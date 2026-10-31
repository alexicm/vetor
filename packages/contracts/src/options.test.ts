import { describe, expect, it } from "vitest";
import { vectorizeOptionsSchema } from "./options";

describe("contratos", () => {
  it("aplica defaults do modo de vetorização", () => {
    const parsed = vectorizeOptionsSchema.parse({ mode: "logo" });
    expect(parsed.transparentBackground).toBe(true);
    expect(parsed.optimizePaths).toBe(true);
  });
});
