import { describe, expect, it } from "vitest";

import { chunkSection } from "./chunks.server";

describe("chunkSection", () => {
  it("returns no chunks for empty prose", () => {
    expect(chunkSection("warnings", "Warnings", [])).toEqual([]);
  });

  it("keeps short sections as a single chunk and prefixes the title for embedding", () => {
    const chunks = chunkSection("purpose", "Purpose", ["Pain reliever. Fever reducer."]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe("Pain reliever. Fever reducer.");
    expect(chunks[0]!.embedding_text.startsWith("Purpose: ")).toBe(true);
  });

  it("splits long prose on sentence boundaries under the size budget", () => {
    const sentence = "Do not exceed the recommended dose in any twenty four hour period. ";
    const chunks = chunkSection("warnings", "Warnings", [sentence.repeat(60)], 400);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(400);
      expect(chunk.section_key).toBe("warnings");
    }
  });

  it("never drops content across chunk boundaries", () => {
    const paragraphs = ["Alpha sentence one. Beta sentence two. Gamma sentence three."];
    const joined = chunkSection("x", "X", paragraphs, 30)
      .map((c) => c.content)
      .join(" ");
    expect(joined).toContain("Alpha");
    expect(joined).toContain("Beta");
    expect(joined).toContain("Gamma");
  });
});
