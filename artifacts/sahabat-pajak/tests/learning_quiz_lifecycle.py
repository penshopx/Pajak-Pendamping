#!/usr/bin/env python3
"""Regression for real /belajar navigation, reload, and answer privacy.

Run from the workspace root:
  uv sync
  BASE_URL=https://your-preview.example uv run python \
    artifacts/sahabat-pajak/tests/learning_quiz_lifecycle.py

Install Chromium with `uv run playwright install chromium`, or supply an
existing browser via CHROMIUM_EXECUTABLE_PATH. BASE_URL may include an artifact
base path. Uses an isolated browser context, never an existing user's storage.
No API mutations, production data, analytics, or application changes are added.
"""

from __future__ import annotations

import argparse
import os
from urllib.parse import urlsplit

from playwright.sync_api import Page, expect, sync_playwright


STORE_KEY = "sahabat-pajak:v1"
SEED = {
    "profile": {"businessName": "", "businessType": "orang-pribadi"},
    "obligations": [], "payments": [], "chat": [], "transactions": [],
    "tradeBills": [],
    "learningCompleted": ["catatan-usaha", "persiapan-spt"],
    "sptProgress": {
        "op:2025": {"documents": True, "access": True, "bpe": False},
        "badan:2024": {"period": True},
    },
}

# Kept in Python memory through full document reloads. These observers do not
# persist anything themselves and forward the original browser API unchanged.
STORAGE_AUDIT = """
(() => {
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function(...args) {
      window.auditStorage({
        area: this === localStorage ? 'local' : 'session', method, args
      });
      return original.apply(this, args);
    };
  }
})();
"""


def storage_snapshot(page: Page) -> dict:
    return page.evaluate("""async () => ({
      local: {...localStorage},
      session: {...sessionStorage},
      databases: (await indexedDB.databases()).map(db => db.name).sort(),
      caches: await caches.keys()
    })""")


def assert_clean_quiz(page: Page) -> None:
    expect(page.get_by_test_id("status-quiz-review")).to_contain_text(
        "Belum ada jawaban yang diperiksa."
    )
    expect(page.locator('[data-testid^="quiz-review-"]')).to_have_count(0)
    # Count DOM elements rather than visibility: collapsed details can conceal
    # stale choices and feedback, but must not conceal a failing assertion.
    expect(page.locator('input[type="radio"]:checked')).to_have_count(0)
    expect(page.locator('[data-testid^="quiz-feedback-"]')).to_have_count(0)
    expect(page.locator('[data-testid^="button-retry-quiz-"]')).to_have_count(0)
    for radio in page.locator('input[type="radio"]').all():
        expect(radio).to_be_enabled()
    expect(page.get_by_test_id("text-learning-progress")).to_have_text("2/6")
    for step in SEED["learningCompleted"]:
        expect(page.get_by_test_id(f"button-toggle-step-{step}")).to_have_attribute(
            "aria-pressed", "true"
        )
    expect(page.get_by_test_id("button-toggle-step-bayar-bukti")).to_have_attribute(
        "aria-pressed", "false"
    )


def answer_several(page: Page) -> None:
    for step in ("catatan-usaha", "bayar-bukti", "persiapan-spt"):
        page.get_by_test_id(f"toggle-quiz-{step}").click()
    # Wrong + correct + selected-but-unchecked answers in separate stages.
    page.get_by_test_id("input-quiz-modal-penjualan").check()
    page.get_by_test_id("button-check-quiz-modal").click()
    expect(page.get_by_test_id("quiz-feedback-modal")).to_contain_text(
        "Masih ada konsep yang tertukar."
    )
    page.get_by_test_id("input-quiz-billing-siap").check()
    page.get_by_test_id("button-check-quiz-billing").click()
    expect(page.get_by_test_id("quiz-feedback-billing")).to_contain_text(
        "Tepat untuk skenario ini."
    )
    page.get_by_test_id("input-quiz-bpe-billing").check()
    page.get_by_test_id("button-check-quiz-bpe").click()
    page.get_by_test_id("input-quiz-tautkan-piutang-baru").check()
    expect(page.locator('input[type="radio"]:checked')).to_have_count(4)
    expect(page.get_by_test_id("quiz-review-modal")).to_be_visible()
    expect(page.get_by_test_id("quiz-review-bpe")).to_be_visible()
    expect(page.get_by_test_id("quiz-review-billing")).to_have_count(0)
    expect(page.get_by_test_id("status-quiz-review")).to_contain_text(
        "Masih ada konsep yang tertukar."
    )


