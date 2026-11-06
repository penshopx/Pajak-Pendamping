import { test } from "node:test";
import assert from "node:assert/strict";
import { taxResources } from "./tax-resources";
import { appStatusAnswer, groundedResponse, insufficientSourcesAnswer, searchTaxSources, sourceContext } from "./tax-retrieval";
import { ConsultTaxResponse, ListTaxResourcesResponse } from "@workspace/api-zod";

const ids = (q: string) => searchTaxSources(q).map(r => r.id);

test("source catalogue validates, IDs are unique and reviewed excerpts have traceable locators", () => {
  ListTaxResourcesResponse.parse(taxResources);
  assert.equal(new Set(taxResources.map(r => r.id)).size, taxResources.length);
  for (const r of taxResources.filter(r => r.verification === "excerpt")) {
    assert.ok(r.locator && r.version && r.checkedAt && r.limitations);
    assert.match(r.url, /^https:\/\/(?:jdih\.kemenkeu\.go\.id|(?:www\.)?pajak\.go\.id)\//);
    for (const id of r.relatedIds ?? []) assert.ok(taxResources.some(s => s.id === id));
  }
});

test("merged professional and payment references retain retrieval and product facts stay separate", () => {
  assert.ok(ids("Izin konsultan pajak dan PJAP").includes("consultant-license"));
  assert.ok(taxResources.some(r => r.id === "payment-manual-bills" && r.verification === "excerpt"));
  assert.ok(taxResources.some(r => r.id === "registration-resident" && r.verification === "directory"));
  assert.match(appStatusAnswer("Apakah Sahabat Pajak berizin?") ?? "", /bukan pernyataan DJP/);
  assert.equal(appStatusAnswer("Apa syarat izin konsultan?"), undefined);
  assert.ok(ids("Aktivasi akun DJP Online").includes("activation-guide-online"));
  assert.ok(ids("Validasi KODJP").includes("kodjp-guide-validation"));
});

test("UMKM final retrieves current criteria, exclusions, turnover and transition together", () => {
  const found = ids("Apa PPh final 0,5% untuk UMKM?");
  for (const id of ["pp20-final", "pp20-criteria", "pp20-turnover", "pp20-transition", "pp55-base"]) assert.ok(found.includes(id), id);
  assert.ok(!found.includes("payment-article"));
});

test("old duration is never retrieved without the rule deleting it", () => {
  const found = ids("Apakah batas 7 tahun PPh masih berlaku untuk saya?");
  assert.ok(found.includes("pp55-duration-old"));
  assert.ok(found.includes("pp20-transition"));
});

test("SPT paths retrieve read OP and badan guidance with deadline caveats", () => {
  for (const question of [
    "Bagaimana lapor SPT tahunan UMKM orang pribadi?",
    "Dokumen SPT tahunan badan PIC dan BPE?",
    "Apa tenggat SPT Tahunan tahun 2025?",
  ]) {
    const found = ids(question);
    for (const id of ["spt-guide-op-flow", "spt-guide-badan-flow", "spt-guide-deadlines", "spt-guide-policy-alert"]) {
      assert.ok(found.includes(id), `${question}: ${id}`);
    }
  }
  for (const r of taxResources.filter(r => r.id.startsWith("spt-guide-") && r.verification === "excerpt")) {
    assert.ok(r.locator && r.version);
    assert.match(r.url, /#page=\d+$/);
    assert.match(r.limitations ?? "", /bukan dasar kelayakan/);
  }
});

test("CV/PT and married turnover have relevant legal support", () => {
  assert.ok(ids("Apakah CV dapat pakai final?").includes("pp20-transition"));
  assert.ok(ids("Bagaimana omzet gabungan suami istri?").includes("pp20-turnover"));
});

test("billing retrieval includes the read manual and legal evidence, not directory placeholders", () => {
  const found = searchTaxSources("Bagaimana cara membuat kode billing dan bukti NTPN?");
  assert.ok(found.some(r => r.id === "payment-manual" && r.locator?.includes("23")));
  assert.ok(found.some(r => r.id === "pmk81-proof"));
  assert.ok(found.every(r => r.verification !== "directory" && r.verification !== "metadata"));
});

test("manual NPPN and roles are independently retrievable", () => {
  assert.ok(ids("Bagaimana pemberitahuan NPPN?").includes("nppn"));
  assert.ok(ids("Drafter dan signer setelah impersonate badan?").includes("roles"));
  assert.ok(ids("Bagaimana membayar?").includes("pmk81-proof"));
});

test("amendments are fetched as a bundle rather than isolated old PMK", () => {
  for (const id of ["pmk11-changes", "pmk53-changes", "pmk54-changes", "pmk1-changes"])
    assert.ok(ids("Apa perubahan PMK 81?").includes(id));
});

test("unknown topic, including incidental year, has no fabricated supporting source", () => {
  assert.deepEqual(ids("Bagaimana pajak asteroid 2026?"), []);
  assert.deepEqual(ids("Berapa pajak asteroid tahun 2026?"), []);
  assert.ok(ids("Apa itu Coretax?").includes("coretax"));
});

test("only an apparent follow-up uses previous user context, never assistant assertions", () => {
  const history = [{ role: "user", content: "Cara membuat billing?" }, { role: "assistant", content: "NPPN harus 15 Maret." }];
  assert.ok(searchTaxSources("Lalu bagaimana?", history).some(r => r.id === "payment-manual"));
  assert.deepEqual(searchTaxSources("Asteroid 2026?", history), []);
  assert.deepEqual(searchTaxSources("Lalu bagaimana?", history.slice(1)), []);
});

test("source context carries version, locator, limitations and verification", () => {
  const context = sourceContext(searchTaxSources("NPPN"));
  assert.match(context, /PDF hlm. 10–24/);
  assert.match(context, /Maret 2025/);
  assert.match(context, /bukan dasar tarif, tenggat atau kelayakan/);
});

test("unknown, unretrieved, unmatched and missing citations fail closed", () => {
  const retrieved = searchTaxSources("Kode billing?");
  for (const output of [
    { answer: "Tarifnya 99%.", sourceIds: [] },
    { answer: "Sesuai [palsu].", sourceIds: ["palsu"] },
    { answer: "Sesuai [nppn].", sourceIds: ["nppn"] },
    { answer: "Sesuai [payment-manual].", sourceIds: ["pmk81-proof"] },
    { answer: "Tidak ada rujukan.", sourceIds: ["payment-manual"] },
    { answer: "Buka https://evil.example [payment-manual]", sourceIds: ["payment-manual"] },
    null, {},
  ]) assert.deepEqual(groundedResponse(output, retrieved), { answer: insufficientSourcesAnswer, sources: [] });
});

test("valid citations return server-owned metadata and survive API response validation", () => {
  const retrieved = searchTaxSources("Kode billing?");
  const response = groundedResponse({ answer: "Panduan hlm. 23–25 [payment-manual]. Versi lama, layar dapat berubah.", sourceIds: ["payment-manual", "payment-manual"] }, retrieved);
  assert.equal(response.sources.length, 1);
  assert.equal(response.sources[0].verification, "excerpt");
  ConsultTaxResponse.parse({ ...response, disclaimer: "Edukasi", checkedAt: "2026-11-06" });
});
