import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page don japa. Find your way back to prices, slang, hustles and more.",
  robots: { index: false, follow: true },
};

const WAYS_BACK = [
  { href: "/prices", label: "Check today's prices" },
  { href: "/trends", label: "Decode a slang word" },
  { href: "/hustle", label: "Find a hustle" },
  { href: "/exam", label: "JAMB and WAEC guides" },
];

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl py-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Error 404</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">This page don japa.</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The link you followed has gone abroad without telling anybody. No wahala. Your money and your hustle are still here.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        The prices and the slang still dey here. Use the search bar, or start from one of these:
      </p>
      <ul className="mt-6 grid gap-2 text-left sm:grid-cols-2">
        {WAYS_BACK.map((w) => (
          <li key={w.href}>
            <Link href={w.href} className="block rounded-lg border p-4 font-semibold hover:border-primary hover:bg-secondary">
              {w.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <Button asChild>
          <Link href="/">Abeg, take me home</Link>
        </Button>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        {SITE_CONFIG.name}: if the link came from our site, tell us on {SITE_CONFIG.domain} so we can fix it.
      </p>
    </section>
  );
}
