import { inspectDocument, officialUrl } from "./tax-source-policy";

const MAX_BYTES = 30 * 1024 * 1024;

export async function fetchSource(input: string, fetcher: typeof fetch = fetch) {
  let url = officialUrl(input);
  const signal = AbortSignal.timeout(25_000);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetcher(url, {
      redirect: "manual", signal,
      headers: { "User-Agent": "SahabatPajak-SourceMonitor/1.0", Accept: "text/html,application/pdf" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect tanpa tujuan");
      url = officialUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok || response.status === 206) {
      await response.body?.cancel();
      throw new Error(`HTTP ${response.status}`);
    }
    if (Number(response.headers.get("content-length")) > MAX_BYTES) {
      await response.body?.cancel();
      throw new Error("Dokumen melebihi batas ukuran");
    }
    if (!response.body) throw new Error("Respons kosong");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error("Dokumen melebihi batas ukuran");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return { effectiveUrl: url, ...inspectDocument(Buffer.concat(chunks), url, response.headers.get("content-type") ?? "") };
  }
  throw new Error("Terlalu banyak redirect");
}
