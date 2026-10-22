import { catalog } from "./domain/catalog";
import { handleMcpRequest } from "./mcp/server";

const agentDirectoryOrigin = "https://agents.mynameistito.com";
const allowedMethods = "POST, OPTIONS";
const allowedOrigins = new Set([agentDirectoryOrigin]);

const jsonResponse = (body: string, status = 200): Response =>
  new Response(body, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
    status,
  });

const isAllowedOrigin = (request: Request): boolean => {
  const origin = request.headers.get("origin");

  return origin === null || allowedOrigins.has(origin);
};

const handleMcp = async (request: Request): Promise<Response> => {
  if (!isAllowedOrigin(request)) {
    return jsonResponse(
      JSON.stringify({ error: "Origin is not allowed" }),
      403
    );
  }

  if (request.method === "GET") {
    return new Response(null, {
      headers: { allow: allowedMethods },
      status: 405,
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-headers":
          "content-type, accept, mcp-session-id, mcp-protocol-version",
        "access-control-allow-methods": allowedMethods,
        "access-control-allow-origin": agentDirectoryOrigin,
        vary: "origin",
      },
      status: 204,
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      headers: { allow: allowedMethods },
      status: 405,
    });
  }

  try {
    const response = await handleMcpRequest(request);
    const headers = new Headers(response.headers);
    headers.set("access-control-allow-origin", agentDirectoryOrigin);
    headers.set("vary", "origin");
    headers.set("x-content-type-options", "nosniff");

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  } catch {
    return jsonResponse(
      JSON.stringify({ error: "MCP request could not be processed" }),
      400
    );
  }
};

const homepage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="A machine-readable directory of mynameistito products and their documented interfaces." />
    <title>mynameistito Agent Directory</title>
  </head>
  <body>
    <main>
      <h1>mynameistito Agent Directory</h1>
      <p>A read-only catalog of products and their documented interfaces. Listings are maintained by the publisher and are not independent security or availability attestations.</p>
      <ul>
        <li><a href="/catalog.json">Catalog JSON</a></li>
        <li><a href="/.well-known/agent-index.json">Well-known agent index document</a></li>
      </ul>
      <h2>Connect over MCP</h2>
      <p>Streamable HTTP endpoint: <code>${agentDirectoryOrigin}/mcp</code></p>
      <p>Tools: <code>list_products</code>, <code>get_product</code>, <code>search_products</code>.</p>
      <p>Resources: <code>directory://manifest</code>, <code>directory://products/{id}</code>.</p>
      <p>Prompt: <code>choose_product_for_task</code>.</p>
    </main>
  </body>
</html>`;

/** Route public catalog documents, health checks, and the MCP Streamable HTTP endpoint. */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/mcp") {
      return await handleMcp(request);
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(homepage, {
        headers: {
          "cache-control": "public, max-age=300",
          "content-security-policy":
            "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
          "content-type": "text/html; charset=utf-8",
          "x-content-type-options": "nosniff",
        },
      });
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/catalog.json" ||
        url.pathname === "/.well-known/agent-index.json")
    ) {
      return jsonResponse(JSON.stringify(catalog));
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(JSON.stringify({ status: "ok" }));
    }

    return jsonResponse(JSON.stringify({ error: "Not found" }), 404);
  },
};
