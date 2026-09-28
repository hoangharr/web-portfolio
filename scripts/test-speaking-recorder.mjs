import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/engine.js',import.meta.url),'utf8');
const recorderCode = source.slice(source.indexOf('function formatSeconds('),source.indexOf('function checkAllMCQ('));
function harness() {
  const elements = new Map(); let now = 0, active = true, tracksStopped = 0, stopCalls = 0;
  const intervals = new Map(); let intervalId = 0;
  const element = () => ({ disabled: false, textContent: '', src: '', checked: false, events: {}, classList: { add() {}, remove() {} }, addEventListener(type, fn) { this.events[type] = fn; }, removeAttribute(key) { this[key] = ''; } });
  for (const selector of ['.btn-start-prep','.btn-start-recording','.btn-stop-recording','.btn-delete-recording','.speaking-timer','.speaking-status','.speaking-playback','.speaking-complete']) elements.set(selector,element());
  const root = { dataset: { prepSeconds: '20', recordingSeconds: '40' }, isConnected: true, querySelector: selector => elements.get(selector), closest: () => ({ classList: { contains: () => active } }) };
  class Recorder {
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/mp4'; }
    start() { this.state = 'recording'; }
    stop() { stopCalls++; this.state = 'inactive'; this.ondataavailable({ data: new Blob(['recording']) }); this.onstop(); }
  }
  const state = {};
  const context = { state, Blob, Date: { now: () => now }, URL: { createObjectURL: () => 'blob:clip', revokeObjectURL() {} }, navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => tracksStopped++ }] }) } }, MediaRecorder: Recorder, window: { MediaRecorder: Recorder, setInterval(fn) { intervals.set(++intervalId,fn); return intervalId; }, clearInterval(id) { intervals.delete(id); } } };
  vm.runInNewContext(recorderCode,context); context.bindSpeakingRecorder(root);
  return { state, root, elements, intervals, get stopCalls() { return stopCalls; }, get tracksStopped() { return tracksStopped; }, tick(seconds) { now = seconds * 1000; [...intervals.values()].forEach(fn => fn()); }, leave() { active = false; } };
}
test('practice recording continues past 40 seconds and stops only when requested', async () => {
  const h = harness(); await h.elements.get('.btn-start-recording').events.click();
  h.tick(600); assert.equal(h.state.recording.recorder.state,'recording'); assert.equal(h.stopCalls,0);
  assert.equal(h.elements.get('.speaking-timer').textContent,'600s');
  h.elements.get('.btn-stop-recording').events.click();
  assert.equal(h.stopCalls,1); assert.equal(h.tracksStopped,1); assert.equal(h.intervals.size,0);
  assert.equal(h.elements.get('.btn-start-recording').disabled,false);
  await h.elements.get('.btn-start-recording').events.click(); assert.equal(h.state.recording.recorder.state,'recording');
  h.elements.get('.btn-stop-recording').events.click();
});
test('leaving a section releases the microphone and clears the elapsed timer', async () => {
  const h = harness(); await h.elements.get('.btn-start-recording').events.click(); h.leave(); h.tick(5);
  assert.equal(h.stopCalls,1); assert.equal(h.tracksStopped,1); assert.equal(h.intervals.size,0);
});
