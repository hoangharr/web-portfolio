import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const engine = fs.readFileSync('js/engine.js', 'utf8');
const html = fs.readFileSync('english.html', 'utf8');
function getFunction(name, nextName) {
  return engine.slice(engine.indexOf(`function ${name}(`), engine.indexOf(`function ${nextName}(`));
}

test('module selector keeps the Modules label when changing lessons', () => {
  const elements = Object.fromEntries(['header-title', 'module-selector-button', 'module-selector-label', 'module-selector-current'].map(id => [id, { setAttribute(key, value) { this[key] = value; } }]));
  const lessons = [{ id: 'a1', level: 'A1', title: 'Starter' }, { id: 'b1', level: 'B1', title: 'First' }, { id: 'b2', level: 'B1', title: 'Second' }];
  const state = { lessons, sections: [{ lesson: lessons[2] }, { lesson: lessons[0] }], currentSlide: 1 };
  const context = vm.createContext({ state, document: { getElementById: id => elements[id], querySelector: () => null } });
  vm.runInContext(getFunction('updateHeaderForCurrentSlide', 'updateNav'), context);
  context.updateHeaderForCurrentSlide();
  assert.equal(elements['module-selector-label'].textContent, 'Modules');
  assert.equal(elements['module-selector-button']['aria-label'], 'Select module');
  state.currentSlide = 2;
  context.updateHeaderForCurrentSlide();
  assert.equal(elements['module-selector-label'].textContent, 'Modules');
  assert.doesNotMatch(html, /id="module-selector-current"/);
  assert.match(engine, /const active = lesson.id === activeLessonId/);
  assert.match(engine, /aria-current="true"/);
  assert.match(engine, /Currently learning/);
  assert.match(engine, /const collapsed = !trackContainsActive/);
});

test('lesson Home returns to welcome, saves position and stops microphone/audio without leaving app', () => {
  const calls = [];
  const context = vm.createContext({
    state: { recording: { recorder: { state: 'recording', stop: () => calls.push('stop') } }, currentAudio: { pause: () => calls.push('pause') } },
    window: { speechSynthesis: { cancel: () => calls.push('cancel') } },
    document: { getElementById: id => ({ classList: { add: value => calls.push(`${id}:${value}`) }, scrollTo: () => calls.push('scroll') }) },
    persistCurrentModuleProgress: () => calls.push('persist'), renderWelcome: () => calls.push('welcome')
  });
  vm.runInContext(getFunction('showWelcome', 'hideWelcome'), context);
  context.showWelcome();
  assert.deepEqual(calls, ['persist', 'stop', 'pause', 'cancel', 'modules-menu:hidden', 'modules-content:translate-y-full', 'welcome', 'scroll']);
  const button = html.match(/<button\s+type="button"\s+id="lesson-home-button"[\s\S]*?<\/button>/)?.[0];
  assert.ok(button);
  assert.match(button, /onclick="showWelcome\(\)"/);
  assert.doesNotMatch(button, /hoangdm\.com|href=/);
});

test('opening Modules overrides a saved collapsed active level, and the first tap can collapse it', () => {
  let saved = ['a1', 'b1'];
  const groups = Object.fromEntries(['a1', 'b1'].map(id => [id, { hidden: true, classList: { toggle(_, collapsed) { groups[id].hidden = collapsed; } } }]));
  const headers = Object.fromEntries(['a1', 'b1'].map(id => [id, {
    dataset: { trackHeader: id }, attributes: {}, chevron: { style: {} },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    querySelector() { return this.chevron; },
    addEventListener(_, callback) { this.click = callback; }
  }]));
  const menuList = {
    innerHTML: '',
    querySelector(selector) {
      const id = selector.match(/="([^"]+)"/)?.[1];
      return selector.includes('data-track-header') ? headers[id] : groups[id];
    },
    querySelectorAll(selector) { return selector === '[data-track-header]' ? Object.values(headers) : []; }
  };
  const lessons = [{ id: 'one', level: 'A1', title: 'One', sections: [{}] }, { id: 'two', level: 'B1', title: 'Two', sections: [{}] }];
  const context = vm.createContext({
    state: { lessons, tracks: [{ id: 'a1', label: 'A1', lessons: ['one'] }, { id: 'b1', label: 'B1', lessons: ['two'] }], sections: [{ lesson: lessons[1] }], currentSlide: 1 },
    document: { getElementById: () => menuList },
    getCollapsedTracks: () => saved,
    setTrackCollapsed: (id, collapsed) => { saved = saved.filter(item => item !== id); if (collapsed) saved.push(id); },
    isLessonCompleted: () => false, escapeHtml: String, materialIcon: () => ''
  });
  vm.runInContext(getFunction('applyTrackVisibility', 'bindLessonEvents'), context);
  context.renderModulesMenu();
  assert.equal(groups.b1.hidden, false);
  assert.equal(groups.a1.hidden, true);
  assert.equal(headers.b1.attributes['aria-expanded'], 'true');
  assert.equal(headers.b1.chevron.style.transform, 'rotate(0deg)');
  assert.match(menuList.innerHTML, /aria-current="true"/);
  headers.b1.click();
  assert.equal(groups.b1.hidden, true);
  headers.b1.click();
  assert.equal(groups.b1.hidden, false);
  headers.b1.click();
  context.renderModulesMenu();
  assert.equal(groups.b1.hidden, false); // re-opening always reveals current module
});
