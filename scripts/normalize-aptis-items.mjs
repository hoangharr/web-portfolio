import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const topicsDir = path.join(root, "data", "topics");

function allQuestions(section) {
  if (section.type === "listening") return [...(section.gistQuestions || []), ...(section.detailQuestions || [])];
  return section.questions || [];
}

let changed = 0;
for (const file of (await readdir(topicsDir)).filter(name => name.endsWith(".json"))) {
  const filePath = path.join(topicsDir, file);
  const lesson = JSON.parse(await readFile(filePath, "utf8"));
  let itemNumber = 0;
  for (const section of lesson.sections) {
    if (section.type === "reading" && Array.isArray(section.questions)) {
      const originalLength = section.questions.length;
      section.questions = section.questions.filter(question => !/^What is the text mainly demonstrating\?$/i.test(question.prompt));
      changed += originalLength - section.questions.length;
      section.passage.options = [...new Set(section.passage.options)];
    }
    if (section.type === "checkpoint" && Array.isArray(section.questions)) {
      const originalLength = section.questions.length;
      section.questions = section.questions.filter(question => !/^Which item belongs to the topic /i.test(question.prompt));
      changed += originalLength - section.questions.length;
    }
    for (const question of allQuestions(section)) {
      if (!Array.isArray(question.options)) continue;
      const correctAnswer = question.options[question.correct];
      const wrongAnswers = question.options.filter((option, index) => index !== question.correct && option !== correctAnswer);
      if (question.options.length !== 3) {
        const correctIndex = itemNumber % 3;
        question.options = [...wrongAnswers.slice(0, 2)];
        question.options.splice(correctIndex, 0, correctAnswer);
        question.correct = correctIndex;
        changed += 1;
      }
      if (!question.explanation) {
        throw new Error(`${file}#${section.id}/${question.id} needs a hand-authored explanation`);
      } else if (question.explanation.trim().length < 40) {
        throw new Error(`${file}#${section.id}/${question.id} needs a fuller hand-authored explanation`);
      }
      itemNumber += 1;
    }
  }
  await writeFile(filePath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
}

console.log(`Normalised Aptis-style item structure (${changed} changes).`);
