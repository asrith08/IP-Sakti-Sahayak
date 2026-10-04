import { getSupabaseAdmin } from './supabaseAdmin.js';
import { embedText } from './embeddings.js';

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  sourceId: string;
  content: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
  pageNumber: number | null;
  sourceUrl: string | null;
  documentTitle: string | null;
  documentType: string | null;
  jurisdiction: string | null;
  publicationDate: string | null;
  effectiveDate: string | null;
  sourceName: string | null;
  organization: string | null;
  authorityTier: number | null;
  canonicalUrl: string | null;
  relevanceScore: number;
  retrievalMethod: string;
  semanticScore: number;
  keywordScore: number;
  authorityScore: number;
}

export interface RetrieveOptions {
  jurisdiction?: string;
  documentId?: string;
  sourceId?: string;
  limit?: number;
}

/**
 * Retrieve knowledge base results for a query.
 * Supports hybrid semantic and keyword/full-text search.
 */
export async function retrieveKnowledge(query: string, options: RetrieveOptions = {}): Promise<RetrievalResult[]> {
  const { jurisdiction, documentId, sourceId, limit = 10 } = options;
  const supabase = getSupabaseAdmin();

  // Generate embedding for the query
  const embedding = await embedText(query);
  const queryNorm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));

  // Keyword / full-text search
  const { data: kwData, error: kwError } = await supabase
    .from('document_chunks')
    .select('id')
    .textSearch('search_vector', query, { config: 'english', type: 'plain' })
    .limit(limit);
  if (kwError) {
    console.error('Keyword search error:', kwError.message);
  }
  const keywordChunkIds = kwData?.map((c: any) => c.id) ?? [];

  // Determine which documents to include
  let docIds: string[] = [];
  let docQuery = supabase
    .from('documents')
    .select('id, source_id, title, document_type, jurisdiction, publication_date, effective_date, canonical_url')
    .order('created_at', { ascending: false });

  if (jurisdiction) {
    docQuery = docQuery.eq('jurisdiction', jurisdiction);
  }
  if (sourceId) {
    docQuery = docQuery.eq('source_id', sourceId);
  }
  if (documentId) {
    docIds = [documentId];
  } else {
    const { data: docsData, error: docsErr } = await docQuery;
    if (docsErr) {
      console.error('Document query error:', docsErr.message);
    }
    if (docsData) {
      docIds = docsData.map((d: any) => d.id);
    }
  }

  // If no documents found, return empty
  if (docIds.length === 0) {
    return [];
  }

  // Fetch chunks for these documents
  const { data: chunksData, error: chunksErr } = await supabase
    .from('document_chunks')
    .select(
      'id, document_id, chunk_index, content, section_title, subsection_title, page_number, source_url, embedding, search_vector'
    )
    .in('document_id', docIds);
  if (chunksErr) {
    console.error('Chunk fetch error:', chunksErr.message);
    return [];
  }
  if (!chunksData) return [];

  // Build maps for documents and sources
  const docMap = new Map<string, any>();
  const sourceIds: string[] = [];
  const docsDataArray: any[] = [];

  if (documentId) {
    const { data: docSingle, error: docSingleErr } = await supabase
      .from('documents')
      .select(
        'id, source_id, title, document_type, jurisdiction, publication_date, effective_date, canonical_url'
      )
      .eq('id', documentId)
      .single();
    if (!docSingleErr && docSingle) {
      docsDataArray.push(docSingle);
    }
  } else if (docIds.length > 0) {
    const { data: docsDataFetched, error: docsFetchedErr } = await supabase
      .from('documents')
      .select(
        'id, source_id, title, document_type, jurisdiction, publication_date, effective_date, canonical_url'
      )
      .in('id', docIds);
    if (!docsFetchedErr && docsDataFetched) {
      docsDataArray.push(...docsDataFetched);
    }
  }

  for (const doc of docsDataArray) {
    docMap.set(doc.id, doc);
    if (doc.source_id && !sourceIds.includes(doc.source_id)) {
      sourceIds.push(doc.source_id);
    }
  }

  // Fetch sources
  const { data: sourcesData, error: sourcesErr } = await supabase
    .from('sources')
    .select(
      'id, name, organization, jurisdiction, authority_tier, source_type, base_url, description, is_active'
    )
    .in('id', sourceIds);
  if (sourcesErr) {
    console.error('Source fetch error:', sourcesErr.message);
  }
  const sourceMap = new Map<string, any>();
  if (sourcesData) {
    for (const s of sourcesData) {
      sourceMap.set(s.id, s);
    }
  }

  // Compute similarity and ranking
  const results: RetrievalResult[] = [];
  for (const chunk of chunksData) {
    const doc = docMap.get(chunk.document_id);
    const source = sourceMap.get(doc?.source_id);
    if (!doc || !source) continue;

    const chunkEmbedding = chunk.embedding as number[];
    if (!chunkEmbedding || chunkEmbedding.length !== 768) continue;

    const chunkNorm = Math.sqrt(chunkEmbedding.reduce((sum, v) => sum + v * v, 0));
    const dot = embedding.reduce((sum, v, i) => sum + v * chunkEmbedding[i], 0);
    const semanticScoreRaw = dot / (queryNorm * chunkNorm || 1);
    const semanticScore = Math.max(0, Math.min(semanticScoreRaw, 1));

    const keywordScore = keywordChunkIds.includes(chunk.id) ? 1 : 0;

    const authorityRaw = source.authority_tier ?? 0;
    const authorityWeight = Math.min(1, authorityRaw / 10); // normalize to [0,1]
    const authorityBoost = authorityWeight * 0.05; // small boost

    const hybridScore = 0.7 * semanticScore + 0.3 * keywordScore + authorityBoost;

    results.push({
      chunkId: chunk.id,
      documentId: chunk.document_id,
      sourceId: doc.source_id,
      content: chunk.content,
      sectionTitle: chunk.section_title,
      subsectionTitle: chunk.subsection_title,
      pageNumber: chunk.page_number,
      sourceUrl: chunk.source_url,
      documentTitle: doc.title,
      documentType: doc.document_type,
      jurisdiction: doc.jurisdiction,
      publicationDate: doc.publication_date,
      effectiveDate: doc.effective_date,
      sourceName: source.name,
      organization: source.organization,
      authorityTier: source.authority_tier,
      canonicalUrl: source.base_url,
      relevanceScore: hybridScore,
      retrievalMethod: 'hybrid',
      semanticScore,
      keywordScore,
      authorityScore: authorityRaw,
    });
  }

  // Sort by relevance score
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Limit results
  return results.slice(0, limit);
}
