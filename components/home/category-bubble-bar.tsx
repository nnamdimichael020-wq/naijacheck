import { buildCategoryBubbleTree } from "@/lib/category-bubbles";
import { CategoryBubbleBarClient } from "./category-bubble-bar-client";

/**
 * Server Component wrapper that builds the 6-bubble SSOT category tree at build/SSR time
 * (zero raw dataset JSON shipped to client bundles) and passes the compact tree to
 * `CategoryBubbleBarClient`.
 */
export function CategoryBubbleBar() {
  const bubbles = buildCategoryBubbleTree();
  return <CategoryBubbleBarClient bubbles={bubbles} />;
}
