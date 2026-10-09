import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ path: "/admin", title: "Admin unavailable", description: "The moderation console is not available on the public static site.", noindex: true }),
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Admin unavailable</h1>
      <p className="text-muted-foreground">
        This static route is not a secure moderation surface. The former browser-only password could be read from the JavaScript bundle, so the editor has been
        disabled. Do not submit community reports or personal information here.
      </p>
      <p className="rounded-lg border border-dashed p-4 text-sm">
        Owner action: protect a server-side moderation tool with Cloudflare Access (or equivalent authenticated access) before enabling submissions. No community
        submission backend or moderation queue is active in this build.
      </p>
    </div>
  );
}
