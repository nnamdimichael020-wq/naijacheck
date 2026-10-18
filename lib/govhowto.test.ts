/**
 * GovHowTo data guard.
 *
 * `data/govhowto.json` feeds every `/howto/*` page, the hub, the home page cards and search.
 * These checks stop a hand-edited guide from shipping with missing answer-first fields, a
 * verification state that overclaims ("live" on a statutory figure), an unfinished table, a
 * broken related slug, or an unimported NBS price pasted in as if it were sourced data.
 *
 * Run with `npm run govhowto:test`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import govhowto from "../data/govhowto.json";

type Table = { caption?: string; columns: string[]; rows: string[][] };
type Section = { h2: string; paras: string[]; bullets?: string[]; table?: Table };
type Link = { label: string; href: string };
type GovDoc = {
  slug: string;
  title: string;
  short: string;
  category: string;
  fee: string;
  feeSource: string;
  timeline: string;
  steps: string[];
  documents: string[];
  pitfalls: string[];
  officialSite: string;
  related: string[];
  hustleLink: string;
  lastVerified?: string;
  verification?: string;
  sourceNote?: string;
  officialLinks?: Link[];
  unverifiedItems?: string[];
  extraIntro?: string[];
  extraSections?: Section[];
  extraFaqs?: { q: string; a: string }[];
  extraTakeaways?: string[];
  extraLinkPaths?: string[];
  headings?: Record<string, string>;
};

const VERIFICATION_STATES = new Set(["live", "recent", "stale", "seeded", "manual", "unavailable"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const docs = govhowto.docs as unknown as GovDoc[];

/** Hand-written app routes that are real pages but are not generated articles. */
const HAND_WRITTEN_ROUTES = new Set(["/status", "/about", "/privacy", "/admin"]);
const articlesFile = path.join(process.cwd(), "content", "generated", "articles.json");
const generatedPaths = new Set<string>(
  (JSON.parse(fs.readFileSync(articlesFile, "utf8")) as { path: string }[]).map((article) => article.path),
);
const knownPaths = new Set<string>([...generatedPaths, ...HAND_WRITTEN_ROUTES]);

function nonEmpty(value: unknown, label: string): string {
  assert.equal(typeof value, "string", `${label} must be a string`);
  const text = (value as string).trim();
  assert.ok(text.length > 0, `${label} must not be empty`);
  return text;
}

function stringList(value: unknown, label: string, min: number): string[] {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  const list = value as string[];
  assert.ok(list.length >= min, `${label} needs at least ${min} entries`);
  list.forEach((item, i) => nonEmpty(item, `${label}[${i}]`));
  return list;
}

function checkTable(table: Table, label: string): void {
  assert.ok(Array.isArray(table.columns) && table.columns.length >= 2, `${label} needs at least two columns`);
  assert.ok(Array.isArray(table.rows) && table.rows.length >= 2, `${label} needs at least two data rows`);
  // A comparison table may leave its top-left corner blank; every other header must be usable.
  table.columns.forEach((column, i) => {
    assert.equal(typeof column, "string", `${label}.columns[${i}] must be a string`);
    if (i > 0) nonEmpty(column, `${label}.columns[${i}]`);
  });
  assert.ok(table.columns.filter((column) => column.trim()).length >= 2, `${label} needs at least two named columns`);
  table.rows.forEach((row, r) => {
    assert.equal(row.length, table.columns.length, `${label}.rows[${r}] must match the column count`);
    row.forEach((cell, c) => nonEmpty(cell, `${label}.rows[${r}][${c}]`));
  });
}

