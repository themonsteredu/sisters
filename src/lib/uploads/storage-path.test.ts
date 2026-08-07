import { describe, expect, it } from "vitest";
import { buildSubmissionStoragePath, safeExtension } from "./storage-path";

const base = {
  familyId: "11111111-1111-1111-1111-111111111111",
  studentId: "22222222-2222-2222-2222-222222222222",
  taskId: "33333333-3333-3333-3333-333333333333",
  uuid: "44444444-4444-4444-4444-444444444444",
};

describe("buildSubmissionStoragePath", () => {
  it("puts the family id in the first segment, which the storage policy authorizes on", () => {
    const path = buildSubmissionStoragePath({ ...base, fileName: "homework.png" });
    expect(path.split("/")[0]).toBe(base.familyId);
    expect(path).toBe(`${base.familyId}/${base.studentId}/${base.taskId}/${base.uuid}.png`);
  });

  it("keeps the family prefix intact for a crafted file name", () => {
    const path = buildSubmissionStoragePath({ ...base, fileName: "../../other-family/evil.png" });
    expect(path.split("/")[0]).toBe(base.familyId);
    expect(path.split("/")).toHaveLength(4);
  });
});

describe("safeExtension", () => {
  it("keeps a normal extension", () => {
    expect(safeExtension("photo.webp")).toBe("webp");
  });

  it("lowercases", () => {
    expect(safeExtension("PHOTO.PNG")).toBe("png");
  });

  it("falls back when there is no extension", () => {
    expect(safeExtension("photo")).toBe("bin");
  });

  it("strips path and query characters instead of letting them into the key", () => {
    expect(safeExtension("a.pn/g")).toBe("png");
    expect(safeExtension("a.png?x=1")).toBe("pngx1");
    expect(safeExtension("a.")).toBe("bin");
  });

  it("bounds the length", () => {
    expect(safeExtension("a.abcdefghijklmnop").length).toBeLessThanOrEqual(8);
  });
});
