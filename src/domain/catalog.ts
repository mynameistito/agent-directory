/** A protocol or package through which a directory product can be used. */
export type ProductInterface =
  | {
      readonly endpoint: string;
      readonly transport: "streamable-http";
      readonly type: "mcp";
    }
  | {
      readonly baseUrl: string;
      readonly documentationUrl: string;
      readonly type: "rest";
    }
  | {
      readonly packageName: string;
      readonly repositoryUrl: string;
      readonly type: "cli";
    };

/** A product entry in the publisher's public catalog. */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: "directory" | "api";
  readonly status: "available";
  readonly websiteUrl: string;
  readonly repositoryUrl: string;
  readonly interfaces: readonly ProductInterface[];
  readonly limitations: readonly string[];
}

/** The versioned document published at the directory's HTTP index URL. */
export interface ProductCatalog {
  readonly schemaVersion: "1";
  readonly publisher: {
    readonly id: "mynameistito";
    readonly name: "mynameistito";
    readonly url: "https://mynameistito.com";
  };
  readonly products: readonly Product[];
}

/** The public catalog; product interfaces describe real services, not inferred capabilities. */
export const catalog: ProductCatalog = {
  products: [
    {
      description:
        "A read-only directory of published products and their documented interfaces.",
      id: "agent-directory",
      interfaces: [
        {
          endpoint: "https://agents.mynameistito.com/mcp",
          transport: "streamable-http",
          type: "mcp",
        },
        {
          baseUrl: "https://agents.mynameistito.com/catalog.json",
          documentationUrl: "https://agents.mynameistito.com/",
          type: "rest",
        },
      ],
      kind: "directory",
      limitations: [
        "Catalog discovery only; MCP tools do not invoke or proxy listed products.",
        "Entries are publisher-maintained descriptions, not independent security or availability attestations.",
      ],
      name: "mynameistito Agent Directory",
      repositoryUrl: "https://github.com/mynameistito/agent-directory",
      status: "available",
      websiteUrl: "https://agents.mynameistito.com/",
    },
    {
      description:
        "An unofficial address lookup for Hamilton City Council bin collection schedules, with a web app and TypeScript CLI.",
      id: "hcc-bin-day",
      interfaces: [
        {
          endpoint: "https://bin-day.mynameistito.com/api/mcp",
          transport: "streamable-http",
          type: "mcp",
        },
        {
          baseUrl: "https://bin-day.mynameistito.com/api/lookup",
          documentationUrl: "https://bin-day.mynameistito.com/docs/",
          type: "rest",
        },
        {
          packageName: "@mynameistito/hcc-bin-day",
          repositoryUrl: "https://github.com/mynameistito/hcc-bin-day",
          type: "cli",
        },
      ],
      kind: "api",
      limitations: [
        "Unofficial and not affiliated with or endorsed by Hamilton City Council.",
        "Schedule data depends on the public Council API and can change or become unavailable.",
        "The MCP endpoint only performs schedule lookups; it does not modify Council data.",
        "This product does not expose an A2A endpoint.",
      ],
      name: "Hamilton Bin Day",
      repositoryUrl: "https://github.com/mynameistito/hcc-bin-day",
      status: "available",
      websiteUrl: "https://bin-day.mynameistito.com/",
    },
  ],
  publisher: {
    id: "mynameistito",
    name: "mynameistito",
    url: "https://mynameistito.com",
  },
  schemaVersion: "1",
};

/** Filter catalog products by free-text query and optional interface type. */
export const findProducts = (
  query: string,
  protocol?: ProductInterface["type"]
): readonly Product[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return catalog.products.filter((product) => {
    const matchesProtocol =
      protocol === undefined ||
      product.interfaces.some((item) => item.type === protocol);
    const searchableText = [
      product.id,
      product.name,
      product.description,
      ...product.limitations,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return matchesProtocol && searchableText.includes(normalizedQuery);
  });
};

/** Find a catalog product by its stable ID. */
export const getProduct = (id: string): Product | undefined =>
  catalog.products.find((product) => product.id === id);
