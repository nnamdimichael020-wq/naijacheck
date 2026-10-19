import assert from "node:assert/strict";
import fs from "node:fs";
import { ARTICLES } from "@/lib/articles";
import { PRICE_IQ, QUIZZES, SLANG_QUIZ, scoreQuiz } from "@/lib/quiz-data";

const publicPaths = new Set(ARTICLES.map((article) => article.path));
const assertQuizHasValidQuestions = () => {
  assert.equal(QUIZZES.length, 2, "v1 has exactly two quizzes");
  assert.equal(PRICE_IQ.questions.length, 6, "Price IQ has six sourced questions");
  assert.equal(SLANG_QUIZ.questions.length, 8, "Slang Check has eight questions sourced from our slang data");
  for (const quiz of QUIZZES) {
    assert.ok(quiz.questions.length > 0, `${quiz.title} is not empty`);
    assert.equal(new Set(quiz.questions.map((question) => question.id)).size, quiz.questions.length, `${quiz.title} ids are unique`);
    for (const question of quiz.questions) {
      assert.ok(question.prompt.trim(), `${question.id}: question prompt is non-empty`);
      assert.ok(question.answer.trim(), `${question.id}: answer is non-empty`);
      assert.ok(question.options.length >= 3, `${question.id}: at least three options`);
      assert.ok(question.options.includes(question.answer), `${question.id}: answer must be one of its options`);
      assert.equal(new Set(question.options).size, question.options.length, `${question.id}: options are unique`);
      assert.ok(question.fact.trim(), `${question.id}: fact/explanation is non-empty`);
      assert.ok(question.source.trim(), `${question.id}: source is non-empty`);
      assert.ok(question.date.trim(), `${question.id}: date is non-empty`);
      assert.ok(/^https:\/\//.test(question.sourceUrl), `${question.id}: source URL is HTTPS`);
      assert.ok(question.learnMore.startsWith("/"), `${question.id}: learnMore is an internal path`);
      assert.ok(publicPaths.has(question.learnMore), `${question.id}: learnMore route ${question.learnMore} exists in the generated article corpus`);
    }
  }
  assert.ok(PRICE_IQ.questions.some((q) => q.source.includes("Central Bank of Nigeria")), "Price IQ includes the CBN reference source");
  assert.ok(PRICE_IQ.questions.some((q) => q.source.toLowerCase().includes("fuel")), "Price IQ includes a fuel source");
  assert.ok(SLANG_QUIZ.questions.every((q) => q.learnMore.startsWith("/trends/")), "slang questions link to trend detail pages");
  const playerSource = fs.readFileSync("components/quiz/quiz-experience.tsx", "utf8");
  const sidebarSource = fs.readFileSync("components/site-sidebar-frame.tsx", "utf8");
  const adsLoaderSource = fs.readFileSync("components/ads/adsense-loader.tsx", "utf8");
  const footerSource = fs.readFileSync("components/site-footer.tsx", "utf8");
  assert.ok(!playerSource.includes("AdSlot"), "the player does not place ads between quiz questions");
  assert.ok(sidebarSource.includes('pathname === "/tools/quiz"'), "the global sidebar/ad rail is excluded on the quiz hub");
  assert.ok(adsLoaderSource.includes('pathname === "/tools/quiz"'), "AdSense auto placements are not loaded on the quiz hub");
  assert.ok(footerSource.includes("quizPage ? null : <AdSlot"), "the shared footer ad is also excluded during quiz play");
};

const assertScoring = () => {
  const questions = [{ answer: "A" }, { answer: "B" }, { answer: "C" }, { answer: "D" }];
  assert.equal(scoreQuiz(questions, ["A", "B", "C", "D"]), 4, "all correct answers earn one point each");
  assert.equal(scoreQuiz(questions, ["A", "wrong", "C", null]), 2, "wrong and unanswered questions earn no points");
  assert.equal(scoreQuiz(questions, []), 0, "an empty response scores zero");
  assert.equal(scoreQuiz(questions, ["A", "B", "C", "D", "extra"]), 4, "extra responses do not add points");
  assert.equal(scoreQuiz([], []), 0, "an empty quiz scores zero");
};

assertQuizHasValidQuestions();
assertScoring();
console.log(`Quiz tests passed: ${PRICE_IQ.questions.length} Price IQ + ${SLANG_QUIZ.questions.length} Slang Check questions; every answer, source, date and learn-more route validated.`);
