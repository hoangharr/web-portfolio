/* Account-scoped offline backup; PostgreSQL is the source of synced attempts. */
(() => {
  class MockAttemptStore {
    constructor({ fetcher = (...args) => fetch(...args), storage = localStorage, onStatus = () => {} } = {}) {
      this.fetcher = async (path, options = {}) => {
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
        try { return await fetcher(path, { ...options, signal: controller.signal }); } finally { clearTimeout(timeout); }
      };
      this.storage = storage; this.onStatus = onStatus;
      this.user = null; this.items = {}; this.timers = new Map(); this.queue = Promise.resolve(); this.blobs = new Map();
    }
    get cacheKey() { return `aptis:mock-attempts:${this.user ? `user-${this.user.id}` : "guest"}`; }
    cache() { try { this.storage.setItem(this.cacheKey, JSON.stringify(this.items)); } catch { this.onStatus("Device backup is unavailable. Keep this page open until saved to your account."); } }
    async init() {
      try { const response = await this.fetcher("/api/auth/me", { credentials: "same-origin" }); if (response.ok) this.user = await response.json(); } catch { /* Guest use remains available. */ }
      try { this.items = JSON.parse(this.storage.getItem(this.cacheKey) || "{}"); } catch { this.items = {}; }
      if (!this.user) { this.onStatus("Sign in to save attempts across your devices."); return; }
      try {
        const response = await this.fetcher("/api/mock-attempts", { credentials: "same-origin" });
        if (!response.ok) throw new Error("Cannot load attempts");
        for (const remote of await response.json()) {
          const local = this.items[remote.id];
          if (!local?.pending && !local?.audioPending) this.items[remote.id] = { ...remote, pending: false, sequence: 0 };
        }
        this.cache(); this.onStatus("Saved attempts loaded from your account.");
        await this.flushAll();
      } catch { this.onStatus("Could not connect. Available attempts are saved on this device."); }
    }
    unfinished(assessmentId) {
      return Object.values(this.items).filter(item => item.assessmentId === assessmentId && !item.submitted && !item.abandoned).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    }
    begin(assessmentId) {
      const record = { id: crypto.randomUUID(), assessmentId, state: { coreAnswers: {}, skillAnswers: { reading: {}, listening: {} }, writing: {}, stage: "core", questionIndex: 0, dataVersion: 3 }, submitted: false, version: 0, hasSpeaking: false, updatedAt: new Date().toISOString(), pending: true, sequence: 0 };
      this.items[record.id] = record; this.cache(); return record;
    }
    copy(record) {
      const state = record.state, submitted = record.submitted;
      record.abandoned = true; record.pending = false;
      const fresh = this.begin(record.assessmentId); this.save(fresh, state, submitted); return fresh;
    }
    save(record, state, submitted = record.submitted) {
      record.state = JSON.parse(JSON.stringify(state)); record.submitted = submitted; record.updatedAt = new Date().toISOString(); record.pending = true; record.sequence = (record.sequence || 0) + 1;
      this.items[record.id] = record; this.cache();
      clearTimeout(this.timers.get(record.id));
      if (this.user) { this.onStatus("Saving to your account…"); this.timers.set(record.id, setTimeout(() => this.flush(record.id).catch(() => {}), 700)); }
    }
    results() {
      const latest = {};
      for (const record of Object.values(this.items).filter(item => !item.abandoned && item.submitted && item.state?.result).sort((a,b) => String(a.updatedAt).localeCompare(String(b.updatedAt)))) {
        latest[record.assessmentId] = { ...record.state.result, attemptId: record.id, synced: Boolean(this.user) && !record.pending, speakingSavedToAccount: record.hasSpeaking && !record.audioPending, speakingSavedOnDevice: record.audioPending };
      }
      return latest;
    }
    async csrf() {
      const response = await this.fetcher("/api/auth/csrf", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Sign in again to save your attempt");
      return response.json();
    }
    async flush(id) {
      clearTimeout(this.timers.get(id));
      if (!this.user) return false;
      const operation = this.queue.catch(() => {}).then(async () => {
        const record = this.items[id];
        if (!record?.pending) return true;
        if (record.conflict) throw new Error("Another device updated this attempt. Your changes remain on this device.");
        try {
          while (record.pending) {
            const sequence = record.sequence;
            const csrf = await this.csrf();
            const response = await this.fetcher(`/api/mock-attempts/${id}`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token }, body: JSON.stringify({ userId: this.user.id, assessmentId: record.assessmentId, state: record.state, submitted: record.submitted, version: record.version }) });
            if (!response.ok) { if (response.status === 409) record.conflict = true; throw new Error(response.status === 409 ? "Another device updated this attempt. Your changes remain on this device." : "Not synced yet. Your attempt is saved on this device."); }
            const remote = await response.json(); record.version = remote.version; record.hasSpeaking = remote.hasSpeaking;
            if (record.sequence === sequence) { record.pending = false; record.updatedAt = remote.updatedAt; }
            this.cache();
          }
          this.onStatus("Saved to your account."); return true;
        } catch (error) { this.cache(); this.onStatus(error.message); throw error; }
      });
      this.queue = operation; return operation;
    }
    async blobDB(action, key, blob) {
      if (!globalThis.indexedDB) throw new Error("Recording backup is unavailable");
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("aptis-mock-audio", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("clips");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result, transaction = db.transaction("clips", action === "get" ? "readonly" : "readwrite"), store = transaction.objectStore("clips");
          const operation = action === "put" ? store.put(blob, key) : action === "delete" ? store.delete(key) : store.get(key);
          transaction.oncomplete = () => { db.close(); resolve(operation.result); };
          transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error); };
        };
      });
    }
    async recordingBlob(record) {
      const key = `${this.cacheKey}:${record.id}`;
      return this.blobs.get(key) || await this.blobDB("get", key).catch(() => null);
    }
    async recordingUrl(record) {
      if (record.audioPending) { const blob = await this.recordingBlob(record); if (blob) return URL.createObjectURL(blob); }
      return record.hasSpeaking ? `/api/mock-attempts/${record.id}/speaking` : "";
    }
    async flushAll() {
      let success = true;
      for (const record of Object.values(this.items).filter(item => !item.abandoned && (item.pending || item.audioPending))) {
        try { await this.flush(record.id); if (record.audioPending) { const blob = await this.recordingBlob(record); if (blob) await this.uploadSpeaking(record, blob, true); } } catch { success = false; }
      }
      return success;
    }
    async uploadSpeaking(record, blob, cached = false) {
      if (!blob?.size || blob.size > 15 * 1024 * 1024) throw new Error("Recording must be smaller than 15 MB.");
      const blobKey = `${this.cacheKey}:${record.id}`;
      if (!cached) {
        this.blobs.set(blobKey, blob); record.audioPending = true; this.cache();
        try { await this.blobDB("put", blobKey, blob); } catch { this.onStatus("Keep this page open until your recording is saved to your account."); }
      }
      if (!this.user) return false;
      await this.flush(record.id);
      const operation = this.queue.catch(() => {}).then(async () => {
        const csrf = await this.csrf();
        const response = await this.fetcher(`/api/mock-attempts/${record.id}/speaking?version=${record.version}`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": blob.type || "audio/webm", [csrf.headerName]: csrf.token }, body: blob });
        if (!response.ok) throw new Error(response.status === 413 ? "Recording is too large (maximum 15 MB)." : "Recording has not synced. Keep this page open and try again.");
        const remote = await response.json(); record.version = remote.version; record.hasSpeaking = remote.hasSpeaking; record.audioPending = false; this.cache();
        this.blobs.delete(blobKey); await this.blobDB("delete", blobKey).catch(() => {}); return true;
      });
      this.queue = operation; return operation;
    }
  }
  globalThis.MockAttemptStore = MockAttemptStore;
})();
