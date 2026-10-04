/**
 * chunking.ts
 *
 * Deterministic regulatory-document chunking service.
 * Designed for Indian government / CDSCO PDFs (Drugs Rules 1945, etc.)
 *
 * Strategy:
 *  1. Input is an array of { pageNumber, text } objects from pdf-parse.
 *  2. We walk each page line-by-line, detecting regulatory headings
 *     (CHAPTER, PART, RULE, SCHEDULE, APPENDIX, numbered rules/sub-rules).
 *  3. We accumulate text into a chunk until it reaches TARGET_CHARS.
 *  4. At a heading boundary OR at TARGET_CHARS we close the current chunk
 *     and start a new one.
 *  5. We add OVERLAP_CHARS of the previous chunk's tail to the new one
 *     so context is preserved across chunk boundaries.
 *  6. Every chunk records: content, chunk_index, section_title,
 *     subsection_title, page_number (first page the chunk touches).
 */

export interface PageText {
  pageNumber: number; // 1-based
  text: string;
}

export interface Chunk {
  chunk_index: number;
  content: string;
  section_title: string | null;
  subsection_title: string | null;
  page_number: number;
}

// ─── Tuning constants ─────────────────────────────────────────────────────────
// Target content size per chunk (characters). At ~4 chars/token this is ~400 tokens —
// small enough for dense regulatory text, large enough for context.
const TARGET_CHARS = 1500;
// Overlap carried from the previous chunk tail.
const OVERLAP_CHARS = 200;
// Minimum useful chunk size — discard slivers smaller than this.
const MIN_CHARS = 80;

// ─── Heading detection regexes ────────────────────────────────────────────────
// Major section headings (CHAPTER, PART, SCHEDULE, APPENDIX)
const RE_MAJOR = /^\s*(CHAPTER\s+[IVXLCDM\d]+|PART\s+[IVXLCDMA-Z]+|SCHEDULE\s+[A-Z\d]+|APPENDIX\s+[A-Z\d]*)\b/i;

// Rule headings: "Rule 5" / "Rule 5A" / "RULE 5"
const RE_RULE = /^\s*RULE\s+(\d+[A-Z]*)\b/i;

// Numbered sub-rules / items: "(1)" or "1." at start of line (but not just any digit)
const RE_SUBRULE = /^\s*\((\d+[a-z]?)\)\s+\S/;

// Form/Table references
const RE_FORM = /^\s*(FORM\s+[A-Z\d\-]+|TABLE\s+[IVXLCDM\d]+)\b/i;

function detectHeadings(line: string): {
  isMajor: boolean;
  isRule: boolean;
  majorTitle: string | null;
  ruleTitle: string | null;
} {
  const cleaned = line.trim();
  if (!cleaned) return { isMajor: false, isRule: false, majorTitle: null, ruleTitle: null };

  const majorMatch = cleaned.match(RE_MAJOR) || cleaned.match(RE_FORM);
  if (majorMatch) {
    return { isMajor: true, isRule: false, majorTitle: cleaned.slice(0, 80), ruleTitle: null };
  }

  const ruleMatch = cleaned.match(RE_RULE);
  if (ruleMatch) {
    return { isMajor: false, isRule: true, majorTitle: null, ruleTitle: cleaned.slice(0, 80) };
  }

  return { isMajor: false, isRule: false, majorTitle: null, ruleTitle: null };
}

// ─── Main chunker ─────────────────────────────────────────────────────────────
export function chunkPages(pages: PageText[]): Chunk[] {
  const chunks: Chunk[] = [];

  let buffer = '';
  let bufferPage = 1;
  let currentSection: string | null = null;
  let currentSubsection: string | null = null;
  let overlapTail = '';

  function flushBuffer(forcedPage?: number) {
    const content = buffer.trim();
    if (content.length < MIN_CHARS) {
      // Keep content but don't emit a micro-chunk; it will merge into next
      return;
    }
    chunks.push({
      chunk_index: chunks.length,
      content,
      section_title: currentSection,
      subsection_title: currentSubsection,
      page_number: forcedPage ?? bufferPage,
    });
    // Carry overlap from the tail of what we just emitted
    overlapTail = content.slice(-OVERLAP_CHARS);
    buffer = '';
  }

  for (const { pageNumber, text } of pages) {
    // Normalise: collapse runs of 3+ blank lines to 2, trim page noise
    const lines = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const { isMajor, isRule, majorTitle, ruleTitle } = detectHeadings(line);

      // ── Major heading (CHAPTER / SCHEDULE / etc.) ──────────────────────────
      if (isMajor) {
        // Close current chunk before starting a new section
        if (buffer.trim().length >= MIN_CHARS) {
          flushBuffer(bufferPage);
        }
        currentSection = majorTitle;
        currentSubsection = null;
        // Start fresh buffer for this section; no overlap across major boundaries
        buffer = overlapTail ? overlapTail + '\n' : '';
        bufferPage = pageNumber;
        buffer += line + '\n';
        continue;
      }

      // ── Rule heading ────────────────────────────────────────────────────────
      if (isRule) {
        // Close current chunk at rule boundaries when it's getting large
        if (buffer.trim().length >= TARGET_CHARS * 0.5) {
          flushBuffer(bufferPage);
          buffer = overlapTail ? overlapTail + '\n' : '';
          bufferPage = pageNumber;
        }
        currentSubsection = ruleTitle;
        buffer += line + '\n';
        continue;
      }

      // ── Regular content line ────────────────────────────────────────────────
      // If adding this line would push us past TARGET_CHARS, flush first
      if (buffer.length + line.length > TARGET_CHARS) {
        flushBuffer(bufferPage);
        buffer = overlapTail ? overlapTail + '\n' : '';
        bufferPage = pageNumber;
      }

      // Track first page of this buffer
      if (!buffer.trim()) {
        bufferPage = pageNumber;
      }

      buffer += line + '\n';
    }
  }

  // Flush any remaining content
  if (buffer.trim().length >= MIN_CHARS) {
    flushBuffer(bufferPage);
  }

  // Re-index sequentially (chunk_index was set during push so it's already correct,
  // but ensure it matches array position after any potential skips)
  return chunks.map((c, i) => ({ ...c, chunk_index: i }));
}
