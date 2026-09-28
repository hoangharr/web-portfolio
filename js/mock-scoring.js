/* Practice estimates, not British Council's calibrated raw-to-scale conversion.
 * Thresholds: Aptis Scoring System v2.1, Appendix, General revised 2020.
 * Core-dependent borderline adjustments are not published and are not guessed.
 */
(() => {
  const thresholds = {
    reading: [8, 16, 26, 38, 46],
    listening: [8, 16, 24, 34, 42],
    writing: [6, 18, 26, 40, 48],
    speaking: [4, 16, 26, 41, 48]
  };
  const levels = ["Below A1", "A1", "A2", "B1", "B2", "C1"];
  function estimate(correct, total, skill) {
    if (!thresholds[skill] || !Number.isFinite(correct) || !Number.isFinite(total) || total <= 0 || correct < 0 || correct > total) return null;
    const score = Math.round(correct / total * 50);
    const index = thresholds[skill].filter(cut => score >= cut).length;
    return { score, cefr: levels[index], correct, total, estimated: true };
  }
  function profile(result) {
    const skills = Object.fromEntries(["reading", "listening"].map(skill => [skill, estimate(result[skill], result[`${skill}Total`], skill)]));
    // Writing/Speaking require assessed performance; completion is not a grade.
    return { version: 1, method: "practice-linear-50-general-2020", skills, overall: null };
  }
  globalThis.MockScoring = { estimate, profile };
})();
