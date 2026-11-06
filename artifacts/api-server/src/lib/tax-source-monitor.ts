import { db, pool, taxObservations, taxReviews, type TaxObservation } from "@workspace/db";
import { desc, gt, inArray } from "drizzle-orm";
import { taxResources } from "./tax-resources";
import { CHECK_INTERVAL, eligibleSources, resourceDigest, reviewStatus, sourceUrl } from "./tax-source-policy";
import { fetchSource } from "./tax-source-fetch";
import { logger } from "./logger";

// A session lock serializes all scheduler replicas and operator decisions.
export async function withMonitorLock<T>(work: () => Promise<T>): Promise<T | undefined> {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT pg_try_advisory_lock(78290124) AS locked");
    if (!result.rows[0].locked) return undefined;
    try { return await work(); }
    finally { await client.query("SELECT pg_advisory_unlock(78290124)"); }
  } finally { client.release(); }
}

export async function monitoringState() {
  const observations = await db.selectDistinctOn([taxObservations.sourceUrl]).from(taxObservations)
    .orderBy(taxObservations.sourceUrl, desc(taxObservations.id));
  const reviews = await db.selectDistinctOn([taxReviews.resourceId]).from(taxReviews)
    .orderBy(taxReviews.resourceId, desc(taxReviews.id));
  const evidenceIds = reviews.map(r => r.observationId);
  const evidence = evidenceIds.length ? await db.select().from(taxObservations).where(inArray(taxObservations.id, evidenceIds)) : [];
  const sinceReview = evidenceIds.length ? await db.select().from(taxObservations)
    .where(gt(taxObservations.id, Math.min(...evidenceIds))) : [];
  const latestByUrl = new Map(observations.map(o => [o.sourceUrl, o]));
  const reviewById = new Map(reviews.map(r => [r.resourceId, r]));
  const evidenceById = new Map(evidence.map(o => [o.id, o]));
  return taxResources.map(resource => {
    const observation = latestByUrl.get(sourceUrl(resource.url));
    const review = reviewById.get(resource.id);
    const reviewedObservation = review ? evidenceById.get(review.observationId) : undefined;
    const invalidated = !!reviewedObservation && sinceReview.some(o => o.sourceUrl === reviewedObservation.sourceUrl
      && o.id > reviewedObservation.id && (o.outcome !== "ok" || o.contentHash !== reviewedObservation.contentHash
        || o.linksHash !== reviewedObservation.linksHash || o.effectiveUrl !== reviewedObservation.effectiveUrl));
    return { resource, observation, review, reviewedObservation,
      status: reviewStatus(resource, observation, review, reviewedObservation, Date.now(), invalidated) };
  });
}

export async function consultationSources() {
  const state = await monitoringState();
  return eligibleSources(taxResources, new Set(state.filter(s => s.status === "approved").map(s => s.resource.id)));
}

export async function checkSources(force = false) {
  return withMonitorLock(async () => {
    const state = await monitoringState();
    const urls = new Map<string, TaxObservation | undefined>();
    for (const s of state) urls.set(sourceUrl(s.resource.url), s.observation);
    let checked = 0;
    for (const [url, last] of urls) {
      if (!force && last && Date.now() - last.checkedAt.getTime() < CHECK_INTERVAL) continue;
      try {
        const evidence = await fetchSource(url);
        await db.insert(taxObservations).values({ sourceUrl: url, ...evidence, outcome: "ok",
          detail: "Sidik byte dan tautan saja; belum menjadi naskah hukum terverifikasi." });
      } catch {
        // Network bodies/errors may contain untrusted content; retain only a safe reason.
        await db.insert(taxObservations).values({ sourceUrl: url, outcome: "error",
          detail: "Unduhan gagal, diblokir, tidak lengkap, terlalu besar, atau bukan dokumen yang didukung." });
      }
      checked++;
    }
    logger.info({ checked }, "Tax source checks finished; human approval required");
    return checked;
  });
}

export async function recordReview(input: { resourceId: string; observationId: number; digest: string;
  decision: "approve" | "reject"; reviewer: string; note: string }) {
  const result = await withMonitorLock(async () => {
    const state = (await monitoringState()).find(s => s.resource.id === input.resourceId);
    if (!state || !state.observation || state.observation.id !== input.observationId
      || resourceDigest(state.resource) !== input.digest) throw new Error("Antrean berubah; baca ulang antrean sebelum meninjau.");
    if (input.decision === "approve" && (state.observation.outcome !== "ok"
      || Date.now() - state.observation.checkedAt.getTime() > CHECK_INTERVAL))
      throw new Error("Persetujuan memerlukan pemeriksaan sukses dalam 24 jam terakhir.");
    await db.insert(taxReviews).values({ resourceId: input.resourceId, resourceDigest: input.digest,
      resourceSnapshot: state.resource, observationId: input.observationId, decision: input.decision, reviewer: input.reviewer, note: input.note });
    return true;
  });
  if (!result) throw new Error("Pemeriksaan lain sedang berjalan; coba lagi setelah selesai.");
}

export function startTaxSourceMonitor() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await checkSources(); }
    catch { logger.error("Tax source monitor unavailable; consultation eligibility remains fail-closed"); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => void tick(), 15 * 60 * 1000);
  timer.unref();
}
