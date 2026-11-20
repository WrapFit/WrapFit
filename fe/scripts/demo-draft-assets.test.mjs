import assert from "node:assert/strict";
import { test } from "node:test";
import { remapDraftElements } from "../src/features/studio/utils/demoDraftAssets.ts";

test("restoring or saving a draft keeps shapes and replaces only local asset URLs", () => {
  const shape = { id: "shape", type: "shape", content: "", shape: { kind: "rect" } };
  const image = { id: "photo", type: "image", content: "blob:photo" };
  const missing = { id: "missing", type: "image", content: "blob:missing" };
  const text = { id: "title", type: "text", content: "Trà sen" };
  for (const replacement of ["blob:restored", "/uploads/photo.png"]) {
    const assets = new Map([["blob:photo", replacement]]);
    assert.deepEqual(remapDraftElements([shape, image, missing, text], assets), [
      shape, { ...image, content: replacement }, text,
    ]);
  }
});
