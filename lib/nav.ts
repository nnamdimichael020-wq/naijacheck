import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BookOpen,
  Briefcase,
  FileText,
  GraduationCap,
  Home,
  MessageSquareText,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Mobile bottom bar: exactly five destinations. */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/prices", label: "Prices", icon: Banknote },
  { href: "/trends", label: "Trends", icon: MessageSquareText },
  { href: "/hustle", label: "Hustle", icon: Briefcase },
  { href: "/tools", label: "Tools", icon: Wrench },
];

/** Inside the "More" sheet on mobile. */
export const MORE_NAV: NavItem[] = [
  { href: "/howto", label: "GovHowTo", icon: FileText },
  { href: "/exam", label: "Exam Hub", icon: GraduationCap },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
];

/** Desktop top nav. */
export const TOP_NAV: { href: string; label: string }[] = [
  { href: "/prices", label: "Prices" },
  { href: "/trends", label: "Trends" },
  { href: "/hustle", label: "Hustle" },
  { href: "/tools", label: "Tools" },
  { href: "/howto", label: "GovHowTo" },
  { href: "/exam", label: "Exam Hub" },
  { href: "/telecom", label: "Telecom" },
  { href: "/learn", label: "Learn" },
];

export const TELECOM_ICON = Smartphone;

export function isActivePath(current: string, href: string) {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}
