#!/usr/bin/env python3
"""Real-browser keyboard and responsive accessibility regression for /belajar.

Runtime prerequisites: Python 3.10+, the Python Playwright package, and its
Chromium browser (``python -m pip install playwright`` then
``python -m playwright install chromium``). This does not add dependencies to
the application.

Run with ``BASE_URL=https://your-app.example python
artifacts/sahabat-pajak/tests/learning_quiz_accessibility.py`` or pass
``--base-url https://your-app.example``. The base URL is the app origin (not
the /belajar route). The test inspects DOM announcement semantics only; it
does not claim audible screen-reader verification and writes no artifacts.
"""

from __future__ import annotations

import argparse
import os

from playwright.sync_api import Page, expect, sync_playwright


def active_testid(page: Page) -> str | None:
    return page.evaluate(
        "() => document.activeElement?.getAttribute('data-testid') ?? null"
    )


def tab_until(page: Page, testid: str, limit: int = 200) -> None:
    for _ in range(limit):
        page.keyboard.press("Tab")
        if active_testid(page) == testid:
            return
    raise AssertionError(f"Tab did not reach {testid!r} within {limit} presses")


def open_billing_quiz_from_keyboard(page: Page) -> None:
    section = page.get_by_test_id("quiz-section-bayar-bukti")
    tab_until(page, "toggle-quiz-bayar-bukti")
    assert active_testid(page) == "toggle-quiz-bayar-bukti"
    page.keyboard.press("Enter")
    assert section.get_attribute("open") is not None
    page.keyboard.press("Space")
    assert section.get_attribute("open") is None
    page.keyboard.press("Space")
    assert section.get_attribute("open") is not None
    page.keyboard.press("Enter")
    assert section.get_attribute("open") is None
    page.keyboard.press("Space")
    assert section.get_attribute("open") is not None


def assert_one_checked(page: Page, expected: str) -> None:
    checked = page.locator(
        '[data-testid="quiz-question-billing"] input[type="radio"]:checked'
    )
    assert checked.count() == 1
    assert checked.first.get_attribute("data-testid") == expected
    assert page.locator(
        '[data-testid="quiz-question-bukti-bayar"] input[type="radio"]:checked'
    ).count() == 0, "Arrow-key selection escaped into the neighboring question"


def submit_with_keyboard(page: Page, question_id: str) -> None:
    button_id = f"button-check-quiz-{question_id}"
    tab_until(page, button_id)
    assert active_testid(page) == button_id
    page.keyboard.press("Enter")


def assert_retry_reset(page: Page) -> None:
    tab_until(page, "button-retry-quiz-billing")
    page.keyboard.press("Enter")
    expect(page.get_by_test_id("input-quiz-billing-lunas")).to_be_focused()
    question = page.get_by_test_id("quiz-question-billing")
    radios = question.locator('input[type="radio"]')
    assert not page.get_by_test_id("quiz-feedback-billing").count()
    assert not page.get_by_test_id("quiz-error-billing").count()
    assert question.locator('input[type="radio"]:checked').count() == 0
    assert all(radios.nth(i).is_enabled() for i in range(radios.count()))
    assert active_testid(page) == "input-quiz-billing-lunas"
    first = page.get_by_test_id("input-quiz-billing-lunas")
    assert first.get_attribute("aria-invalid") in (None, "false")


def assert_feedback(page: Page, outcome: str, reason: str) -> None:
    question = page.get_by_test_id("quiz-question-billing")
    feedback = page.get_by_test_id("quiz-feedback-billing")
    expect(feedback).to_be_visible()
    assert outcome in feedback.inner_text()
    assert reason in feedback.inner_text()
    assert (
        "Kode untuk proses pembayaran tersedia, belum menjadi bukti pembayaran"
        in feedback.inner_text()
    )
    assert (
        "Halaman pembayaran DJP menjelaskan adanya kode billing aktif yang belum dibayar."
        in feedback.inner_text()
    )
    status = question.get_by_role("status")
    assert status.get_attribute("aria-live") == "polite"
    assert status.get_attribute("aria-atomic") == "true"
    assert outcome in status.inner_text()
    assert reason in status.inner_text()
    assert (
        "Kode untuk proses pembayaran tersedia, belum menjadi bukti pembayaran"
        in status.inner_text()
    )
    assert (
        "Halaman pembayaran DJP menjelaskan adanya kode billing aktif yang belum dibayar."
        in status.inner_text()
    )
    assert all(
        question.locator('input[type="radio"]')
        .nth(i)
        .evaluate("(el) => el.matches(':disabled')")
        for i in range(question.locator('input[type="radio"]').count())
    )


