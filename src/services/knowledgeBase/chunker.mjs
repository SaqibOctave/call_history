// Splits scraped page text into embedding-sized chunks.
//
// Why chunk at all: embedding models cap how much text one call can take, and more
// importantly, retrieval quality is much better with focused, paragraph-sized chunks
// than with one giant vector for an entire page — a single embedding covering ten
// unrelated paragraphs doesn't match well against a specific question about any one
// of them.
//
// Strategy: split on paragraph breaks first (keeps related sentences together), then
// greedily pack consecutive paragraphs into a chunk until adding the next one would
// exceed maxChars. Any single paragraph that's already bigger than maxChars (e.g. a
// wall of text with no blank lines) is hard-split as a fallback, with a bit of
// overlap so a sentence cut in half still has surrounding context in at least one
// of the two chunks.
export function chunkText(text, { maxChars = 1000, overlapChars = 100 } = {}) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  const flushCurrent = () => {
    if (current) chunks.push(current);
    current = '';
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flushCurrent();
      for (let i = 0; i < paragraph.length; i += maxChars - overlapChars) {
        chunks.push(paragraph.slice(i, i + maxChars).trim());
      }
      continue;
    }

    // +2 accounts for the "\n\n" that will join it to `current` below.
    const wouldExceed = current.length + 2 + paragraph.length > maxChars;
    if (wouldExceed) flushCurrent();

    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }

  flushCurrent();
  return chunks;
}
