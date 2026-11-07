import { test } from "node:test";
import assert from "node:assert/strict";
import { GetSp2dkReadinessResponse } from "@workspace/api-zod";
import { taxResources } from "./tax-resources";
import { publicSp2dkReadiness } from "./tax-public-readiness";
import { reviewStatus } from "./tax-source-policy";

const state = () => taxResources.map(resource => ({ resource, status: "approved" as ReturnType<typeof reviewStatus>,
  review: { reviewer: "PRIVATE_OPERATOR", note: "PRIVATE_NOTE" }, observation: { detail: "PRIVATE_DETAIL" } }));

test("ready snapshot uses eligibility and only explicitly public fields", () => {
  const result = publicSp2dkReadiness(state(), new Date("2026-11-07T12:00:00Z"));
  assert.equal(result.ready, true);
  assert.equal(result.sources.length, 4);
  assert.ok(result.sources.every(s => s.status === "ready"));
  assert.equal(result.evaluatedAt, "2026-11-07T12:00:00.000Z");
  assert.deepEqual(Object.keys(result).sort(), ["evaluatedAt", "ready", "sources"]);
  for (const s of result.sources) assert.deepEqual(Object.keys(s).sort(), ["id", "status", "title"]);
  assert.ok(!JSON.stringify(result).includes("PRIVATE_"));
  assert.deepEqual(GetSp2dkReadinessResponse.parse(result), result);
});

test("public statuses distinguish missing review, access failure, expiry and renewed review", () => {
  const cases = [
    ["Belum diperiksa otomatis", "not_checked"],
    ["Menunggu tinjauan cuplikan dan baseline", "awaiting_review"],
    ["Sumber gagal diakses", "access_failed"],
    ["Pemeriksaan sumber kedaluwarsa", "expired"],
    ["Tinjauan manusia kedaluwarsa", "expired"],
    ["Ditolak peninjau", "needs_review"],
    ["Ada perubahan atau gangguan sejak persetujuan; tinjau ulang", "needs_review"],
    ["Naskah atau tautan resmi berubah", "needs_review"],
  ] as const;
  for (const [internal, expected] of cases) {
    const rows = state();
    const held = rows.find(s => s.resource.id.startsWith("sp2dk-"))!;
    held.status = internal;
    const result = publicSp2dkReadiness(rows);
    assert.equal(result.ready, false);
    assert.equal(result.sources.find(s => s.id === held.resource.id)?.status, expected);
    assert.ok(result.sources.some(s => s.status === "companion_held"));
  }
});

test("empty snapshot never claims ready and a fresh evaluation reflects changed eligibility", () => {
  assert.equal(publicSp2dkReadiness([]).ready, false);
  const rows = state();
  assert.equal(publicSp2dkReadiness(rows).ready, true);
  rows.find(s => s.resource.id.startsWith("sp2dk-"))!.status = "Sumber gagal diakses";
  assert.equal(publicSp2dkReadiness(rows).ready, false);
});
