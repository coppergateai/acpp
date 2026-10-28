# Wedge: GitHub

Demonstrates the ACPP MVP loop in-process:

1. Create agent address
2. Grant scoped GitHub permission
3. Execute authorized stub action
4. Build receipt
5. Revoke grant → subsequent evaluation denies

```bash
pnpm --filter @acpp/example-wedge-github test
```

Real GitHub HTTP + hosted connection/execute API shipped in **P-020**. Runnable local allow/deny demo: **A-012** — [`docs/QUICKSTART.md`](../../docs/QUICKSTART.md) and [`examples/quickstart`](../quickstart/README.md). See [`docs/protocol/connections.md`](../../docs/protocol/connections.md).
