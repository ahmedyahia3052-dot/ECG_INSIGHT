import assert from "node:assert/strict";

import { BOLT_PRESERVE_MANIFEST, BOLT_REPLACEMENT_MANIFEST } from "../artifacts/ecg-insight/migration/bolt-replacement-manifest.ts";
import { APP_NAV_ITEMS } from "../artifacts/ecg-insight/routes/registry.ts";

assert.ok(BOLT_REPLACEMENT_MANIFEST.layouts.length > 0);
assert.ok(BOLT_PRESERVE_MANIFEST.includes("artifacts/ecg-insight/services/domain/"));
assert.ok(BOLT_PRESERVE_MANIFEST.includes("artifacts/ecg-insight/adapters/"));
assert.ok(APP_NAV_ITEMS.some((item) => item.href === "/ecg-workspace"));
assert.ok(APP_NAV_ITEMS.some((item) => item.href === "/dashboard"));
assert.equal(
  new Set(APP_NAV_ITEMS.map((item) => `${item.href}:${item.title}`)).size,
  APP_NAV_ITEMS.length,
  "Duplicate nav entries in navigation registry",
);

console.log("Bolt UI Migration Foundation unit tests: PASS");
