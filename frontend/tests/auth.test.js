import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeFakeLocalStorage } from "./helpers/fake-local-storage.js";

// auth.js references the bare `localStorage` global, same as cart.js.
globalThis.localStorage = makeFakeLocalStorage();

const { readEmailMap, writeEmailMap, SEED_EMAIL_MAP, signUp, signIn, signOut, getIdToken, getCurrentUser, AUTH_MODE } = await import(
  "../assets/js/auth.js"
);

beforeEach(async () => {
  globalThis.localStorage.clear();
  await signOut();
});

test("auth.js defaults to dev mode", () => {
  assert.equal(AUTH_MODE, "dev");
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

test("signUp registers a brand-new email with a fresh uid and signs it in", async () => {
  await signUp("newparent@example.test", "whatever");
  const user = getCurrentUser();
  assert.equal(user.email, "newparent@example.test");
  assert.ok(user.uid, "expected a uid to have been generated");
});

test("signUp rejects an email that is already registered", async () => {
  await signUp("dupe@example.test", "whatever");
  await assert.rejects(() => signUp("dupe@example.test", "different"), /already registered/i);
});

test("signIn on a seeded email reuses that account's known uid", async () => {
  await signIn("dana.admin@example.test", "whatever");
  const user = getCurrentUser();
  assert.equal(user.uid, "dev-admin-1");
});

test("signIn on an unknown email creates and remembers a new uid (dev mode cannot verify passwords)", async () => {
  await signIn("firsttime@example.test", "whatever");
  const first = getCurrentUser();
  await signOut();
  await signIn("firsttime@example.test", "a-different-password");
  const second = getCurrentUser();
  assert.equal(first.uid, second.uid, "signing in again should reuse the same uid, not mint a new one");
});

test("signOut clears the current session", async () => {
  await signIn("someone@example.test", "whatever");
  assert.ok(getCurrentUser());
  await signOut();
  assert.equal(getCurrentUser(), null);
});

test("getIdToken returns null when signed out and a dev:<uid>:<email> token when signed in", async () => {
  assert.equal(await getIdToken(), null);
  await signIn("dana.admin@example.test", "whatever");
  assert.equal(await getIdToken(), "dev:dev-admin-1:dana.admin@example.test");
});
