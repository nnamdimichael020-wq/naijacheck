import { getAllPostalAreaParams, getAllPostalStates } from "@/lib/postal";

const leafSet = new Set(getAllPostalAreaParams().map((p) => `${p.state}/${p.area}`));

export function postalLeafHref(stateSlug: string, areaSlug: string): string | null {
  return leafSet.has(`${stateSlug}/${areaSlug}`) ? `/codes/postal/${stateSlug}/${areaSlug}` : null;
}

export function hasPostalLeaf(stateSlug: string, areaSlug: string): boolean {
  return leafSet.has(`${stateSlug}/${areaSlug}`);
}

export function getPostalLeavesForState(stateSlug: string) {
  const s = getAllPostalStates().find((x) => x.slug === stateSlug);
  if (!s) return [] as { place: string; code: string; slug: string; href: string | null }[];
  return s.places.map((p) => ({
    place: p.name,
    code: p.code,
    slug: p.slug!,
    href: postalLeafHref(stateSlug, p.slug!),
  }));
}
