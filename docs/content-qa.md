# Content item QA

Every selected-response item must have one and only one defensible answer. Reviewers check the stem, options, answer key, explanation and—where relevant—the source transcript or passage.

## Acceptance criteria

- A grammar item has exactly one option that is grammatical in the stated context.
- A vocabulary item either uses a fixed grammatical frame or states enough meaning/register context to rule out every distractor.
- A reading/listening answer is supported by a specific passage/transcript detail; distractors must be contradicted, absent or answer a different question.
- Names never establish gender, nationality, relationship or other facts. The stem must state any information needed to choose a pronoun or possessive form.
- Matching targets do not overlap in meaning and every item has one valid target.
- Productive tasks specify required content, word/time range and assessment criteria rather than a single “correct” response.

## Revision log

| File | Item | Revision | Reason |
| --- | --- | --- | --- |
| `family-home-01.json` | `guided-practice/q3` | Added `She` before the possessive blank and removed the gender assumption from feedback. | “Hoa” does not establish gender in English. |
| `future-plans-01.json` | `guided-practice/q1` | Rewrote the prompt as `I ___ meeting …; it is already in my calendar` and changed distractors to incompatible auxiliary forms. | `meet` can also express a scheduled future event, so the former item had two plausible answers. |
| `work-career-01.json` | `sentence-completion/m1q1` | Rewrote the career sentence and replaced lexical near-synonyms with noun/-ing distractors. | `pursue` and `follow` can both describe a career path. |
| `work-career-01.json` | `sentence-completion/m1q3` | Replaced register/collocation distractors with adjective/noun forms. | The item now tests the required adverb form, not a subjective judgement about naturalness. |

## Regression guard

`npm run validate:content` now rejects explanations that infer gender from a name. New assessments must pass this validation and the acceptance criteria above before publication.
