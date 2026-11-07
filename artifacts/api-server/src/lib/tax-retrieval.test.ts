import { test } from "node:test";
import assert from "node:assert/strict";
import { taxResources } from "./tax-resources";
import { appStatusAnswer, groundedResponse, insufficientSourcesAnswer, searchTaxSources, sourceContext } from "./tax-retrieval";
import { ConsultTaxResponse, ListTaxResourcesResponse } from "@workspace/api-zod";
import { taxConsultationSystemPrompt } from "./tax-consultation-prompt";

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

test("SP2DK retrieves operative text as a complete bundle even among general UMKM and BPE matches", () => {
  for (const question of [
    "Apa itu SP2DK?",
    "SP2DK UMKM dokumen SPT BPE omzet dan pembayaran?",
    "Surat permintaan penjelasan atas data dan keterangan",
    "WP belum terdaftar akun belum aktif SP2DK baru dibaca hari ini, tenggatnya?",
  ]) {
    const found = searchTaxSources(question);
    for (const id of ["sp2dk-registered", "sp2dk-unregistered", "sp2dk-extension", "sp2dk-followup"]) {
      const source = found.find(r => r.id === id);
      assert.ok(source, `${question}: ${id}`);
      assert.equal(source.sourceType, "Naskah hukum");
      assert.equal(source.checkedAt, "2026-11-07");
      assert.match(source.locator!, /PMK 111\/2025 Pasal/);
      assert.match(source.version!, /1 Januari 2026/);
    }
    assert.ok(!found.some(r => r.sourceType === "Artikel opini"));
  }
  const prompt = taxConsultationSystemPrompt(searchTaxSources("SP2DK"));
  for (const phrase of ["status/tanggal aktivasi akun", "semua saluran/tanggal", "DITERIMA KPP", "tidak menerima kuasa atau mengirim tanggapan resmi", "Jangan menghitung tanggal jatuh tempo"]) {
    assert.ok(prompt.includes(phrase), phrase);
  }
  const history = [{ role: "user", content: "Apa itu SP2DK?" }];
  assert.ok(searchTaxSources("Lalu kapan waktunya?", history).some(r => r.id === "sp2dk-unregistered"));
  assert.deepEqual(searchTaxSources("Asteroid?", history), []);
});

test("SP2DK instructions reject the uploaded draft's unsupported timing assumptions", () => {
  const sources = searchTaxSources("SP2DK belum terdaftar tidak dapat memperpanjang, 14 hari kerja sejak diterima dan 7 hari tiap permohonan?");
  for (const id of ["sp2dk-registered", "sp2dk-unregistered", "sp2dk-extension"]) {
    assert.ok(sources.some(s => s.id === id));
  }
  const prompt = taxConsultationSystemPrompt(sources);
  for (const instruction of [
    "WP belum terdaftar juga memiliki mekanisme",
    "bukan otomatis hari kerja",
    "jangan menggunakan rumus addBusinessDays",
    "jangan mengakumulasikan 7 hari berdasarkan jumlah permohonan",
    "bukan pemicu waktu yang boleh ditambahkan",
    "jangan mengadopsi kode, placeholder, atau tanggal lastVerified",
  ]) assert.ok(prompt.toLowerCase().includes(instruction.toLowerCase()), instruction);
  const extension = sources.find(s => s.id === "sp2dk-extension")!;
  assert.ok(extension.excerpt.includes("Kedua cabang WP"));
  assert.ok(extension.excerpt.includes("harus diterima KPP sebelum"));
  assert.ok(extension.excerpt.includes("tanggapan boleh lebih dari sekali"));
  const unregistered = sources.find(s => s.id === "sp2dk-unregistered")!;
  assert.ok(unregistered.excerpt.includes("Aktivasi bukan alasan mengabaikan pemicu pos/langsung"));
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

test("mixed final/NPPN question keeps the manual without bypassing the source allowlist", () => {
  const question = "OP toko 2026 omzet Rp300 juta, bagian Rp500 juta PPh final, langkah NPPN serta tenggat dan denda.";
  assert.ok(ids(question).includes("nppn"));
  assert.ok(!searchTaxSources(question, [], taxResources.filter(r => r.id !== "nppn")).some(r => r.id === "nppn"));
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
