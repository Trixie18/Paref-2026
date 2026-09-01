import { test } from "node:test";
import assert from "node:assert/strict";
import { wireLiveSearch } from "../assets/js/search.js";

// Node's built-in EventTarget is enough to stand in for an <input> here -
// wireLiveSearch only needs something with a mutable `.value` and a real
// "input" event to react to.
function fakeInput() {
  const target = new EventTarget();
  target.value = "";
  return target;
}

test("empty query returns every item, unfiltered", () => {
  const input = fakeInput();
  let lastResult = null;
  wireLiveSearch(input, {
    getItems: () => [{ name: "Meal Stub" }, { name: "Water" }],
    matches: (item, q) => item.name.toLowerCase().includes(q),
    onFilter: (filtered) => (lastResult = filtered),
  });

  input.value = "";
  input.dispatchEvent(new Event("input"));

  assert.deepEqual(lastResult, [{ name: "Meal Stub" }, { name: "Water" }]);
});

test("filters items case-insensitively as the query changes", () => {
  const input = fakeInput();
  let lastResult = null;
  const items = [{ name: "Meal Stub" }, { name: "Water" }, { name: "Bingo Card" }];
  wireLiveSearch(input, {
    getItems: () => items,
    matches: (item, q) => item.name.toLowerCase().includes(q),
    onFilter: (filtered) => (lastResult = filtered),
  });

  input.value = "WATER";
  input.dispatchEvent(new Event("input"));
  assert.deepEqual(lastResult, [{ name: "Water" }]);

  input.value = "b";
  input.dispatchEvent(new Event("input"));
  assert.deepEqual(lastResult, [{ name: "Meal Stub" }, { name: "Bingo Card" }]);
});

test("re-reads getItems() on every keystroke, so it reflects live edits to the underlying list", () => {
  const input = fakeInput();
  let items = [{ name: "Meal Stub" }];
  let lastResult = null;
  wireLiveSearch(input, {
    getItems: () => items,
    matches: (item, q) => item.name.toLowerCase().includes(q),
    onFilter: (filtered) => (lastResult = filtered),
  });

  input.value = "";
  input.dispatchEvent(new Event("input"));
  assert.equal(lastResult.length, 1);

  items = [...items, { name: "Water" }];
  input.dispatchEvent(new Event("input"));
  assert.equal(lastResult.length, 2);
});

test("whitespace-only query behaves like an empty query", () => {
  const input = fakeInput();
  let lastResult = null;
  const items = [{ name: "Meal Stub" }];
  wireLiveSearch(input, {
    getItems: () => items,
    matches: (item, q) => item.name.toLowerCase().includes(q),
    onFilter: (filtered) => (lastResult = filtered),
  });

  input.value = "   ";
  input.dispatchEvent(new Event("input"));
  assert.deepEqual(lastResult, items);
});
