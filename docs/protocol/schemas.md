# Machine-readable schemas (A-011)

ACPP separates **portable protocol** shapes from the **hosted HTTP API** contract (PRODUCT §16.2).

## Portable protocol (transport-independent)

Version **0.1.0** JSON Schemas live in `@acpp/schemas`:

```text
packages/acpp-schemas/protocol/v0.1.0/
  manifest.json
  signal-envelope.schema.json
  permission-grant.schema.json
  authorization-decision.schema.json
  receipt.schema.json
```

Fetch at runtime (no dashboard UI dependency):

| Method | Path | Description |
| --- | --- | --- |
| GET | `/v1/protocol/schemas` | Manifest with schema ids |
| GET | `/v1/protocol/schemas/{schemaId}` | One JSON Schema document |

Normative signing and verification rules remain in the markdown protocol docs (for example [`signal.md`](./signal.md)); schemas describe wire shapes for validators and SDK generators.

## Hosted HTTP API

OpenAPI **3.1** document version **1.0.0** (`/v1` routes):

| Method | Path | Description |
| --- | --- | --- |
| GET | `/v1/openapi.json` | Full OpenAPI document |

Source file: `packages/acpp-schemas/openapi/acpp-hosted-v1.openapi.json`.

Import in tooling:

```bash
curl -sS http://127.0.0.1:3000/v1/openapi.json | jq .info.version
curl -sS http://127.0.0.1:3000/v1/protocol/schemas/signal-envelope | jq .title
```

## Versioning

- **Protocol schemas** track `@acpp/core` `ACPP_PROTOCOL_VERSION` (currently `0.1.0`).
- **Hosted API** uses URL prefix `/v1` and OpenAPI `info.version` `1.0.0`.

Breaking changes to either surface require a new protocol folder or API major version.
