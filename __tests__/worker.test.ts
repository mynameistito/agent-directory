import { describe, expect, it } from "vitest";

import worker from "../src/worker";

describe("directory Worker", () => {
  it("serves the machine-readable catalog at both public index paths", async () => {
    const catalogResponse = await worker.fetch(
      new Request("https://agents.example/catalog.json")
    );
    const wellKnownResponse = await worker.fetch(
      new Request("https://agents.example/.well-known/agent-index.json")
    );

    expect(catalogResponse.status).toBe(200);
    expect(wellKnownResponse.status).toBe(200);
    await expect(catalogResponse.json()).resolves.toMatchObject({
      publisher: { id: "mynameistito" },
      schemaVersion: "1",
    });
  });

  it("rejects MCP requests from unapproved browser origins", async () => {
    const response = await worker.fetch(
      new Request("https://agents.example/mcp", {
        headers: { origin: "https://attacker.example" },
        method: "POST",
      })
    );

    expect(response.status).toBe(403);
  });

  it("answers MCP GET requests with the Streamable HTTP 405 behavior", async () => {
    const response = await worker.fetch(
      new Request("https://agents.example/mcp", { method: "GET" })
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });

  it("exposes its catalog tools through MCP Streamable HTTP", async () => {
    const initialization = await worker.fetch(
      new Request("https://agents.example/mcp", {
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            capabilities: {},
            clientInfo: { name: "directory-test", version: "1.0.0" },
            protocolVersion: "2025-11-25",
          },
        }),
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        method: "POST",
      })
    );
    const tools = await worker.fetch(
      new Request("https://agents.example/mcp", {
        body: JSON.stringify({
          id: 2,
          jsonrpc: "2.0",
          method: "tools/list",
          params: {},
        }),
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        method: "POST",
      })
    );
    const product = await worker.fetch(
      new Request("https://agents.example/mcp", {
        body: JSON.stringify({
          id: 3,
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            arguments: { id: "hcc-bin-day" },
            name: "get_product",
          },
        }),
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        method: "POST",
      })
    );

    expect(initialization.status).toBe(200);
    expect(tools.status).toBe(200);
    expect(product.status).toBe(200);
    await expect(tools.json()).resolves.toMatchObject({
      result: {
        tools: [
          { name: "list_products" },
          { name: "get_product" },
          { name: "search_products" },
        ],
      },
    });
    await expect(product.json()).resolves.toMatchObject({
      result: {
        content: [
          {
            text: expect.stringContaining(
              "https://bin-day.mynameistito.com/api/mcp"
            ),
          },
        ],
      },
    });
  });

  it("returns not found for unknown routes", async () => {
    const response = await worker.fetch(
      new Request("https://agents.example/not-a-route")
    );

    expect(response.status).toBe(404);
  });
});
