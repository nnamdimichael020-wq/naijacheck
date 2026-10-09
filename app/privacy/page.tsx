import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy Notice (NDPA 2023)",
  description: "How NaijaCheck handles personal data under the Nigeria Data Protection Act 2023: what we collect, why, your rights and how to complain.",
});

const LAST_UPDATED = "9 October 2026";

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl space-y-6 text-[16px] leading-relaxed">
      <header>
        <p className="text-sm font-semibold text-primary">Legal</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Privacy notice</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {LAST_UPDATED}. Prepared under the Nigeria Data Protection Act 2023 (NDPA).</p>
      </header>

      <div className="rounded-md border border-accent/60 bg-accent/10 p-3 text-sm">
        <strong>Launch note:</strong> this notice is a working draft. Before we rely on it, a Nigerian data protection lawyer should review it, and the
        controller&apos;s registered name and privacy contact must be filled in.
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">1. Who we are</h2>
        <p>
          {SITE_CONFIG.name} operates {SITE_CONFIG.url}. For the purposes of the NDPA we act as the data controller for personal data collected through this
          website. Registered name and address: <em>to be inserted before launch</em>. Privacy contact: <em>to be inserted before launch</em>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">2. What we collect and why</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Technical request data.</strong> When you open a page, our hosting provider (Cloudflare) processes your IP address, browser type and
            request time to deliver the site and protect it from abuse. This is needed to run the service.
          </li>
          <li>
            <strong>Browser storage on your device.</strong> We store your theme choice, a flag that unlocks premium on this device, and any admin draft
            (editors only). This stays in your browser. You can clear it at any time.
          </li>
          <li>
            <strong>Calculator and hustle inputs.</strong> Figures you type into calculators, the hustle matcher and the cookbook are processed in your browser.
            We do not send them to a server.
          </li>
          <li>
            <strong>Search.</strong> The site search runs in your browser against a static index. We do not log your search terms.
          </li>
          <li>
            <strong>Mock premium checkout.</strong> The premium checkout on the Hustle page is a demonstration. It collects no card, bank or payment details
            and takes no money.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">3. Advertising</h2>
        <p>
          The site shows clearly labelled sponsored and advertising placements. When we switch on Google AdSense, Google and its partners may use cookies to show
          ads, including personalised ads. Before we enable personalised advertising, we will add a consent mechanism that meets NDPA requirements and Google&apos;s
          policies. We do not use ads that open pop-ups, interstitials or autoplay sound.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">4. Lawful bases</h2>
        <p>
          We rely on <strong>legitimate interests</strong> to run and secure the site, <strong>consent</strong> for non-essential storage and advertising, and{" "}
          <strong>legal obligation</strong> where the law requires us to keep or disclose information.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">5. Who we share data with</h2>
        <p>
          We use service providers: hosting and content delivery (Cloudflare Pages), and, once enabled, advertising (Google AdSense). They process data on our
          instructions. Some providers may process data outside Nigeria. Where that happens, we rely on the transfer safeguards the NDPA requires.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">6. How long we keep data</h2>
        <p>
          Hosting request logs are kept only as long as our provider&apos;s policy allows. Browser storage stays on your device until you clear it. We do not
          keep user accounts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">7. Your rights</h2>
        <p>Under the NDPA you can ask us to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>confirm whether we process your personal data and give you a copy;</li>
          <li>correct inaccurate data;</li>
          <li>delete your data where the law allows;</li>
          <li>restrict or object to processing;</li>
          <li>receive your data in a portable format;</li>
          <li>withdraw consent at any time, without affecting earlier lawful processing.</li>
        </ul>
        <p>
          You can also complain to the <strong>Nigeria Data Protection Commission (NDPC)</strong>, the regulator under the NDPA. Contact the NDPC through its
          official website before you complain, so you have the current details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">8. Children</h2>
        <p>
          The NDPA treats anyone under 18 as a child and requires extra protection. Our site is for general audiences. We do not knowingly collect personal data
          from children. If you believe a child has given us data, contact us and we will delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">9. Changes</h2>
        <p>We will update this notice when our practices change, and show the new date at the top of the page.</p>
      </section>
    </article>
  );
}
