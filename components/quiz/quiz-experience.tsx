"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/config/site";
import { PRICE_IQ, QUIZZES, SLANG_QUIZ, scoreQuiz, type QuizDefinition } from "@/lib/quiz-data";
import { shareLinks } from "@/lib/share";

const BEST_PREFIX = "naijacheck:quiz-best:v1:";
const quizById: Record<string, QuizDefinition> = { [PRICE_IQ.id]: PRICE_IQ, [SLANG_QUIZ.id]: SLANG_QUIZ };

function QuizPicker({ onChoose }: { onChoose: (quiz: QuizDefinition) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {QUIZZES.map((quiz) => (
        <button
          key={quiz.id}
          type="button"
          onClick={() => onChoose(quiz)}
          className="group rounded-xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{quiz.id === "price-iq" ? "Prices · FX · fuel" : "Words · meaning · context"}</span>
          <span className="mt-2 block text-xl font-bold">{quiz.title}</span>
          <span className="mt-2 block text-sm leading-6 text-muted-foreground">{quiz.description}</span>
          <span className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Start quiz</span>
        </button>
      ))}
    </div>
  );
}

function BestScore({ quiz, best }: { quiz: QuizDefinition; best: number | null }) {
  return best === null ? null : (
    <p className="text-sm text-muted-foreground">Best on this device: <strong className="text-foreground">{best}/{quiz.questions.length}</strong></p>
  );
}

function QuizPlayer({ quiz, onExit }: { quiz: QuizDefinition; onExit: () => void }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<(string | null)[]>(() => Array(quiz.questions.length).fill(null));
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const currentQuestion = quiz.questions[questionIndex];
  const answered = selected[questionIndex] !== null;
  const score = useMemo(() => scoreQuiz(quiz.questions, selected), [quiz.questions, selected]);
  const shareSummary = `I scored ${score}/${quiz.questions.length} in NaijaCheck ${quiz.title}. Try the quiz.`;
  const links = shareLinks({ title: `NaijaCheck ${quiz.title}`, summary: shareSummary, url: `${SITE_CONFIG.url}/tools/quiz` });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`${BEST_PREFIX}${quiz.id}`);
      const parsed = saved === null ? null : Number(saved);
      if (parsed !== null && Number.isInteger(parsed) && parsed >= 0 && parsed <= quiz.questions.length) setBest(parsed);
    } catch {
      // Storage may be unavailable; the quiz still works without it.
    }
  }, [quiz]);

  const choose = (answer: string) => {
    if (answered) return;
    setSelected((answers) => answers.map((value, index) => index === questionIndex ? answer : value));
  };

  const finish = () => {
    const finalScore = scoreQuiz(quiz.questions, selected);
    setFinished(true);
    setBest((previous) => {
      const next = previous === null ? finalScore : Math.max(previous, finalScore);
      try {
        window.localStorage.setItem(`${BEST_PREFIX}${quiz.id}`, String(next));
      } catch {
        // Best score is an optional convenience, never a condition of play.
      }
      return next;
    });
  };

  if (finished) {
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm" aria-labelledby="quiz-result-title">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">That’s your result</p>
        <h2 id="quiz-result-title" className="mt-2 text-3xl font-black">{score} / {quiz.questions.length}</h2>
        <p className="mt-2 text-muted-foreground">{score === quiz.questions.length ? "Sharp! You got every one." : score >= quiz.questions.length / 2 ? "Good work. The answer notes are there to help you learn." : "No wahala. Check the sourced notes and have another go."}</p>
        <div className="mt-3"><BestScore quiz={quiz} best={best} /></div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a className="inline-flex min-h-11 items-center rounded-md bg-[#128C7E] px-4 font-semibold text-white hover:opacity-90" href={links.whatsapp} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
          <a className="inline-flex min-h-11 items-center rounded-md border px-4 font-semibold hover:border-primary" href={links.x} target="_blank" rel="noopener noreferrer">Share on X</a>
          <button type="button" className="min-h-11 rounded-md border px-4 font-semibold hover:border-primary" onClick={() => { setQuestionIndex(0); setSelected(Array(quiz.questions.length).fill(null)); setFinished(false); }}>Play again</button>
          <button type="button" className="min-h-11 rounded-md px-4 font-semibold text-muted-foreground hover:text-foreground" onClick={onExit}>Choose another quiz</button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Sharing includes only your score and this quiz link. No account, email or public leaderboard.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="quiz-question-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{quiz.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">Question {questionIndex + 1} of {quiz.questions.length}</p>
        </div>
        <BestScore quiz={quiz} best={best} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((questionIndex + 1) / quiz.questions.length) * 100}%` }} /></div>
      <h2 id="quiz-question-title" className="mt-6 text-xl font-bold leading-snug sm:text-2xl">{currentQuestion.prompt}</h2>
      <div className="mt-5 grid gap-2">
        {currentQuestion.options.map((option) => {
          const isSelected = selected[questionIndex] === option;
          const isCorrect = answered && option === currentQuestion.answer;
          const isWrongPick = answered && isSelected && !isCorrect;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              disabled={answered}
              onClick={() => choose(option)}
              className={`min-h-12 rounded-lg border px-4 py-3 text-left text-sm leading-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default ${isCorrect ? "border-emerald-600 bg-emerald-500/10" : isWrongPick ? "border-rose-500 bg-rose-500/10" : isSelected ? "border-primary bg-primary/5" : "hover:border-primary"}`}
            >
              <span className="mr-2 font-bold">{isCorrect ? "✓" : isWrongPick ? "×" : "›"}</span>{option}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className="mt-5 rounded-lg border-l-4 border-primary bg-muted/50 p-4 text-sm leading-6">
          <p className="font-semibold">{selected[questionIndex] === currentQuestion.answer ? "Correct." : `The answer is: ${currentQuestion.answer}`}</p>
          <p className="mt-1">{currentQuestion.fact}</p>
          <p className="mt-2 text-muted-foreground"><strong className="text-foreground">Source:</strong> <a href={currentQuestion.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-primary underline-offset-2">{currentQuestion.source}</a> · <strong className="text-foreground">Date:</strong> {currentQuestion.date}</p>
          <Link href={currentQuestion.learnMore} className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Learn more →</Link>
        </div>
      ) : null}
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Score: {score}/{questionIndex + (answered ? 1 : 0)}</span>
        {answered ? <button type="button" className="min-h-11 rounded-md bg-primary px-5 font-semibold text-primary-foreground" onClick={() => questionIndex + 1 === quiz.questions.length ? finish() : setQuestionIndex(questionIndex + 1)}>{questionIndex + 1 === quiz.questions.length ? "See my score" : "Next question"}</button> : <span className="text-sm text-muted-foreground">Choose one answer to continue</span>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Your answers stay in this browser session. Best score is optional and saved only on this device.</p>
    </section>
  );
}

export function QuizExperience() {
  const [quiz, setQuiz] = useState<QuizDefinition | null>(null);
  return quiz ? <QuizPlayer key={quiz.id} quiz={quizById[quiz.id]} onExit={() => setQuiz(null)} /> : <QuizPicker onChoose={setQuiz} />;
}
