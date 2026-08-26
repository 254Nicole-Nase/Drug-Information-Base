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
