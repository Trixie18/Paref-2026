// Tiny modal helper - mirrors frontend/components/ui/Modal.tsx (backdrop,
// Escape-to-close, a titled box). `bodyHtml` is inserted as-is; the
// caller wires up its own form/button listeners after this returns the
// mounted content element.

export function openModal({ title, bodyHtml, wide = false, onClose }) {
  const root = document.getElementById("modal-root");
  root.innerHTML = "";

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const box = document.createElement("div");
  box.className = wide ? "modal-box modal-wide" : "modal-box";

  box.innerHTML = `
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-navy">${title}</h2>
      <button type="button" data-modal-close aria-label="Close" class="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/5">&times;</button>
    </div>
    <div data-modal-body></div>
  `;
  box.querySelector("[data-modal-body]").innerHTML = bodyHtml;

  function close() {
    root.innerHTML = "";
    document.removeEventListener("keydown", onKey);
    if (onClose) onClose();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  box.querySelector("[data-modal-close]").addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  backdrop.appendChild(box);
  root.appendChild(backdrop);

  return { body: box.querySelector("[data-modal-body]"), close };
}
