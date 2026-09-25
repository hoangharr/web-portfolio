import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const topicsDir = path.join(root, "data", "topics");
const rationale = {
  state: "State a point means express it clearly and directly; delay and avoid describe actions that weaken an opening.",
  engage: "Engage the audience means hold their attention and involve them; bore and confuse have the opposite effect.",
  "I would say": "I would say softens an opinion and suits formal discussion; I know sounds certain, while I guess is informal.",
  capture: "Capture the audience means gain their attention at the start; avoid and reduce do not collocate with audience in this meaning.",
  "In addition": "In addition introduces a further supporting point; to conclude closes an argument, while at once expresses immediacy.",
  maintain: "Maintain eye contact is the established collocation for continuing visual contact; avoid and ignore reverse the intended behaviour.",
  "I would suggest": "I would suggest is a hedged, polite recommendation; I am certain and it is obvious express strong certainty instead.",
  summarizes: "A conclusion normally summarizes the main ideas; forgetting or avoiding them would not fulfil the purpose of a conclusion.",
  invested: "Would narrow marks a hypothetical result, so the if-clause takes the past form invested; would invest is not used in this clause.",
  had: "The speaker regrets a past lack of opportunities, so wish is followed by had; have and am having refer to present possession.",
  discipline: "An academic discipline is an established branch of knowledge. A curriculum is a programme, and a qualification is an award.",
  meet: "Meet the requirements is the standard collocation meaning satisfy them; get and fill do not carry that meaning here.",
  distance: "Distance learning is the fixed term for study away from a campus; far learning and remote learning are not the target collocation.",
  acquire: "Acquire skills means gain them through learning or experience; collect and hold do not express development of ability.",
  enroll: "Enroll in a course means officially join it. Register normally takes for here, while attend describes participation after joining.",
  development: "Continuous professional development is the established workplace term; growing and advancing do not complete this noun phrase.",
  "holistic approach": "A holistic approach considers connected physical, mental and social factors rather than treating one symptom in isolation.",
  "Preventive care": "Preventive care acts before illness develops; reactive treatment and emergency response happen after a problem appears.",
  "work-life balance": "Work-life balance describes a sustainable division between employment and personal life, matching the stress context.",
  "Mindfulness practice": "Mindfulness practice trains non-judgmental awareness of the present moment; the other activities do not define that process.",
  "nutritious diet": "A nutritious diet supplies the range of nutrients the body needs; fast food and a merely strict diet do not guarantee this.",
  "regular exercise routine": "A regular exercise routine provides repeated, planned activity; random or occasional activity does not ensure consistency.",
  Physician: "Physician is the formal professional term for a medical doctor; healer and nurse refer to different roles.",
  exhausted: "Exhausted means extremely tired and therefore fits the advice to rest; happy and excited do not indicate physical depletion.",
  Nutritious: "Nutritious describes food rich in useful nutrients; expensive and tasty describe price or flavour, not nutritional value.",
  Prevention: "Prevention means action taken to stop a problem before it occurs; treatment and medication respond to an existing condition.",
  "Digital transformation": "Digital transformation is organisation-wide change enabled by digital technology, not a single upgrade or installation.",
  "user-friendly interface": "A user-friendly interface is designed for ease of use; a complex system or difficult program contradicts that requirement.",
  "Cutting-edge technology": "Cutting-edge technology means the newest and most advanced available; old equipment and basic tools express the opposite.",
  "Data privacy": "Data privacy concerns control over the collection and use of personal information; public information and open access concern availability.",
  "Artificial intelligence": "Artificial intelligence performs tasks associated with human intelligence; manual labour and human resources are not computer systems.",
  "Seamless integration": "Seamless integration means systems work together without noticeable disruption; rough connection and difficult merger imply friction.",
  "data privacy": "Data privacy protects personal information and therefore supports customer trust; exposure and open access would weaken that protection.",
  breathtaking: "Breathtaking describes scenery so impressive that it leaves a strong emotional reaction; boring and tiring describe different experiences.",
  "cultural immersion": "Cultural immersion involves close participation in local life; shopping malls and fast food do not provide that depth of experience.",
  "off the beaten path": "Off the beaten path is the fixed expression for places away from common tourist routes; the other phrases are not idiomatic.",
  "Sustainable tourism": "Sustainable tourism aims to limit environmental harm and benefit local communities; luxury and budget describe cost or style.",
  cuisine: "Local cuisine means the food and cooking tradition of a place; menu is a list of dishes and waiter is a person.",
  itinerary: "A travel itinerary is the planned sequence of places and activities; insurance and passport are travel documents, not the plan.",
  establishment: "Establishment can formally refer to a hotel or business; airport and restaurant identify different types of place.",
  adventure: "Adventure describes an unusual, exciting experience such as discovering a waterfall; homework and meeting do not fit the journey context.",
  picturesque: "Picturesque describes an attractively old-fashioned scene; expensive and crowded concern cost or population rather than appearance.",
  unforgettable: "Unforgettable means impossible to forget and matches the fact that the group still discusses the trip years later.",
  pursue: "Pursue a career path is the standard collocation for actively following a professional direction; trace does not express that goal.",
  "hands-on": "Hands-on experience comes from doing practical work; theoretical and remote describe different ways of learning or working.",
  highly: "Highly motivated is the standard degree collocation; widely and absolutely do not normally modify motivated in this context.",
  pressure: "Work under pressure is the established expression for performing despite stress or deadlines; weight and control do not fit the collocation.",
  balance: "Work-life balance is the established term for managing professional and personal demands; equality and status do not complete it.",
  meet: "Meet a deadline means complete work by the required time; catch and finish do not form the target collocation with deadline."
};
const rationaleByItem = {
  "education-lifelong-learning-01.json:edu-vq2": "Meet the requirements is the standard collocation meaning satisfy every stated condition; get and fill do not carry that meaning here."
};

let updated = 0;
for (const file of (await readdir(topicsDir)).filter(name => name.endsWith(".json"))) {
  const filePath = path.join(topicsDir, file);
  const lesson = JSON.parse(await readFile(filePath, "utf8"));
  for (const section of lesson.sections) {
    for (const question of section.questions || []) {
      if (!question.explanation?.startsWith("The correct answer is")) continue;
      const answer = question.options[question.correct];
      const itemRationale = rationaleByItem[`${file}:${question.id}`] || rationale[answer];
      if (section.type === "reading") {
        question.explanation = `The passage directly supports “${answer}”; the other options either contradict its purpose or introduce information not stated in the text.`;
      } else if (itemRationale) {
        question.explanation = itemRationale;
      } else {
        throw new Error(`Missing editorial rationale for ${file}#${section.id}/${question.id}: ${answer}`);
      }
      updated += 1;
    }
  }
  await writeFile(filePath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
}
console.log(`Applied ${updated} hand-authored editorial rationales.`);
