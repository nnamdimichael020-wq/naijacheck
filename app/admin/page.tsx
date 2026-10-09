import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/admin-panel";
import { CITIES } from "@/lib/data";
import pricesFile from "@/data/prices.json";
import fuelFile from "@/data/fuel.json";
import slangFile from "@/data/slang.json";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ path: "/admin", title: "Admin", description: "Editor console.", noindex: true }),
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Editor console</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick updates for prices, fuel and slang trend scores.</p>
      </header>
      <AdminPanel
        cities={CITIES.map((c) => ({ slug: c.slug, name: c.name }))}
        prices={pricesFile as unknown as Parameters<typeof AdminPanel>[0]["prices"]}
        fuel={fuelFile as unknown as Parameters<typeof AdminPanel>[0]["fuel"]}
        slang={slangFile as unknown as Parameters<typeof AdminPanel>[0]["slang"]}
      />
    </div>
  );
}
