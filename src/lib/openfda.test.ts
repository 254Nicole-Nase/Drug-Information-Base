import { describe, expect, it } from "vitest";

import { labelSchema, nameSearchExpression } from "./openfda.server";

describe("nameSearchExpression", () => {
  it("searches brand, generic and substance fields", () => {
    const expression = nameSearchExpression("ibuprofen");
    expect(expression).toContain('openfda.brand_name:"ibuprofen"');
    expect(expression).toContain('openfda.generic_name:"ibuprofen"');
    expect(expression).toContain('openfda.substance_name:"ibuprofen"');
    expect(expression.split(" OR ")).toHaveLength(3);
  });
});

describe("labelSchema", () => {
  it("accepts a minimal openFDA record", () => {
    const parsed = labelSchema.parse({ id: "abc-123" });
    expect(parsed.id).toBe("abc-123");
  });

  it("rejects a record without an id", () => {
    expect(() => labelSchema.parse({ set_id: "x" })).toThrow();
  });

  it("keeps the openfda metadata block when present", () => {
    const parsed = labelSchema.parse({
      id: "abc",
      openfda: { brand_name: ["PANADOL"], generic_name: ["ACETAMINOPHEN"] },
    });
    expect(parsed.openfda?.brand_name?.[0]).toBe("PANADOL");
  });
});
