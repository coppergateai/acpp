import { createApiServer } from "./index.js";

const port = Number(process.env.PORT ?? 8787);
createApiServer().listen(port, () => {
  console.log(`acpp api listening on :${port}`);
});
