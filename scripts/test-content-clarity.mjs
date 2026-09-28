import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const modules = readdirSync(new URL('../data/topics/', import.meta.url)).filter(name => name.endsWith('.json')).map(name => read(`data/topics/${name}`));
const exams = read('data/mock-exams.json').exams;
const section = (name,id) => modules.find(module => module.id === `${name}-01`).sections.find(item => item.id === id);

test('every module reading gap is answerable from its supplied word bank', () => {
  for (const module of modules) for (const task of module.sections.filter(s => s.type === 'reading')) {
    for (const blank of task.passage.blanks) assert.ok(task.passage.options.includes(blank.correct), `${module.id}/${blank.id}`);
    assert.ok(!task.passage.parts.some(part => typeof part === 'string' && /_{3,}/.test(part)),module.id);
    if (!(task.questions || []).length) assert.doesNotMatch(task.description,/answer.*comprehension/i);
  }
});
test('routine matching states times rather than assuming habits, and valid phrases are accepted', () => {
  const task = section('daily-life-personal-info','matching-practice');
  for (const item of task.items.filter(item => ['morning','evening','weekend'].includes(item.match))) assert.match(item.text, /weekday|Saturday/);
  const work = section('work-career','matching-lab');
  assert.equal(work.items.find(item => item.text === 'Proficient at').match,'good-at');
  assert.equal(work.items.find(item => item.text === 'Competent in').match,'good-at');
});
test('Writing reference answers respect the same word limits as learners', () => {
  for (const module of modules) for (const task of module.sections.filter(s => s.type === 'writing')) {
    const prompt = task.prompt, count = prompt.referenceAnswer.trim().split(/\s+/).length;
    assert.ok(count >= prompt.minWords && count <= prompt.maxWords,`${module.id}: ${count} words, expected ${prompt.minWords}–${prompt.maxWords}`);
  }
});
test('all ten mocks provide Writing choices and display those instructions', () => {
  for (const exam of exams) {
    assert.match(exam.writing.context,/Saturday at 10 a.m. or Sunday at 2 p.m./);
    assert.match(exam.writing.context,/two activities offered/);
    assert.match(exam.writing.context,/invent personal details/);
    assert.match(exam.writing.part2,/chosen day, activity and one reason/);
    assert.match(exam.speaking.instructions,/may invent a situation/);
    assert.ok(!exam.core.some(item => /notice, [“"](?:A|The|To)[”"] means/.test(item.prompt)));
  }
  const ui = readFileSync(new URL('../js/tests.js',import.meta.url),'utf8');
  assert.ok(ui.includes('escapeHtml(exam.writing.context)'));
  assert.ok(ui.includes('escapeHtml(exam.speaking.instructions)'));
});
test('Listening matching uses distinct speaker names and asks about an exclusive opinion', () => {
  for (const exam of exams) {
    const listening = exam.listening;
    assert.equal(new Set(listening.part2.speakers.map(s => s.name)).size,4,exam.id);
    const item = listening.part3.statements[2];
    assert.match(item.text,/keep the current schedule/);
    assert.equal(item.correct,'b');
    assert.match(listening.part3.transcript,/I would keep the current schedule/);
  }
});
test('cohesion tasks supply links between events, and existing Listening audio stays available', () => {
  const manifest = read('data/tts-manifest.json');
  for (const exam of exams) {
    const first = exam.reading.part2[0];
    const ordered = first.correctPositions.map(position => first.sentences[position - 1]);
    assert.match(ordered[1],/After those discussions/);
    assert.match(ordered[2],/Once that list was complete/);
    assert.match(ordered[3],/After receiving those suggestions/);
    for (const text of Object.values(exam.listening.audioClips)) assert.ok(manifest[text],`${exam.id}: missing audio`);
  }
});
