# Reference SDK (`@acpp/sdk`)

**Open ID:** A-020 — PRODUCT §17.2

The TypeScript reference SDK wraps hosted HTTP routes and local cryptographic helpers for identity, signals, authorization, and receipts. It is the supported integration surface for developers building on ACPP.

Install (monorepo workspace):

```json
"dependencies": {
  "@acpp/sdk": "workspace:*"
}
```

## Design rule: no hidden approvals

SDK helpers **must not** auto-approve or auto-execute protected operations. Security decisions stay explicit:

1. **Evaluate** policy (`evaluateAuthorization` or local `evaluateGrant`).
2. When `requiresApproval` is true, **record** an approver decision (`recordApproval` / `POST /v1/approvals`).
3. Build an **execution proof** with `buildExecutionAuthorizationProof(decision, approvalId?)`.
4. **Execute** with that proof (`executeGithubProtectedAction`).

There is no `executeAndApprove`, `runProtected`, or similar convenience that skips step 2.

## Sign and verify signals

```typescript
import { createActorAddress } from "@acpp/core";
import {
  AcppHostedClient,
  generateEd25519KeyPair,
  signSignalEnvelope,
  signingMessage,
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

if (!verifySignalEnvelopeSignature(envelope, keys.publicKey)) {
  throw new Error("local signature check failed");
}

const client = new AcppHostedClient({ baseUrl: "http://127.0.0.1:8787" });
await client.submitSignal(envelope);
await client.verifySignature({
  address: sender,
  keyId: envelope.auth!.keyId,
  message: signingMessage(envelope), // re-exported from @acpp/signals via SDK
  signature: envelope.auth!.signature,
});
```

Local verification proves **identity** (key control). It does not grant permission to act.

## Authorization and GitHub execution

```typescript
import {
  AcppHostedClient,
  buildExecutionAuthorizationProof,
  ProtectedOperationError,
} from "@acpp/sdk";

const client = new AcppHostedClient({ baseUrl: process.env.ACPP_API_URL! });

const evalResult = await client.evaluateAuthorization({
  workspaceId: "ws_…",
  subject: "acpp:agent:…",
  resource: "github:repo:org/repo",
  action: "issues.comment",
});
if (!evalResult.ok) throw new Error("evaluate failed");

const { decision } = evalResult;
let approvalId: string | undefined;

if (decision.requiresApproval) {
  const approval = await client.recordApproval({
    grantId: decision.grantId!,
    subject: "acpp:agent:…",
    resource: "github:repo:org/repo",
    action: "issues.comment",
    payload: { issueNumber: 1, body: "Approved comment" },
    approved: true,
  });
  if (!approval.ok) throw new Error("approval failed");
  approvalId = approval.approval.approvalId;
}

let proof;
try {
  proof = buildExecutionAuthorizationProof(decision, approvalId);
} catch (err) {
  if (err instanceof ProtectedOperationError) {
    // Missing grant or missing approval — do not execute
    throw err;
  }
  throw err;
}

const exec = await client.executeGithubProtectedAction({
  workspaceId: "ws_…",
  connectionId: "conn_…",
  subject: "acpp:agent:…",
  repo: "org/repo",
  action: "issues.comment",
  payload: { issueNumber: 1, body: "Approved comment" },
  signalId: "sig_my_request_01",
  proof,
  decision,
});

if (exec.ok && exec.receipt) {
  console.log("receipt", exec.receipt.receiptId);
}
```

## Receipts

- `getReceipt(receiptId, workspaceId)` — `GET /v1/receipts/{id}`
- `getSignalReceipt(signalId, workspaceId)` — `GET /v1/signals/{id}/receipt`

Use `describeReceiptChain` (from `@acpp/receipts`, re-exported) for inspector-style step lists.

## Related packages

| Package | Role |
| --- | --- |
| `@acpp/identity` | Keys, signing primitives |
| `@acpp/signals` | Canonical envelope rules |
| `@acpp/policy` | Grant evaluation and approval binding |
| `@acpp/receipts` | Receipt chain model |
| `@acpp/schemas` | OpenAPI + JSON Schema |

## See also

- [`QUICKSTART.md`](../QUICKSTART.md) — end-to-end allow/deny demo
- [`authz.md`](./authz.md) — server-side evaluation and approvals
- [`signal.md`](./signal.md) — envelope and signing rules
