import { createServer } from "node:http";
import { DASHBOARD_NAV, pageTitle } from "./shell.js";

const port = Number(process.env.PORT ?? 3000);

createServer((_req, res) => {
  const nav = DASHBOARD_NAV.map((n) => `<li>${n}</li>`).join("");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(
    `<!doctype html><html><head><title>ACPP</title></head><body><h1>${pageTitle()}</h1><ul>${nav}</ul><p>Dashboard scaffold — P-030.</p></body></html>`,
  );
}).listen(port, () => {
  console.log(`acpp web listening on :${port}`);
});
