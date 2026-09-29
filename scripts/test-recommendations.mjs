import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const catalog = JSON.parse(fs.readFileSync('data/recommendations.json', 'utf8')).modules;
const curriculum = JSON.parse(fs.readFileSync('data/curriculum.json', 'utf8'));
const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync('js/recommendations.js', 'utf8'), context);
const ui = context.RecommendationUI;

test('every module has reading and listening from multiple publishers', () => {
  const ids = curriculum.tracks.flatMap(track => track.lessons.map(path => JSON.parse(fs.readFileSync(path, 'utf8')).id));
  assert.equal(ids.length, 24);
  assert.deepEqual(Object.keys(catalog).sort(), ids.sort());
  for (const id of ids) {
    const resources = catalog[id];
    assert.ok(resources.some(resource => resource.type === 'reading'), id);
    assert.ok(resources.some(resource => ['listening', 'video'].includes(resource.type)), id);
    assert.ok(new Set(resources.map(resource => resource.source)).size >= 2, id);
    for (const resource of resources) {
      assert.equal(new URL(resource.url).protocol, 'https:');
      assert.ok(['publisher', 'estimated'].includes(resource.levelBasis));
      assert.ok(resource.practiceMinutes > 0 && resource.practiceMinutes <= 20);
      assert.ok(resource.focus.length > 30);
      assert.equal(resource.verifiedAt, '2026-09-29');
      if (resource.access === 'youtube-embed') assert.match(resource.youtubeId, /^[\w-]{11}$/);
    }
  }
  const all = Object.values(catalog).flat();
  assert.ok(new Set(all.map(resource => resource.source)).size >= 10);
  assert.ok(all.filter(resource => resource.source.includes('British Council')).length < all.length / 2);
});

test('resources are collapsed, source-labelled and honest about estimated levels and transcripts', () => {
  const html = ui.render({ id: 'health-wellness-01' }, catalog['health-wellness-01']);
  assert.match(html, /NIH \/ NHLBI/);
  assert.match(html, /B2 · estimated/);
  assert.match(html, /min practice/);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  assert.doesNotMatch(html, /<iframe/); // player loads only after a tap
  const sourceHtml = ui.render({ id: 'food-shopping-01' }, catalog['food-shopping-01']);
  assert.match(sourceHtml, /Open transcript at source/);
  assert.match(sourceHtml, /rel="noopener noreferrer"/);
  assert.match(sourceHtml, /rec-notebook/);
});

test('resource rendering escapes text and blocks unsafe links', () => {
  assert.equal(ui.safeUrl('javascript:alert(1)'), '');
  assert.equal(ui.safeUrl('http://example.com'), '');
  assert.equal(ui.render({ id: 'empty' }, []), '');
  const html = ui.render({ id: '<script>' }, [{ title: '<img onerror="x">', source: 'A&B', url: 'javascript:alert(1)', focus: '<script>', youtubeId: '"><script>', level: 'A1', practiceMinutes: 5 }]);
  assert.doesNotMatch(html, /<script>|<img|javascript:|data-rec-video/);
  assert.match(html, /A&amp;B/);
});

test('optional practice is attached only to the final section and uses the account vocabulary API', () => {
  const engine = fs.readFileSync('js/engine.js', 'utf8');
  assert.match(engine, /section\.sectionIndex === section\.lesson\.sections\.length - 1 \? globalThis\.RecommendationUI/);
  assert.match(engine, /saveWord: saveVocabularyWord/);
  assert.match(engine, /recommendations\.json\?v=4/);
});

test('recommendations never depend on the VOA website, including transcript links', () => {
  for (const resource of Object.values(catalog).flat()) {
    for (const url of [resource.url, resource.transcriptUrl].filter(Boolean)) {
      assert.ok(!/(^|\.)voanews\.com$/i.test(new URL(url).hostname), resource.title);
    }
  }
});

test('notebook requires sign-in and reports success only after persistence succeeds', async () => {
  let submit, saves = 0;
  const status = { textContent: '' }, button = { disabled: false }, input = { value: 'climate' };
  const form = { elements: { word: input }, querySelector: selector => selector === 'button' ? button : status, addEventListener: (_, fn) => { submit = fn; } };
  const root = { querySelectorAll: selector => selector === '.rec-notebook' ? [form] : [] };
  ui.bind(root, { isSignedIn: () => false, saveWord: async () => { saves++; } });
  await submit({ preventDefault() {} });
  assert.equal(saves, 0);
  assert.match(status.textContent, /Sign in/);
  ui.bind(root, { isSignedIn: () => true, saveWord: async word => { assert.equal(word, 'climate'); saves++; } });
  await submit({ preventDefault() {} });
  assert.equal(saves, 1);
  assert.match(status.textContent, /Saved/);
  assert.equal(input.value, '');
  input.value = 'ocean';
  ui.bind(root, { isSignedIn: () => true, saveWord: async () => { throw new Error('offline'); } });
  await submit({ preventDefault() {} });
  assert.match(status.textContent, /Could not save/);
  assert.equal(input.value, 'ocean');
  assert.equal(button.disabled, false);
});
