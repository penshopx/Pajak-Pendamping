import { test } from "node:test";
import assert from "node:assert/strict";
import type { TaxObservation, TaxReview } from "@workspace/db";
import { taxResources } from "./tax-resources";
import { eligibleSources, hash, inspectDocument, MAX_CHECK_AGE, MAX_REVIEW_AGE,
  officialLinks, officialUrl, resourceDigest, reviewStatus, sourceUrl } from "./tax-source-policy";
import { fetchSource } from "./tax-source-fetch";
import { searchTaxSources } from "./tax-retrieval";

const resource = taxResources.find(r => r.id === "pp20-final")!;
const now = Date.now();
const observation: TaxObservation = {
  id: 1, sourceUrl: sourceUrl(resource.url), checkedAt: new Date(now),
  effectiveUrl: sourceUrl(resource.url), contentHash: hash("original"), linksHash: hash("[]"),
  outcome: "ok", detail: "test",
};
const review: TaxReview = {
  id: 1, resourceId: resource.id, resourceDigest: resourceDigest(resource), resourceSnapshot: resource,
  observationId: 1, decision: "approve", reviewedAt: new Date(now), reviewer: "Test operator", note: "Test only",
};
const status = (o = observation, r = review, baseline = observation, invalidated = false) =>
  reviewStatus(resource, o, r, baseline, now, invalidated);

test("baseline is held until human review, and identical later checks do not extend review date", () => {
  assert.notEqual(reviewStatus(resource, observation, undefined, undefined, now), "approved");
  assert.equal(status(), "approved");
  assert.equal(status({ ...observation, id: 2 }), "approved");
  assert.equal(review.reviewedAt.getTime(), now);
});

test("changed bytes, official links and redirect target each hold the source", () => {
  for (const delta of [{ contentHash: hash("new") }, { linksHash: hash("new link") },
    { effectiveUrl: "https://jdih.kemenkeu.go.id/replaced.pdf" }]) {
    assert.notEqual(status({ ...observation, ...delta }), "approved");
  }
  assert.notEqual(status(observation, review, observation, true), "approved", "reversion must not clear review queue");
});

test("failures, expired checks, expired reviews, rejection and edited excerpts fail closed", () => {
  assert.notEqual(status({ ...observation, outcome: "error" }), "approved");
  assert.notEqual(status({ ...observation, checkedAt: new Date(now - MAX_CHECK_AGE - 1) }), "approved");
  assert.notEqual(status(observation, { ...review, reviewedAt: new Date(now - MAX_REVIEW_AGE - 1) }), "approved");
  assert.notEqual(status(observation, { ...review, decision: "reject" }), "approved");
  assert.notEqual(reviewStatus({ ...resource, excerpt: "changed" }, observation, review, observation, now), "approved");
  assert.notEqual(reviewStatus(resource, observation, review, undefined, now), "approved");
});

test("source identity ignores fragment but restricts hosts, credentials, scheme and ports", () => {
  assert.equal(sourceUrl(resource.url), resource.url.split("#")[0]);
  for (const url of ["http://pajak.go.id/x", "https://pajak.go.id.attacker.test/x",
    "https://user:pass@pajak.go.id/x", "https://127.0.0.1/x", "https://pajak.go.id:8080/x"])
    assert.throws(() => officialUrl(url));
});

test("HTML official links are normalized and link removal changes fingerprint", () => {
  const html = '<html><title>Dokumen</title>' + "A".repeat(250) + '<a href="/dok/new?a=1&amp;b=2">X</a><a href="https://evil.test">X</a></html>';
  assert.deepEqual(officialLinks(html, "https://jdih.kemenkeu.go.id/dok"), ["https://jdih.kemenkeu.go.id/dok/new?a=1&b=2"]);
  const a = inspectDocument(Buffer.from(html), "https://jdih.kemenkeu.go.id/dok", "text/html");
  const b = inspectDocument(Buffer.from(html.replace("/dok/new", "/dok/changed")), "https://jdih.kemenkeu.go.id/dok", "text/html");
  assert.notEqual(a.contentHash, b.contentHash);
  assert.notEqual(a.linksHash, b.linksHash);
});

test("a PDF URL returning maintenance HTML, truncated PDF and unsupported content are rejected", () => {
  assert.throws(() => inspectDocument(Buffer.from("<html>Under Maintenance</html>"), resource.url, "text/html"));
  assert.throws(() => inspectDocument(Buffer.from("%PDF-1.7 truncated"), resource.url, "application/pdf"));
  assert.throws(() => inspectDocument(Buffer.from("json"), "https://pajak.go.id/doc", "application/json"));
  assert.throws(() => inspectDocument(Buffer.from("<title>Access denied</title>" + "x".repeat(300)), "https://pajak.go.id/doc", "text/html"));
  assert.ok(inspectDocument(Buffer.from("%PDF-1.7\nfixture\n%%EOF"), resource.url, "application/pdf").contentHash);
});

test("dependency withholding cascades through legal bundles but preserves unrelated resources", () => {
  const approved = new Set(taxResources.map(r => r.id));
  approved.delete("pp20-transition");
  const eligible = eligibleSources(taxResources, approved);
  assert.ok(!eligible.some(r => r.id === "pp20-final" || r.id === "pp55-duration-old" || r.id === "pp55-base"));
  assert.ok(eligible.some(r => r.id === "nppn"));
  assert.ok(!searchTaxSources("Apa PPh final UMKM?", [], eligible).some(r => r.id === "pp20-final"));
  assert.deepEqual(searchTaxSources("Apa itu Coretax?", [], []), []);
  assert.deepEqual(eligibleSources(taxResources, new Set()), []);
});

const mockFetch = (run: (url: string) => Response | Promise<Response>) =>
  ((input: string | URL | Request) => run(String(input))) as typeof fetch;

test("fetch follows official redirects and fingerprints the effective URL", async () => {
  const calls: string[] = [];
  const result = await fetchSource("https://pajak.go.id/old", mockFetch(url => {
    calls.push(url);
    return calls.length === 1 ? new Response(null, { status: 302, headers: { location: "/new.pdf" } })
      : new Response("%PDF-1.7\nfixture\n%%EOF", { headers: { "content-type": "application/pdf" } });
  }));
  assert.equal(result.effectiveUrl, "https://pajak.go.id/new.pdf");
  assert.equal(calls.length, 2);
});

test("redirect outside official hosts is blocked before sending request", async () => {
  let calls = 0;
  await assert.rejects(fetchSource("https://pajak.go.id/old", mockFetch(() => {
    calls++;
    return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/internal" } });
  })));
  assert.equal(calls, 1);
});

test("redirect loop, HTTP failures, partial content and oversized responses are not baseline evidence", async () => {
  await assert.rejects(fetchSource("https://pajak.go.id/old", mockFetch(() =>
    new Response(null, { status: 302, headers: { location: "/loop" } }))));
  for (const response of [new Response(null, { status: 404 }), new Response("%PDF-", { status: 206 }),
    new Response("large", { headers: { "content-length": String(31 * 1024 * 1024) } })])
    await assert.rejects(fetchSource("https://pajak.go.id/file.pdf", mockFetch(() => response)));
});
