const CURRICULUM_URL = "/data/curriculum.json?v=2";
const TEST_STATE_KEY = "aptis:assessment-results";
const LEVELS = ["A1", "A2", "B1", "B2"];
const ACCENTS = { A1: "teal", A2: "sky", B1: "violet", B2: "rose" };
const MOCK_TOPICS = ["Repair cafés & practical skills", "Youth radio & local voices", "Rivers & wildlife", "Museums & cultural access", "Food sharing & community support", "School exchanges & cultures", "Sport & community health", "Science & public engagement", "Transport & safer journeys", "Charity concerts & fundraising"];
let curriculum = [], lessons = [], assessments = [], authoredMocks = {}, neuralAudio = {}, completedLessonIds = new Set(), active = null, answers = {}, skillAnswers = { reading: {}, listening: {} }, questionIndex = 0, activeMockAudio = null;
let currentAttempt = null;

const $ = selector => document.querySelector(selector);
const mockStore = new MockAttemptStore({ onStatus: updateMockSyncStatus });
const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
function resolveMockMediaUrl(source) { const base = String(window.MEDIA_BASE_URL || document.querySelector('meta[name="media-base-url"]')?.content || "").replace(/\/$/, ""); return base && String(source).startsWith("/audio/") ? `${base}${source}` : source; }
const keyFor = id => `assessment:${id}`;
function updateMockSyncStatus(message) {
  const status = $("#mock-sync-status"); if (!status) return; status.textContent = message;
  if (currentAttempt?.conflict) {
    status.insertAdjacentHTML("beforeend", '<button id="copy-conflicted-attempt" class="ml-3 min-h-11 rounded-xl border border-slate-300 px-3 font-bold dark:border-slate-700">Save this version as a new attempt</button>');
    $("#copy-conflicted-attempt").onclick = async () => {
      const previous = currentAttempt;
      let blob = await mockStore.recordingBlob(previous);
      if (!blob && previous.hasSpeaking) { try { const response = await fetch(`/api/mock-attempts/${previous.id}/speaking`, { credentials: "same-origin" }); if (response.ok) blob = await response.blob(); } catch { /* Original audio remains in the account. */ } }
      currentAttempt = mockStore.copy(previous);
      try { await mockStore.flush(currentAttempt.id); if (blob) await mockStore.uploadSpeaking(currentAttempt, blob); updateMockSyncStatus("Saved as a separate attempt. The original remains in your account."); } catch (error) { updateMockSyncStatus(error.message); }
    };
  }
}
function savedResults() {
  if (mockStore.user) return mockStore.results();
  let legacy = {}; try { legacy = JSON.parse(localStorage.getItem(TEST_STATE_KEY) || "{}"); } catch { /* Keep legacy guest results separate from accounts. */ }
  return { ...legacy, ...mockStore.results() };
}
function attemptSnapshot() {
  return { ...currentAttempt.state, coreAnswers: answers, skillAnswers, writing: active?.writing || currentAttempt.state.writing || {}, stage: active?.stage || "core", questionIndex, dataVersion: 3 };
}
function saveAttemptDraft() { if (currentAttempt && active) mockStore.save(currentAttempt, attemptSnapshot()); }
function saveResult(id, result) {
  if (currentAttempt) mockStore.save(currentAttempt, { ...attemptSnapshot(), result }, true);
}
function themeIsDark() { const saved = localStorage.getItem("theme"); const hour = new Date().getHours(); return saved === "dark" || (!saved && (matchMedia("(prefers-color-scheme: dark)").matches || hour >= 19 || hour < 7)); }
function applyTheme() { document.documentElement.classList.toggle("dark", themeIsDark()); $("#theme-button span").textContent = document.documentElement.classList.contains("dark") ? "light_mode" : "dark_mode"; }

