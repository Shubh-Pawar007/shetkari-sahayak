import test from "node:test";
import assert from "node:assert/strict";
import { findUser, verifyLogin, sign, unsign } from "../lib/users.ts";

test("seeded demo logins work; wrong password and unknown user are rejected", async () => {
  assert.ok(await verifyLogin("officer1", "Demo@1234"));
  assert.ok(await verifyLogin("officer2", "Demo@1234"));
  assert.equal(await verifyLogin("officer1", "wrong"), null);
  assert.equal(await verifyLogin("nobody", "Demo@1234"), null);
  assert.equal(findUser("officer1")?.name, "अनिल देशमुख");
});

test("cookie signing", () => {
  assert.equal(unsign(sign("officer1")), "officer1");
  assert.equal(unsign("officer1.forged"), null);
});
