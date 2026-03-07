import type { LucideIcon } from "lucide-react";
import {
  Map,
  LayoutDashboard,
  ClipboardList,
  User,
  Users,
  Users2,
  BarChart2,
  FileText,
  Building2,
  Store,
  Shield,
  Tag,
  Landmark,
  Medal,
} from "lucide-react";
import type { Role } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const dashboardItem: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
];

const mapBaseNavItems: NavItem[] = [
  { href: "/", label: "Map", icon: Map },
  { href: "/missions", label: "Missions", icon: ClipboardList },
  { href: "/report", label: "Report", icon: FileText },
  { href: "/merchants", label: "Merchants", icon: Store },
];

const profileItem: NavItem = { href: "/profile", label: "Profile", icon: User };

const adminNavItems: NavItem[] = [
  { href: "/admin/operational-summary", label: "Operational Summary", icon: BarChart2 },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/merchants", label: "Merchants", icon: Store },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/teams", label: "Teams", icon: Users2 },
  { href: "/admin/branches", label: "Branches", icon: Building2 },
  { href: "/admin/categories", label: "Scout Categories", icon: Tag },
  { href: "/admin/external-banks", label: "Other Services", icon: Landmark },
  { href: "/admin/ranks", label: "Ranks", icon: Medal },
  { href: "/admin/assets", label: "Deployment Assets", icon: Shield },
];

const branchManagerNavItems: NavItem[] = [
  { href: "/admin/operational-summary", label: "Operational Summary", icon: BarChart2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/teams", label: "Teams", icon: Users2 },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/merchants", label: "Merchants", icon: Store },
];

/**
 * Returns nav items for the given role. Used by BottomNav (staff) and SidebarLayout (admin/manager).
 * Admin: Dashboard, Missions, Reports, Users, Teams, Branches, Profile.
 * Branch Manager / Staff: Map, Missions, Report, then manager items if any, then Profile.
 */
export function getNavItems(role: Role | null): NavItem[] {
  if (role === "ADMIN") {
    return [
      ...dashboardItem,
      { href: "/missions", label: "Missions", icon: ClipboardList },
      ...adminNavItems,
      profileItem,
    ];
  }
  const adminItems =
    role === "BRANCH_MANAGER" ? branchManagerNavItems : [];
  return [...mapBaseNavItems, ...adminItems, profileItem];
}
