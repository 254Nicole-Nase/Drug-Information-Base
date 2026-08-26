export type ChunkInput = {
  section_key: string;
  section_title: string;
  content: string;
  embedding_text: string;
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;])\s+(?=[A-Z(“"])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Splits long label prose into sentence-bound chunks of roughly maxChars.
 * The section title is prepended to the embedding text so retrieval aligns
 * with the section the passage came from.
 */
export function chunkSection(
  sectionKey: string,
  sectionTitle: string,
  paragraphs: string[],
  maxChars = 1200,
): ChunkInput[] {
  const sentences = paragraphs.flatMap(splitSentences);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.map((content) => ({
    section_key: sectionKey,
    section_title: sectionTitle,
    content,
    embedding_text: `${sectionTitle}: ${content}`,
  }));
}
