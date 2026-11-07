import type { TaxResource } from "@workspace/api-zod";
import { taxResources } from "./tax-resources";

const stopWords = new Set("apa apakah itu yang dan atau untuk dengan dari saya kami anda di ke pada sebagai perlu bagaimana cara soal pajak coretax tolong jelaskan tentang bisa sudah belum berapa kapan tahun masa".split(" "));
const normalize = (text: string) => text.toLowerCase().normalize("NFKC").replace(/\b([347])\s+tahun\b/g, "$1tahun");
const aliases: Record<string, string> = { membayar: "pembayaran", dibayar: "pembayaran", bayar: "pembayaran",
  menghitung: "hitung", penghitungan: "perhitungan", omset: "omzet", pribadi: "perorangan", pendapatan: "omzet" };
const tokens = (text: string) => [...new Set(normalize(text).split(/[^\p{L}\p{N},.]+/u)
  .filter(t => (t.length >= 3 || t === "cv" || t === "pt") && !stopWords.has(t) && !/^\d{4}$/.test(t))
  .map(t => aliases[t] ?? t))];

/** Local, deterministic retrieval; neither a web search nor proof of applicability. */
export function searchTaxSources(question: string, history: { role: string; content: string }[] = [], resources: TaxResource[] = taxResources): TaxResource[] {
  // Only user context is used, and only for an apparent follow-up. AI history is not evidence.
  const followUp = /^(lalu|kalau begitu|bagaimana dengan|dan untuk|itu|terus)\b/i.test(question.trim());
  const previous = followUp ? history.filter(m => m.role === "user").slice(-1).map(m => m.content).join(" ") : "";
  const terms = tokens(`${question} ${previous}`);
  const wantsOpinion = /\b(artikel|opini|anthonie|fuad)\b/i.test(question);
  const ranked = resources
    .filter(r => r.verification === "excerpt" || (r.verification === "page" && (r.sourceType !== "Artikel opini" || wantsOpinion)))
    .map(resource => {
      const tags = new Set(tokens(resource.topics?.join(" ") ?? resource.title));
      const score = terms.reduce((sum, term) => sum + (tags.has(term) ? 4 : 0), 0);
      return { resource, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.resource.id.localeCompare(b.resource.id));
  const selected = new Map<string, TaxResource>();
  // Explicit SP2DK context must survive generic UMKM/document/BPE matches.
  // Use only the supplied monitor allowlist, including for follow-up questions.
  if (/\bsp2dk\b|permintaan penjelasan|pengawasan/i.test(`${question} ${previous}`)) {
    for (const { resource } of ranked.filter(r => r.resource.id.startsWith("sp2dk-"))) {
      selected.set(resource.id, resource);
      for (const id of resource.relatedIds ?? []) {
        const companion = resources.find(r => r.id === id && r.verification === "excerpt");
        if (companion) selected.set(id, companion);
      }
    }
  }
  // An explicit secondary NPPN question must not be crowded out by the final-tax bundle.
  // Still select only from the eligible, scored input (including the monitor's allowlist).
  if (/\bnppn\b/i.test(`${question} ${previous}`)) {
    const nppn = ranked.find(r => r.resource.id === "nppn");
    if (nppn) selected.set(nppn.resource.id, nppn.resource);
  }
  // Fetch companion criteria/amendments together: never retrieve an isolated old rule.
  for (const { resource } of ranked.slice(0, 4)) {
    selected.set(resource.id, resource);
    for (const id of resource.relatedIds ?? []) {
      const companion = resources.find(r => r.id === id && (r.verification === "excerpt" || r.verification === "page"));
      if (companion) selected.set(id, companion);
    }
  }
  if (!selected.size && !terms.length && /\bcoretax\b/i.test(question)) {
    const portal = resources.find(r => r.id === "coretax");
    if (portal) selected.set(portal.id, portal);
  }
  return [...selected.values()];
}

export const insufficientSourcesAnswer = "Cuplikan sumber yang diperiksa belum cukup untuk menjawab rincian kasus ini. Saya tidak dapat memastikan tarif, tenggat, kelayakan, isi pasal, atau jumlah pajak tanpa dasar yang mendukung. Sebutkan topik, bentuk usaha dan tahun/masa pajak tanpa NPWP, NIK atau kredensial. Periksa dokumen asli di pustaka atau konfirmasikan kepada DJP/KPP; jangan menganggap ada kewajiban otomatis dari jawaban ini.";

// Internal product facts have no external attribution; DJP does not endorse this app.
export function appStatusAnswer(question: string): string | undefined {
  if (!/\bsahabat\s+pajak\b/i.test(question) || !/\b(izin|berizin|pjap|konsultan|status|resmi|sertifikasi)\b/i.test(question)) return undefined;
  return "Keterangan aplikasi: Sahabat Pajak adalah pendamping edukasi independen, bukan layanan resmi DJP. Aplikasi ini tidak mengklaim izin praktik konsultan pajak atau penunjukan sebagai PJAP, tidak menerima pendaftaran izin, tidak memverifikasi izin individu, dan tidak menerima kuasa. Ini keterangan internal aplikasi, bukan pernyataan DJP tentang Sahabat Pajak. Untuk syarat profesi atau PJAP, tanyakan secara terpisah agar rujukan eksternalnya dapat dijelaskan sesuai batas sumber.";
}

export function sourceContext(sources: TaxResource[]): string {
  return sources.map(r => `[${r.id}] ${r.title}
Jenis: ${r.sourceType}; tingkat pembacaan: ${r.verification}; diperiksa ${r.checkedAt}
Versi: ${r.version ?? "Halaman web pada tanggal pemeriksaan"}
Lokasi: ${r.locator ?? "Halaman web, bukan pasal hukum"}
URL: ${r.url}
Batas: ${r.limitations ?? "Bukan dasar penetapan tarif, tenggat atau kewajiban."}
Cuplikan: ${r.excerpt}`).join("\n\n");
}

/** Fail closed for fabricated/unretrieved citations, missing citations and external links. */
export function groundedResponse(output: unknown, retrieved: TaxResource[]): { answer: string; sources: TaxResource[] } {
  const fallback = { answer: insufficientSourcesAnswer, sources: [] };
  if (!output || typeof output !== "object" || !("answer" in output) || typeof output.answer !== "string"
    || !output.answer.trim() || output.answer.length > 24000
    || !("sourceIds" in output) || !Array.isArray(output.sourceIds)) return fallback;
  const ids = output.sourceIds;
  const allowed = new Map(retrieved.map(r => [r.id, r]));
  const cited = [...output.answer.matchAll(/\[([a-zA-Z0-9_-]+)\]/g)].map(m => m[1]);
  if (!ids.length || !cited.length || ids.some(id => typeof id !== "string" || !allowed.has(id))
    || cited.some(id => !ids.includes(id)) || ids.some(id => !cited.includes(id))) return fallback;
  // Links are rendered exclusively from server-owned source cards, never AI text.
  if (/(?:https?:\/\/|www\.|coretaxdjp\.|pajak\.go\.id|jdih\.)/i.test(output.answer)) return fallback;
  return { answer: output.answer.trim(), sources: [...new Set(ids)].map(id => allowed.get(id)!) };
}
