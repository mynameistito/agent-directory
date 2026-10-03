import { describe, expect, it } from "vitest";

import { catalog, findProducts, getProduct } from "../src/domain/catalog";

describe("product catalog", () => {
  it("lists only product interfaces that are explicitly published", () => {
    const binDay = getProduct("hcc-bin-day");

    expect(binDay?.interfaces.map(({ type }) => type)).toStrictEqual([
      "mcp",
      "rest",
      "cli",
    ]);
    expect(binDay?.limitations).toContain(
      "This product does not expose an A2A endpoint."
    );
    expect(binDay?.interfaces).toContainEqual({
      endpoint: "https://bin-day.mynameistito.com/api/mcp",
      transport: "streamable-http",
      type: "mcp",
    });
  });

  it("finds products by text and optional interface type", () => {
    expect(findProducts("Hamilton", "rest").map(({ id }) => id)).toStrictEqual([
      "hcc-bin-day",
    ]);
    expect(findProducts("Hamilton", "mcp").map(({ id }) => id)).toStrictEqual([
      "hcc-bin-day",
    ]);
    expect(findProducts("  DIRECTORY ").map(({ id }) => id)).toStrictEqual([
      "agent-directory",
    ]);
  });

  it("returns the complete public catalog with stable publisher metadata", () => {
    expect(catalog.publisher.url).toBe("https://mynameistito.com");
    expect(catalog.schemaVersion).toBe("1");
    expect(getProduct("missing-product")).toBeUndefined();
  });
});
