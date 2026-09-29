/* Curated external resources: never count optional practice towards completion. */
(function (global) {
  "use strict";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  function safeUrl(value) {
    try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; } catch { return ""; }
  }
  const link = (url, label) => safeUrl(url) ? `<a class="rec-link" href="${escape(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-label="opens in a new tab">↗</span></a>` : "";
  function render(lesson, resources) {
    if (!resources?.length) return "";
    return `<aside class="recommendations" aria-label="Further practice" data-recommendations="${escape(lesson.id)}">
      <h2>Keep exploring</h2><p class="rec-muted">Optional reading and listening chosen for this module.</p>
      <div class="rec-grid">${resources.map(resource => {
        const videoId = /^[\w-]{11}$/.test(resource.youtubeId || "") ? resource.youtubeId : "";
        return `<details class="rec-card"><summary><span class="rec-kind">${escape(resource.type === "reading" ? "Read" : "Listen / watch")}</span><span class="rec-title">${escape(resource.title)}</span><span class="rec-muted">${escape(resource.source)}</span><span class="rec-meta">${escape(resource.level)}${resource.levelBasis === "estimated" ? " · estimated" : ""} · ~${escape(resource.practiceMinutes)} min practice</span></summary>
        <div class="rec-body"><p>${escape(resource.focus)}</p>
          ${videoId ? `<div class="rec-player"><button type="button" data-rec-video="${escape(videoId)}" data-rec-title="${escape(resource.title)}">Play video</button><p class="rec-muted">Loads the official YouTube player.</p></div>` : ""}
          ${link(resource.url, resource.type === "reading" ? "Open reading & activities" : "Open original lesson")}
          ${resource.transcriptUrl ? `<details class="rec-transcript"><summary>Transcript</summary><p class="rec-muted">Read the transcript on the original lesson page.</p>${link(resource.transcriptUrl, "Open transcript at source")}</details>` : videoId ? '<p class="rec-muted">Use the player’s CC button for available captions.</p>' : ""}
          ${resource.keywords?.length ? `<p class="rec-muted">Words to explore: ${resource.keywords.map(escape).join(", ")}</p>` : ""}
        </div></details>`;
      }).join("")}</div>
      <form class="rec-notebook"><label>Found a useful word?<input name="word" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="One English word" required pattern="[A-Za-z]+(?:['-][A-Za-z]+)*" maxlength="60"></label><button type="submit">Save to vocab notebook</button><p class="rec-status" role="status" aria-live="polite"></p></form>
    </aside>`;
  }
  function bind(root, hooks) {
    root.querySelectorAll("[data-rec-video]").forEach(button => button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${button.dataset.recVideo}`;
      iframe.title = button.dataset.recTitle;
      iframe.allow = "encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      button.closest(".rec-player").replaceChildren(iframe);
    }));
    root.querySelectorAll(".rec-notebook").forEach(form => form.addEventListener("submit", async event => {
      event.preventDefault();
      const status = form.querySelector(".rec-status"), button = form.querySelector("button"), input = form.elements.word;
      if (!hooks.isSignedIn()) { status.textContent = "Sign in to save words to your notebook."; return; }
      const word = input.value.trim().toLowerCase();
      if (!/^[a-z]+(?:['-][a-z]+)*$/.test(word)) { status.textContent = "Enter one English word."; return; }
      button.disabled = true; status.textContent = "Saving…";
      try { await hooks.saveWord(word); status.textContent = `Saved “${word}” to your notebook.`; input.value = ""; }
      catch { status.textContent = "Could not save this word. Please try again."; }
      finally { button.disabled = false; }
    }));
  }
  global.RecommendationUI = { render, bind, safeUrl };
})(globalThis);
