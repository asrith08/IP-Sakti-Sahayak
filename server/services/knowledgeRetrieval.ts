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
  let embedding: number[] = [];
  let queryNorm = 0;
  try {
    embedding = await embedText(query);
    queryNorm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  } catch (e) {
    console.warn('[IP-SAKTI] Gemini embedding failed, fallback to keyword-only retrieval:', e);
    // Continue with empty embedding; semantic scoring will be zero.
  }

  // Keyword / full-text search
  // Split query into individual significant tokens and search per-token,
  // then union all matching chunk IDs. This gives OR semantics across terms
  // because postgres plainto_tsquery ANDs multi-word queries.
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'in', 'of', 'for', 'to', 'is', 'are',
    'can', 'i', 'my', 'it', 'be', 'on', 'with', 'what', 'how', 'do', 'does',
    'this', 'that', 'from', 'at', 'by', 'as', 'its', 'also', 'any', 'all',
    'me', 'we', 'our', 'they', 'their', 'which', 'would', 'should', 'could',
    'not', 'no', 'yes', 'if', 'so', 'but', 'was', 'has', 'have', 'had',
  ]);
  const queryTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stopWords.has(t));
  // Deduplicate tokens
  const uniqueTokens = [...new Set(queryTokens)];

  const keywordChunkIdSet = new Set<string>();
  for (const token of uniqueTokens.slice(0, 8)) { // cap at 8 to avoid excessive calls
    const { data: kwData } = await supabase
      .from('document_chunks')
      .select('id')
      .textSearch('search_vector', token, { config: 'english', type: 'plain' })
      .limit(limit);
    for (const row of kwData ?? []) {
      keywordChunkIdSet.add((row as { id: string }).id);
    }
  }
  const keywordChunkIds = [...keywordChunkIdSet];

  // Determine which documents to include
  let docIds: string[] = [];
  let docQuery = supabase
    .from('documents')
    .select('id, source_id, title, document_type, jurisdiction, publication_date, effective_date, canonical_url')
    .order('created_at', { ascending: false });

  if (jurisdiction) {
    const isIndia = jurisdiction === 'IN' || jurisdiction.toLowerCase() === 'india';
    if (isIndia) {
      docQuery = docQuery.or('jurisdiction.eq.India,jurisdiction.eq.IN');
    } else {
      docQuery = docQuery.eq('jurisdiction', jurisdiction);
    }
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
      docIds = docsData.map((d: { id: string }) => d.id);
    }
  }

  // If no documents found, return empty
  if (docIds.length === 0) {
    return [];
  }

  // Fetch chunks for these documents (paginate in batches of 1000 to prevent row-cap truncation)
  let allChunksData: Array<{
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    section_title: string | null;
    subsection_title: string | null;
    page_number: number | null;
    source_url: string | null;
    embedding: number[] | string | null;
    search_vector: unknown;
  }> = [];

  let from = 0;
  const CHUNK_PAGE_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error: pageErr } = await supabase
      .from('document_chunks')
      .select('id, document_id, chunk_index, content, section_title, subsection_title, page_number, source_url, embedding, search_vector')
      .in('document_id', docIds)
      .range(from, from + CHUNK_PAGE_SIZE - 1);

    if (pageErr) {
      console.error('Chunk fetch error:', pageErr.message);
      break;
    }

    if (!pageData || pageData.length === 0) {
      break;
    }

    allChunksData = allChunksData.concat(pageData as any);
    if (pageData.length < CHUNK_PAGE_SIZE) {
      hasMore = false;
    } else {
      from += CHUNK_PAGE_SIZE;
    }
  }

  const chunksData = allChunksData;


  // Build maps for documents and sources
  const docMap = new Map<string, {
    id: string;
    source_id: string;
    title: string;
    document_type: string | null;
    jurisdiction: string | null;
    publication_date: string | null;
    effective_date: string | null;
    canonical_url: string | null;
  }>();
  const sourceIds: string[] = [];
  const docsDataArray: Array<{
    id: string;
    source_id: string;
    title: string;
    document_type: string | null;
    jurisdiction: string | null;
    publication_date: string | null;
    effective_date: string | null;
    canonical_url: string | null;
  }> = [];

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
  const sourceMap = new Map<string, {
    id: string;
    name: string;
    organization: string | null;
    jurisdiction: string | null;
    authority_tier: number | null;
    source_type: string | null;
    base_url: string | null;
    description: string | null;
    is_active: boolean;
  }>();
  if (sourcesData) {
    for (const s of sourcesData) {
      sourceMap.set(s.id, s);
    }
  }

  // Compute similarity and ranking
  const results: RetrievalResult[] = [];
  for (const chunk of chunksData as Array<{
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    section_title: string | null;
    subsection_title: string | null;
    page_number: number | null;
    source_url: string | null;
    embedding: number[] | string | null;
    search_vector: unknown;
  }>) {
    const doc = docMap.get(chunk.document_id);
    const source = doc ? sourceMap.get(doc.source_id) : undefined;
    if (!doc || !source) continue;

    const chunkEmbedding: number[] | null = (() => {
      const raw = chunk.embedding;
      if (!raw) return null;
      // Supabase returns vector columns as a JSON string "[0.1,0.2,...]" not a parsed array.
      if (typeof raw === 'string') {
        try { return JSON.parse(raw) as number[]; } catch { return null; }
      }
      if (Array.isArray(raw)) return raw as number[];
      return null;
    })();
    if (!chunkEmbedding || chunkEmbedding.length !== 768) continue;

    const chunkNorm = Math.sqrt(chunkEmbedding.reduce((sum, v) => sum + v * v, 0));
    const dot = embedding.length > 0
      ? embedding.reduce((sum, v, i) => sum + v * chunkEmbedding[i], 0)
      : 0;
    const semanticScoreRaw = dot / (queryNorm * chunkNorm || 1);
    const semanticScore = Math.max(0, Math.min(semanticScoreRaw, 1));

    const keywordScore = keywordChunkIds.includes(chunk.id) ? 1 : 0;

    const authorityRaw = source.authority_tier ?? 0;
    const authorityWeight = Math.min(1, authorityRaw / 10); // normalize to [0,1]
    const authorityBoost = authorityWeight * 0.05; // small boost, capped at 0.05

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

  // Sort by relevance score descending
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Deduplicate by chunkId (keep highest score)
  const seen = new Set<string>();
  const deduplicated: RetrievalResult[] = [];
  for (const r of results) {
    if (!seen.has(r.chunkId)) {
      seen.add(r.chunkId);
      deduplicated.push(r);
    }
  }

  return deduplicated.slice(0, limit);
}
