/** Real destinations — GitHub docs and in-app anchors only. */

export const SITE_URL = "https://acpp.coppergate.ai";
export const GITHUB_REPO = "https://github.com/coppergateai/acpp";
export const DOCS = {
  product: `${GITHUB_REPO}/blob/main/PRODUCT.md`,
  quickstart: `${GITHUB_REPO}/blob/main/docs/QUICKSTART.md`,
  protocol: `${GITHUB_REPO}/tree/main/docs/protocol`,
  sdk: `${GITHUB_REPO}/blob/main/docs/protocol/sdk.md`,
  wedge: `${GITHUB_REPO}/blob/main/docs/WEDGE.md`,
  wedgeGithub: `${GITHUB_REPO}/blob/main/docs/wedge-github.md`,
  mcp: `${GITHUB_REPO}/blob/main/docs/protocol/mcp-integration.md`,
  openProgram: `${GITHUB_REPO}/blob/main/docs/OPEN_PROGRAM.md`,
  license: `${GITHUB_REPO}/blob/main/LICENSE`,
} as const;

export const SITE_META = {
  title: "ACPP — Identity for AI agents",
  description:
    "Open protocol for verifiable AI agent identity, explicit permissions, signed signals, authorized actions, and verifiable execution receipts.",
  tagline: "Give agents an identity, not just an API key.",
} as const;

export type LayerStatus = "available" | "partial" | "conceptual";

export type ProtocolLayer = {
  id: string;
  num: string;
  name: string;
  summary: string;
  status: LayerStatus;
  statusLabel: string;
  accent: string;
};

/** PRODUCT §7 layers with honest implementation status from OPEN_PROGRAM. */
export const PROTOCOL_LAYERS: readonly ProtocolLayer[] = [
  {
    id: "identity",
    num: "01",
    name: "Identity",
    summary: "Stable acpp:agent addresses, Ed25519 keys, rotation, and lifecycle.",
    status: "available",
    statusLabel: "Available",
    accent: "#4F8CFF",
  },
  {
    id: "discovery",
    num: "02",
    name: "Discovery",
    summary: "Resolve identities and permitted capabilities — discovery is not consent.",
    status: "available",
    statusLabel: "Available",
    accent: "#8B7CFF",
  },
  {
    id: "signals",
    num: "03",
    name: "Signals",
    summary: "Signed envelopes for events, requests, offers, responses, and revocations.",
    status: "available",
    statusLabel: "Available",
    accent: "#3DCF8E",
  },
  {
    id: "trust",
    num: "04",
    name: "Trust",
    summary: "Cryptographic identity proof today; richer trust relationships remain conceptual.",
    status: "conceptual",
    statusLabel: "Conceptual",
    accent: "#6BA3D9",
  },
  {
    id: "authorization",
    num: "05",
    name: "Authorization",
    summary: "Deny-by-default grants, evaluate, expire, and revoke before any protected action.",
    status: "available",
    statusLabel: "Available",
    accent: "#E8B84A",
  },
  {
    id: "action",
    num: "06",
    name: "Action",
    summary: "GitHub connector executes gated ops; MCP invoke remains an experimental sketch.",
    status: "partial",
    statusLabel: "Partial",
    accent: "#E85D5D",
  },
  {
    id: "receipts",
    num: "07",
    name: "Receipts",
    summary: "Signal → verification → decision → outcome chain for accountable audit.",
    status: "available",
    statusLabel: "Available",
    accent: "#2FA36B",
  },
] as const;

export type IntegrationStatus = "available" | "experimental" | "planned";

export type Integration = {
  name: string;
  status: IntegrationStatus;
  statusLabel: string;
  blurb: string;
  href: string;
};

