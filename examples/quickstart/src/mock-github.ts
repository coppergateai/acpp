/** Offline GitHub HTTP stub for local allow/deny demos (no real tokens). */
export const mockGithubFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  if (url.includes("/issues/") && init?.method === "POST") {
    return new Response(
      JSON.stringify({ id: 1, html_url: "https://example.test/issues/1#issuecomment-1" }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  }
  if (url.includes("/repos/") && (!init?.method || init.method === "GET")) {
    return new Response(JSON.stringify({ full_name: "coppergateai/acpp" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response("not found", { status: 404 });
};