function includedTracks(level, modules) {
  const levelIndex = LEVELS.indexOf(level);
  return curriculum.flatMap((track, index) => index < levelIndex ? track.lessons : index === levelIndex ? track.lessons.slice(0, modules) : []);
}
function buildAssessments() {
  const progressCounts = { A1: 12, A2: 18, B1: 24, B2: 30 };
  const levelCounts = { A1: 20, A2: 28, B1: 36, B2: 50 };
  const checks = LEVELS.flatMap(level => [
    { id: `${level.toLowerCase()}-progress-check`, kind: "Progress Check", level, modules: 3, count: progressCounts[level], source: includedTracks(level, 3), description: `Cumulative review through ${level} Module 3.` },
    { id: `${level.toLowerCase()}-level-mock`, kind: "Level Mock", level, modules: 6, count: levelCounts[level], source: includedTracks(level, 6), description: `Cumulative mock covering all completed topics through ${level}.` }
  ]);
  const allLessons = curriculum.flatMap(track => track.lessons);
  const mocks = Array.from({ length: 10 }, (_, index) => ({ id: `aptis-general-mock-${index + 1}`, kind: "Aptis General Mock", level: "A1–B2", modules: 24, count: 96, source: allLessons, description: MOCK_TOPICS[index] }));
  assessments = [...checks, ...mocks];
}
function hash(value) { return [...value].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7); }
function questionPool(assessment) {
  if (assessment.kind === "Aptis General Mock") return authoredMocks[assessment.id]?.core || [];
  const permitted = new Set(assessment.source);
  // Core papers may only use self-contained Grammar/Vocabulary items. Reading and
  // Listening questions depend on a passage or audio and are rendered in their own
  // assessment parts, never as an orphaned question here.
  const pool = lessons.filter(item => permitted.has(item.url)).flatMap(lesson => lesson.sections
    .filter(section => section.type === "mcq" || section.type === "checkpoint")
    .flatMap(section => (section.questions || []).filter(question => Array.isArray(question.options) && Number.isInteger(question.correct)).map(question => ({ ...question, lessonTitle: lesson.title }))));
  const ordered = pool.map((question, index) => ({ question, rank: hash(`${assessment.id}:${question.id}:${index}`) })).sort((a, b) => a.rank - b.rank).map(item => item.question);
  return ordered.slice(0, Math.min(assessment.count, ordered.length));
}
function canOpen(assessment) {
  if (assessment.kind === "Aptis General Mock") return true;
  const prerequisiteIds = assessment.source.map(url => lessons.find(lesson => lesson.url === url)?.id).filter(Boolean);
  return prerequisiteIds.every(id => completedLessonIds.has(id));
}
function badge(result) {
  if (!result) return "";
  const profile = MockScoring.profile(result);
  const labels = ["reading", "listening"].filter(skill => profile.skills[skill]).map(skill => `${skill === "reading" ? "Reading" : "Listening"} ${profile.skills[skill].cefr}`);
  return `<span class="mt-3 inline-block rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold leading-5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Latest estimate · ${escapeHtml(labels.join(" · ") || "Completed")}</span>`;
}
function card(assessment) {
  const result = savedResults()[assessment.id]; const accent = ACCENTS[assessment.level] || "amber";
  return `<article class="rounded-2xl border border-${accent}-200 bg-white p-5 shadow-sm dark:border-${accent}-900/70 dark:bg-slate-900"><h3 class="font-serif text-xl font-bold">${assessment.kind === "Aptis General Mock" ? `Mock test ${assessment.id.split("-").at(-1)}` : escapeHtml(assessment.kind)}</h3><p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">${escapeHtml(assessment.description)}</p>${badge(result)}<div class="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">${result ? `<button data-result="${assessment.id}" class="min-h-11 rounded-xl border border-slate-300 px-4 py-2 font-bold dark:border-slate-700">View results</button>` : ""}<button data-start="${assessment.id}" class="min-h-11 rounded-xl bg-${accent}-700 px-4 py-2 font-bold text-white active:scale-[.98] dark:bg-${accent}-600">${result ? "Try again" : "Start"}</button></div></article>`;
}
function renderHub() {
  if (currentAttempt?.pending) mockStore.flush(currentAttempt.id).catch(() => {});
  active = null; currentAttempt = null; answers = {}; questionIndex = 0; location.hash = "";
  const mocks = assessments.filter(item => item.kind === "Aptis General Mock");
  $("#app").innerHTML = `<section><p class="text-xs font-extrabold uppercase tracking-[.16em] text-amber-700 dark:text-amber-300">Aptis ESOL General</p><h2 class="mt-1 font-serif text-3xl font-bold">Mock exams</h2><p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">These papers help you practise and estimate your current readiness. They are not an official Aptis result.</p><div class="mt-6 grid gap-4 sm:grid-cols-2">${mocks.map(card).join("")}</div></section>`;
  document.querySelectorAll("[data-start]").forEach(button => button.addEventListener("click", () => start(button.dataset.start)));
  document.querySelectorAll("[data-result]").forEach(button => button.addEventListener("click", () => renderAttemptHistory(button.dataset.result)));
  if (mockStore.user) {
    let legacy = {}; try { legacy = JSON.parse(localStorage.getItem(TEST_STATE_KEY) || "{}"); } catch { /* No earlier results. */ }
    const imports = Object.entries(legacy).filter(([id, result]) => authoredMocks[id] && !Object.values(mockStore.items).some(record => record.state?.importKey === `${id}:${JSON.stringify(result)}`));
    if (imports.length) {
      $("#app").insertAdjacentHTML("beforeend", '<button id="import-device-results" class="mt-5 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold dark:border-slate-700">Import my earlier results from this device</button>');
      $("#import-device-results").onclick = async () => {
        $("#import-device-results").disabled = true;
        for (const [id, result] of imports) { const record = mockStore.begin(id); mockStore.save(record, { ...record.state, result, importKey: `${id}:${JSON.stringify(result)}` }, true); }
        await mockStore.flushAll(); renderHub();
      };
    }
  }
}
function renderAttemptHistory(assessmentId) {
  const records = Object.values(mockStore.items).filter(record => record.assessmentId === assessmentId && record.submitted && !record.abandoned && record.state?.result).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const resultFor = record => ({ ...record.state.result, attemptId: record.id, synced: Boolean(mockStore.user) && !record.pending, speakingSavedToAccount: record.hasSpeaking && !record.audioPending, speakingSavedOnDevice: record.audioPending });
  if (records.length <= 1) return renderMockResult(assessmentId, records.length ? resultFor(records[0]) : savedResults()[assessmentId]);
  $("#app").innerHTML = `<section class="mx-auto max-w-3xl"><h2 class="font-serif text-3xl font-bold">Mock test ${escapeHtml(assessmentId.split("-").at(-1))} · Your attempts</h2><div class="mt-5 grid gap-3">${records.map(record => `<article class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p class="font-bold">${escapeHtml(new Date(record.state.result.completedAt || record.updatedAt).toLocaleString())}</p>${badge(resultFor(record))}<button data-attempt-result="${record.id}" class="mt-3 block min-h-11 rounded-xl bg-indigo-800 px-4 font-bold text-white dark:bg-amber-300 dark:text-slate-950">View this result</button></article>`).join("")}</div><button id="back" class="mt-5 min-h-11 font-bold text-indigo-800 dark:text-indigo-300">Back to mock exams</button></section>`;
  document.querySelectorAll("[data-attempt-result]").forEach(button => button.onclick = () => renderMockResult(assessmentId, resultFor(mockStore.items[button.dataset.attemptResult])));
  $("#back").onclick = renderHub;
}
function renderQuestion() {
  const questions = active.questions, question = questions[questionIndex], picked = answers[questionIndex];
  const answered = Object.keys(answers).length;
  $("#app").innerHTML = `<section class="mx-auto max-w-3xl"><button id="exit" class="mb-5 min-h-11 text-sm font-bold text-indigo-800 dark:text-indigo-300">← Exit without submitting</button><div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"><div class="flex items-start justify-between gap-4"><div><p class="text-xs font-extrabold uppercase tracking-[.15em] text-amber-700 dark:text-amber-300">${escapeHtml(active.assessment.kind)} · ${escapeHtml(active.assessment.level)}</p><h2 class="mt-1 font-serif text-2xl font-bold">Grammar & Vocabulary</h2></div><span class="shrink-0 text-sm font-bold text-slate-500 dark:text-slate-300">${questionIndex + 1} / ${questions.length}</span></div><div class="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full bg-amber-400" style="width:${(answered / questions.length) * 100}%"></div></div><p class="mt-7 text-lg font-semibold leading-8">${escapeHtml(question.prompt)}</p><div class="mt-6 grid gap-3">${question.options.map((option, index) => `<button data-option="${index}" class="min-h-12 rounded-xl border-2 px-4 py-3 text-left text-base font-semibold transition ${picked === index ? "border-indigo-700 bg-indigo-50 text-indigo-950 dark:border-amber-300 dark:bg-slate-800 dark:text-white" : "border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500"}"><span class="mr-2 text-sm text-slate-500">${String.fromCharCode(65 + index)}.</span>${escapeHtml(option)}</button>`).join("")}</div><div class="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800"><button id="previous" ${questionIndex ? "" : "disabled"} class="min-h-11 rounded-xl px-4 font-bold text-indigo-800 disabled:opacity-35 dark:text-indigo-300">Previous</button>${questionIndex === questions.length - 1 ? `<button id="submit" class="min-h-11 rounded-xl bg-indigo-800 px-5 font-bold text-white active:scale-[.98] dark:bg-amber-300 dark:text-slate-950">Submit ${answered}/${questions.length}</button>` : `<button id="next" class="min-h-11 rounded-xl bg-indigo-800 px-5 font-bold text-white active:scale-[.98] dark:bg-amber-300 dark:text-slate-950">Next</button>`}</div></div></section>`;
  document.querySelectorAll("[data-option]").forEach(button => button.addEventListener("click", () => { answers[questionIndex] = Number(button.dataset.option); persistCoreAnswers(); renderQuestion(); }));
  $("#exit").onclick = renderHub; $("#previous").onclick = () => { if (questionIndex) { questionIndex--; renderQuestion(); } }; const next = $("#next"); if (next) next.onclick = () => { if (questionIndex < questions.length - 1) { questionIndex++; renderQuestion(); } }; const submit = $("#submit"); if (submit) submit.onclick = submitTest;
  saveAttemptDraft();
}
function persistCoreAnswers() {
  if (!active || active.assessment.kind !== "Aptis General Mock") return;
  saveAttemptDraft();
}
function submitTest() {
  if (Object.keys(answers).length < active.questions.length) {
    const unanswered = active.questions.findIndex((_, index) => answers[index] === undefined);
    questionIndex = Math.max(0, unanswered);
    renderQuestion();
    const notice = document.createElement("p");
    notice.className = "mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100";
    notice.setAttribute("role", "alert");
    notice.textContent = "Answer every question before continuing.";
    $("#app section > div").append(notice);
    return;
  }
  const score = active.questions.reduce((total, question, index) => total + (answers[index] === question.correct ? 1 : 0), 0);
  active.coreScore = score;
  active.stage = "skills";
  saveAttemptDraft();
  renderMockSkills(score);
}
function objectiveItems(exam, part) {
  if (part === "reading") return [
    ...exam.reading.part1.items.map((item, i) => ({ id: `r1-${i}`, correct: item.correct, type: "mcq" })),
    ...exam.reading.part2.flatMap((task, ti) => task.sentences.map((_, si) => ({ id: `r2-${ti}-${si}`, correct: task.correctPositions[si], type: "number", fixed: si === 0 })).filter(item => !item.fixed)),
    ...exam.reading.part3.statements.map((item, i) => ({ id: `r3-${i}`, correct: item.correct, type: "id" })),
    ...exam.reading.part4.paragraphs.map((item, i) => ({ id: `r4-${i}`, correct: item.heading, type: "id" }))
  ];
  return [
    ...exam.listening.part1.items.map((item, i) => ({ id: `l1-${i}`, correct: item.correct, type: "mcq" })),
    ...exam.listening.part2.speakers.map(speaker => ({ id: `l2-${speaker.id}`, correct: exam.listening.part2.matches[speaker.id], type: "id" })),
    ...exam.listening.part3.statements.map((item, i) => ({ id: `l3-${i}`, correct: item.correct, type: "id" })),
    ...exam.listening.part4.flatMap((monologue, mi) => monologue.items.map((item, i) => ({ id: `l4-${mi}-${i}`, correct: item.correct, type: "mcq" })))
  ];
}
function saveSkillAnswers() { saveAttemptDraft(); }
function matchingSelect(part, id, options, group = "") {
  const value = skillAnswers[part][id] ?? "";
  return `<select data-skill-select data-skill-part="${part}" data-skill-id="${id}" data-skill-group="${group}" class="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold dark:border-slate-700 dark:bg-slate-950"><option value="">Choose an answer…</option>${options.map(option => `<option value="${escapeHtml(option.id)}" ${String(value) === String(option.id) ? "selected" : ""}>${escapeHtml(option.text)}</option>`).join("")}</select>`;
}
function mcqCard(item, part, id, label, audio = "") {
  return `<div class="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p class="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapeHtml(label)}</p>${audio}<p class="mt-2 font-semibold leading-7">${escapeHtml(item.prompt)}</p><div class="mt-3 grid gap-2">${item.options.map((option, optionIndex) => `<button data-skill-part="${part}" data-skill-question="${id}" data-skill-option="${optionIndex}" aria-pressed="${skillAnswers[part][id] === optionIndex}" class="skill-option min-h-12 rounded-xl border border-slate-300 px-4 py-3 text-left font-semibold active:scale-[.99] dark:border-slate-700">${String.fromCharCode(65 + optionIndex)}. ${escapeHtml(option)}</button>`).join("")}</div></div>`;
}
function renderMockSkills(coreScore) {
  const exam = authoredMocks[active.assessment.id];
  const audioControl = clipId => `<div class="mt-3 flex flex-wrap items-center gap-3"><button data-audio-clip="${escapeHtml(clipId)}" class="min-h-11 rounded-xl bg-indigo-800 px-4 font-bold text-white disabled:opacity-50 dark:bg-amber-300 dark:text-slate-950">Play audio</button><span data-audio-status="${escapeHtml(clipId)}" aria-live="polite" class="text-sm text-slate-600 dark:text-slate-300">Edge Neural audio · up to two listens.</span></div>`;
  const select = (part,id,options,group="") => { const value=skillAnswers[part][id]??""; return `<select data-skill-select data-skill-part="${part}" data-skill-id="${id}" data-skill-group="${group}" class="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold dark:border-slate-700 dark:bg-slate-950"><option value="">Choose an answer…</option>${options.map(option=>`<option value="${escapeHtml(option.id)}" ${String(value)===String(option.id)?"selected":""}>${escapeHtml(option.text)}</option>`).join("")}</select>`; };
  const mcq = (item,part,id,label,audio="") => `<div class="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p class="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapeHtml(label)}</p>${audio}<p class="mt-2 font-semibold leading-7">${escapeHtml(item.prompt)}</p><div class="mt-3 grid gap-2">${item.options.map((option,i)=>`<button data-skill-part="${part}" data-skill-question="${id}" data-skill-option="${i}" aria-pressed="${skillAnswers[part][id]===i}" class="skill-option min-h-12 rounded-xl border border-slate-300 px-4 py-3 text-left font-semibold active:scale-[.99] dark:border-slate-700">${String.fromCharCode(65+i)}. ${escapeHtml(option)}</button>`).join("")}</div></div>`;
  const r=exam.reading,l=exam.listening, personOptions=r.part3.people.map(x=>({id:x.id,text:x.name})), headingOptions=r.part4.headings.map(x=>({id:x.id,text:x.text})), listenOptions=l.part2.options.map(x=>({id:x.id,text:x.text})), speakerOptions=l.part3.speakers.map(x=>({id:x.id,text:x.name})), positions=Array.from({length:5},(_,i)=>({id:i+2,text:`Position ${i+2}`}));
  const readingHtml=`<article class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-extrabold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Reading · 4 parts / ${objectiveItems(exam,"reading").length} answers</p><h2 class="mt-1 font-serif text-2xl font-bold">Reading</h2><h3 class="mt-5 border-t pt-5 font-bold dark:border-slate-700">Part 1 · Read a short message</h3><p class="mt-3 rounded-xl bg-slate-50 p-4 leading-7 dark:bg-slate-800">${escapeHtml(r.part1.message)}</p>${r.part1.items.map((item,i)=>mcq(item,"reading",`r1-${i}`,`Choose the correct information · ${i+1}`)).join("")}<h3 class="mt-7 border-t pt-5 font-bold dark:border-slate-700">Part 2 · Put the sentences in order</h3><p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Sentence 1 is fixed. Choose a position for each remaining sentence.</p>${r.part2.map((task,ti)=>`<div class="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><h4 class="font-bold">${escapeHtml(task.title)}</h4>${task.sentences.map((sentence,si)=>`<div class="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"><p class="rounded-lg bg-white p-3 text-sm leading-6 dark:bg-slate-900"><strong>${si===0?"1 ·":"? ·"}</strong> ${escapeHtml(sentence)}</p>${si===0?"<span class=\"text-sm font-semibold text-emerald-700 dark:text-emerald-300\">Fixed first</span>":select("reading",`r2-${ti}-${si}`,positions,`seq-${ti}`)}</div>`).join("")}</div>`).join("")}<h3 class="mt-7 border-t pt-5 font-bold dark:border-slate-700">Part 3 · Match opinions</h3><p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Read each opinion and match the statements.</p><div class="mt-4 grid gap-3 md:grid-cols-2">${r.part3.people.map(person=>`<blockquote class="rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-800"><strong>${escapeHtml(person.name)}</strong><p class="mt-2">${escapeHtml(person.text)}</p></blockquote>`).join("")}</div>${r.part3.statements.map((item,i)=>`<div class="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-center"><p class="font-medium leading-6">${i+1}. ${escapeHtml(item.text)}</p>${select("reading",`r3-${i}`,personOptions)}</div>`).join("")}<h3 class="mt-7 border-t pt-5 font-bold dark:border-slate-700">Part 4 · Choose a heading</h3><p class="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-800">${escapeHtml(r.part4.sample)}</p>${r.part4.paragraphs.map((para,i)=>`<div class="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p class="leading-7"><strong>Paragraph ${i+1}</strong> · ${escapeHtml(para.text)}</p><label class="mt-3 block text-sm font-bold">Heading${select("reading",`r4-${i}`,headingOptions)}</label></div>`).join("")}</article>`;
  const listeningHtml=`<article class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-extrabold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Listening · 4 parts / ${objectiveItems(exam,"listening").length} answers</p><h2 class="mt-1 font-serif text-2xl font-bold">Listening</h2><p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Each recording can be played twice.</p><h3 class="mt-5 border-t pt-5 font-bold dark:border-slate-700">Part 1 · Recognise key information</h3>${l.part1.items.map((item,i)=>mcq(item,"listening",`l1-${i}`,`Short recording ${i+1}`,audioControl(item.clipId))).join("")}<h3 class="mt-7 border-t pt-5 font-bold dark:border-slate-700">Part 2 · Match speakers to information</h3><p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Choose one option for each of four speakers; two options are extra.</p>${l.part2.speakers.map((speaker,i)=>`<div class="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><strong>Speaker ${i+1}</strong>${audioControl(speaker.clipId)}${select("listening",`l2-${speaker.id}`,listenOptions)}</div>`).join("")}<h3 class="mt-7 border-t pt-5 font-bold dark:border-slate-700">Part 3 · Match opinions in a conversation</h3>${audioControl(l.part3.clipId)}${l.part3.statements.map((item,i)=>`<div class="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center"><p>${i+1}. ${escapeHtml(item.text)}</p>${select("listening",`l3-${i}`,speakerOptions)}</div>`).join("")}<h3 class="mt-7 border-t pt-5 font-bold dark:border-slate-700">Part 4 · Understand longer recordings</h3>${l.part4.map((mono,mi)=>`<div class="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><h4 class="font-bold">${escapeHtml(mono.title)}</h4>${audioControl(mono.clipId)}${mono.items.map((item,i)=>mcq(item,"listening",`l4-${mi}-${i}`,`Question ${i+1}`)).join("")}</div>`).join("")}</article>`;
  const skillCount=objectiveItems(exam,"reading").length+objectiveItems(exam,"listening").length;
  $("#app").innerHTML=`<section class="mx-auto max-w-4xl space-y-6"><div class="rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-900 dark:bg-slate-900"><p class="text-sm font-bold text-emerald-700 dark:text-emerald-300">Core complete: ${coreScore}/${active.questions.length}</p><p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Reading and Listening · ${skillCount} responses</p></div>${readingHtml}${listeningHtml}<article class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-extrabold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Writing</p><h2 class="mt-1 font-serif text-2xl font-bold">Write your response</h2><p class="mt-4 leading-7 text-slate-700 dark:text-slate-200">${escapeHtml(exam.writing.prompt)}</p><textarea id="mock-writing" class="mt-4 min-h-48 w-full rounded-xl border border-slate-300 bg-white p-4 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="Write your response here..."></textarea></article><article class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-extrabold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Speaking</p><h2 class="mt-1 font-serif text-2xl font-bold">Record your responses</h2><ol class="mt-4 list-decimal space-y-3 pl-5 leading-7 text-slate-700 dark:text-slate-200">${exam.speaking.tasks.map(task=>`<li>${escapeHtml(task)}</li>`).join("")}</ol><p class="mt-4 text-sm text-slate-600 dark:text-slate-300">Speaking audio is not uploaded. The clip stays on this device and cannot yet be reviewed by a teacher.</p></article><button id="finish-mock" class="min-h-12 w-full rounded-xl bg-indigo-800 px-5 font-bold text-white dark:bg-amber-300 dark:text-slate-950">Finish mock</button></section>`;
  for(const part of ["reading","listening"]) for(const [id,choice] of Object.entries(skillAnswers[part])) document.querySelector(`[data-skill-part="${part}"][data-skill-question="${id}"][data-skill-option="${choice}"]`)?.classList.add("border-indigo-700","bg-indigo-50","dark:border-amber-300","dark:bg-slate-800");
  document.querySelectorAll(".skill-option").forEach(button=>button.onclick=()=>{const part=button.dataset.skillPart,id=button.dataset.skillQuestion,choice=Number(button.dataset.skillOption);skillAnswers[part][id]=choice;saveSkillAnswers();const siblings=button.parentElement.querySelectorAll("button");siblings.forEach(item=>{item.classList.remove("border-indigo-700","bg-indigo-50","dark:border-amber-300","dark:bg-slate-800");item.setAttribute("aria-pressed","false")});button.classList.add("border-indigo-700","bg-indigo-50","dark:border-amber-300","dark:bg-slate-800");button.setAttribute("aria-pressed","true")});
  document.querySelectorAll("[data-skill-select]").forEach(select=>select.addEventListener("change",()=>{const part=select.dataset.skillPart,id=select.dataset.skillId,group=select.dataset.skillGroup,previous=skillAnswers[part][id],value=select.value===""?"":(/^r2-/.test(id)?Number(select.value):select.value);if(group&&value!=="")document.querySelectorAll(`[data-skill-group="${group}"]`).forEach(other=>{if(other!==select&&String(other.value)===String(value)){const otherId=other.dataset.skillId;other.value=previous===undefined?"":String(previous);if(previous===undefined)delete skillAnswers[part][otherId];else skillAnswers[part][otherId]=previous}});if(value==="")delete skillAnswers[part][id];else skillAnswers[part][id]=value;saveSkillAnswers()}));
  if(activeMockAudio)activeMockAudio.pause();
  document.querySelectorAll("[data-audio-clip]").forEach(button=>{const clipId=button.dataset.audioClip,source=neuralAudio[l.audioClips[clipId]],status=document.querySelector(`[data-audio-status="${clipId}"]`),audio=new Audio();let fallback=false,plays=0;audio.preload="none";button.disabled=!source;if(!source){status.textContent="Neural audio is not available yet.";return}audio.src=resolveMockMediaUrl(source);audio.addEventListener("error",()=>{const base=String(window.MEDIA_BASE_URL||document.querySelector('meta[name="media-base-url"]')?.content||"").replace(/\/$/,"");if(!fallback&&base&&String(source).startsWith("/audio/")){fallback=true;audio.src=source;audio.load()}else{button.disabled=true;status.textContent="Audio could not be loaded."}});audio.addEventListener("play",()=>{plays++;button.disabled=true;button.textContent=`Listening… (${plays}/2)`;status.textContent="Listen carefully, then answer."});audio.addEventListener("ended",()=>{button.textContent=plays<2?`Play again (${plays}/2)`:"Listening complete";button.disabled=plays>=2;status.textContent=plays<2?"You may listen once more.":"You have used both listens."});button.onclick=()=>{if(activeMockAudio&&activeMockAudio!==audio)activeMockAudio.pause();activeMockAudio=audio;audio.currentTime=0;audio.play().catch(()=>{status.textContent="Tap Play audio again to start playback."})}});
  const writingArticle = $("#mock-writing").closest("article");
  const savedWriting = active.writing || {};
  active.writing = savedWriting;
  const writeField = (id, label, prompt, rows = 1) => `<label class="mt-4 block text-sm font-bold">${escapeHtml(label)}${rows === 1 ? `<input data-writing="${id}" class="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="${escapeHtml(prompt)}" value="${escapeHtml(savedWriting[id] || "")}" />` : `<textarea data-writing="${id}" rows="${rows}" class="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="${escapeHtml(prompt)}">${escapeHtml(savedWriting[id] || "")}</textarea>`}</label>`;
  writingArticle.innerHTML = `<p class="text-xs font-extrabold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Writing · Part 1</p><h2 class="mt-1 font-serif text-2xl font-bold">Short answers</h2><p class="mt-3 text-sm text-slate-600 dark:text-slate-300">Answer each message in a word or short phrase.</p><p class="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-200">${escapeHtml(exam.writing.context)}</p>${exam.writing.part1.map((prompt,index)=>writeField("p1-"+index,prompt,"Your answer")).join("")}<div class="mt-7 border-t border-slate-200 pt-5 dark:border-slate-700"><p class="text-xs font-extrabold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Part 2 · Short text</p><p class="mt-3">${escapeHtml(exam.writing.part2)}</p>${writeField("p2","Your response","Write 20–30 words",3)}</div><div class="mt-7 border-t border-slate-200 pt-5 dark:border-slate-700"><p class="text-xs font-extrabold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Part 3 · Online discussion</p>${exam.writing.part3.map((prompt,index)=>writeField("p3-"+index,prompt,"Write about 40 words",3)).join("")}</div><div class="mt-7 border-t border-slate-200 pt-5 dark:border-slate-700"><p class="text-xs font-extrabold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Part 4 · Emails</p><p class="mt-3 leading-6">${escapeHtml(exam.writing.prompt)}</p>${writeField("p4","Write both emails","Informal email (40–50 words), then formal email (120–150 words)",8)}</div>`;
  writingArticle.querySelectorAll("[data-writing]").forEach(input => input.addEventListener("input", () => { savedWriting[input.dataset.writing] = input.value; saveAttemptDraft(); }));
  const speakingArticle = [...document.querySelectorAll("article")].find(article => article.textContent.includes("Record your responses"));
  speakingArticle?.insertAdjacentHTML("beforeend", '<div class="mt-5 flex flex-wrap gap-3"><button id="record-speaking" class="min-h-11 rounded-xl bg-indigo-800 px-4 font-bold text-white dark:bg-amber-300 dark:text-slate-950">Record responses</button><button id="stop-speaking" disabled class="min-h-11 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40 dark:border-slate-700">Stop</button></div><p id="recording-status" class="mt-3 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">Record the four responses in one clip.</p><audio id="speaking-playback" class="mt-3 hidden w-full" controls></audio>');
  const recordingAttempt = currentAttempt;
  speakingArticle.querySelector("ol").insertAdjacentHTML("beforebegin", `<p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">${escapeHtml(exam.speaking.instructions)}</p>`);
  speakingArticle.querySelector("p.mt-4").textContent = mockStore.user ? "Your recording will be saved with this attempt in your account." : "Sign in to save your recording across devices.";
  let recorder = null, stream = null, chunks = [], speakingBlob = null, speakingUpload = null, recordingReady = Promise.resolve(), markRecordingReady = null, speakingUrl = recordingAttempt?.hasSpeaking ? `/api/mock-attempts/${recordingAttempt.id}/speaking` : "";
  if (speakingUrl) { $("#speaking-playback").src = speakingUrl; $("#speaking-playback").classList.remove("hidden"); $("#recording-status").textContent = "Your saved recording is ready to play."; }
  const playback = $("#speaking-playback"), recordingStatus = $("#recording-status");
  if (recordingAttempt?.audioPending) mockStore.recordingUrl(recordingAttempt).then(url => { if (url && playback.isConnected && !speakingBlob && recorder?.state !== "recording") { speakingUrl = url; playback.src = url; playback.classList.remove("hidden"); recordingStatus.textContent = "Recording saved on this device; waiting to sync."; } });
  async function uploadRecording() {
    const target = recordingAttempt.abandoned && currentAttempt?.assessmentId === recordingAttempt.assessmentId ? currentAttempt : recordingAttempt;
    try { const synced = await mockStore.uploadSpeaking(target, speakingBlob); recordingStatus.textContent = synced ? "Recording saved to your account." : "Recording available on this device. Sign in to save it to your account."; }
    catch (error) { recordingStatus.textContent = error.message; speakingArticle.querySelector("#retry-speaking-upload")?.classList.remove("hidden"); }
  }
  speakingArticle.insertAdjacentHTML("beforeend", '<button id="retry-speaking-upload" class="mt-3 hidden min-h-11 rounded-xl border border-slate-300 px-4 font-bold dark:border-slate-700">Retry saving recording</button>');
  $("#retry-speaking-upload").onclick = () => { $("#retry-speaking-upload").classList.add("hidden"); speakingUpload = uploadRecording(); };
  $("#record-speaking").onclick = async () => { try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("unsupported");
    stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recorder = new MediaRecorder(stream); chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop()); if (speakingUrl.startsWith("blob:")) URL.revokeObjectURL(speakingUrl);
      speakingBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" }); speakingUrl = URL.createObjectURL(speakingBlob);
      playback.src = speakingUrl; playback.classList.remove("hidden");
      recordingStatus.textContent = "Saving recording…"; speakingUpload = uploadRecording(); markRecordingReady?.();
    };
    recorder.start(); recordingReady = new Promise(resolve => { markRecordingReady = resolve; }); $("#record-speaking").disabled = true; $("#stop-speaking").disabled = false; $("#recording-status").textContent = "Recording…";
  } catch { stream?.getTracks().forEach(track => track.stop()); $("#recording-status").textContent = "Microphone access is unavailable in this browser."; } };
  $("#stop-speaking").onclick = () => { if (recorder?.state === "recording") recorder.stop(); $("#stop-speaking").disabled = true; $("#record-speaking").disabled = false; };
  $("#finish-mock").onclick = async () => {
    if (recorder?.state === "recording") { $("#recording-status").textContent = "Stop your recording before finishing the mock."; return; }
    const exam = authoredMocks[active.assessment.id];
    const missingPart = ["reading", "listening"].find(part => objectiveItems(exam, part).some(item => skillAnswers[part][item.id] === undefined));
    if (missingPart) {
      const missing = objectiveItems(exam, missingPart).find(item => skillAnswers[missingPart][item.id] === undefined);
      const field = document.querySelector(`[data-skill-part="${missingPart}"][data-skill-question="${missing.id}"], [data-skill-part="${missingPart}"][data-skill-id="${missing.id}"]`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.insertAdjacentHTML("afterend", '<span class="mt-2 block text-sm font-semibold text-amber-800 dark:text-amber-200" role="alert">Choose an answer to continue.</span>');
      return;
    }
    const submitButton = $("#finish-mock"); submitButton.disabled = true; submitButton.textContent = "Saving…";
    await recordingReady;
    if (speakingUpload) await speakingUpload;
    const submission = { kind: "aptis-mock-writing", assessmentId: active.assessment.id, attemptId: currentAttempt?.id, data: savedWriting };
    let writingSubmitted = false;
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { credentials: "same-origin" });
      if (csrfResponse.ok) {
        const csrf = await csrfResponse.json();
        const response = await fetch("/api/progress/submissions", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token }, body: JSON.stringify({ lessonId: active.assessment.id, sectionId: "writing", content: JSON.stringify(submission) }) });
        writingSubmitted = response.ok;
      }
    } catch { writingSubmitted = false; }
    await finishMock(active.assessment.id, speakingUrl, savedWriting, writingSubmitted);
  };
}
async function finishMock(assessmentId, speakingUrl, savedWriting, writingSubmitted = false) {
  const exam = authoredMocks[active.assessment.id];
  const objectiveScore = part => objectiveItems(exam, part).reduce((sum, item) => sum + (skillAnswers[part][item.id] === item.correct ? 1 : 0), 0);
  const result = { core: active.coreScore, coreTotal: active.questions.length, reading: objectiveScore("reading"), readingTotal: objectiveItems(exam,"reading").length, listening: objectiveScore("listening"), listeningTotal: objectiveItems(exam,"listening").length, writingPartsAnswered: Object.values(savedWriting).filter(value => value.trim()).length, writingSubmitted, speakingRecorded: Boolean(speakingUrl), speakingSavedLocally: Boolean(speakingUrl), completedAt: new Date().toISOString() };
  result.scoreProfile = MockScoring.profile(result);
  saveResult(assessmentId, result);
  try { if (currentAttempt) await mockStore.flush(currentAttempt.id); } catch { /* Show the result with an explicit unsynced status. */ }
  renderMockResult(assessmentId, savedResults()[assessmentId] || result);
}
function renderMockResult(assessmentId, result) {
  if (!result) return renderHub();
  if (activeMockAudio) activeMockAudio.pause();
  const profile = MockScoring.profile(result);
  const skillCard = (skill, title) => {
    const score = profile.skills[skill];
    return `<div class="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-800 dark:bg-slate-800"><dt class="font-bold">${title}</dt><dd class="mt-2 text-3xl font-black text-indigo-950 dark:text-amber-300">${score ? escapeHtml(score.cefr) : "Unavailable"}</dd><p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Estimated CEFR</p>${score ? `<p class="mt-4 font-bold">${score.score}<span class="font-normal text-slate-500 dark:text-slate-400"> / 50 · practice score</span></p><p class="mt-1 text-sm text-slate-600 dark:text-slate-300">${score.correct} of ${score.total} answers correct</p>` : ""}</div>`;
  };
  const coreScore = Number.isFinite(result.core) && result.coreTotal > 0 ? Math.round(result.core / result.coreTotal * 50) : null;
  $("#app").innerHTML = `<section class="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"><p class="text-xs font-extrabold uppercase tracking-[.16em] text-amber-700 dark:text-amber-300">Mock test ${escapeHtml(assessmentId.split("-").at(-1))} · Results</p><h2 class="mt-2 font-serif text-3xl font-bold">Your skill profile</h2><p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Estimated levels for this practice paper. Your official Aptis result may differ.</p><dl class="mt-6 grid gap-3 sm:grid-cols-2">${skillCard("reading", "Reading")}${skillCard("listening", "Listening")}<div class="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800"><dt class="font-bold">Writing</dt><dd class="mt-2 text-lg font-bold">${result.writingPartsAnswered ? "Awaiting teacher assessment" : "Not assessed"}</dd><p class="mt-2 text-sm text-slate-600 dark:text-slate-300">${result.writingSubmitted ? "Sent for teacher review." : result.writingPartsAnswered ? "Your responses are saved on this device." : "No written responses were completed."}</p></div><div class="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800"><dt class="font-bold">Speaking</dt><dd class="mt-2 text-lg font-bold">Not assessed</dd><p class="mt-2 text-sm text-slate-600 dark:text-slate-300">${result.speakingRecorded ? "Recording available on this device only; it has not been sent for assessment." : "No speaking recording was submitted for assessment."}</p></div><div class="rounded-2xl border border-slate-200 p-5 dark:border-slate-700 sm:col-span-2"><dt class="font-bold">Grammar & Vocabulary</dt><dd class="mt-2 text-2xl font-black">${coreScore ?? "—"}<span class="text-base font-normal text-slate-500 dark:text-slate-400"> / 50</span></dd><p class="mt-1 text-sm text-slate-600 dark:text-slate-300">This component receives a score only, without a CEFR level.</p></div></dl><div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30"><p class="font-bold">Overall CEFR · Awaiting all four skills</p><p class="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">An overall level requires assessed results for Reading, Listening, Writing and Speaking.</p></div><details class="mt-5 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700"><summary class="min-h-11 cursor-pointer font-bold">How your estimate is calculated</summary><p class="mt-2 leading-6 text-slate-600 dark:text-slate-300">Correct answers are converted proportionally to a practice score out of 50. The estimated CEFR uses the published Aptis General thresholds, which differ by skill. Official Aptis uses calibrated scores and may adjust borderline levels using Grammar & Vocabulary; this practice estimate does not reproduce those adjustments.</p><a href="https://www.britishcouncil.org/sites/default/files/aptis_scoring_system_v2.1.pdf" target="_blank" rel="noopener" class="mt-3 inline-flex min-h-11 items-center font-bold text-indigo-800 underline dark:text-indigo-300">British Council scoring guide</a></details><button id="back" class="mt-6 min-h-12 w-full rounded-xl bg-indigo-800 px-5 py-3 font-bold text-white dark:bg-amber-300 dark:text-slate-950">Back to mock exams</button></section>`;
  $("#back").onclick = renderHub;
  const syncText = result.synced ? "Saved to your account · Available across your devices" : mockStore.user ? "Not synced yet · Saved on this device; reconnect to save to your account" : "Saved on this device · Sign in to save across devices";
  $("#app").insertAdjacentHTML("afterbegin", `<p class="mx-auto mb-4 max-w-3xl rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800" role="status">${escapeHtml(syncText)}</p>`);
  $("#app").querySelectorAll("dt").forEach(term => {
    if (term.textContent === "Writing" && result.synced && !result.writingSubmitted && result.writingPartsAnswered) term.parentElement.querySelector("p").textContent = "Your responses are saved with this attempt in your account.";
    if (term.textContent === "Speaking" && result.speakingSavedToAccount && result.attemptId) {
      term.parentElement.querySelector("p").textContent = "Your recording is saved with this attempt in your account.";
      term.parentElement.insertAdjacentHTML("beforeend", `<audio controls preload="none" class="mt-3 w-full" src="/api/mock-attempts/${escapeHtml(result.attemptId)}/speaking"></audio>`);
    }
    if (term.textContent === "Speaking" && result.speakingSavedOnDevice && result.attemptId) {
      term.parentElement.querySelector("p").textContent = "Recording saved on this device; waiting to sync to your account.";
      const record = mockStore.items[result.attemptId];
      mockStore.recordingUrl(record).then(url => { if (url && term.isConnected) term.parentElement.insertAdjacentHTML("beforeend", `<audio controls class="mt-3 w-full" src="${escapeHtml(url)}"></audio>`); });
    }
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function start(id) {
  const assessment = assessments.find(item => item.id === id); if (!assessment) return;
  if (!canOpen(assessment)) { $("#app").innerHTML = '<p class="rounded-xl p-5">Complete the earlier modules first. <a href="english.html" class="underline">Back to lessons</a></p>'; return; }
  currentAttempt = mockStore.unfinished(id) || mockStore.begin(id);
  const draft = currentAttempt.state;
  active = { assessment, questions: questionPool(assessment), writing: draft.writing || {}, stage: draft.stage || "core" };
  if (!active.questions.length) { renderHub(); return; }
  answers = draft.coreAnswers || {}; skillAnswers = { reading: {}, listening: {}, ...draft.skillAnswers };
  questionIndex = Math.max(0, Math.min(draft.questionIndex || 0, active.questions.length - 1));
  location.hash = id;
  if (active.stage === "skills" && active.questions.every((_, i) => answers[i] !== undefined)) {
    active.coreScore = active.questions.reduce((sum, question, i) => sum + (answers[i] === question.correct ? 1 : 0), 0);
    renderMockSkills(active.coreScore);
  } else { active.stage = "core"; renderQuestion(); }
  window.scrollTo({ top: 0, behavior: "instant" });
}
async function init() {
  applyTheme(); $("#theme-button").onclick = () => { localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "light" : "dark"); applyTheme(); };
  await mockStore.init();
  window.addEventListener("online", () => mockStore.flushAll().catch(() => {}));
  try { const [config, mockData] = await Promise.all([fetch(CURRICULUM_URL).then(response => response.json()), fetch("/data/mock-exams.json?v=3").then(response => response.json())]); curriculum = config.tracks || []; authoredMocks = Object.fromEntries((mockData.exams || []).map(exam => [exam.id, exam])); const entries = await Promise.all(curriculum.flatMap(track => track.lessons).map(async url => ({ ...(await fetch(url).then(response => response.json())), url }))); lessons = entries; const progress = await fetch("/api/progress", { credentials: "same-origin" }); if (progress.ok) completedLessonIds = new Set((await progress.json()).filter(item => item.completed).map(item => item.lessonId)); buildAssessments(); const requested = new URLSearchParams(location.search).get("assessment"); if (requested && assessments.some(item => item.id === requested)) start(requested); else renderHub(); } catch (error) { $("#app").innerHTML = `<p class="rounded-xl bg-red-50 p-5 text-red-800 dark:bg-red-950 dark:text-red-200">Unable to load the Exam Centre. ${escapeHtml(error.message)}</p>`; }
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/data/tts-manifest.json?v=3");
    if (response.ok) neuralAudio = await response.json();
  } catch { neuralAudio = {}; }
  init();
}, { once: true });
