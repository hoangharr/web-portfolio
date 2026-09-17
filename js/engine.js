const CURRICULUM_URL = "data/curriculum.json";

const state = {
  lessons: [],
  tracks: [],
  sections: [],
  currentSlide: 1,
  totalSlides: 0,
  draggedItem: null,
  selectedMatchItem: null,
  currentAudio: null,
  user: null,
  csrf: null
};

const sectionNavMap = {
  vocabulary: ["vocabulary", "synonyms"],
  grammar: ["grammar"],
  exercise: ["mcq", "drag-drop", "reading", "writing", "speaking", "checkpoint"]
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function materialIcon(icon, classes = "") {
  return `<span class="material-symbols-outlined ${classes}">${escapeHtml(icon)}</span>`;
}

function renderTip(tip, extraClasses = "") {
  if (!tip) return "";
  return `
    <div class="academic-gold-accent pro-tip-bg p-6 relative rounded-r-lg ${extraClasses}">
      ${materialIcon(tip.icon || "lightbulb", "absolute top-4 right-4 text-secondary text-3xl opacity-50 md:opacity-100")}
      <p class="font-label-caps text-label-caps text-secondary mb-unit uppercase">${escapeHtml(tip.title)}</p>
      <p class="font-body-md text-on-surface italic pr-8 md:pr-0">${escapeHtml(tip.text)}</p>
    </div>
  `;
}

function renderHeader(section) {
  return `
    <header class="mb-8 md:mb-section-gap">
      <div class="flex justify-between items-end gap-4">
        <div>
          <p class="font-label-caps text-label-caps text-secondary mb-2 uppercase">${escapeHtml(section.eyebrow)}</p>
          <h2 class="font-h2 text-2xl md:text-h2 text-primary">${escapeHtml(section.title)}</h2>
          <div class="w-16 h-1 bg-secondary-container mt-4"></div>
        </div>
      </div>
      ${section.description ? `<p class="font-body-lg text-sm md:text-body-lg text-outline mt-4">${escapeHtml(section.description)}</p>` : ""}
    </header>
  `;
}

function renderIntro(section) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-gutter items-center">
      <div class="md:col-span-6 flex flex-col gap-6 md:gap-section-gap">
        <div>
          <span class="font-label-caps text-label-caps text-secondary mb-unit block uppercase">${escapeHtml(section.eyebrow)}</span>
          <h2 class="font-h1 text-3xl md:text-h1 text-primary mb-element-gap">${escapeHtml(section.title)}</h2>
          <p class="font-quote text-quote text-on-surface-variant italic">"${escapeHtml(section.quote)}"</p>
        </div>
        <div class="grid grid-cols-1 gap-element-gap">
          ${section.features.map(feature => `
            <div class="flex items-start gap-4 p-4 rounded-lg bg-surface-container-low border border-outline-variant">
              ${materialIcon(feature.icon, "text-primary")}
              <div>
                <p class="font-body-md font-bold text-primary">${escapeHtml(feature.title)}</p>
                <p class="font-body-md text-on-surface-variant text-sm">${escapeHtml(feature.description)}</p>
              </div>
            </div>
          `).join("")}
        </div>
        ${renderNextStepCard(section.nextStep)}
        ${renderTip(section.tip, "border border-[#E0E0E0]")}
      </div>
      <div class="md:col-span-6 relative group mt-8 md:mt-0">
        <div class="aspect-[4/3] rounded-xl overflow-hidden shadow-sm border border-outline-variant">
          <img alt="${escapeHtml(section.image.alt)}" class="w-full h-full object-cover" src="${escapeHtml(section.image.src)}" />
          <div class="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors"></div>
        </div>
        ${section.badge ? `
          <div class="absolute -bottom-6 -left-6 bg-white p-6 shadow-xl border border-outline-variant max-w-xs hidden lg:block">
            <div class="flex items-center gap-3 mb-2">
              ${materialIcon(section.badge.icon, "text-secondary")}
              <span class="font-label-caps text-label-caps text-on-surface uppercase">${escapeHtml(section.badge.title)}</span>
            </div>
            <p class="font-body-md text-on-surface-variant text-sm">${escapeHtml(section.badge.text)}</p>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function cardClasses(card) {
  if (card.variant === "primary") {
    return {
      inner: "shadow-md hover:shadow-lg transition-shadow",
      front: "flip-card-front bg-primary-container p-6 text-white flex flex-col justify-between",
      icon: "text-secondary-container",
      category: "font-label-caps text-label-caps text-on-primary-container",
      term: "font-h3 text-xl md:text-h3 text-white mb-unit flex justify-between items-center",
      volume: "text-white/40 text-lg",
      definition: "text-body-md text-on-primary-container",
      badge: "inline-flex items-center px-3 py-1 bg-white/10 text-white text-label-caps"
    };
  }

  if (card.variant === "highlight") {
    return {
      inner: "shadow-md hover:shadow-lg transition-shadow",
      front: "flip-card-front bg-tertiary-fixed border-2 border-secondary-container p-6 flex flex-col justify-between",
      icon: "text-secondary",
      category: "font-label-caps text-label-caps text-on-secondary-fixed-variant",
      term: "font-h3 text-xl md:text-h3 text-on-primary-fixed mb-unit flex justify-between items-center",
      volume: "text-on-primary-fixed/40 text-lg",
      definition: "text-body-md text-on-tertiary-fixed-variant",
      badge: "inline-flex items-center px-3 py-1 bg-secondary-container text-on-secondary-container text-label-caps font-bold"
    };
  }

  return {
    inner: "shadow-sm hover:shadow-md transition-shadow",
    front: "flip-card-front bg-white p-6 border border-outline-variant flex flex-col justify-between",
    icon: "text-primary",
    category: "font-label-caps text-label-caps text-outline",
    term: "font-h3 text-xl md:text-h3 text-primary-container mb-unit flex justify-between items-center",
    volume: "text-outline/40 text-lg",
    definition: "text-body-md text-on-surface-variant",
    badge: ""
  };
}

function renderVocabulary(section) {
  return `
    ${renderHeader(section)}
    <p class="text-sm font-label-caps text-outline animate-pulse mb-4 text-center md:text-right">TAP CARDS TO FLIP & LISTEN</p>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-gutter">
      ${section.cards.map(card => {
        const classes = cardClasses(card);
        return `
          <div class="flip-card" data-speak="${escapeHtml(card.term)}">
            <div class="flip-card-inner ${classes.inner}">
              <div class="${classes.front}">
                <div>
                  <div class="flex items-center gap-unit mb-element-gap">
                    ${materialIcon(card.icon, classes.icon)}
                    <span class="${classes.category} uppercase">${escapeHtml(card.category)}</span>
                  </div>
                  <h3 class="${classes.term}">
                    ${escapeHtml(card.term)}
                    ${materialIcon("volume_up", classes.volume)}
                  </h3>
                  <p class="${classes.definition}">${escapeHtml(card.definition)}</p>
                </div>
                ${card.badge ? `<div class="mt-element-gap"><span class="${classes.badge} uppercase">${escapeHtml(card.badge)}</span></div>` : ""}
              </div>
              <div class="flip-card-back">
                ${materialIcon("translate", "text-4xl text-on-secondary-container mb-2")}
                <h3 class="font-h3 text-xl md:text-h3 text-on-secondary-container">${escapeHtml(card.translation)}</h3>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
    <div class="mt-8 md:mt-section-gap max-w-2xl mx-auto md:mx-0">
      ${renderTip(section.tip)}
    </div>
  `;
}

function renderSynonyms(section) {
  return `
    ${renderHeader(section)}
    <div class="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table class="w-full border-collapse text-left min-w-[500px]">
        <thead>
          <tr class="bg-primary text-on-primary">
            <th class="p-4 md:p-6 font-h3 text-lg md:text-h3 border-b border-white/10 w-1/3 md:w-1/2">Basic Word</th>
            <th class="p-4 md:p-6 font-h3 text-lg md:text-h3 border-b border-white/10 w-2/3 md:w-1/2">B2 Equivalent ${materialIcon("star", "text-secondary-container")}</th>
          </tr>
        </thead>
        <tbody class="font-body-md text-body-md">
          ${section.rows.map((row, index) => `
            <tr class="${index % 2 ? "bg-primary-container/5" : "bg-white"} border-b border-gray-100">
              <td class="p-4 md:p-6 text-primary font-semibold">${escapeHtml(row.basic)}</td>
              <td class="p-4 md:p-6 bg-secondary-container/${index % 2 ? "10" : "5"} text-academic-gold font-bold leading-loose">
                ${row.advanced.map(word => `
                  <span data-speak="${escapeHtml(word)}" class="speakable cursor-pointer hover:text-primary-container hover:underline transition-all inline-flex items-center gap-1 group" title="Listen to ${escapeHtml(word)}">
                    ${escapeHtml(word)}
                    ${materialIcon("volume_up", "text-[16px] opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity")}
                  </span>
                `).join(" / ")}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="mt-8 md:mt-section-gap">
      ${renderTip(section.tip, "max-w-4xl")}
    </div>
    <div class="mt-8 md:mt-section-gap grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-gutter items-center">
      ${section.image ? `
        <div class="h-48 md:h-64 rounded-xl overflow-hidden relative group">
          <img alt="${escapeHtml(section.image.alt)}" class="w-full h-full object-cover" src="${escapeHtml(section.image.src)}" />
          <div class="absolute inset-0 bg-primary/20 group-hover:bg-primary/10 transition-colors"></div>
        </div>
      ` : ""}
      <div class="flex flex-col gap-6 md:gap-element-gap">
        ${(section.practiceTasks || []).map(task => `
          <div class="flex items-start gap-4">
            ${materialIcon(task.icon, "text-primary p-2 bg-primary-container/10 rounded-lg")}
            <div>
              <span class="font-label-caps text-label-caps text-outline uppercase">${escapeHtml(task.label)}</span>
              <p class="font-body-md text-sm md:text-body-md mt-1">${escapeHtml(task.text)}</p>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderGrammar(section) {
  return `
    ${renderHeader(section)}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-gutter items-start">
      <div class="lg:col-span-5 flex flex-col gap-element-gap">
        <div class="p-6 md:p-8 bg-white border border-outline-variant rounded-xl shadow-sm">
          <p class="font-body-lg text-sm md:text-body-lg text-on-surface-variant mb-6">${escapeHtml(section.description)}</p>
          ${renderTip(section.tip)}
        </div>
      </div>
      <div class="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-element-gap">
        ${section.points.map((point, index) => `
          <div class="${index === 0 ? "bg-primary-container text-white" : "bg-white"} ${index === 2 ? "col-span-1 md:col-span-2" : ""} p-6 md:p-8 rounded-xl border border-outline-variant flex flex-col justify-center shadow-sm">
            <div class="flex items-center gap-3 mb-4">
              ${materialIcon(point.icon, index === 0 ? "text-secondary-container" : "text-primary")}
              <h3 class="font-h3 text-xl md:text-h3 ${index === 0 ? "text-white" : "text-primary"}">${escapeHtml(point.title)}</h3>
            </div>
            <p class="text-xs font-label-caps text-outline uppercase mb-3">${escapeHtml(point.function)}</p>
            <ul class="${index === 0 ? "text-on-primary-container" : "text-on-surface-variant"} space-y-2">
              ${point.examples.map(example => `<li class="font-body-md">"${escapeHtml(example)}"</li>`).join("")}
            </ul>
          </div>
        `).join("")}
      </div>
    </div>
    ${section.table ? `
      <div class="overflow-x-auto rounded-xl border border-outline-variant mt-8 md:mt-section-gap shadow-sm w-full">
        <table class="w-full text-left border-collapse bg-white min-w-[600px]">
          <thead>
            <tr class="bg-primary text-white">
              ${section.table.headers.map(header => `<th class="p-4 md:p-6 font-h3 text-lg md:text-h3">${escapeHtml(header)}</th>`).join("")}
            </tr>
          </thead>
          <tbody class="zebra-striping">
            ${section.table.rows.map(row => `
              <tr>
                ${row.map((cell, index) => `<td class="p-4 md:p-6 ${index === 0 ? "font-bold text-primary" : "text-on-surface-variant"}">${escapeHtml(cell)}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : ""}
  `;
}

function optionLabel(index) {
  return String.fromCharCode(65 + index);
}

function renderMcq(section) {
  return `
    ${renderHeader(section)}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 space-y-6 mcq-group" data-count="${section.questions.length}">
        ${section.questions.map((question, questionIndex) => `
          <div class="mcq-question p-6 bg-white border border-outline-variant rounded-xl shadow-sm space-y-4" data-question-id="${escapeHtml(question.id)}">
            <p class="font-h3 text-lg text-primary italic">${questionIndex + 1}. ${escapeHtml(question.prompt)}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${question.options.map((option, optionIndex) => `
                <button class="mcq-option flex items-center gap-2 p-4 border border-outline-variant rounded hover:bg-indigo-50 text-left transition-all" data-correct="${optionIndex === question.correct}">
                  ${materialIcon("radio_button_unchecked", "text-outline icon-state text-lg")}
                  <span>${optionLabel(optionIndex)}. ${escapeHtml(option)}</span>
                </button>
              `).join("")}
            </div>
          </div>
        `).join("")}
        <div class="mt-8 flex justify-end">
          <button disabled class="btn-check-all-mcq bg-primary text-white font-bold py-3 px-8 md:py-4 md:px-12 rounded-lg opacity-50 cursor-not-allowed transition-all shadow-md flex items-center gap-3 w-full sm:w-auto justify-center">
            Check All Answers
            ${materialIcon("done_all", "text-sm md:text-base")}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderDragDrop(section) {
  return `
    ${renderHeader(section)}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white p-6 rounded-2xl border border-outline-variant shadow-sm items-start">
      <div class="space-y-4" id="drop-zones-container-${escapeHtml(section.id)}">
        ${section.targets.map(target => `
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span class="w-24 text-sm font-bold text-outline uppercase">${escapeHtml(target.label)}</span>
            <button type="button" class="drop-zone flex-grow min-h-[56px] h-auto border-2 border-dashed border-outline-variant rounded-lg bg-surface flex flex-wrap items-center gap-2 p-2 text-left" data-match="${escapeHtml(target.id)}" aria-label="Place selected item in ${escapeHtml(target.label)}"></button>
          </div>
        `).join("")}
      </div>
      <div class="flex flex-wrap gap-3 content-start p-4 bg-surface-container-low rounded-lg border border-outline-variant min-h-[400px]" id="draggables-container-${escapeHtml(section.id)}">
        ${section.items.map(item => `
          <button type="button" draggable="true" data-match="${escapeHtml(item.match)}" class="drag-item px-3 py-1.5 text-sm bg-white border border-primary text-primary rounded-full cursor-grab active:scale-95 shadow-sm transition-colors" aria-pressed="false">
            ${escapeHtml(item.text)}
          </button>
        `).join("")}
      </div>
    </div>
    <div class="mt-8 flex gap-4 justify-center">
      <button id="btn-reset-matching-${escapeHtml(section.id)}" class="px-8 py-3 border-2 border-outline text-outline font-bold rounded-full hover:bg-surface transition-all">RESET</button>
      <button id="btn-check-matching-${escapeHtml(section.id)}" class="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary-container shadow-lg transition-all">CHECK ANSWERS</button>
    </div>
  `;
}

function renderReading(section) {
  const blankMap = new Map(section.passage.blanks.map(blank => [blank.id, blank.correct]));

  return `
    ${renderHeader(section)}
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-gutter">
      <div class="col-span-12 xl:col-span-8 bg-white border border-gray-200 p-6 md:p-10 rounded-xl">
        <div class="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 text-primary">
          ${materialIcon("menu_book")}
          <span class="font-label-caps text-xs md:text-sm">${escapeHtml(section.passage.title)}</span>
        </div>
        <article class="font-body-lg text-sm md:text-lg leading-[2.5] text-on-surface">
          ${section.passage.parts.map(part => {
            if (typeof part === "string") return escapeHtml(part);
            const correct = blankMap.get(part.blank);
            return `
              <select class="reading-blank inline-block min-w-[120px] border-b-2 border-primary-fixed-dim bg-primary-fixed/10 px-2 py-1 mx-1 text-center text-primary font-bold outline-none cursor-pointer rounded transition-colors" data-correct="${escapeHtml(correct)}">
                <option value="" disabled selected>__________</option>
                ${section.passage.options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}
              </select>
            `;
          }).join("")}
        </article>
        ${section.video ? `
          <div class="mt-6">
            ${section.video.type === 'iframe' ? `<div class="aspect-video rounded-lg overflow-hidden border border-outline-variant"><iframe src="${escapeHtml(section.video.src)}" title="${escapeHtml(section.video.title || 'Video')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full"></iframe></div>` : ''}
            ${section.video.caption ? `<p class="mt-2 text-sm text-on-surface-variant">${escapeHtml(section.video.caption)}</p>` : ''}
          </div>
        ` : ''}
      </div>
      <div class="col-span-12 xl:col-span-4 flex flex-col gap-6 md:gap-8">
        ${renderTip(section.tip)}
      </div>
    </div>
    ${section.questions?.length ? `
      <div class="mt-8">
        ${renderMcq({ ...section, questions: section.questions, title: "Reading Check", eyebrow: "Comprehension", description: "" })}
      </div>
    ` : ""}
    <section class="bg-primary-container text-white p-4 md:p-8 mt-8 rounded-xl shadow-md">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 class="font-h3 text-lg md:text-xl text-on-primary-container">Select the correct options above</h3>
        <button disabled class="btn-check-reading bg-secondary-fixed text-on-secondary-fixed px-6 py-2 md:px-8 md:py-3 text-xs md:text-sm font-label-caps rounded-full opacity-50 cursor-not-allowed transition-all duration-150 w-full sm:w-auto">CHECK ANSWERS</button>
      </div>
    </section>
  `;
}

function renderWriting(section) {
  const draftKey = `${section.lesson?.id || "lesson"}:${section.id}`;
  const savedDraft = getWritingDraft(draftKey);
  const initialWords = countWords(savedDraft);
  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-gutter">
      <div class="lg:col-span-7 flex flex-col gap-6 md:gap-section-gap">
        <div>
          <p class="font-label-caps text-label-caps text-secondary mb-2 uppercase">${escapeHtml(section.eyebrow)}</p>
          <h2 class="font-h2 text-2xl md:text-h2 text-primary mb-2">${escapeHtml(section.title)}</h2>
          <p class="font-body-lg text-sm md:text-body-lg text-on-surface-variant">${escapeHtml(section.description)}</p>
        </div>
        <div class="bg-white border border-outline-variant p-4 md:p-8 rounded-xl shadow-sm">
          <div class="flex items-center gap-2 md:gap-unit mb-3 md:mb-element-gap">
            ${materialIcon("description", "text-primary")}
            <span class="font-label-caps text-[10px] md:text-xs text-outline uppercase tracking-widest">The Situation</span>
          </div>
          <p class="font-quote text-base md:text-quote text-tertiary italic leading-relaxed border-l-4 border-primary pl-4 py-1">"${escapeHtml(section.prompt.situation)}"</p>
        </div>
        <div class="flex flex-col gap-2 md:gap-4">
          <div class="flex justify-between items-end">
            <label class="font-label-caps text-[10px] md:text-xs text-primary uppercase tracking-widest">Your Response</label>
            <span class="text-[10px] md:text-xs text-outline font-label-caps">Word Count: <span class="word-counter font-bold text-primary">${initialWords}</span> / ${section.prompt.maxWords} <span class="min-words">(min. ${section.prompt.minWords})</span></span>
          </div>
          <div class="relative">
            <textarea class="writing-input-text w-full p-4 md:p-6 font-body-md text-sm md:text-base border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white resize-none outline-none shadow-inner" data-max-words="${section.prompt.maxWords}" data-min-words="${section.prompt.minWords}" data-draft-key="${escapeHtml(draftKey)}" placeholder="${escapeHtml(section.prompt.placeholder)}" rows="8">${escapeHtml(savedDraft)}</textarea>
            <div class="absolute bottom-4 right-4 opacity-20 pointer-events-none">${materialIcon("edit_note", "text-2xl md:text-4xl")}</div>
          </div>
          <p class="draft-status text-xs text-outline" aria-live="polite">${savedDraft ? "Draft restored from this browser." : "Draft saves automatically on this browser."}</p>
        </div>
        ${section.prompt.referenceAnswer ? `
          <details class="bg-surface-container-low border border-primary-container p-6 rounded-xl">
            <summary class="cursor-pointer font-h3 text-xl md:text-h3 text-primary-container">Reference Answer</summary>
            <p class="font-body-lg text-base md:text-lg text-on-surface mt-3">${escapeHtml(section.prompt.referenceAnswer)}</p>
          </details>
        ` : ""}
      </div>
      <div class="lg:col-span-5 flex flex-col gap-6 md:gap-gutter">
        ${renderTip(section.tip)}
        ${section.prompt.focus?.length ? `
          <div class="bg-primary-container text-white p-4 md:p-6 rounded-xl shadow-sm">
            <h3 class="font-h3 text-lg md:text-xl text-white mb-3 md:mb-4 border-b border-white/20 pb-2">Key Vocabulary</h3>
            <div class="grid grid-cols-2 gap-2 text-[10px] md:text-xs font-label-caps tracking-wider">
              ${section.prompt.focus.map(item => `<div class="bg-white/10 p-2 rounded text-center uppercase">${escapeHtml(item)}</div>`).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function getWritingDraft(draftKey) {
  try {
    return localStorage.getItem(`aptis_draft_${draftKey}`) || "";
  } catch (e) {
    return "";
  }
}

function saveWritingDraft(draftKey, value) {
  try {
    localStorage.setItem(`aptis_draft_${draftKey}`, value);
    if (state.user) void syncDraft(draftKey, value);
    return true;
  } catch (e) {
    return false;
  }
}

function renderLessonCompletionPanel(lesson) {
  if (!lesson) return "";
  const completed = isLessonCompleted(lesson.id);
  return `
    <section class="mt-8 border border-outline-variant rounded-xl bg-surface-container-low p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p class="font-label-caps text-label-caps text-secondary uppercase">Lesson progress</p>
        <p class="font-body-md text-on-surface-variant mt-1">Mark this lesson complete when you have finished its practice tasks.</p>
      </div>
      <button data-complete-lesson="${escapeHtml(lesson.id)}" class="flex shrink-0 items-center justify-center gap-3 font-bold py-3 px-6 rounded-lg shadow-md transition-all ${completed ? "bg-green-600 text-white" : "bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-white"}">
        ${materialIcon(completed ? "task_alt" : "flag", "text-xl")}
        <span class="complete-label uppercase">${completed ? "Lesson Completed" : "Mark as Completed"}</span>
      </button>
    </section>
  `;
}

function isLessonCompleted(lessonId) {
  try {
    return localStorage.getItem(`aptis_completed_${lessonId}`) === "1";
  } catch (e) {
    return false;
  }
}

function setLessonCompleted(lessonId, completed) {
  try {
    if (completed) {
      localStorage.setItem(`aptis_completed_${lessonId}`, "1");
    } else {
      localStorage.removeItem(`aptis_completed_${lessonId}`);
    }
  } catch (e) {
    // ignore storage errors
  }
  if (state.user) void syncLessonProgress(lessonId, completed);
}

async function getCsrf() {
  if (state.csrf) return state.csrf;
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Could not start a secure session.");
  state.csrf = await response.json();
  return state.csrf;
}

async function apiWrite(path, method, body) {
  const csrf = await getCsrf();
  const response = await fetch(path, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.status === 204 ? null : response.json();
}

async function syncLessonProgress(lessonId, completed) {
  const section = state.sections[state.currentSlide - 1];
  const lastSlide = section?.lesson?.id === lessonId ? section.sectionIndex + 1 : 1;
  try { await apiWrite(`/api/progress/lessons/${encodeURIComponent(lessonId)}`, "PUT", { lastSlide, completed }); } catch (e) { /* local storage remains the offline fallback */ }
}

async function syncDraft(draftKey, content) {
  const [lessonId, sectionId] = draftKey.split(":");
  if (!lessonId || !sectionId) return;
  try { await apiWrite("/api/progress/drafts", "PUT", { lessonId, sectionId, content }); } catch (e) { /* local draft remains available */ }
}

function updateAuthButton() {
  const button = document.getElementById("auth-button");
  const logoutButton = document.getElementById("logout-button");
  if (!button) return;
  button.textContent = state.user ? state.user.displayName : "Log in";
  button.href = state.user?.role === "ADMIN" ? "admin.html" : state.user ? "english.html" : "login.html";
  if (logoutButton) logoutButton.hidden = !state.user;
}

async function restoreAccountState() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!response.ok) return;
    state.user = await response.json();
    const [progressResponse, draftsResponse] = await Promise.all([fetch("/api/progress", { credentials: "same-origin" }), fetch("/api/progress/drafts", { credentials: "same-origin" })]);
    if (progressResponse.ok) for (const item of await progressResponse.json()) if (item.completed) localStorage.setItem(`aptis_completed_${item.lessonId}`, "1");
    if (draftsResponse.ok) for (const item of await draftsResponse.json()) localStorage.setItem(`aptis_draft_${item.lessonId}:${item.sectionId}`, item.content);
  } catch (e) { /* Backend is optional until it is deployed. */ }
}

async function logout() {
  try {
    const csrf = await getCsrf();
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", headers: { [csrf.headerName]: csrf.token } });
  } finally {
    state.user = null;
    state.csrf = null;
    window.location.assign("login.html");
  }
}

function bindAuth() {
  const logoutButton = document.getElementById("logout-button");
  if (!logoutButton) return;
  logoutButton.addEventListener("click", () => { void logout(); });
}

function renderNextStepCard(nextStep) {
  if (!nextStep) return "";
  return `
    <div class="flex items-start gap-4 p-4 rounded-lg bg-secondary-container/20 border border-secondary-container">
      ${materialIcon(nextStep.icon || "arrow_forward", "text-secondary")}
      <div>
        <p class="font-label-caps text-label-caps text-secondary uppercase">${escapeHtml(nextStep.label)}</p>
        <p class="font-body-md text-sm text-on-surface-variant">${escapeHtml(nextStep.text)}</p>
      </div>
    </div>
  `;
}

function renderSpeaking(section) {
  return `
    ${renderHeader(section)}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-gutter items-start">
      <div class="lg:col-span-7 space-y-6">
        ${section.questions.map((question, index) => `
          <div class="p-6 bg-white border border-outline-variant rounded-xl shadow-sm flex items-start gap-4">
            ${materialIcon("mic", "text-primary text-3xl")}
            <div>
              <p class="font-label-caps text-label-caps text-outline uppercase">Question ${index + 1}</p>
              <p class="font-h3 text-lg text-primary mt-1">${escapeHtml(question)}</p>
            </div>
          </div>
        `).join("")}
        ${renderTip(section.tip)}
      </div>
      <div class="lg:col-span-5 flex flex-col gap-6">
        <div class="bg-primary-container text-white p-6 rounded-xl shadow-sm">
          <div class="flex justify-between items-center mb-4 border-b border-white/20 pb-3">
            <span class="font-label-caps text-label-caps uppercase">Sample Answer</span>
            <button class="speakable flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-full text-sm font-bold" data-speak="${escapeHtml(section.sampleAnswer)}">
              ${materialIcon("volume_up", "text-lg")} Listen
            </button>
          </div>
          <p class="font-body-lg text-base leading-relaxed text-on-primary-container">${escapeHtml(section.sampleAnswer)}</p>
        </div>
        ${section.sampleAnswerTranslation ? `
          <details class="bg-surface-container-low border border-outline-variant p-6 rounded-xl">
            <summary class="cursor-pointer font-h3 text-lg text-primary-container">Nghĩa tiếng Việt</summary>
            <p class="font-body-md text-on-surface-variant mt-3">${escapeHtml(section.sampleAnswerTranslation)}</p>
          </details>
        ` : ""}
      </div>
    </div>
  `;
}

function renderCheckpoint(section) {
  const lessonId = section.lesson?.id || "";
  const completed = isLessonCompleted(lessonId);
  return `
    ${renderHeader(section)}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 space-y-6 mcq-group" data-count="${section.questions.length}">
        ${section.questions.map((question, questionIndex) => `
          <div class="mcq-question p-6 bg-white border border-outline-variant rounded-xl shadow-sm space-y-4" data-question-id="${escapeHtml(question.id)}">
            <p class="font-h3 text-lg text-primary italic">${questionIndex + 1}. ${escapeHtml(question.prompt)}</p>
            <div class="grid grid-cols-1 gap-3">
              ${question.options.map((option, optionIndex) => `
                <button class="mcq-option flex items-center gap-2 p-4 border border-outline-variant rounded hover:bg-indigo-50 text-left transition-all" data-correct="${optionIndex === question.correct}">
                  ${materialIcon("radio_button_unchecked", "text-outline icon-state text-lg")}
                  <span>${optionLabel(optionIndex)}. ${escapeHtml(option)}</span>
                </button>
              `).join("")}
            </div>
          </div>
        `).join("")}
        <div class="mt-8 flex justify-end">
          <button disabled class="btn-check-all-mcq bg-primary text-white font-bold py-3 px-8 md:py-4 md:px-12 rounded-lg opacity-50 cursor-not-allowed transition-all shadow-md flex items-center gap-3 w-full sm:w-auto justify-center">
            Check All Answers
            ${materialIcon("done_all", "text-sm md:text-base")}
          </button>
        </div>
      </div>
      <div class="lg:col-span-4 flex flex-col gap-6">
        <button data-complete-lesson="${escapeHtml(lessonId)}" id="btn-complete-${escapeHtml(lessonId)}" class="flex items-center justify-center gap-3 font-bold py-4 px-8 rounded-lg shadow-md transition-all ${completed ? "bg-green-600 text-white" : "bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-white"}">
          ${materialIcon(completed ? "task_alt" : "flag", "text-xl")}
          <span class="complete-label uppercase">${completed ? "Lesson Completed" : "Mark as Completed"}</span>
        </button>
        ${renderNextStepCard(section.nextStep)}
        ${renderTip(section.tip)}
      </div>
    </div>
  `;
}

function renderSection(section, index) {
  const renderers = {
    intro: renderIntro,
    vocabulary: renderVocabulary,
    synonyms: renderSynonyms,
    grammar: renderGrammar,
    mcq: renderMcq,
    "drag-drop": renderDragDrop,
    reading: renderReading,
    writing: renderWriting,
    speaking: renderSpeaking,
    checkpoint: renderCheckpoint
  };

  return `
    <section id="slide-${index + 1}" class="slide-section ${index === 0 ? "active" : ""} w-full" data-section-id="${escapeHtml(section.id)}" data-section-type="${escapeHtml(section.type)}" data-nav="${escapeHtml(section.nav)}">
      ${renderers[section.type](section)}
      ${section.sectionIndex === section.lesson.sections.length - 1 && section.type !== "checkpoint" ? renderLessonCompletionPanel(section.lesson) : ""}
    </section>
  `;
}

function renderDeck(lessons) {
  state.lessons = lessons;
  state.sections = lessons.flatMap((lesson, lessonIndex) =>
    lesson.sections.map((section, sectionIndex) => ({
      ...section,
      lesson,
      lessonIndex,
      sectionIndex
    }))
  );
  state.currentSlide = 1;
  state.totalSlides = state.sections.length;

  document.title = "English Academic Deck";

  updateHeaderForCurrentSlide();

  const root = document.getElementById("lesson-root");
  root.innerHTML = state.sections.map(renderSection).join("");

  renderModulesMenu();
  bindLessonEvents();
  updateUI();
}

function getCollapsedTracks() {
  try {
    return JSON.parse(localStorage.getItem("aptis_collapsedTracks") || "[]");
  } catch (e) {
    return [];
  }
}

function setTrackCollapsed(trackId, collapsed) {
  try {
    const collapsedTracks = getCollapsedTracks();
    const index = collapsedTracks.indexOf(trackId);
    if (collapsed && index === -1) collapsedTracks.push(trackId);
    if (!collapsed && index !== -1) collapsedTracks.splice(index, 1);
    localStorage.setItem("aptis_collapsedTracks", JSON.stringify(collapsedTracks));
  } catch (e) {
    // ignore storage errors
  }
}

function applyTrackVisibility(menuList, trackId, collapsed) {
  const header = menuList.querySelector(`[data-track-header="${trackId}"]`);
  const group = menuList.querySelector(`[data-track-group="${trackId}"]`);
  if (!header || !group) return;
  group.classList.toggle("hidden", collapsed);
  const chevron = header.querySelector(".track-chevron");
  if (chevron) chevron.style.transform = collapsed ? "rotate(-90deg)" : "rotate(0deg)";
}

function renderModulesMenu() {
  const menuList = document.getElementById("modules-list");
  if (!menuList || !state.lessons.length) return;

  let slideStart = 1;
  let lessonPointer = 0;
  let globalIndex = 0;
  let html = `<div class="max-h-[55vh] overflow-y-auto pr-1 flex flex-col gap-2" id="tracks-scroll">`;

  const tracks = state.tracks && state.tracks.length
    ? state.tracks
    : [{ id: "all", label: "Modules", lessons: state.lessons.map(() => "") }];

  tracks.forEach(track => {
    const trackCount = track.lessons.length;
    if (!trackCount) return;
    const collapsed = getCollapsedTracks().includes(track.id);
    html += `
      <button data-track-header="${track.id}" class="flex items-center justify-between w-full p-3 rounded-lg bg-surface-container-low hover:bg-primary/5 transition-all text-left">
        <span class="font-label-caps text-label-caps text-primary uppercase tracking-widest">${escapeHtml(track.label)}</span>
        <span class="flex items-center gap-2">
          <span class="text-[10px] text-outline font-label-caps">${trackCount}</span>
          ${materialIcon("keyboard_arrow_down", "track-chevron text-outline transition-transform duration-200")}
        </span>
      </button>
      <div data-track-group="${track.id}" class="flex flex-col gap-2 ${collapsed ? "hidden" : ""}">
    `;
    for (let i = 0; i < trackCount; i += 1) {
      const lesson = state.lessons[lessonPointer];
      if (!lesson) break;
      lessonPointer += 1;
      globalIndex += 1;
      const start = slideStart;
      slideStart += lesson.sections.length;
      const completed = isLessonCompleted(lesson.id);
      html += `
        <button data-module-slide="${start}" class="flex items-center gap-4 p-4 rounded-xl border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all text-left">
          ${materialIcon(lesson.themeIcon, "text-primary text-3xl")}
          <div class="flex-grow">
            <p class="font-bold text-primary text-base">Module ${globalIndex}</p>
            <p class="text-sm text-on-surface-variant">${escapeHtml(lesson.title)}</p>
          </div>
          ${completed ? materialIcon("check_circle", "text-green-600") : ""}
        </button>
      `;
    }
    html += `</div>`;
  });

  html += `</div>`;
  menuList.innerHTML = html;

  menuList.querySelectorAll("[data-module-slide]").forEach(button => {
    button.addEventListener("click", () => selectModule(Number(button.dataset.moduleSlide)));
  });

  menuList.querySelectorAll("[data-track-header]").forEach(header => {
    const trackId = header.dataset.trackHeader;
    applyTrackVisibility(menuList, trackId, getCollapsedTracks().includes(trackId));
    header.addEventListener("click", () => {
      const collapsed = !getCollapsedTracks().includes(trackId);
      setTrackCollapsed(trackId, collapsed);
      applyTrackVisibility(menuList, trackId, collapsed);
    });
  });
}

function bindLessonEvents() {
  document.querySelectorAll(".flip-card").forEach(card => {
    card.addEventListener("click", event => {
      card.classList.toggle("flipped");
      speakText(card.dataset.speak, event);
    });
  });

  document.querySelectorAll(".speakable").forEach(element => {
    element.addEventListener("click", event => speakText(element.dataset.speak, event));
  });

  document.querySelectorAll(".mcq-option").forEach(button => {
    button.addEventListener("click", () => selectMCQ(button));
  });

  document.querySelectorAll(".btn-check-all-mcq").forEach(button => {
    button.addEventListener("click", checkAllMCQ);
  });

  document.querySelectorAll(".reading-blank").forEach(blank => {
    blank.addEventListener("change", checkReadingReady);
  });

  document.querySelectorAll(".btn-check-reading").forEach(button => {
    button.addEventListener("click", checkReading);
  });

  document.querySelectorAll("[data-complete-lesson]").forEach(button => {
    button.addEventListener("click", () => {
      const lessonId = button.dataset.completeLesson;
      if (!lessonId) return;
      const nowCompleted = !isLessonCompleted(lessonId);
      setLessonCompleted(lessonId, nowCompleted);
      button.classList.toggle("bg-green-600", nowCompleted);
      button.classList.toggle("text-white", nowCompleted);
      button.classList.toggle("bg-secondary-container", !nowCompleted);
      button.classList.toggle("text-on-secondary-container", !nowCompleted);
      button.classList.toggle("hover:bg-secondary", !nowCompleted);
      button.classList.toggle("hover:text-white", !nowCompleted);
      const icon = button.querySelector(".material-symbols-outlined");
      if (icon) icon.textContent = nowCompleted ? "task_alt" : "flag";
      const label = button.querySelector(".complete-label");
      if (label) label.textContent = nowCompleted ? "Lesson Completed" : "Mark as Completed";
      renderModulesMenu();
    });
  });

  bindDragDrop();
  bindWritingCounter();
}

function bindDragDrop() {
  // Global drag handlers for any draggable item
  document.querySelectorAll(".drag-item").forEach(item => {
    item.addEventListener("click", function () {
      const previous = state.selectedMatchItem;
      if (previous && previous !== this) {
        previous.classList.remove("ring-2", "ring-secondary", "bg-secondary-container/20");
        previous.setAttribute("aria-pressed", "false");
      }
      state.selectedMatchItem = previous === this ? null : this;
      this.classList.toggle("ring-2", state.selectedMatchItem === this);
      this.classList.toggle("ring-secondary", state.selectedMatchItem === this);
      this.classList.toggle("bg-secondary-container/20", state.selectedMatchItem === this);
      this.setAttribute("aria-pressed", String(state.selectedMatchItem === this));
    });
    item.addEventListener("dragstart", function () {
      state.draggedItem = this;
      setTimeout(() => {
        this.style.opacity = "0.5";
      }, 0);
    });

    item.addEventListener("dragend", function () {
      setTimeout(() => {
        this.style.opacity = "1";
        state.draggedItem = null;
      }, 0);
    });
  });

  // Global drop zones
  document.querySelectorAll(".drop-zone").forEach(zone => {
    zone.addEventListener("dragover", event => event.preventDefault());
    zone.addEventListener("drop", function (event) {
      event.preventDefault();
      if (!state.draggedItem) return;
      this.appendChild(state.draggedItem);
      this.classList.remove("border-dashed");
      this.classList.add("border-solid", "border-primary");
    });
    zone.addEventListener("click", function () {
      if (!state.selectedMatchItem) return;
      this.appendChild(state.selectedMatchItem);
      this.classList.remove("border-dashed");
      this.classList.add("border-solid", "border-primary");
      state.selectedMatchItem.classList.remove("ring-2", "ring-secondary", "bg-secondary-container/20");
      state.selectedMatchItem.setAttribute("aria-pressed", "false");
      state.selectedMatchItem = null;
    });
  });

  // Bind check/reset buttons scoped per section (IDs include section id suffix)
  document.querySelectorAll("[id^='btn-check-matching-']").forEach(button => {
    const sectionId = button.id.replace("btn-check-matching-", "");
    button.addEventListener("click", () => checkMatching(sectionId));
  });

  document.querySelectorAll("[id^='btn-reset-matching-']").forEach(button => {
    const sectionId = button.id.replace("btn-reset-matching-", "");
    button.addEventListener("click", () => resetMatching(sectionId));
  });
}

function bindWritingCounter() {
  document.querySelectorAll(".writing-input-text").forEach(writingInput => {
    const counter = writingInput.closest(".slide-section")?.querySelector(".word-counter");
    if (!counter) return;

    writingInput.addEventListener("input", function () {
      const maxWords = Number(this.dataset.maxWords || 0);
      const words = this.value.trim().split(/\s+/).filter(word => word.length > 0);
      counter.textContent = words.length;
      if (maxWords && words.length > maxWords) {
        counter.classList.add("text-error");
        counter.classList.remove("text-primary");
      } else {
        counter.classList.remove("text-error");
        counter.classList.add("text-primary");
      }
      const status = this.closest(".slide-section")?.querySelector(".draft-status");
      if (this.dataset.draftKey && saveWritingDraft(this.dataset.draftKey, this.value)) {
        if (status) status.textContent = "Draft saved.";
      } else if (status) {
        status.textContent = "Draft could not be saved in this browser.";
      }
    });
  });
}

function speakText(text, event, ipa = null) {
  if (!text) return;
  if (event) event.stopPropagation();

  if (ipa && event?.currentTarget) {
    const ipaDisplay = event.currentTarget.querySelector(".ipa-display");
    if (ipaDisplay) {
      ipaDisplay.textContent = ipa;
      ipaDisplay.classList.toggle("hidden");
    }
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.lang === "en-US" && voice.name.includes("Samantha"));
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
    return;
  }

  const encodedText = encodeURIComponent(text);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-US&client=tw-ob&q=${encodedText}`;
  if (state.currentAudio) state.currentAudio.pause();
  state.currentAudio = new Audio(url);
  state.currentAudio.play().catch(() => {});
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = function () {};
}

function updateUI() {
  for (let i = 1; i <= state.totalSlides; i += 1) {
    const slide = document.getElementById(`slide-${i}`);
    if (slide) slide.classList.toggle("active", i === state.currentSlide);
  }

  const progressBar = document.getElementById("progress-fill");
  if (progressBar && state.totalSlides) {
    progressBar.style.width = `${(state.currentSlide / state.totalSlides) * 100}%`;
  }

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  if (btnPrev) btnPrev.disabled = state.currentSlide === 1;
  if (btnNext) btnNext.disabled = state.currentSlide === state.totalSlides;

  updateHeaderForCurrentSlide();

  const section = state.sections[state.currentSlide - 1];
  if (section) updateNav(section);
}

function updateHeaderForCurrentSlide() {
  const section = state.sections[state.currentSlide - 1];
  const lesson = section?.lesson || state.lessons[0];
  if (!lesson) return;

  const headerTitle = document.getElementById("header-title");
  if (headerTitle) headerTitle.textContent = lesson.title;

  const headerIcon = document.querySelector("[data-icon='lesson-theme']");
  if (headerIcon) headerIcon.textContent = lesson.themeIcon || "school";
}

function updateNav(section) {
  const navItems = {
    vocabulary: document.getElementById("nav-vocab"),
    grammar: document.getElementById("nav-grammar"),
    exercise: document.getElementById("nav-exercise")
  };
  const inactiveClass = "nav-item text-gray-500 font-serif antialiased hover:bg-indigo-50 transition-colors px-2 cursor-pointer rounded";
  const activeClass = "nav-item text-indigo-900 font-bold font-serif antialiased cursor-pointer px-2 rounded transition-colors";

  Object.entries(navItems).forEach(([nav, element]) => {
    if (!element) return;
    const active = nav === section.nav || (nav === "exercise" && ["reading", "writing"].includes(section.nav));
    element.className = active ? activeClass : inactiveClass;
  });
}

function requireAccount() {
  if (state.user) return true;
  window.location.assign("login.html");
  return false;
}

function changeSlide(direction) {
  if (!requireAccount()) return;
  const newSlide = state.currentSlide + direction;
  if (newSlide >= 1 && newSlide <= state.totalSlides) {
    state.currentSlide = newSlide;
    updateUI();
    try {
      localStorage.setItem("aptis_lastSlide", String(state.currentSlide));
    } catch (e) {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}


function goToSlide(slideNum) {
  if (!requireAccount()) return;
  if (slideNum >= 1 && slideNum <= state.totalSlides) {
    state.currentSlide = slideNum;
    updateUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function navigateToSection(sectionName) {
  const wantedTypes = sectionNavMap[sectionName] || [sectionName];
  const activeSection = state.sections[state.currentSlide - 1];
  const activeLessonIndex = activeSection?.lessonIndex ?? 0;
  let index = state.sections.findIndex(section => section.lessonIndex === activeLessonIndex && wantedTypes.includes(section.type));
  if (index < 0) {
    index = state.sections.findIndex(section => wantedTypes.includes(section.type));
  }
  if (index >= 0) goToSlide(index + 1);
}

function toggleModulesMenu() {
  const menu = document.getElementById("modules-menu");
  const content = document.getElementById("modules-content");
  if (!menu || !content) return;

  if (menu.classList.contains("hidden")) {
    menu.classList.remove("hidden");
    setTimeout(() => content.classList.remove("translate-y-full"), 10);
  } else {
    content.classList.add("translate-y-full");
    setTimeout(() => menu.classList.add("hidden"), 300);
  }
}

function selectModule(startSlideNum) {
  goToSlide(startSlideNum);
  toggleModulesMenu();
}

function hideWelcome() {
  const screen = document.getElementById("welcome-screen");
  if (screen) screen.classList.add("hidden");
  document.body.classList.remove("welcome-active");
}

function startFromWelcome(slideNum) {
  if (!requireAccount()) return;
  hideWelcome();
  goToSlide(slideNum);
}

function renderWelcome() {
  const screen = document.getElementById("welcome-screen");
  const content = document.getElementById("welcome-content");
  if (!screen || !content) return;

  let slideStart = 1;
  let moduleIndex = 0;
  const cards = [];
  const tracks = state.tracks && state.tracks.length
    ? state.tracks
    : [{ id: "all", label: "Modules", lessons: state.lessons.map(() => "") }];

  tracks.forEach(track => {
    track.lessons.forEach(() => {
      const lesson = state.lessons[moduleIndex];
      if (!lesson) return;
      const start = slideStart;
      slideStart += lesson.sections.length;
      moduleIndex += 1;
      const completed = isLessonCompleted(lesson.id);
      cards.push(`
        <button data-welcome-slide="${start}" class="group flex items-center gap-4 w-full p-4 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant dark:border-slate-700 hover:border-primary dark:hover:border-amber-400 hover:bg-primary/5 transition-all text-left active:scale-[0.98]">
          <span class="w-11 h-11 shrink-0 rounded-full bg-primary-container dark:bg-indigo-900 flex items-center justify-center">
            ${materialIcon(lesson.themeIcon, "text-on-primary dark:text-amber-400 text-2xl")}
          </span>
          <span class="flex-grow">
            <span class="block font-label-caps text-label-caps text-secondary dark:text-amber-400 uppercase tracking-widest mb-0.5">Module ${moduleIndex}</span>
            <span class="block font-bold text-primary dark:text-slate-100 text-base">${escapeHtml(lesson.title)}</span>
          </span>
          ${completed ? materialIcon("check_circle", "text-green-600") : materialIcon("chevron_right", "text-outline group-hover:text-primary dark:group-hover:text-amber-400 transition-colors")}
        </button>
      `);
    });
  });

  let saved = null;
  try {
    const value = Number(localStorage.getItem("aptis_lastSlide"));
    if (value && Number.isFinite(value) && value >= 1 && value <= state.totalSlides) saved = value;
  } catch (e) {
    // ignore
  }

  const welcomeSubtitle = state.user ? "Select a module to start learning" : "Log in to access your lessons and save your progress.";

  content.innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-2">
      <div class="flex items-center gap-2">
        <button id="welcome-logout-button" type="button" hidden class="order-2 px-4 py-2 rounded-full border border-primary text-primary dark:border-amber-400 dark:text-amber-400 text-sm font-bold hover:bg-primary/5 dark:hover:bg-white/10 transition-colors">Log out</button>
        ${state.user ? `<span class="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold tracking-wide text-primary shadow-sm dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">${escapeHtml(state.user.displayName)}</span>` : `<a href="login.html" class="px-4 py-2 rounded-full bg-primary dark:bg-indigo-900 text-on-primary dark:text-amber-400 text-sm font-bold hover:bg-primary-container dark:hover:bg-indigo-800 transition-colors">Log in</a>`}
      </div>
      <div class="flex items-center gap-1">
      <a
        href="https://hoangdm.com"
        class="p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors text-indigo-900 dark:text-amber-400 flex items-center justify-center"
        title="Về trang chủ"
      >
        <span class="material-symbols-outlined">home</span>
      </a>
      <button
        onclick="toggleDarkMode()"
        class="p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors text-indigo-900 dark:text-amber-400 flex items-center justify-center"
        title="Chuyển chế độ Sáng/Tối"
      >
        <span id="welcome-theme-icon" class="material-symbols-outlined">light_mode</span>
      </button>
      </div>
    </div>
    <div class="text-center mb-8">
      <span class="inline-flex w-16 h-16 rounded-full bg-primary-container dark:bg-indigo-900 items-center justify-center mb-4">
        ${materialIcon("school", "text-on-primary dark:text-amber-400 text-4xl")}
      </span>
      <h1 class="font-h1 text-3xl md:text-4xl text-primary dark:text-slate-100 mb-2">English Academic Deck</h1>
      <div class="w-16 h-1 bg-secondary-container mx-auto mb-4"></div>
      <p class="font-body-md text-on-surface-variant dark:text-slate-400">${welcomeSubtitle}</p>
    </div>
    ${saved ? `
      <button data-welcome-continue="${saved}" class="flex items-center justify-center gap-2 w-full p-4 mb-4 rounded-xl bg-primary dark:bg-indigo-900 text-on-primary dark:text-amber-400 font-bold hover:bg-primary-container dark:hover:bg-indigo-800 transition-all active:scale-[0.98]">
        ${materialIcon("play_arrow", "text-xl")}
        <span>Continue learning</span>
      </button>
    ` : ""}
    <div class="flex flex-col gap-3">${cards.join("")}</div>
  `;

  content.querySelectorAll("[data-welcome-slide]").forEach(button => {
    button.addEventListener("click", () => startFromWelcome(Number(button.dataset.welcomeSlide)));
  });
  const continueBtn = content.querySelector("[data-welcome-continue]");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => startFromWelcome(Number(continueBtn.dataset.welcomeContinue)));
  }
  const welcomeLogout = content.querySelector("#welcome-logout-button");
  if (welcomeLogout) {
    welcomeLogout.hidden = !state.user;
    welcomeLogout.addEventListener("click", () => { void logout(); });
  }

  screen.classList.remove("hidden");
  document.body.classList.add("welcome-active");

  const welcomeThemeIcon = document.getElementById("welcome-theme-icon");
  if (welcomeThemeIcon) {
    welcomeThemeIcon.textContent = document.documentElement.classList.contains("dark") ? "dark_mode" : "light_mode";
  }
}

function selectMCQ(btn) {
  const container = btn.closest(".mcq-question");
  if (!container) return;
  container.classList.remove("answered");

  const options = container.querySelectorAll(".mcq-option");
  options.forEach(option => {
    option.classList.remove("border-2", "border-primary", "bg-primary/5", "border-green-600", "bg-green-50", "border-red-500", "bg-red-50");
    option.classList.add("border-outline-variant");
    option.removeAttribute("data-selected");

    const icon = option.querySelector(".icon-state");
    if (icon) {
      icon.textContent = "radio_button_unchecked";
      icon.classList.remove("text-primary", "text-green-600", "text-red-500");
    }

    option.querySelectorAll("span").forEach(span => {
      span.classList.remove("font-bold", "text-primary", "text-green-700", "text-red-700");
    });
  });

  btn.classList.remove("border-outline-variant");
  btn.classList.add("border-2", "border-primary", "bg-primary/5");
  btn.setAttribute("data-selected", "true");
  const icon = btn.querySelector(".icon-state");
  if (icon) {
    icon.textContent = "radio_button_checked";
    icon.classList.add("text-primary");
  }
  btn.querySelectorAll("span").forEach(span => span.classList.add("font-bold", "text-primary"));

  const currentSection = document.querySelector(".slide-section.active");
  const unanswered = currentSection?.querySelectorAll(".mcq-question:not(.answered)") || [];
  const allAnswered = Array.from(currentSection?.querySelectorAll(".mcq-question") || []).every(question => question.querySelector(".mcq-option[data-selected='true']"));
  const checkAllButton = currentSection?.querySelector(".btn-check-all-mcq");
  if (checkAllButton && allAnswered && unanswered.length) {
    checkAllButton.disabled = false;
    checkAllButton.classList.remove("opacity-50", "cursor-not-allowed");
    checkAllButton.classList.add("hover:scale-95", "hover:bg-primary-container");
    checkAllButton.style.display = "flex";
  }
}

function checkMCQ(container) {
  if (!container) return;
  container.classList.add("answered");

  container.querySelectorAll(".mcq-option").forEach(option => {
    const icon = option.querySelector(".icon-state");
    const textSpans = option.querySelectorAll("span");
    if (option.getAttribute("data-selected") !== "true") return;

    if (option.getAttribute("data-correct") === "true") {
      option.classList.remove("border-outline-variant", "border-primary", "bg-primary/5");
      option.classList.add("border-2", "border-green-600", "bg-green-50");
      if (icon) {
        icon.textContent = "check_circle";
        icon.classList.remove("text-primary", "text-outline");
        icon.classList.add("text-green-600");
      }
      textSpans.forEach(span => {
        span.classList.add("font-bold", "text-green-700");
        span.classList.remove("text-primary");
      });
    } else {
      option.classList.remove("border-primary", "bg-primary/5");
      option.classList.add("border-2", "border-red-500", "bg-red-50");
      if (icon) {
        icon.textContent = "cancel";
        icon.classList.remove("text-primary", "text-outline");
        icon.classList.add("text-red-500");
      }
      textSpans.forEach(span => {
        span.classList.add("font-bold", "text-red-700");
        span.classList.remove("text-primary");
      });
    }
  });
}

function checkAllMCQ() {
  const currentSection = document.querySelector(".slide-section.active");
  currentSection?.querySelectorAll(".mcq-question").forEach(container => {
    checkMCQ(container);
  });

  const button = currentSection?.querySelector(".btn-check-all-mcq");
  if (button) button.style.display = "none";
}

function checkReadingReady() {
  const blanks = document.querySelectorAll(".slide-section.active .reading-blank");
  let allFilled = true;

  blanks.forEach(blank => {
    if (!blank.value) allFilled = false;
    if (!blank.disabled && blank.classList.contains("text-red-700")) {
      blank.classList.remove("text-red-700", "bg-red-100", "border-red-500");
      blank.classList.add("text-primary", "bg-primary-fixed/10", "border-primary-fixed-dim");
    }
  });

  const button = document.querySelector(".slide-section.active .btn-check-reading");
  if (allFilled && button) {
    button.disabled = false;
    button.classList.remove("opacity-50", "cursor-not-allowed");
    button.classList.add("hover:scale-95");
    button.textContent = "CHECK ANSWERS";
  }
}

function checkReading() {
  const blanks = document.querySelectorAll(".slide-section.active .reading-blank");
  let allCorrect = true;

  blanks.forEach(blank => {
    blank.classList.remove("text-primary", "bg-primary-fixed/10", "border-primary-fixed-dim", "text-red-700", "bg-red-100", "border-red-500");
    if (blank.value === blank.getAttribute("data-correct")) {
      blank.classList.add("text-green-700", "bg-green-100", "border-green-500");
      blank.disabled = true;
    } else {
      blank.classList.add("text-red-700", "bg-red-100", "border-red-500");
      blank.disabled = false;
      allCorrect = false;
    }
  });

  const button = document.querySelector(".slide-section.active .btn-check-reading");
  if (!button) return;
  if (allCorrect) {
    button.style.display = "none";
  } else {
    button.textContent = "TRY AGAIN";
    button.disabled = true;
    button.classList.add("opacity-50", "cursor-not-allowed");
    button.classList.remove("hover:scale-95");
  }
}

function checkMatching(sectionId) {
  const root = sectionId ? document.querySelector(`.slide-section[data-section-id="${sectionId}"]`) : document.querySelector('.slide-section.active');
  if (!root) return;
  root.querySelectorAll(".drop-zone").forEach(zone => {
    const targetMatch = zone.dataset.match;
    Array.from(zone.children).forEach(item => {
      item.classList.remove("bg-white", "border-primary", "text-primary", "bg-green-100", "border-green-500", "text-green-800", "bg-red-50", "border-red-500", "text-red-700");
      if (item.dataset.match === targetMatch) {
        item.classList.add("bg-green-100", "border-green-500", "text-green-800");
      } else {
        item.classList.add("bg-red-50", "border-red-500", "text-red-700");
      }
    });
  });
}

function resetMatching(sectionId) {
  const root = sectionId ? document.querySelector(`.slide-section[data-section-id="${sectionId}"]`) : document.querySelector('.slide-section.active');
  if (!root) return;
  const container = root.querySelector(`#draggables-container-${sectionId}`) || root.querySelector("[id^='draggables-container-']");
  if (!container) return;

  root.querySelectorAll(".drop-zone").forEach(zone => {
    Array.from(zone.children).forEach(item => {
      item.classList.remove("bg-green-100", "border-green-500", "text-green-800", "bg-red-50", "border-red-500", "text-red-700");
      item.classList.add("bg-white", "border-primary", "text-primary");
      container.appendChild(item);
    });
    zone.classList.add("border-dashed");
    zone.classList.remove("border-solid", "border-primary");
  });

  // Shuffle container children
  const items = Array.from(container.children);
  for (const it of items.sort(() => Math.random() - 0.5)) container.appendChild(it);
}

function toggleDarkMode() {
  const html = document.documentElement;
  const icon = document.getElementById("theme-icon");
  const welcomeIcon = document.getElementById("welcome-theme-icon");
  const nextIcon = html.classList.contains("dark") ? "light_mode" : "dark_mode";

  if (html.classList.contains("dark")) {
    html.classList.remove("dark");
    html.classList.add("light");
  } else {
    html.classList.remove("light");
    html.classList.add("dark");
  }
  if (icon) icon.textContent = nextIcon;
  if (welcomeIcon) welcomeIcon.textContent = nextIcon;
  localStorage.setItem("theme", html.classList.contains("dark") ? "dark" : "light");
}

async function loadLesson() {
  const root = document.getElementById("lesson-root");
  try {
    // Load curriculum (tracks object or legacy array of lesson URLs)
    const curriculumResp = await fetch(CURRICULUM_URL);
    if (!curriculumResp.ok) throw new Error(`Unable to load curriculum`);
    const curriculumData = await curriculumResp.json();
    const tracks = Array.isArray(curriculumData)
      ? [{ id: "all", label: "Modules", lessons: curriculumData }]
      : curriculumData.tracks;
    state.tracks = tracks;
    const urls = tracks.flatMap(track => track.lessons);
    const lessons = await Promise.all(urls.map(async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Unable to load ${url}`);
      return response.json();
    }));
    await restoreAccountState();
    renderDeck(lessons);
    updateAuthButton();
    // Show welcome screen; user picks a module (or continues) from there
    renderWelcome();
  } catch (error) {
    if (root) {
      root.innerHTML = `
        <section class="slide-section active w-full">
          <div class="bg-error-container text-on-error-container p-6 rounded-xl border border-error">
            <h2 class="font-h2 text-2xl mb-2">Lesson failed to load</h2>
            <p class="font-body-md">${escapeHtml(error.message)}</p>
          </div>
        </section>
      `;
    }
  }
}

(function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.addEventListener("DOMContentLoaded", () => {
      const icon = document.getElementById("theme-icon");
      if (icon) icon.textContent = "dark_mode";
    });
  }
})();

document.addEventListener("DOMContentLoaded", () => { bindAuth(); loadLesson(); });

window.speakText = speakText;
window.updateUI = updateUI;
window.changeSlide = changeSlide;
window.goToSlide = goToSlide;
window.navigateToSection = navigateToSection;
window.toggleModulesMenu = toggleModulesMenu;
window.selectModule = selectModule;
window.selectMCQ = selectMCQ;
window.checkMCQ = checkMCQ;
window.checkMatching = checkMatching;
window.resetMatching = resetMatching;
window.toggleDarkMode = toggleDarkMode;
