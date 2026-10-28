# ACPP quickstart (GitHub wedge)

End-to-end walkthrough for PRODUCT §17.1: workspace → agent → signal → grant → authorized GitHub action → receipt → revoke → **deny**.

## Prerequisites

- Node.js **22+**
- `pnpm install` at repo root

## 1. Run tests (offline)

The wedge example exercises both an in-process sketch and a full HTTP walkthrough against `@acpp/api` with mocked GitHub HTTP:

```bash
pnpm --filter @acpp/example-wedge-github test
```

Source: [`examples/wedge-github/src/walkthrough.ts`](../examples/wedge-github/src/walkthrough.ts).

## 2. Start the Developer API locally

```bash
pnpm --filter @acpp/api dev
```

Default listen: `http://127.0.0.1:8787` (see `apps/api/src/serve.ts`).

Discover routes:

```bash
curl -s http://127.0.0.1:8787/v1 | jq .
```

## 3. Use the reference SDK (`@acpp/client`)

The SDK is a thin HTTP wrapper — it **does not** auto-approve or execute protected operations.

```typescript
import { AcppClient, signSignalEnvelope } from "@acpp/client";
import { generateEd25519KeyPair } from "@acpp/identity";

const client = new AcppClient({ baseUrl: "http://127.0.0.1:8787" });
const { workspace } = await client.createWorkspace({
  id: "my-team",
  slug: "my-team",
  displayName: "My team",
});
// register identities, signSignalEnvelope(...), submitSignal, createGrant, evaluateAuthorization, …
```

Package: [`packages/acpp-client`](../packages/acpp-client).

## 4. Protocol map

| Concern | Doc |
| --- | --- |
| Identity + `/v1/verify` | [`protocol/identity.md`](./protocol/identity.md) |
| Signals | [`protocol/signal.md`](./protocol/signal.md) |
| Grants + evaluate/execute | [`protocol/authz.md`](./protocol/authz.md) |
| GitHub connect + execute | [`protocol/connections.md`](./protocol/connections.md) |
| Receipts | [`protocol/receipts.md`](./protocol/receipts.md) |
| Workspace tenant | [`protocol/workspace.md`](./protocol/workspace.md) |

## 5. Policy denial

After revoking a grant, `POST /v1/authorization/evaluate` returns `allow: false` and `POST /v1/github/actions/execute` responds **403** before calling GitHub. The HTTP walkthrough test asserts both **success** and **denial** paths.

OpenAPI and machine-readable schemas: **A-011**. Runnable local allow+deny demos without mocks: **A-012**.