function run(): void {
  assert.ok(docs.length >= 12, "the GovHowTo collection is present and complete enough to check");

  const slugs = new Set<string>();
  for (const doc of docs) {
    nonEmpty(doc.slug, "doc.slug");
    assert.ok(/^[a-z0-9-]+$/.test(doc.slug), `doc.slug must be a URL slug: ${doc.slug}`);
    assert.ok(!slugs.has(doc.slug), `duplicate doc.slug: ${doc.slug}`);
    slugs.add(doc.slug);
  }

  for (const doc of docs) {
    const id = doc.slug;
    for (const key of ["title", "short", "category", "fee", "feeSource", "timeline", "officialSite", "hustleLink"] as const) {
      nonEmpty(doc[key], `${id}.${key}`);
    }
    stringList(doc.steps, `${id}.steps`, 5);
    stringList(doc.documents, `${id}.documents`, 3);
    stringList(doc.pitfalls, `${id}.pitfalls`, 3);

    assert.ok(doc.officialSite.startsWith("https://"), `${id}.officialSite must be https`);
    assert.ok(doc.hustleLink.startsWith("/"), `${id}.hustleLink must be an internal path`);
    assert.ok(Array.isArray(doc.related), `${id}.related must be an array`);
    for (const related of doc.related) {
      // Related slugs may live in /howto, /exam, /learn or another hub; audit:static proves the
      // resolved route exists. Here we only reject malformed and self-referential entries.
      assert.ok(/^[a-z0-9-]+$/.test(related), `${id}.related has a malformed slug: ${related}`);
      assert.notEqual(related, id, `${id}.related must not point at itself`);
    }

    // Verification state and date travel together, and statutory/manual data is never "live".
    if (doc.verification || doc.lastVerified) {
      nonEmpty(doc.verification, `${id}.verification`);
      nonEmpty(doc.lastVerified, `${id}.lastVerified`);
      assert.ok(VERIFICATION_STATES.has(doc.verification as string), `${id}.verification is not an allowed state`);
      assert.notEqual(doc.verification, "live", `${id} must not label manual/statutory figures as live`);
      assert.ok(ISO_DATE.test(doc.lastVerified as string), `${id}.lastVerified must be YYYY-MM-DD`);
      const verifiedAt = Date.parse(`${doc.lastVerified}T00:00:00Z`);
      assert.ok(!Number.isNaN(verifiedAt), `${id}.lastVerified must be a real date`);
      assert.ok(verifiedAt <= Date.now() + 86_400_000, `${id}.lastVerified must not be in the future`);
      nonEmpty(doc.sourceNote, `${id}.sourceNote (required when a verification block is present)`);
    }

    if (doc.officialLinks) {
      assert.ok(doc.officialLinks.length >= 1, `${id}.officialLinks must not be empty`);
      doc.officialLinks.forEach((link, i) => {
        nonEmpty(link.label, `${id}.officialLinks[${i}].label`);
        assert.ok(/^https:\/\//.test(link.href), `${id}.officialLinks[${i}] must be https`);
      });
    }

    if (doc.unverifiedItems) {
      stringList(doc.unverifiedItems, `${id}.unverifiedItems`, 1);
    }

    if (doc.extraIntro) stringList(doc.extraIntro, `${id}.extraIntro`, 1);
    if (doc.extraTakeaways) stringList(doc.extraTakeaways, `${id}.extraTakeaways`, 1);
    if (doc.extraFaqs) {
      assert.ok(doc.extraFaqs.length >= 1, `${id}.extraFaqs must not be empty`);
      doc.extraFaqs.forEach((faq, i) => {
        nonEmpty(faq.q, `${id}.extraFaqs[${i}].q`);
        nonEmpty(faq.a, `${id}.extraFaqs[${i}].a`);
      });
    }

    if (doc.extraSections) {
      assert.ok(doc.extraSections.length >= 1, `${id}.extraSections must not be empty`);
      doc.extraSections.forEach((section, i) => {
        nonEmpty(section.h2, `${id}.extraSections[${i}].h2`);
        stringList(section.paras, `${id}.extraSections[${i}].paras`, 1);
        if (section.bullets) stringList(section.bullets, `${id}.extraSections[${i}].bullets`, 1);
        if (section.table) checkTable(section.table, `${id}.extraSections[${i}].table`);
      });
    }

    if (doc.extraLinkPaths) {
      // The generator silently drops a link whose page does not exist, so a stale path would
      // quietly shrink the related-links block instead of failing the build. Catch it here.
      doc.extraLinkPaths.forEach((href, i) => {
        assert.ok(href.startsWith("/"), `${id}.extraLinkPaths[${i}] must be internal`);
        assert.ok(!href.includes("?") && !href.includes("#"), `${id}.extraLinkPaths[${i}] must be a bare path`);
        assert.ok(knownPaths.has(href), `${id}.extraLinkPaths[${i}] has no built page: ${href}`);
      });
    }
  }

  // ---- no generated guide may repeat an H2; the renderer keys sections by heading ----
  const howtoArticles = (
    JSON.parse(fs.readFileSync(articlesFile, "utf8")) as { path: string; sections: { h2: string }[] }[]
  ).filter((article) => article.path.startsWith("/howto/"));
  for (const article of howtoArticles) {
    const seen = new Set<string>();
    for (const section of article.sections) {
      const key = section.h2.trim().toLowerCase();
      assert.ok(!seen.has(key), `${article.path} repeats the heading "${section.h2}"`);
      seen.add(key);
    }
  }

  // ---- the NBS food-price guide: answer-first, free, sourced, and honest about what is missing ----
  const nbs = docs.find((doc) => doc.slug === "nbs-food-price-watch");
  assert.ok(nbs, "the NBS food price guide is present");
  const guide = nbs as GovDoc;
  assert.equal(guide.verification, "manual", "the NBS guide is manually verified, never live");
  assert.equal(guide.lastVerified, "2026-10-18");
  assert.match(guide.fee, /^No fee\b/, "the NBS release is free, so the fee line must say so");
  assert.ok(guide.officialLinks?.some((link) => link.href.includes("microdata.nigerianstat.gov.ng/index.php/catalog/162")), "links to the official NBS catalog");
  assert.ok((guide.unverifiedItems?.length ?? 0) >= 4, "lists what was not imported or not confirmed");
  assert.ok((guide.extraSections?.filter((section) => section.table).length ?? 0) >= 3, "carries the definition, unit and worked-comparison tables");
  const body = JSON.stringify(guide);
  assert.ok(body.includes("May 2026") && body.includes("25 June 2026"), "names the latest release and publication date read");
  assert.ok(body.includes("9 October 2026"), "labels NaijaCheck's own ranges with their date");
  assert.ok(body.includes("not a live market quote") || body.includes("not live"), "states plainly that the report is not live");

  // No NBS number may appear as our observation before the state-level rows are imported.
  const nbsFigure = /NBS[^.]{0,90}₦\s?\d/;
  assert.ok(!nbsFigure.test(body), "must not print an NBS price figure as an imported observation");
  for (const figure of ["₦112,000", "₦133,975", "₦92,946", "₦1,325.85"]) {
    assert.ok(!body.includes(figure), `must not paste the unimported news-reported NBS figure ${figure}`);
  }

  console.log("GovHowTo tests passed (answer-first fields, honest verification states, complete tables, sourced NBS guide with no imported NBS price).");
}

run();
