/** Minimal dashboard shell copy — full UI lands with P-030. */
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
