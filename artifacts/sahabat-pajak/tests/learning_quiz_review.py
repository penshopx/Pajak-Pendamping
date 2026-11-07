#!/usr/bin/env python3
"""Click integration regression for LearningQuizReview + LearningQuiz on /belajar.

Run from the workspace root with the preview running:
  uv sync
  uv run playwright install chromium
  BASE_URL=https://your-preview.example uv run python \
    artifacts/sahabat-pajak/tests/learning_quiz_review.py

Alternatively pass --base-url and --executable-path (or set
CHROMIUM_EXECUTABLE_PATH) to use an existing Chromium installation. BASE_URL
may include an artifact base path. Uses a fresh context without seeding storage
or mocking components; answers are selected and submitted through the real UI.
Keyboard navigation and persistence are covered by the other quiz suites.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from urllib.parse import urlsplit

from playwright.sync_api import Page, expect, sync_playwright


@dataclass(frozen=True)
class Question:
    id: str
    step: str
    wrong: str
    correct: str
    concept: str
    guide_href: str
    guide_label: str


# Independent expectations: don't derive targets/guides from rendered hrefs,
# since a miswired link must fail even when it navigates successfully.
QUESTIONS = (
    Question("modal", "catatan-usaha", "penjualan", "modal",
             "Setoran modal dan pendapatan penjualan",
             "/laba-rugi", "Baca batas rekap laba rugi"),
    Question("tautkan-piutang", "catatan-usaha", "baru", "tautkan",
             "Penautan pembayaran piutang tanpa kas masuk ganda",
             "/piutang-utang", "Buka panduan piutang dan utang"),
    Question("tautkan-utang", "catatan-usaha", "baru", "tautkan",
             "Penautan pembayaran utang tanpa kas keluar ganda",
             "/piutang-utang", "Buka panduan piutang dan utang"),
    Question("billing", "bayar-bukti", "lunas", "siap",
             "Kode billing berbeda dari bukti pembayaran dan pelaporan",
             "/pembayaran", "Baca panduan pembayaran"),
    Question("bukti-bayar", "bayar-bukti", "billing", "bpn",
             "BPN dan NTPN sebagai bukti pembayaran, bukan kode billing",
             "/pembayaran", "Baca panduan bukti pembayaran"),
    Question("bpe", "persiapan-spt", "billing", "lapor",
             "BPE sebagai bukti penerimaan pelaporan SPT",
             "/pustaka?guide=spt", "Baca panduan pelaporan SPT"),
)
STEPS = tuple(dict.fromkeys(question.step for question in QUESTIONS))
WRONG = "Masih ada konsep yang tertukar."
CORRECT = "Tepat untuk skenario ini."


def close_panels(page: Page) -> None:
    for step in STEPS:
        panel = page.get_by_test_id(f"quiz-section-{step}")
        if panel.get_attribute("open") is not None:
            page.get_by_test_id(f"toggle-quiz-{step}").click()
        expect(panel).not_to_have_attribute("open", "")
    for question in QUESTIONS:
        expect(page.get_by_test_id(f"quiz-question-{question.id}")).to_be_hidden()


def assert_guides(page: Page, question: Question, base_url: str) -> None:
    expected_href = base_url.rstrip("/") + question.guide_href
    for prefix in ("link-review-guide", "link-quiz-guide"):
        link = page.get_by_test_id(f"{prefix}-{question.id}")
        expect(link).to_have_text(question.guide_label)
        assert link.evaluate("(link) => link.href") == expected_href, (
            f"{prefix}-{question.id} must lead to {expected_href}"
        )


def assert_review(page: Page, ids: list[str]) -> None:
    entries = page.locator('[data-testid^="quiz-review-"]')
    expect(entries).to_have_count(len(ids))
    assert entries.evaluate_all(
        "(nodes) => nodes.map(node => node.dataset.testid)"
    ) == [f"quiz-review-{id}" for id in ids], "Wrong summary membership or order"
    for question in QUESTIONS:
        if question.id in ids:
            entry = page.get_by_test_id(f"quiz-review-{question.id}")
            expect(entry.get_by_role("heading")).to_have_text(question.concept)
            expect(entry.get_by_role("link", name="Kembali ke soal")).to_have_attribute(
                "href", f"#soal-{question.id}"
            )
    expect(page.get_by_test_id("status-quiz-review")).to_contain_text(WRONG)


def return_to_question(page: Page, question: Question) -> None:
    # Closing all panels ensures the link, not previous interactions, opens it.
    close_panels(page)
    page.get_by_test_id(f"link-review-question-{question.id}").click()
    for step in STEPS:
        panel = page.get_by_test_id(f"quiz-section-{step}")
        assert (panel.get_attribute("open") is not None) == (step == question.step), (
            f"Returning to {question.id} opened the wrong panel: {step}"
        )
    target = page.get_by_test_id(f"quiz-question-{question.id}")
    expect(target).to_be_visible()
    expect(target).to_be_in_viewport()
    expect(target.locator("legend")).to_be_visible()
    expect(target.locator('input[type="radio"]:checked')).to_have_count(1)
    assert urlsplit(page.url).fragment == f"soal-{question.id}"
    assert target.get_attribute("id") == f"soal-{question.id}"


def other_question_snapshot(page: Page, excluded: str) -> dict:
    """Compare both rendered summary entries and retained local question state."""
    return {
        question.id: {
            "entry": page.get_by_test_id(f"quiz-review-{question.id}").inner_html(),
            "feedback": page.get_by_test_id(f"quiz-feedback-{question.id}").inner_html(),
            "checked": page.get_by_test_id(f"quiz-question-{question.id}")
            .locator('input:checked').get_attribute("data-testid"),
            "disabled": page.get_by_test_id(f"input-quiz-{question.id}-{question.wrong}")
            .is_disabled(),
        }
        for question in QUESTIONS if question.id != excluded
    }


def run(base_url: str, executable: str | None) -> None:
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, **({"executable_path": executable} if executable else {})
        )
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(base_url.rstrip("/") + "/belajar", wait_until="networkidle")
        expect(page.get_by_test_id("status-quiz-review")).to_contain_text(
            "Belum ada jawaban yang diperiksa."
        )
        expect(page.locator('[data-testid^="quiz-review-"]')).to_have_count(0)

        for step in STEPS:
            page.get_by_test_id(f"toggle-quiz-{step}").click()
        ids: list[str] = []
        for question in QUESTIONS:
            page.get_by_test_id(f"input-quiz-{question.id}-{question.wrong}").check()
            page.get_by_test_id(f"button-check-quiz-{question.id}").click()
            expect(page.get_by_test_id(f"quiz-feedback-{question.id}")).to_contain_text(WRONG)
            ids.append(question.id)
            assert_review(page, ids)
            assert_guides(page, question, base_url)

        for question in QUESTIONS:
            # Repeat the same hash after closing again: a second click must
            # reopen and reveal the target even if the URL hash hasn't changed.
            for _ in range(2):
                return_to_question(page, question)
                expect(page.get_by_test_id(f"quiz-feedback-{question.id}")).to_contain_text(WRONG)
                assert_guides(page, question, base_url)
                assert_review(page, ids)

        repeated = next(question for question in QUESTIONS if question.id == "billing")
        return_to_question(page, repeated)
        baseline = other_question_snapshot(page, repeated.id)
        remaining = [id for id in ids if id != repeated.id]

        def assert_others_unchanged() -> None:
            assert other_question_snapshot(page, repeated.id) == baseline, (
                "Retrying billing changed another question's summary, links, or answer"
            )

        # Wrong -> retry -> correct -> retry -> wrong. Selection alone must not
        # reinsert the entry: only the latest checked answer belongs in review.
        for option, outcome in ((repeated.correct, CORRECT), (repeated.wrong, WRONG)):
            page.get_by_test_id("button-retry-quiz-billing").click()
            assert_review(page, remaining)
            expect(page.get_by_test_id("quiz-feedback-billing")).to_have_count(0)
            question = page.get_by_test_id("quiz-question-billing")
            expect(question.locator('input:checked')).to_have_count(0)
            for radio in question.locator('input[type="radio"]').all():
                expect(radio).to_be_enabled()
            assert_others_unchanged()
            page.get_by_test_id(f"input-quiz-billing-{option}").check()
            assert_review(page, remaining)
            assert_others_unchanged()
            page.get_by_test_id("button-check-quiz-billing").click()
            expect(page.get_by_test_id("quiz-feedback-billing")).to_contain_text(outcome)
            assert_review(page, ids if outcome == WRONG else remaining)
            expect(page.get_by_test_id("input-quiz-billing-" + option)).to_be_disabled()
            assert_others_unchanged()

        # The restored entry still targets the right closed panel and guide.
        return_to_question(page, repeated)
        assert_guides(page, repeated, base_url)
        assert_review(page, ids)
        assert_others_unchanged()
        assert not errors, f"Browser errors: {errors}"
        context.close()
        browser.close()
    print("PASS: six summary targets, three closed panels, repeated hash clicks, "
          "guide mappings, wrong/correct/wrong retry isolation")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("BASE_URL"))
    parser.add_argument("--executable-path", default=os.environ.get("CHROMIUM_EXECUTABLE_PATH"))
    args = parser.parse_args()
    if not args.base_url:
        parser.error("provide --base-url or set BASE_URL")
    run(args.base_url, args.executable_path)
