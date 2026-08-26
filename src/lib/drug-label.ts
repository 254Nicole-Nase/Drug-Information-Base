import type { DrugLabel } from "./openfda.functions";

export type LabelSection = {
  key: string;
  title: string;
  paragraphs: string[];
};

/** Ordered, human-readable view of the label sections we surface. */
const SECTION_MAP: Array<{ key: keyof DrugLabel; title: string }> = [
  { key: "boxed_warning", title: "Boxed warning" },
  { key: "purpose", title: "Purpose" },
  { key: "indications_and_usage", title: "Indications and usage" },
  { key: "dosage_and_administration", title: "Dosage and administration" },
  { key: "contraindications", title: "Contraindications" },
  { key: "warnings", title: "Warnings" },
  { key: "drug_interactions", title: "Drug interactions" },
  { key: "adverse_reactions", title: "Adverse reactions" },
  { key: "pregnancy", title: "Pregnancy" },
  { key: "description", title: "Description" },
];

export function labelTitle(label: DrugLabel): string {
  return (
    label.openfda?.brand_name?.[0] ??
    label.openfda?.generic_name?.[0] ??
    label.openfda?.substance_name?.[0] ??
    "Unnamed product"
  );
}

export function labelSubtitle(label: DrugLabel): string | null {
  const generic = label.openfda?.generic_name?.[0];
  const brand = label.openfda?.brand_name?.[0];
  if (generic && brand && generic.toLowerCase() !== brand.toLowerCase()) return generic;
  return label.openfda?.substance_name?.[0] ?? null;
}

export function labelSections(label: DrugLabel): LabelSection[] {
  return SECTION_MAP.flatMap(({ key, title }) => {
    const value = label[key];
    if (!Array.isArray(value) || value.length === 0) return [];
    const paragraphs = value.filter((entry): entry is string => typeof entry === "string");
    if (paragraphs.length === 0) return [];
    return [{ key: String(key), title, paragraphs }];
  });
}

export type LabelBlock =
  | { kind: "heading"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "text"; text: string };

const BULLET_PREFIX = /^[•▪·*\u2022\u25AA-]\s+/;

function isHeading(line: string): boolean {
  if (line.length > 90) return false;
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;
  return /:$/.test(line) && line.split(/\s+/).length <= 12;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;])\s+(?=[A-Z(“"])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Standard OTC/SPL cue phrases that act as sub-headings inside run-on label prose. */
const CUE_PHRASES = [
  "Allergy alert",
  "Stomach bleeding warning",
  "Heart attack and stroke warning",
  "Liver warning",
  "Caffeine warning",
  "Sore throat warning",
  "Do not use",
  "Ask a doctor before use if",
  "Ask a doctor or pharmacist before use if",
  "Ask a doctor",
  "When using this product",
  "Stop use and ask a doctor if",
  "Stop use and ask a doctor",
  "If pregnant or breast-feeding",
  "Keep out of reach of children",
  "Other information",
  "In case of overdose",
];

const CUE_REGEX = new RegExp(`(${CUE_PHRASES.map((cue) => cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*:?\\s*`, "g");

type Chunk = { heading: string | null; body: string };

function splitOnCues(line: string): Chunk[] {
  const chunks: Chunk[] = [];
  let lastIndex = 0;
  let current: string | null = null;
  CUE_REGEX.lastIndex = 0;

  for (let match = CUE_REGEX.exec(line); match; match = CUE_REGEX.exec(line)) {
    const body = line.slice(lastIndex, match.index).trim();
    if (body || current) chunks.push({ heading: current, body });
    current = match[1] ?? null;
    lastIndex = CUE_REGEX.lastIndex;
  }
  const tail = line.slice(lastIndex).trim();
  if (tail || current) chunks.push({ heading: current, body: tail });
  return chunks.length > 0 ? chunks : [{ heading: null, body: line }];
}

/**
 * Turns wall-of-text label prose into headings, bullet lists and short paragraphs.
 * `sentenceBullets` splits long safety prose into scannable one-sentence points.
 */
export function parseLabelBlocks(
  paragraphs: string[],
  options: { sentenceBullets?: boolean } = {},
): LabelBlock[] {
  const blocks: LabelBlock[] = [];
  const pushBullet = (item: string) => {
    const last = blocks[blocks.length - 1];
    if (last && last.kind === "bullets") last.items.push(item);
    else blocks.push({ kind: "bullets", items: [item] });
  };

  for (const paragraph of paragraphs) {
    for (const rawLine of paragraph.split(/\n+/)) {
      const line = rawLine.trim();
      if (!line) continue;

      if (BULLET_PREFIX.test(line)) {
        pushBullet(line.replace(BULLET_PREFIX, "").trim());
        continue;
      }
      if (isHeading(line)) {
        blocks.push({ kind: "heading", text: line.replace(/:$/, "") });
        continue;
      }

      for (const chunk of splitOnCues(line)) {
        if (chunk.heading) blocks.push({ kind: "heading", text: chunk.heading });
        if (!chunk.body) continue;

        const sentences = splitSentences(chunk.body);
        if (options.sentenceBullets && sentences.length > 1 && chunk.body.length > 90) {
          for (const sentence of sentences) pushBullet(sentence);
        } else {
          blocks.push({ kind: "text", text: chunk.body });
        }
      }
    }
  }

  return blocks;
}



export function blockCount(blocks: LabelBlock[]): number {
  return blocks.reduce((total, block) => total + (block.kind === "bullets" ? block.items.length : 1), 0);
}

/** openFDA effective_time is YYYYMMDD. */
export function formatEffectiveTime(value: string | undefined): string | null {
  if (!value || value.length !== 8) return null;
  const date = new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
  );
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function dailyMedUrl(setId: string | undefined): string | null {
  if (!setId) return null;
  return `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setId}`;
}
