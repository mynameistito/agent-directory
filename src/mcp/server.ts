import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Effect } from "effect";
import { z } from "zod";

import { catalog, findProducts, getProduct } from "../domain/catalog";

const protocolSchema = z.enum(["mcp", "rest", "cli"]);

const listProducts = (protocol?: z.infer<typeof protocolSchema>) => {
  const products = protocol
    ? catalog.products.filter((product) =>
        product.interfaces.some((item) => item.type === protocol)
      )
    : catalog.products;

  return { count: products.length, products };
};

const textResult = (text: string) => ({
  content: [{ text, type: "text" as const }],
});

const makeServer = (): McpServer => {
  const server = new McpServer({
    description:
      "Read-only catalog of mynameistito products and their published interfaces. These tools describe products; they do not call or proxy them.",
    name: "mynameistito-agent-directory",
    title: "mynameistito Agent Directory",
    version: "0.1.0",
  });

  server.registerTool(
    "list_products",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      description:
        "List catalog products, optionally filtering by interface type. Returns publisher-maintained descriptions and limitations only; it does not invoke products.",
      inputSchema: {
        protocol: protocolSchema
          .optional()
          .describe("Optional interface type filter."),
      },
      title: "List products",
    },
    async ({ protocol }) => {
      const result = await Effect.runPromise(
        Effect.sync(() => listProducts(protocol))
      );

      return textResult(JSON.stringify(result, null, 2));
    }
  );

  server.registerTool(
    "get_product",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      description:
        "Get one product by its stable catalog ID, including its documented interfaces and limitations. This tool does not call the product.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Stable product ID, such as hcc-bin-day."),
      },
      title: "Get product details",
    },
    async ({ id }) => {
      const result = await Effect.runPromise(
        Effect.sync(() => ({ product: getProduct(id) ?? null }))
      );

      return textResult(JSON.stringify(result, null, 2));
    }
  );

  server.registerTool(
    "search_products",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      description:
        "Search product IDs, names, descriptions, and limitations. This is catalog search only and does not invoke product APIs.",
      inputSchema: {
        protocol: protocolSchema
          .optional()
          .describe("Optional interface type filter."),
        query: z
          .string()
          .trim()
          .min(1)
          .describe("Words or phrase to search for."),
      },
      title: "Search products",
    },
    async ({ query, protocol }) => {
      const products = await Effect.runPromise(
        Effect.sync(() => findProducts(query, protocol))
      );

      return textResult(
        JSON.stringify({ count: products.length, products }, null, 2)
      );
    }
  );

  server.registerResource(
    "directory-manifest",
    "directory://manifest",
    {
      description:
        "Versioned machine-readable catalog. Entries are publisher-maintained and are not independent attestations.",
      mimeType: "application/json",
      title: "Product catalog manifest",
    },
    (uri) => ({
      contents: [
        {
          mimeType: "application/json",
          text: JSON.stringify(catalog, null, 2),
          uri: uri.href,
        },
      ],
    })
  );

  server.registerResource(
    "product-details",
    new ResourceTemplate("directory://products/{id}", {
      // The SDK requires an explicitly undefined callback when listing is unsupported.
      // oxlint-disable-next-line sonarjs/no-undefined-assignment
      list: undefined,
    }),
    {
      description:
        "One product entry by stable ID, including its documented interfaces and limitations.",
      mimeType: "application/json",
      title: "Product details",
    },
    /**
     * Return one product resource by its stable ID.
     * @param uri - Requested resource URI.
     * @param variables - Template variables from the resource request.
     * @returns The product resource contents or a not-found response.
     */
    (uri, variables) => {
      const { id } = variables;
      const productId = Array.isArray(id) ? id[0] : id;

      const product =
        productId !== undefined && productId.length > 0
          ? getProduct(productId)
          : undefined;

      return {
        contents: [
          {
            mimeType: "application/json",
            text: JSON.stringify(
              product ?? { error: "Product not found" },
              null,
              2
            ),
            uri: uri.href,
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "choose_product_for_task",
    {
      argsSchema: {
        task: z
          .string()
          .min(1)
          .describe("The user's task or integration need."),
      },
      description:
        "Compare the published directory entries against a user's task. Explain interface fit and limitations; never claim to invoke a product.",
      title: "Choose a product for a task",
    },
    ({ task }) => ({
      description:
        "Use only the catalog data below; distinguish direct fit from unsupported capabilities.",
      messages: [
        {
          content: {
            text: `Help select an existing product for this task: ${task}\n\nCatalog:\n${JSON.stringify(catalog, null, 2)}\n\nState explicitly when no listed interface fits. Do not invent MCP or A2A support.`,
            type: "text",
          },
          role: "user",
        },
      ],
    })
  );

  return server;
};

/**
 * Handle one stateless Streamable HTTP MCP request.
 * @param request - Incoming MCP Streamable HTTP request.
 * @returns The MCP response.
 */
export const handleMcpRequest = async (request: Request): Promise<Response> => {
  const server = makeServer();

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
};
