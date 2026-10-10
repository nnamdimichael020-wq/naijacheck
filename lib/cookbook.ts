import { DIRECT_PRICE_CITIES, ITEM_BY_SLUG, RECIPES, recipeCostPerPerson } from "@/lib/data";
import type { CookRecipe } from "@/components/calc/cookbook-calc";

/**
 * Server-side prep for the cookbook calculator. Per-person cost bands are computed for every city
 * here, so the client only multiplies by family size.
 */
export function cookRecipes(only?: string): CookRecipe[] {
  return RECIPES.filter((r) => !only || r.slug === only).map((r) => ({
    slug: r.slug,
    name: r.name,
    servesNote: r.servesNote,
    perPerson: Object.fromEntries(DIRECT_PRICE_CITIES.map((c) => [c.slug, recipeCostPerPerson(r.slug, c.slug)])),
    ingredients: r.ingredients.map((ing) => ({
      name: (ITEM_BY_SLUG[ing.item]?.name ?? ing.item).split(" (")[0],
      qty: ing.qty,
      unit: ing.unit,
    })),
  }));
}

export const COOK_CITIES = DIRECT_PRICE_CITIES.map((c) => ({ slug: c.slug, name: c.name }));