def assert_mobile_layout(page: Page, width: int) -> None:
    page.set_viewport_size({"width": width, "height": 900})
    page.get_by_test_id("quiz-question-billing").scroll_into_view_if_needed()
    metrics = page.evaluate(
        """() => {
          const section = document.querySelector('[data-testid="quiz-section-bayar-bukti"]');
          const texts = [...section.querySelectorAll('legend, label span')];
          return {
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            items: texts.map(el => {
              const rect = el.getBoundingClientRect();
              return {
                text: el.innerText,
                left: rect.left,
                right: rect.right,
                clientWidth: el.clientWidth,
                scrollWidth: el.scrollWidth,
                clientHeight: el.clientHeight,
                scrollHeight: el.scrollHeight
              };
            })
          };
        }"""
    )
    assert metrics["viewport"] == width
    assert metrics["documentWidth"] <= width, metrics
    assert metrics["bodyWidth"] <= width, metrics
    assert len(metrics["items"]) == 8, metrics
    for item in metrics["items"]:
        assert item["left"] >= 0 and item["right"] <= width, item
        assert item["scrollWidth"] <= item["clientWidth"], item
        assert item["scrollHeight"] <= item["clientHeight"], item
    longest = next(
        item for item in metrics["items"]
        if item["text"]
        == "Kode untuk proses pembayaran tersedia, belum menjadi bukti pembayaran"
    )
    assert longest["clientHeight"] > 20, longest  # confirms wrapping at mobile width


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("BASE_URL"),
        help="Application origin; may also be supplied through BASE_URL.",
    )
    args = parser.parse_args()
    if not args.base_url:
        parser.error("provide --base-url or set BASE_URL")
    url = args.base_url.rstrip("/") + "/belajar"

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto(url, wait_until="domcontentloaded")
        page.get_by_test_id("quiz-section-bayar-bukti").wait_for()

        # Reach the real summary by keyboard, then exercise native Enter/Space.
        open_billing_quiz_from_keyboard(page)
        page.keyboard.press("Tab")
        assert active_testid(page) == "input-quiz-billing-lunas"
        page.keyboard.press("ArrowRight")
        assert_one_checked(page, "input-quiz-billing-siap")
        page.keyboard.press("ArrowDown")
        assert_one_checked(page, "input-quiz-billing-lapor")
        page.keyboard.press("ArrowUp")
        assert_one_checked(page, "input-quiz-billing-siap")
        page.keyboard.press("ArrowLeft")
        assert_one_checked(page, "input-quiz-billing-lunas")

        # Reload to ensure the blank-submit test starts with no selected answer.
        page.goto(url, wait_until="domcontentloaded")
        open_billing_quiz_from_keyboard(page)
        page.keyboard.press("Tab")
        assert active_testid(page) == "input-quiz-billing-lunas"
        page.keyboard.press("Tab")
        assert active_testid(page) == "button-check-quiz-billing"
        page.keyboard.press("Enter")
        error = page.get_by_test_id("quiz-error-billing")
        first_radio = page.get_by_test_id("input-quiz-billing-lunas")
        expect(error).to_be_visible()
        expect(first_radio).to_be_focused()
        assert error.get_attribute("role") == "alert"
        assert error.inner_text() == "Pilih satu jawaban terlebih dahulu."
        assert active_testid(page) == "input-quiz-billing-lunas"
        assert first_radio.get_attribute("aria-invalid") == "true"
        error_id = first_radio.get_attribute("aria-describedby")
        assert error_id and page.locator(f"#{error_id}").get_attribute("role") == "alert"
        status = page.get_by_test_id("quiz-question-billing").get_by_role("status")
        assert status.get_attribute("aria-live") == "polite"
        assert status.get_attribute("aria-atomic") == "true"
        assert status.inner_text().strip() == ""

        # Wrong answer, keyboard submit, and keyboard retry.
        page.keyboard.press("Space")
        submit_with_keyboard(page, "billing")
        assert_feedback(
            page,
            "Masih ada konsep yang tertukar.",
            "Kode billing dapat berstatus belum dibayar; terbitnya kode bukan bukti pembayaran.",
        )
        assert_retry_reset(page)

        # Correct answer via native arrow navigation, keyboard submit, then retry.
        page.keyboard.press("ArrowRight")
        assert_one_checked(page, "input-quiz-billing-siap")
        submit_with_keyboard(page, "billing")
        assert_feedback(
            page,
            "Tepat untuk skenario ini.",
            "Pembuatan kode dan pelaksanaan pembayaran adalah hal berbeda.",
        )
        assert_retry_reset(page)

        # Check the complete billing question (including the longest label) at
        # both requested mobile widths. No screenshots or output files are saved.
        assert_mobile_layout(page, 320)
        assert_mobile_layout(page, 390)
        browser.close()
    print("PASS: /belajar quiz keyboard, validation, live-region DOM semantics, retry, and 320/390px layout")


if __name__ == "__main__":
    main()
