import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeFakeLocalStorage } from "./helpers/fake-local-storage.js";

// auth.js references the bare `localStorage` global, same as cart.js.
globalThis.localStorage = makeFakeLocalStorage();

// These tests exercise the dev-mode implementation directly (devSignUp,
// devSignIn, ...) rather than the AUTH_MODE-switched signUp/signIn/etc.
// AUTH_MODE is a live deployment setting - whichever value it currently
// holds (e.g. "firebase" once a real project is configured) - so tests
// must not depend on it being "dev" to exercise the dev-mode logic.
const { readEmailMap, writeEmailMap, devSignUp, devSignIn, devSignOut, devGetIdToken, devGetCurrentUser } = await import(
  "../assets/js/auth.js"
);

beforeEach(async () => {
  globalThis.localStorage.clear();
  await devSignOut();
});

test("readEmailMap seeds itself with the backend's known seed accounts on first read", () => {
  const map = readEmailMap();
  assert.equal(map["dana.admin@example.test"], "dev-admin-1");
  assert.equal(map["sam.staff@example.test"], "dev-staff-1");
  assert.equal(map["maria.delacruz@example.test"], "dev-parent-1");
  assert.equal(map["liza.fernandez@example.test"], "dev-parent-5");
});

test("readEmailMap persists the seed map to localStorage so it survives a reload", () => {
  readEmailMap(); // triggers the seed write
  const raw = globalThis.localStorage.getItem("paref_dev_email_map");
  assert.ok(raw, "expected the seed map to have been written to storage");
  const parsed = JSON.parse(raw);
  assert.equal(parsed["dana.admin@example.test"], "dev-admin-1");
});

test("writeEmailMap adds a new entry without disturbing the seed accounts", () => {
  const map = readEmailMap();
  map["newparent@example.test"] = "uid-123";
  writeEmailMap(map);

  const reread = readEmailMap();
  assert.equal(reread["newparent@example.test"], "uid-123");
  assert.equal(reread["dana.admin@example.test"], "dev-admin-1");
});

test("devSignUp registers a brand-new email with a fresh uid and signs it in", async () => {
  await devSignUp("newparent@example.test", "whatever");
  const user = devGetCurrentUser();
  assert.equal(user.email, "newparent@example.test");
  assert.ok(user.uid, "expected a uid to have been generated");
});

test("devSignUp rejects an email that is already registered", async () => {
  await devSignUp("dupe@example.test", "whatever");
  await assert.rejects(() => devSignUp("dupe@example.test", "different"), /already registered/i);
});

test("devSignIn on a seeded email reuses that account's known uid", async () => {
  await devSignIn("dana.admin@example.test", "whatever");
  const user = devGetCurrentUser();
  assert.equal(user.uid, "dev-admin-1");
});

test("devSignIn on an unknown email creates and remembers a new uid (dev mode cannot verify passwords)", async () => {
  await devSignIn("firsttime@example.test", "whatever");
  const first = devGetCurrentUser();
  await devSignOut();
  await devSignIn("firsttime@example.test", "a-different-password");
  const second = devGetCurrentUser();
  assert.equal(first.uid, second.uid, "signing in again should reuse the same uid, not mint a new one");
});

test("devSignOut clears the current session", async () => {
  await devSignIn("someone@example.test", "whatever");
  assert.ok(devGetCurrentUser());
  await devSignOut();
  assert.equal(devGetCurrentUser(), null);
});

test("devGetIdToken returns null when signed out and a dev:<uid>:<email> token when signed in", async () => {
  assert.equal(await devGetIdToken(), null);
  await devSignIn("dana.admin@example.test", "whatever");
  assert.equal(await devGetIdToken(), "dev:dev-admin-1:dana.admin@example.test");
});
