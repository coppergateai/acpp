/** Dashboard navigation — receipt inspector on /receipts (P-030). */
export const DASHBOARD_NAV = [
  "Overview",
  "Identities",
  "Connections",
  "Permissions",
  "Approvals",
  "Signals",
  "Receipts",
] as const;

export function pageTitle(): string {
  return "ACPP — Give agents an identity, not just an API key.";
}
