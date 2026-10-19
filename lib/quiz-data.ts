import fxFile from "@/data/live/fx.json";
import fuelFile from "@/data/live/fuel.json";
import slangFile from "@/data/slang.json";
import { formatShareDate } from "@/lib/share";

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  fact: string;
  source: string;
  sourceUrl: string;
  date: string;
  learnMore: string;
};

export type QuizDefinition = {
  id: "price-iq" | "slang";
  title: string;
  description: string;
  questions: QuizQuestion[];
};

const money = (value: number, digits = 2) => `₦${value.toLocaleString("en-NG", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const date = (value: string) => formatShareDate(value);
const makeOptions = (answer: string, distractors: string[], seed: string): string[] => {
  const options = [answer, ...distractors];
  let state = [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  for (let i = options.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
};

export const PRICE_IQ: QuizDefinition = {
  id: "price-iq",
  title: "Price IQ",
  description: "Six quick questions from NaijaCheck's dated FX and fuel snapshots. These are references, not a promise of a live quote.",
  questions: [
    {
      id: "cbn-usd",
      prompt: `What was the CBN NFEM USD/NGN reference rate in the snapshot dated ${date(fxFile.officialAsOf)}?`,
      answer: `${money(fxFile.official.USD, 2)} per US$1`,
      options: makeOptions(`${money(fxFile.official.USD, 2)} per US$1`, [`${money(fxFile.blackMarket.USD.sell, 2)} per US$1`, `${money(fxFile.official.GBP, 2)} per US$1`, `${money(fxFile.official.EUR, 2)} per US$1`], "cbn-usd"),
      fact: "This is the CBN NFEM reference rate in the stored snapshot; it is not the street-market quote.",
      source: fxFile.officialSource.label,
      sourceUrl: fxFile.officialSource.url,
      date: date(fxFile.officialAsOf),
      learnMore: "/prices",
    },
    {
      id: "aboki-usd-sell",
      prompt: `What USD sell rate did the Aboki Forex snapshot record on ${date(fxFile.blackMarketAsOf)}?`,
      answer: `${money(fxFile.blackMarket.USD.sell, 0)} per US$1`,
      options: makeOptions(`${money(fxFile.blackMarket.USD.sell, 0)} per US$1`, [`${money(fxFile.blackMarket.USD.buy, 0)} per US$1`, `${money(fxFile.official.USD, 2)} per US$1`, `${money(fxFile.blackMarket.GBP.sell, 0)} per US$1`], "aboki-usd-sell"),
      fact: "A source-reported black-market sell quote; rates vary by dealer, location and time.",
      source: fxFile.blackMarketSource.label,
      sourceUrl: fxFile.blackMarketSource.url,
      date: date(fxFile.blackMarketAsOf),
      learnMore: "/prices",
    },
    {
      id: "cbn-gbp",
      prompt: `What GBP/NGN reference rate was recorded in the CBN NFEM snapshot dated ${date(fxFile.officialAsOf)}?`,
      answer: `${money(fxFile.official.GBP, 2)} per £1`,
      options: makeOptions(`${money(fxFile.official.GBP, 2)} per £1`, [`${money(fxFile.official.USD, 2)} per £1`, `${money(fxFile.official.EUR, 2)} per £1`, `${money(fxFile.blackMarket.GBP.sell, 0)} per £1`], "cbn-gbp"),
      fact: "The CBN reference snapshot is distinct from retail bureau and street-market rates.",
      source: fxFile.officialSource.label,
      sourceUrl: fxFile.officialSource.url,
      date: date(fxFile.officialAsOf),
      learnMore: "/prices",
    },
    {
      id: "aboki-eur-sell",
      prompt: `What EUR sell rate did the Aboki Forex snapshot record on ${date(fxFile.blackMarketAsOf)}?`,
      answer: `${money(fxFile.blackMarket.EUR.sell, 0)} per €1`,
      options: makeOptions(`${money(fxFile.blackMarket.EUR.sell, 0)} per €1`, [`${money(fxFile.blackMarket.EUR.buy, 0)} per €1`, `${money(fxFile.official.EUR, 2)} per €1`, `${money(fxFile.blackMarket.GBP.sell, 0)} per €1`], "aboki-eur-sell"),
      fact: "The snapshot labels this as a sell quote; actual cash rates can differ.",
      source: fxFile.blackMarketSource.label,
      sourceUrl: fxFile.blackMarketSource.url,
      date: date(fxFile.blackMarketAsOf),
      learnMore: "/prices",
    },
    {
      id: "fuel-petrol-median",
      prompt: `What petrol depot median did the fuel snapshot record for ${date(fuelFile.asOf)}?`,
      answer: `${money(fuelFile.medians.petrol, 2)} per litre`,
      options: makeOptions(`${money(fuelFile.medians.petrol, 2)} per litre`, [`${money(fuelFile.medians.diesel, 2)} per litre`, `${money(fuelFile.medians.lpg, 2)} per litre`, `${money(fxFile.official.USD, 2)} per litre`], "fuel-petrol-median"),
      fact: "This is a reported depot-data median, not a guaranteed pump price at every station.",
      source: fuelFile.source.label,
      sourceUrl: fuelFile.source.url,
      date: date(fuelFile.asOf),
      learnMore: "/prices/fuel",
    },
    {
      id: "fuel-diesel-median",
      prompt: `What diesel depot median did the fuel snapshot record for ${date(fuelFile.asOf)}?`,
      answer: `${money(fuelFile.medians.diesel, 2)} per litre`,
      options: makeOptions(`${money(fuelFile.medians.diesel, 2)} per litre`, [`${money(fuelFile.medians.petrol, 2)} per litre`, `${money(fuelFile.medians.lpg, 2)} per litre`, `${money(fxFile.official.GBP, 2)} per litre`], "fuel-diesel-median"),
      fact: "This is a reported depot-data median; retail diesel prices can vary by location.",
      source: fuelFile.source.label,
      sourceUrl: fuelFile.source.url,
      date: date(fuelFile.asOf),
      learnMore: "/prices/fuel",
    },
  ],
};

const slangTerms = slangFile.terms.filter((term) => term.kind === "slang");
const slangDistractorMeanings = (index: number, answer: string) => {
  const pool = slangTerms.map((term) => term.meaning).filter((meaning) => meaning !== answer);
  return [pool[(index + 1) % pool.length], pool[(index + 5) % pool.length], pool[(index + 9) % pool.length]];
};

export const SLANG_QUIZ: QuizDefinition = {
  id: "slang",
  title: "Slang check",
  description: "Meanings from our existing Naija slang and trends desk. Context matters, and some expressions have more than one use.",
  questions: slangTerms.slice(0, 8).map((term, index) => ({
    id: term.slug,
    prompt: `In our slang desk, what does “${term.term}” mean?`,
    answer: term.meaning,
    options: makeOptions(term.meaning, slangDistractorMeanings(index, term.meaning), term.slug),
    fact: term.detail,
    source: term.source,
    sourceUrl: `https://naijacheck.ng/trends/${term.slug}`,
    date: date(slangFile.updatedAt),
    learnMore: `/trends/${term.slug}`,
  })),
};

export const QUIZZES = [PRICE_IQ, SLANG_QUIZ] as const;

/** Scoring is intentionally a pure browser-friendly function: one point per exact answer. */
export function scoreQuiz(questions: Pick<QuizQuestion, "answer">[], selectedAnswers: (string | null)[]): number {
  return questions.reduce((score, question, index) => score + (selectedAnswers[index] === question.answer ? 1 : 0), 0);
}
