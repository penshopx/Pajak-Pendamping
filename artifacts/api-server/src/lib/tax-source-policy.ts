import { createHash } from "node:crypto";
import type { TaxResource } from "@workspace/api-zod";
import type { TaxObservation, TaxReview } from "@workspace/db";

export const CHECK_INTERVAL = 24 * 60 * 60 * 1000;
export const MAX_CHECK_AGE = 48 * 60 * 60 * 1000;
export const MAX_REVIEW_AGE = 90 * 24 * 60 * 60 * 1000;
export const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
export const sourceUrl = (url: string) => { const u = new URL(url); u.hash = ""; return u.href; };
export const resourceDigest = (r: TaxResource) => hash(JSON.stringify(r));
const officialHosts = new Set(["pajak.go.id", "www.pajak.go.id", "jdih.kemenkeu.go.id"]);

export function officialUrl(url: string): string {
  const u = new URL(sourceUrl(url));
  if (u.protocol !== "https:" || !officialHosts.has(u.hostname) || u.username || u.password || (u.port && u.port !== "443"))
    throw new Error("URL di luar daftar sumber resmi yang diizinkan");
  return u.href;
}

export function officialLinks(html: string, base: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    try { links.add(officialUrl(new URL(match[1].replace(/&amp;/g, "&"), base).href)); } catch { /* Not an official link. */ }
  }
  return [...links].sort();
}

/** Byte changes are signals, not proof of a legal amendment or of readable PDF text. */
export function inspectDocument(bytes: Uint8Array, url: string, contentType: string) {
  const data = Buffer.from(bytes);
  const pdf = /\.pdf$/i.test(new URL(url).pathname) || /application\/pdf/i.test(contentType);
  if (pdf) {
    if (data.subarray(0, 5).toString() !== "%PDF-" || !data.subarray(-2048).includes(Buffer.from("%%EOF")))
      throw new Error("PDF tidak lengkap atau respons bukan PDF");
    return { contentHash: hash(data), linksHash: hash("[]") };
  }
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType))
    throw new Error("Jenis dokumen tidak didukung");
  const html = data.toString("utf8");
  if (html.length < 200 || /<title[^>]*>[^<]*(?:maintenance|access denied|captcha|forbidden|error|not found)/i.test(html)
    || /under maintenance|temporarily unavailable|verify you are human/i.test(html))
    throw new Error("Halaman gangguan atau tantangan akses, bukan naskah");
  return { contentHash: hash(data), linksHash: hash(JSON.stringify(officialLinks(html, url))) };
}

export function reviewStatus(r: TaxResource, latest: TaxObservation | undefined, review: TaxReview | undefined,
  reviewedObservation: TaxObservation | undefined, now = Date.now(), invalidated = false): string {
  if (!latest) return "Belum diperiksa otomatis";
  if (latest.outcome !== "ok") return "Sumber gagal diakses";
  if (now - latest.checkedAt.getTime() > MAX_CHECK_AGE) return "Pemeriksaan sumber kedaluwarsa";
  if (!review || review.resourceDigest !== resourceDigest(r)) return "Menunggu tinjauan cuplikan dan baseline";
  if (review.decision !== "approve") return "Ditolak peninjau";
  if (now - review.reviewedAt.getTime() > MAX_REVIEW_AGE) return "Tinjauan manusia kedaluwarsa";
  if (invalidated) return "Ada perubahan atau gangguan sejak persetujuan; tinjau ulang";
  if (!reviewedObservation || latest.sourceUrl !== reviewedObservation.sourceUrl
    || latest.contentHash !== reviewedObservation.contentHash || latest.linksHash !== reviewedObservation.linksHash
    || latest.effectiveUrl !== reviewedObservation.effectiveUrl) return "Naskah atau tautan resmi berubah";
  return "approved";
}

/** If a required companion is held, withhold the dependent excerpt too. */
export function eligibleSources(resources: TaxResource[], approvedIds: Set<string>): TaxResource[] {
  const allowed = new Set(approvedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of resources) if (allowed.has(r.id) && (r.relatedIds ?? []).some(id => !allowed.has(id))) {
      allowed.delete(r.id);
      changed = true;
    }
  }
  return resources.filter(r => allowed.has(r.id));
}
