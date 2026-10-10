import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";
import { pageMetadata, absUrl } from "@/lib/seo";
import { ShareControls } from "@/components/share-controls";

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy Notice (NDPA 2023)",
  description: "How NaijaCheck handles personal data under the Nigeria Data Protection Act 2023: what we collect, why, your rights and how to complain.",
});

const LAST_UPDATED = "10 October 2026";

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl space-y-6 text-[16px] leading-relaxed">
      <header>
        <p className="text-sm font-semibold text-primary">Legal</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Privacy notice</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {LAST_UPDATED}. Prepared under the Nigeria Data Protection Act 2023 (NDPA).</p>
        <ShareControls placement="inline" title="Privacy notice" url={absUrl("/privacy")} />
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
            <strong>Browser storage on your device.</strong> We store your theme choice, your chosen state, local page-open watch rules, a seven-day
            “Not now” time for the alert invitation, a visit count, a flag that unlocks the mock premium demo on this device, and any admin draft (editors only).
            A service worker may cache public pages and static files for offline use. This stays in your browser and can be removed by clearing site data or
            uninstalling the app.
          </li>
          <li>
            <strong>Optional Web Push.</strong> If you explicitly select “Enable alerts”, Cloudflare KV stores exactly the browser-provided push endpoint and
            the required <code>p256dh</code> public encryption key and <code>auth</code> secret. We attach no name, phone number, precise location, watch rule or
            advertising identifier. The endpoint is used only for a verified parallel-dollar movement of at least ₦5, a changed depot petrol median, or an
            owner-authorised setup test. A global six-hour cooldown prevents more than one real change alert per subscriber in that period.
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
          Advertising is currently disabled because no approved AdSense publisher configuration is present. The cards in ad positions are internal related-guide
          links, not paid partnerships. If advertising is enabled later, this notice and the consent controls must be updated before non-essential advertising
          storage is used. We do not use pop-ups, interstitials or autoplay sound.
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
          Cloudflare provides hosting, content delivery, abuse protection and—only after the owner completes setup—KV storage for push subscriptions. The
          browser vendor&apos;s push service (for example Apple, Google or Mozilla) receives the encrypted Web Push request and necessarily processes the endpoint
          and delivery request. No site analytics, newsletter, user-submission service or advertising network is enabled. The site does not request browser
          geolocation; the optional area card uses coarse country/region metadata Cloudflare already attaches to a request and stores only a state choice on the device.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">6. How long we keep data</h2>
        <p>
          Hosting request logs are kept only as long as our provider&apos;s policy allows. Browser storage stays on your device until you clear it. A push
          subscription remains until you use “Unsubscribe and clear”; the Worker also deletes it when its push service reports that it has expired (HTTP 404 or
          410). Browser vendors may rotate or expire subscriptions independently. We do not keep user accounts.
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
