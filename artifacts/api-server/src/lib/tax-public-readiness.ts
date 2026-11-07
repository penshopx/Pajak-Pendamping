import type { TaxResource, Sp2dkReadiness, PublicSourceReadiness } from "@workspace/api-zod";
import { eligibleSources, reviewStatus } from "./tax-source-policy";

type SourceState = { resource: TaxResource; status: ReturnType<typeof reviewStatus> };

// Explicit allowlist: never spread observations, operator identity, notes or snapshots.
export function publicSp2dkReadiness(state: SourceState[], now = new Date()): Sp2dkReadiness {
  const eligible = new Set(eligibleSources(state.map(s => s.resource),
    new Set(state.filter(s => s.status === "approved").map(s => s.resource.id))).map(s => s.id));
  const sources = state.filter(s => s.resource.id.startsWith("sp2dk-")).map(s => {
    let status: PublicSourceReadiness["status"];
    switch (s.status) {
      case "approved": status = eligible.has(s.resource.id) ? "ready" : "companion_held"; break;
      case "Belum diperiksa otomatis": status = "not_checked"; break;
      case "Sumber gagal diakses": status = "access_failed"; break;
      case "Pemeriksaan sumber kedaluwarsa":
      case "Tinjauan manusia kedaluwarsa": status = "expired"; break;
      case "Menunggu tinjauan cuplikan dan baseline": status = "awaiting_review"; break;
      default: status = "needs_review";
    }
    return { id: s.resource.id, title: s.resource.title, status };
  });
  return { ready: sources.length > 0 && sources.every(s => s.status === "ready"),
    evaluatedAt: now.toISOString(), sources };
}