export const INTEGRATIONS: readonly Integration[] = [
  {
    name: "GitHub",
    status: "available",
    statusLabel: "Available",
    blurb: "Connect once per workspace. Scoped grants gate issues.comment and repos.metadata.read.",
    href: `${GITHUB_REPO}/blob/main/docs/protocol/connections.md`,
  },
  {
    name: "MCP",
    status: "experimental",
    statusLabel: "Experimental",
    blurb: "Gateway sketch and security helpers. Capabilities endpoint live; connect/invoke still sketch.",
    href: DOCS.mcp,
  },
  {
    name: "A2A",
    status: "planned",
    statusLabel: "Planned",
    blurb: "Interoperability direction for agent-to-agent messaging. No connector shipped yet.",
    href: DOCS.product,
  },
] as const;

/** Adapted from docs/protocol/sdk.md — real @acpp/sdk surface. */
export const SDK_CODE_SAMPLE = `import { createActorAddress } from "@acpp/core";
import {
  AcppHostedClient,
  generateEd25519KeyPair,
  signSignalEnvelope,
  verifySignalEnvelopeSignature,
} from "@acpp/sdk";

const keys = generateEd25519KeyPair();
const sender = createActorAddress("agent", "MYAGENT01");

const envelope = signSignalEnvelope(
  {
    signalId: "sig_my_request_01",
    type: "request",
    audience: createActorAddress("human", "owner"),
    contentType: "application/json",
    payload: { action: "issues.comment", repo: "org/repo" },
  },
  { sender, publicKey: keys.publicKey, privateKey: keys.privateKey },
);

// Identity proof ≠ permission to act
verifySignalEnvelopeSignature(envelope, keys.publicKey);

const client = new AcppHostedClient({
  baseUrl: "http://127.0.0.1:8787",
});
await client.submitSignal(envelope);`;

/** Narrative scenario for the landing page — locked GitHub wedge in human terms. */
export const SCENARIO = {
  kicker: "Real-life scenario",
  title: "A triage agent comments on a GitHub issue.",
  lead:
    "Your platform team connects GitHub once. An incident-response agent gets a narrow grant to post on issues — not the org token. Every comment leaves a receipt; revoke the grant and the next attempt is denied.",
  setting: {
    agent: "acpp:agent:triage-bot",
    resource: "github:repo:acme/payments",
    action: "issues.comment",
    issue: "#4821 · checkout latency spike",
  },
  beats: [
    {
      who: "Ops",
      what: "An alert opens issue #4821. Someone needs a status note on the thread — not a human hunting for a shared PAT.",
    },
    {
      who: "Agent",
      what: "TriageBot sends a signed signal: comment on #4821 with the latest findings.",
    },
    {
      who: "ACPP",
      what: "Verifies the agent identity, evaluates the grant (issues.comment only), and allows the action.",
    },
    {
      who: "GitHub",
      what: "The comment posts through the workspace connection. Credential never sits on the agent.",
    },
    {
      who: "Receipt",
      what: "Audit trail links signal → decision → outcome. Later, security revokes the grant — the next comment returns deny.",
    },
  ],
} as const;

export const WEDGE_STEPS = [
  {
    title: "Register agent identity",
    detail: "Create acpp:agent:… with an Ed25519 key pair.",
    meta: "POST /v1/workspaces/{id}/identities",
  },
  {
    title: "Connect GitHub once",
    detail: "Workspace credential stays isolated from the agent.",
    meta: "POST …/connections/github",
  },
  {
    title: "Grant scoped permission",
    detail: "Resource + action, optional approval binding.",
    meta: "POST /v1/grants",
  },
  {
    title: "Send signed signal",
    detail: "Authenticated request for a protected GitHub action.",
    meta: "POST /v1/signals",
  },
  {
    title: "Evaluate authorization",
    detail: "Deny-by-default policy produces Allow or Deny.",
    meta: "POST /v1/authorization/evaluate",
  },
  {
    title: "Execute allowed action",
    detail: "Proof-bound GitHub issues.comment (or metadata read).",
    meta: "POST /v1/github/actions/execute",
  },
  {
    title: "Record verifiable receipt",
    detail: "Chain links signal → decision → outcome.",
    meta: "GET /v1/receipts/{id}",
  },
  {
    title: "Revoke, then prove denial",
    detail: "Next execute returns 403 after grant revoke.",
    meta: "POST /v1/demo/wedge-revoke-proof",
  },
] as const;
