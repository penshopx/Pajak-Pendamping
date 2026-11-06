import { pool } from "@workspace/db";
import { checkSources, consultationSources, monitoringState, recordReview } from "./lib/tax-source-monitor";
import { resourceDigest } from "./lib/tax-source-policy";

async function main() {
  const [command, resourceId, observation, digest, decision, reviewer, note, ...extra] = process.argv.slice(2);
  if (command === "check") {
    const checked = await checkSources(true);
    if (checked === undefined) throw new Error("Monitor sedang berjalan; coba lagi nanti.");
    process.stdout.write(`Sumber diperiksa: ${checked}\n`);
  } else if (command === "queue") {
    const state = await monitoringState();
    const eligible = new Set((await consultationSources()).map(r => r.id));
    process.stdout.write(JSON.stringify(state.map(s => ({
      id: s.resource.id, title: s.resource.title, status: s.status,
      consultationEligible: eligible.has(s.resource.id),
      resourceDigest: resourceDigest(s.resource), curatedExcerpt: s.resource.excerpt,
      version: s.resource.version, locator: s.resource.locator, limitations: s.resource.limitations,
      relatedIds: s.resource.relatedIds, curatedReviewedAt: s.resource.checkedAt,
      observation: s.observation ?? null, review: s.review ?? null, reviewedObservation: s.reviewedObservation ?? null,
      sourceUrl: s.resource.url,
    })), null, 2) + "\n");
  } else if (command === "review" && resourceId && /^\d+$/.test(observation ?? "") && /^[a-f0-9]{64}$/.test(digest ?? "")
    && (decision === "approve" || decision === "reject") && reviewer?.trim() && reviewer.length <= 100
    && note?.trim() && note.length <= 4000 && !extra.length) {
    await recordReview({ resourceId, observationId: Number(observation), digest,
      decision, reviewer: reviewer.trim(), note: note.trim() });
    process.stdout.write("Keputusan ditambahkan ke riwayat; tidak mengubah naskah atau cuplikan.\n");
  } else throw new Error("Gunakan: queue | check | review <id> <observationId> <resourceDigest> approve|reject <peninjau> <catatan>");
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; })
  .finally(() => pool.end());
