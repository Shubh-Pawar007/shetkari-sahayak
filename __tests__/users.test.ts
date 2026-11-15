import test from "node:test";
import assert from "node:assert/strict";
import { createUser, verifyLogin, validate, sign, unsign } from "../lib/users.ts";

test("sign up then log in; duplicate and wrong password are rejected", async () => {
  const u = { username: "newofficer", password: "Secret123", name: "नवीन अधिकारी", role: "तलाठी" };
  assert.equal(validate(u), null);
  assert.equal(await createUser(u), "ok");
  assert.equal(await createUser(u), "exists");
  assert.ok(await verifyLogin("newofficer", "Secret123"));
  assert.equal(await verifyLogin("newofficer", "wrong"), null);
});

test("seeded demo logins still work", async () => {
  assert.ok(await verifyLogin("officer1", "Demo@1234"));
});

test("validation and cookie signing", () => {
  assert.equal(validate({ username: "ab", password: "Secret123", name: "xx", role: "तलाठी" }), "username");
  assert.equal(validate({ username: "abcd", password: "short", name: "xx", role: "तलाठी" }), "password");
  assert.equal(unsign(sign("officer1")), "officer1");
  assert.equal(unsign("officer1.forged"), null);
});
