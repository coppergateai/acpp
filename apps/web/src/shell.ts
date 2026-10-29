/** Dashboard navigation — PRODUCT §11.1 (+ Approvals inbox). */
export const DASHBOARD_NAV = [
  "Overview",
  "Identities",
  "Connections",
  "Signals",
  "Permissions",
  "Approvals",
  "Receipts",
  "Developers",
] as const;

export type DashboardNavItem = (typeof DASHBOARD_NAV)[number];

const NAV_HREF: Record<DashboardNavItem, string> = {
  Overview: "/dashboard",
  Identities: "/identities",
  Connections: "/connections",
  Signals: "/signals",
  Permissions: "/permissions",
  Approvals: "/approvals",
  Receipts: "/receipts",
  Developers: "/developers",
};

export function dashboardNavHref(label: string): string {
  if (label in NAV_HREF) {
    return NAV_HREF[label as DashboardNavItem];
  }
  return `#${label.toLowerCase()}`;
}

export function pageTitle(): string {
  return "ACPP — Give agents an identity, not just an API key.";
}
