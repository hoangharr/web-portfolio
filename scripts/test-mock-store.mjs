import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';

const source = readFileSync(new URL('../js/mock-store.js', import.meta.url), 'utf8');
function setup(fetcher, cache = new Map()) {
  const context = { AbortController, setTimeout, clearTimeout, crypto: { randomUUID }, URL };
  runInNewContext(source, context);
  const store = new context.MockAttemptStore({ fetcher, storage: { getItem: k => cache.get(k), setItem: (k,v) => cache.set(k,v) } });
  const clips = new Map();
  store.blobDB = async (action,key,blob) => action === 'put' ? clips.set(key,blob) : action === 'delete' ? clips.delete(key) : clips.get(key);
  return { store, cache, clips };
}
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
function api() {
  const rows = new Map(); let offline = false;
  return {
    rows, setOffline: value => { offline = value; },
    fetcher: async (url, options = {}) => {
      if (offline) throw new Error('offline');
      if (url === '/api/auth/me') return response({ id: 7 });
      if (url === '/api/auth/csrf') return response({ headerName: 'X-XSRF-TOKEN', token: 'test' });
      if (url === '/api/mock-attempts') return response([...rows.values()]);
      const id = url.split('/')[3];
      const old = rows.get(id);
      if (url.includes('/speaking')) {
        const row = { ...old, version: old.version + 1, hasSpeaking: true }; rows.set(id,row); return response(row);
      }
      const body = JSON.parse(options.body);
      assert.equal(body.userId, 7);
      if (old && old.version !== body.version) return response({},409);
      const row = { ...body, id, version: (old?.version || 0) + 1, updatedAt: new Date().toISOString() };
      rows.set(id,row); return response(row);
    }
  };
}
test('draft and completed retakes persist independently and restore from account', async () => {
  const backend = api(), { store } = setup(backend.fetcher); await store.init();
  const first = store.begin('aptis-general-mock-1');
  store.save(first, { writing: { email: 'My draft' }, result: { coreScore: 30 } }, true);
  await store.flush(first.id);
  const second = store.begin(first.assessmentId); store.save(second, { coreAnswers: { 0: 2 } }); await store.flush(second.id);
  assert.notEqual(first.id,second.id); assert.equal(backend.rows.size,2);
  const restored = setup(backend.fetcher).store; await restored.init();
  assert.equal(restored.unfinished(first.assessmentId).id,second.id);
  assert.equal(restored.results()[first.assessmentId].synced,true);
  assert.equal(restored.items[first.id].state.writing.email,'My draft');
});
test('offline edits survive reload and retry without being overwritten by server', async () => {
  const backend = api(), { store, cache } = setup(backend.fetcher); await store.init();
  const record = store.begin('aptis-general-mock-2'); await store.flush(record.id);
  backend.setOffline(true); store.save(record,{ writing: { email: 'Offline text' } });
  await assert.rejects(store.flush(record.id)); assert.equal(record.pending,true);
  backend.setOffline(false); const restored = setup(backend.fetcher,cache).store; await restored.init();
  assert.equal(backend.rows.get(record.id).state.writing.email,'Offline text');
  assert.equal(restored.items[record.id].pending,false);
});
test('conflicts retain local answers and can be copied without overwriting another device', async () => {
  const backend = api(), { store } = setup(backend.fetcher); await store.init();
  const record = store.begin('aptis-general-mock-3'); await store.flush(record.id);
  backend.rows.get(record.id).version += 1;
  store.save(record,{ writing: { email: 'Local version' } }); await assert.rejects(store.flush(record.id));
  assert.equal(record.conflict,true); assert.equal(record.pending,true);
  const copy = store.copy(record); await store.flush(copy.id);
  assert.equal(backend.rows.get(copy.id).state.writing.email,'Local version');
  assert.equal(backend.rows.size,2);
});
test('audio is backed up before network upload and cleared only after successful DB save', async () => {
  const backend = api(), { store, clips } = setup(backend.fetcher); await store.init();
  const record = store.begin('aptis-general-mock-4'); await store.flush(record.id);
  const blob = new Blob(['voice'],{ type: 'audio/mp4' }); backend.setOffline(true);
  await assert.rejects(store.uploadSpeaking(record,blob));
  assert.equal(record.audioPending,true); assert.equal(clips.size,1);
  backend.setOffline(false); await store.flushAll();
  assert.equal(record.hasSpeaking,true); assert.equal(record.audioPending,false); assert.equal(clips.size,0);
});
test('guest and other account caches are never imported implicitly', async () => {
  const cache = new Map([['aptis:mock-attempts:guest',JSON.stringify({ private: { id: 'private' } })],['aptis:mock-attempts:user-8',JSON.stringify({ other: { id: 'other' } })]]);
  const store = setup(api().fetcher,cache).store; await store.init();
  assert.equal(Object.keys(store.items).length,0); assert.equal(store.cacheKey,'aptis:mock-attempts:user-7');
});
