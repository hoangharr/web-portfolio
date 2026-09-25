import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const topicsDir = path.join(root, "data", "topics");
const lessonIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{2}$/;
const errors = [];
const warnings = [];
const strictMedia = process.env.STRICT_MEDIA === "1";

function fail(location, message) {
  errors.push(`${location}: ${message}`);
}

function checkUnique(items, location, getKey) {
  const seen = new Set();
  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      fail(location, "missing id");
    } else if (seen.has(key)) {
      fail(location, `duplicate id '${key}'`);
    } else {
      seen.add(key);
    }
  }
}

function checkAptisItem(question, location) {
  if (!Array.isArray(question.options) || question.options.length !== 3) {
    fail(location, "Aptis-style multiple-choice items need exactly three options");
    return;
  }
  const normalized = question.options.map(option => String(option).trim().toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) fail(location, "answer options must be distinct");
  if (typeof question.explanation !== "string" || question.explanation.trim().length < 40) {
    fail(location, "needs an explanation that identifies the contextual grammar or meaning clue");
  }
  if (/^The correct answer is/i.test(question.explanation || "")) {
    fail(location, "uses generic feedback instead of an item-specific rationale");
  }
  if (/^Which item belongs to the topic |^What is the text mainly demonstrating\?$/i.test(question.prompt || "")) {
    fail(location, "uses a topic-label trivia template instead of a language task");
  }
}

async function checkNeuralAudio(text, location) {
  const source = ttsManifest[text];
  if (!source) {
    warnings.push(`${location}: missing optional neural TTS asset for '${text}'`);
    return;
  }
  if (/^https?:\/\//i.test(source)) return;
  const audioPath = String(source).split("?")[0];
  try { await access(path.join(root, "public", audioPath)); }
  catch {
    const message = `${location}: neural TTS file does not exist: ${audioPath}`;
    if (strictMedia) errors.push(message); else warnings.push(message);
  }
}

const curriculum = JSON.parse(await readFile(path.join(root, "data", "curriculum.json"), "utf8"));
let ttsManifest = {};
try { ttsManifest = JSON.parse(await readFile(path.join(root, "data", "tts-manifest.json"), "utf8")); }
catch { warnings.push("data/tts-manifest.json: optional neural TTS manifest is not present"); }
const referencedLessons = new Set((curriculum.tracks || []).flatMap(track => track.lessons || []));
const topicFiles = (await readdir(topicsDir)).filter(file => file.endsWith(".json"));

for (const relativePath of referencedLessons) {
  if (!relativePath.startsWith("data/topics/")) fail("data/curriculum.json", `lesson path must be inside data/topics: ${relativePath}`);
}

for (const file of topicFiles) {
  const relativePath = `data/topics/${file}`;
  if (!referencedLessons.has(relativePath)) fail(relativePath, "lesson is not included in the curriculum");

  const lesson = JSON.parse(await readFile(path.join(topicsDir, file), "utf8"));
  if (!lessonIdPattern.test(lesson.id || "")) fail(relativePath, "lesson id must end with a two-digit version, e.g. work-career-01");
  if (!Array.isArray(lesson.sections) || lesson.sections.length === 0) {
    fail(relativePath, "lesson needs at least one section");
    continue;
  }

  checkUnique(lesson.sections, relativePath, section => section.id);
  const listeningSections = lesson.sections.filter(section => section.type === "listening");
  if (listeningSections.length !== 1) fail(relativePath, `lesson needs exactly one listening section; found ${listeningSections.length}`);
  for (const section of lesson.sections) {
    const location = `${relativePath}#${section.id || "unknown"}`;
    if (!section.type) fail(location, "missing section type");

    if (section.type === "mcq" || section.type === "checkpoint" || section.type === "reading" || section.type === "listening") {
      const groups = section.type === "listening" ? [section.gistQuestions || [], section.detailQuestions || []] : [section.questions || []];
      const questions = groups.flat();
      checkUnique(questions, location, question => question.id);
      for (const question of questions) {
        checkAptisItem(question, `${location}/${question.id}`);
        if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= (question.options || []).length) {
          fail(`${location}/${question.id}`, "correct answer index is outside the option list");
        }
      }
    }

    if (section.type === "listening") {
      if (!section.audio?.src || !section.audio?.transcript) fail(location, "listening needs an MP3 source and transcript");
      const audioPath = String(section.audio?.src || "").split("?")[0];
      if (!audioPath.startsWith("/audio/") || !audioPath.toLowerCase().endsWith(".mp3")) {
        fail(location, "listening audio must reference a fixed MP3 under /audio/");
      } else {
        try { await access(path.join(root, "public", audioPath)); }
        catch {
          const message = `${location}: listening audio file does not exist: ${audioPath}`;
          if (strictMedia) errors.push(message); else warnings.push(message);
        }
      }
    }

    if (section.type === "vocabulary") {
      for (const card of section.cards || []) await checkNeuralAudio(card.term, `${location}/vocabulary`);
    }
    if (section.type === "synonyms") {
      for (const row of section.rows || []) for (const word of row.advanced || []) await checkNeuralAudio(word, `${location}/synonyms`);
    }
    if (section.type === "speaking") await checkNeuralAudio(section.sampleAnswer, `${location}/sampleAnswer`);

    if (section.type === "drag-drop") {
      checkUnique(section.targets || [], location, target => target.id);
      checkUnique(section.items || [], location, item => item.id);
      const targetIds = new Set((section.targets || []).map(target => target.id));
      for (const item of section.items || []) {
        if (!targetIds.has(item.match)) fail(`${location}/${item.id}`, `match '${item.match}' has no target`);
      }
    }

    if (section.type === "writing") {
      const prompt = section.prompt || {};
      if (!Number.isInteger(prompt.minWords) || !Number.isInteger(prompt.maxWords) || prompt.minWords > prompt.maxWords) {
        fail(location, "writing prompt needs valid minWords and maxWords");
      }
    }
  }
}

if (warnings.length) console.warn(`Content validation warnings (${warnings.length}); run with STRICT_MEDIA=1 to enforce media coverage.`);
if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Content validation passed for ${topicFiles.length} lessons.`);
}
