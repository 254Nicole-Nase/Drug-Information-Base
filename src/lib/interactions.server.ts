// Interaction checking: the NLM/RxNav drug-drug interaction API was retired,
// so we build on the `drug_interactions` sections of FDA labels instead.
// Strategy: normalize each drug name via RxNav, pull its interactions section
// from openFDA, then detect cross-mentions between the queried drugs and
// extract severity-ish signals from the surrounding text.

const OPENFDA_BASE = "https://api.fda.gov/drug/label.json";
const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";

export interface InteractionFinding {
  drugA: string;
  drugB: string;
  /** Where the mention was found */
  source: "labelA" | "labelB" | "both";
  /** The sentence(s) mentioning the other drug */
  evidence: string[];
  severityHint: "contraindicated" | "major" | "moderate" | "unknown";
  labelIdA?: string | undefined;
  labelIdB?: string | undefined;
  brandA?: string | undefined;
  brandB?: string | undefined;
}

export interface InteractionCheckResult {
  drugs: { input: string; normalized: string; found: boolean }[];
  findings: InteractionFinding[];
  checkedPairs: number;
  note: string;
}

const MAJOR_WORDS =
  /\b(contraindicated|avoid (concomitant |co-?)?use|do not (co-?)?administer|serious|life[- ]threatening|severe|significant(ly)? (increase|decrease)s? (the )?(risk|plasma|exposure)|increase(s|d)? the risk of (bleeding|hemorrhage|toxicity)|bleeding risk|major)\b/i;
const CONTRA_WORDS = /\bcontraindicat/i;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
}

/** Split interactions prose into sentences containing a mention of `term`. */
function sentencesMentioning(text: string, term: string): string[] {
  const t = normalize(term);
  if (!t) return [];
  // split on sentence boundaries; also split bullets
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    const n = normalize(s);
    // whole-word-ish match to avoid "warfarin" matching "warfarin sodium" misses etc.
    if (!n.includes(t)) continue;
    const clipped = s.length > 400 ? s.slice(0, 400) + "…" : s;
    // dedupe near-identical evidence (same text appears across many labels)
    const key = n.slice(0, 160);
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(clipped);
    if (hits.length >= 3) break;
  }
  return hits;
}

function classify(evidence: string[]): InteractionFinding["severityHint"] {
  const joined = evidence.join(" ");
  if (CONTRA_WORDS.test(joined)) return "contraindicated";
  if (MAJOR_WORDS.test(joined)) return "major";
  if (evidence.length > 0) return "moderate";
  return "unknown";
}

async function rxnavNormalize(name: string): Promise<string> {
  try {
    const res = await fetch(`${RXNAV_BASE}/rxcui.json?name=${encodeURIComponent(name)}&search=2`);
    if (!res.ok) return name.toLowerCase();
    const json = (await res.json()) as {
      approxGroup?: { candidate?: { rxcui: string }[] };
    };
    const rxcui = json.approxGroup?.candidate?.[0]?.rxcui;
    if (!rxcui) return name.toLowerCase();
    const propRes = await fetch(
      `${RXNAV_BASE}/rxcui/${rxcui}/property.json?propName=RxNorm%20Name`,
    );
    if (!propRes.ok) return name.toLowerCase();
    const propJson = (await propRes.json()) as {
      propertyConceptGroup?: { propertyConcept?: { propValue: string }[] };
    };
    const rxname = propJson.propertyConceptGroup?.propertyConcept?.[0]?.propValue;
    if (!rxname) return name.toLowerCase();
    // Use the base ingredient part, lowercased
    return rxname.split(/[\s/]/)[0]!.toLowerCase();
  } catch {
    return name.toLowerCase();
  }
}

interface LabelInfo {
  id: string;
  brand?: string | undefined;
  interactionsText: string;
}

async function fetchInteractionsSection(name: string): Promise<LabelInfo | null> {
  const q =
    `openfda.generic_name:"${encodeURIComponent(name)}"+openfda.brand_name:"${encodeURIComponent(name)}"`.replace(
      "+",
      "%20OR%20",
    );
  const url = `${OPENFDA_BASE}?search=${q}&limit=5`;
  let res = await fetch(url);
  if (!res.ok) {
    // fallback: loose search
    res = await fetch(`${OPENFDA_BASE}?search=${encodeURIComponent(name)}&limit=5`);
    if (!res.ok) return null;
  }
  const json = (await res.json()) as {
    results?: Array<{
      id?: string;
      drug_interactions?: string[];
      openfda?: { brand_name?: string[] };
    }>;
  };
  const withInteractions = (json.results ?? []).filter(
    (r) => r.drug_interactions && r.drug_interactions.length > 0,
  );
  if (withInteractions.length === 0) return null;
  const best = withInteractions[0]!;
  return {
    id: best.id ?? "unknown",
    brand: best.openfda?.brand_name?.[0],
    interactionsText: withInteractions.flatMap((r) => r.drug_interactions ?? []).join("\n"),
  };
}

export async function checkInteractions(drugNames: string[]): Promise<InteractionCheckResult> {
  const unique = [...new Set(drugNames.map((d) => d.trim()).filter(Boolean))];
  if (unique.length < 2) {
    throw new Error("Provide at least two drugs to check.");
  }

  const normalized = await Promise.all(
    unique.map(async (d) => ({ input: d, normalized: await rxnavNormalize(d) })),
  );

  const labels = await Promise.all(
    normalized.map(async (n) => ({
      ...n,
      label: await fetchInteractionsSection(n.normalized),
    })),
  );

  const drugs = labels.map((l) => ({
    input: l.input,
    normalized: l.normalized,
    found: l.label !== null,
  }));

  const findings: InteractionFinding[] = [];
  let checkedPairs = 0;

  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      checkedPairs++;
      const a = labels[i]!;
      const b = labels[j]!;
      const evA = a.label ? sentencesMentioning(a.label.interactionsText, b.normalized) : [];
      const evB = b.label ? sentencesMentioning(b.label.interactionsText, a.normalized) : [];
      // also try the raw input term when normalization changed nothing useful
      if (evA.length === 0 && a.label && b.input.toLowerCase() !== b.normalized) {
        evA.push(...sentencesMentioning(a.label.interactionsText, b.input));
      }
      if (evB.length === 0 && b.label && a.input.toLowerCase() !== a.normalized) {
        evB.push(...sentencesMentioning(b.label.interactionsText, a.input));
      }
      if (evA.length === 0 && evB.length === 0) continue;
      const evidence = [...evA, ...evB].slice(0, 6);
      findings.push({
        drugA: a.input,
        drugB: b.input,
        source: evA.length && evB.length ? "both" : evA.length ? "labelA" : "labelB",
        evidence,
        severityHint: classify(evidence),
        ...(a.label ? { labelIdA: a.label.id, brandA: a.label.brand } : {}),
        ...(b.label ? { labelIdB: b.label.id, brandB: b.label.brand } : {}),
      });
    }
  }

  return {
    drugs,
    findings,
    checkedPairs,
    note:
      "Interactions are detected from the drug_interactions sections of FDA labels. " +
      "Absence of a finding is not proof of safety — always confirm with a pharmacist or the full label.",
  };
}
