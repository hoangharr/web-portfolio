import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL("../js/mock-scoring.js", import.meta.url), "utf8"), context);
const scoring = context.MockScoring;

test("skill-specific published boundaries, including either side of each cut", () => {
  const bands = ["A1", "A2", "B1", "B2", "C1"];
  for (const [skill, cuts] of Object.entries({ reading: [8, 16, 26, 38, 46], listening: [8, 16, 24, 34, 42], writing: [6, 18, 26, 40, 48], speaking: [4, 16, 26, 41, 48] })) {
    assert.equal(scoring.estimate(0, 50, skill).cefr, "Below A1");
    cuts.forEach((cut, index) => {
      assert.equal(scoring.estimate(cut, 50, skill).cefr, bands[index]);
      assert.equal(scoring.estimate(cut - 1, 50, skill).cefr, index ? bands[index - 1] : "Below A1");
    });
  }
  assert.equal(scoring.estimate(35, 50, "reading").cefr, "B1");
  assert.equal(scoring.estimate(35, 50, "listening").cefr, "B2");
});

test("normalises different paper lengths and refuses invalid scores", () => {
  assert.equal(scoring.estimate(22, 29, "reading").score, 38);
  assert.equal(scoring.estimate(12, 17, "listening").score, 35);
  for (const [correct, total] of [[1, 0], [-1, 29], [30, 29], [undefined, 29], [NaN, 29]]) assert.equal(scoring.estimate(correct, total, "reading"), null);
});

test("saved legacy results remain viewable; completion alone never grants productive grades or overall", () => {
  const profile = scoring.profile({ reading: 8, readingTotal: 10, listening: 7, listeningTotal: 10, core: 50, coreTotal: 50, writingPartsAnswered: 10, speakingRecorded: true });
  assert.equal(profile.skills.reading.cefr, "B2");
  assert.equal(profile.skills.listening.cefr, "B2");
  assert.equal(profile.overall, null);
  assert.equal(profile.skills.writing, undefined);
  assert.equal(profile.skills.speaking, undefined);
});

test("all ten mock papers yield valid estimates from empty to perfect attempts", () => {
  const { exams } = JSON.parse(readFileSync(new URL("../data/mock-exams.json", import.meta.url), "utf8"));
  assert.equal(exams.length, 10);
  for (const exam of exams) {
    const reading = exam.reading.part1.items.length + exam.reading.part2.reduce((sum, task) => sum + task.sentences.length - 1, 0) + exam.reading.part3.statements.length + exam.reading.part4.paragraphs.length;
    const listening = exam.listening.part1.items.length + exam.listening.part2.speakers.length + exam.listening.part3.statements.length + exam.listening.part4.reduce((sum, task) => sum + task.items.length, 0);
    for (const [skill, total] of [["reading", reading], ["listening", listening]]) {
      let previousScore = -1;
      for (let correct = 0; correct <= total; correct++) {
        const result = scoring.estimate(correct, total, skill);
        assert.ok(result.score >= previousScore && result.score <= 50);
        previousScore = result.score;
      }
      assert.equal(scoring.estimate(total, total, skill).score, 50);
    }
  }
});

test("hub differentiates papers by topic and saved results render the skill profile", () => {
  const app = { innerHTML: "", querySelectorAll: () => [], insertAdjacentHTML(position, html) { this.innerHTML = position === "afterbegin" ? html + this.innerHTML : this.innerHTML + html; } }, back = {};
  const ui = vm.createContext({
    document: { addEventListener() {}, querySelector: selector => selector === "#app" ? app : back, querySelectorAll: () => [] },
    localStorage: { getItem: () => null }, location: { hash: "" }, window: { scrollTo() {} }
  });
  vm.runInContext(readFileSync(new URL("../js/mock-scoring.js", import.meta.url), "utf8"), ui);
  vm.runInContext(readFileSync(new URL("../js/mock-store.js", import.meta.url), "utf8"), ui);
  vm.runInContext(readFileSync(new URL("../js/tests.js", import.meta.url), "utf8"), ui);
  vm.runInContext("buildAssessments(); renderHub();", ui);
  assert.equal((app.innerHTML.match(/data-start=/g) || []).length, 10);
  assert.ok(app.innerHTML.includes("Youth radio &amp; local voices"));
  assert.ok(!app.innerHTML.includes("auto-marked") && !app.innerHTML.includes("A1–B2"));
  vm.runInContext('renderMockResult("aptis-general-mock-1", {core: 36, coreTotal: 50, reading: 22, readingTotal: 29, listening: 12, listeningTotal: 17, writingPartsAnswered: 5});', ui);
  assert.equal((app.innerHTML.match(/Estimated CEFR/g) || []).length, 2);
  assert.ok(app.innerHTML.includes("Awaiting all four skills"));
  assert.ok(app.innerHTML.includes("38") && app.innerHTML.includes("35"));
  assert.equal(typeof back.onclick, "function");
});
