// Wires a search <input> to live-filter an already-loaded array and
// re-render on every keystroke. No network round trip and no debounce -
// the data's already in the browser, so filtering is instant. Shared by
// every admin list page that filters client-side (Products, Bundles,
// Users, Audit Log). Admin Orders search stays server-side instead,
// since it matches against parent name/email/phone that the loaded
// order rows don't otherwise carry.
export function wireLiveSearch(inputEl, { getItems, matches, onFilter }) {
  function apply() {
    const query = inputEl.value.trim().toLowerCase();
    const filtered = query ? getItems().filter((item) => matches(item, query)) : getItems();
    onFilter(filtered, query);
  }
  inputEl.addEventListener("input", apply);
  return apply;
}