def run(base_url: str, executable: str | None) -> None:
    writes: list[dict] = []
    outbound: list[dict] = []
    sockets: list[str] = []
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, **({"executable_path": executable} if executable else {})
        )
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        context.expose_binding("auditStorage", lambda _, event: writes.append(event))
        context.add_init_script(STORAGE_AUDIT)
        # Observe all frames and all destinations, not only known analytics URLs.
        context.on("request", lambda request: outbound.append({
            "url": request.url, "method": request.method,
            "type": request.resource_type, "body": request.post_data,
        }))
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("websocket", lambda socket: socket.on(
            "framesent", lambda payload: sockets.append(str(payload))
        ))
        url = base_url.rstrip("/") + "/belajar"
        page.goto(url, wait_until="networkidle")
        # Seed only once, before the measured lifecycle. Never seed in an init
        # script: that would mask an accidental overwrite on every reload.
        page.evaluate("([key, value]) => localStorage.setItem(key, JSON.stringify(value))",
                      [STORE_KEY, SEED])
        page.reload(wait_until="networkidle")
        assert_clean_quiz(page)
        baseline = storage_snapshot(page)
        cookies = context.cookies()
        # Reload legitimately re-requests the page's existing Google fonts.
        # Permit only exact font URLs already seen before any quiz interaction.
        font_requests = {
            (req["url"], req["type"]) for req in outbound
            if (urlsplit(req["url"]).netloc == "fonts.googleapis.com"
                and req["type"] == "stylesheet")
            or (urlsplit(req["url"]).netloc == "fonts.gstatic.com"
                and req["type"] == "font")
        }
        writes.clear()
        outbound.clear()
        sockets.clear()

        def assert_private() -> None:
            assert storage_snapshot(page) == baseline, "Browser storage changed"
            assert context.cookies() == cookies, "Cookies changed"
            assert not writes, f"Unexpected storage operations (even transient): {writes}"
            # This local quiz has no network contract. Forbid all POSTs/beacons
            # and all unrecognized fetch/XHR, so renamed/encoded answer fields
            # cannot bypass a keyword-only analytics assertion.
            parsed_base = urlsplit(base_url)
            meta_url = base_url.rstrip("/") + "/api/meta"
            unexpected = [
                req for req in outbound
                if req["method"] != "GET"
                or req["body"] is not None
                or req["type"] == "ping"
                or (req["type"] in ("fetch", "xhr")
                    and req["url"] != meta_url)
                or (urlsplit(req["url"]).netloc != parsed_base.netloc
                    and (req["url"], req["type"]) not in font_requests)
                or (req["type"] not in ("fetch", "xhr", "document")
                    and (req["url"], req["type"]) not in font_requests
                    and req["url"] != base_url.rstrip("/") + "/favicon.svg"
                    and not urlsplit(req["url"]).path.startswith((
                        parsed_base.path.rstrip("/") + "/src/",
                        parsed_base.path.rstrip("/") + "/@",
                        parsed_base.path.rstrip("/") + "/node_modules/",
                        parsed_base.path.rstrip("/") + "/assets/",
                    )))
            ]
            assert not unexpected, f"Unexpected outbound requests: {unexpected}"
            assert all(payload == '{"type":"ping"}' for payload in sockets), sockets
            assert not errors, f"Browser errors: {errors}"

        answer_several(page)
        assert_private()
        # Real Wouter navigation, not goto(): exercises component unmount while
        # StoreProvider survives, then remounts the page through the sidebar.
        page.get_by_test_id("link-learning-glossary").click()
        expect(page.get_by_test_id("section-quiz-review")).to_have_count(0)
        assert_private()
        page.get_by_test_id("nav-belajar").click()
        assert_clean_quiz(page)
        assert_private()
        # Test browser history separately from sidebar navigation.
        page.go_back(wait_until="networkidle")
        expect(page.get_by_test_id("section-quiz-review")).to_have_count(0)
        page.go_forward(wait_until="networkidle")
        assert_clean_quiz(page)
        assert_private()

        # Reload with live answers, not an already-empty page.
        answer_several(page)
        assert_private()
        page.reload(wait_until="networkidle")
        assert_clean_quiz(page)
        assert_private()
        stored = page.evaluate("(key) => JSON.parse(localStorage.getItem(key))", STORE_KEY)
        assert stored == SEED, "Learning or SPT progress was changed"
        context.close()
        browser.close()
    print("PASS: SPA navigation, history, reload, storage/network privacy, learning + SPT isolation")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("BASE_URL"))
    parser.add_argument("--executable-path", default=os.environ.get("CHROMIUM_EXECUTABLE_PATH"))
    args = parser.parse_args()
    if not args.base_url:
        parser.error("provide --base-url or set BASE_URL")
    run(args.base_url, args.executable_path)
