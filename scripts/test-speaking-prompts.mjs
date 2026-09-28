import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const speaking = name => JSON.parse(readFileSync(new URL(`../data/topics/${name}-01.json`, import.meta.url), 'utf8')).sections.find(section => section.type === 'speaking');

test('park activity prompt supplies a hypothetical setting and explicit response instructions', () => {
  const section = speaking('free-time-weather');
  assert.match(section.questions[2], /Imagine you and two friends.*park.*sunny day/);
  assert.match(section.questions[2], /Choose an activity for each friend.*each friend is doing now/);
  assert.ok(section.prompts.some(prompt => /Question 3, make up one activity for each of your two friends/.test(prompt)));
  assert.match(section.sampleAnswer, /One friend is playing football.*other friend is reading a book/);
  assert.ok(!section.questions.includes('What are people doing today?'));
});
test('directions have an origin and destination; follow-ups identify their referents', () => {
  assert.match(speaking('places-directions').questions[2], /from your home to that place/);
  assert.match(speaking('relationships-communication').questions[1], /person you described in Question 1/);
  assert.match(speaking('travel-transport').questions[1], /journey you described in Question 1/);
  assert.match(speaking('culture-entertainment').questions[1], /Imagine a friend recommended/);
});
