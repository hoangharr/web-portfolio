import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const topicsDir = path.join(root, "data", "topics");
const lessonIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{2}$/;
const errors = [];

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

const curriculum = JSON.parse(await readFile(path.join(root, "data", "curriculum.json"), "utf8"));
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
  for (const section of lesson.sections) {
    const location = `${relativePath}#${section.id || "unknown"}`;
    if (!section.type) fail(location, "missing section type");

    if (section.type === "mcq" || section.type === "checkpoint" || section.type === "reading") {
      checkUnique(section.questions || [], location, question => question.id);
      for (const question of section.questions || []) {
        if (!Array.isArray(question.options) || question.options.length < 2) fail(`${location}/${question.id}`, "needs at least two options");
        if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= (question.options || []).length) {
          fail(`${location}/${question.id}`, "correct answer index is outside the option list");
        }
      }
    }

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

if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Content validation passed for ${topicFiles.length} lessons.`);
}
