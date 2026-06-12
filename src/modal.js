/* PazModal — reusable modal engine.
   Open:  any element with  data-paz-modal="modal-id"
   Close: .paz-modal-close, any [data-paz-modal-close], overlay click, or Esc
   API:   PazModal.open('id') / PazModal.close('id') / PazModal.closeAll()
          PazModal.config({ ... })  — tweak the auto-injected close button

   The close button is auto-injected into every .paz-modal that doesn't
   already contain one, so you never have to place it by hand. Styling lives
   entirely in CSS under the .paz-modal-close class — change it there without
   touching this script.
*/
(function () {
  "use strict";

  // Close-button injection config. Override via PazModal.config({...}).
  const CONFIG = {
    injectClose: true,            // set false to manage close buttons yourself
    closeClass: "paz-modal-close",// styling hook — keep in sync with your CSS
    closeHTML: "×",          // the × glyph; swap for an <svg>/<img> if you like
    closeAriaLabel: "Close",
  };

  const openStack = [];
  function el(id) { return typeof id === "string" ? document.getElementById(id) : id; }

  // Inject a close button into a modal if it doesn't already have one.
  // Hand-placed close buttons are respected and never duplicated.
  function ensureCloseButton(modal) {
    if (!CONFIG.injectClose || !modal) return;
    if (modal.querySelector("." + CONFIG.closeClass)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = CONFIG.closeClass;
    btn.setAttribute("aria-label", CONFIG.closeAriaLabel);
    btn.innerHTML = CONFIG.closeHTML;
    modal.insertBefore(btn, modal.firstChild);
  }

  function open(id) {
    const modal = el(id);
    if (!modal || modal.classList.contains("is-open")) return;
    ensureCloseButton(modal);
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (modal.id && openStack.indexOf(modal.id) === -1) openStack.push(modal.id);
    const focusTarget = modal.querySelector("[autofocus], input:not([type=hidden]), select, textarea");
    if (focusTarget) setTimeout(function () { focusTarget.focus(); }, 60);
    modal.dispatchEvent(new CustomEvent("paz:modal:open", { bubbles: true }));
  }

  function close(id) {
    const modal = id ? el(id) : el(openStack[openStack.length - 1]);
    if (!modal) return;
    modal.classList.remove("is-open");
    const i = openStack.indexOf(modal.id);
    if (i !== -1) openStack.splice(i, 1);
    if (!openStack.length) document.body.style.overflow = "";
    modal.dispatchEvent(new CustomEvent("paz:modal:close", { bubbles: true }));
  }

  function closeAll() { while (openStack.length) close(openStack[openStack.length - 1]); }

  function config(opts) {
    Object.assign(CONFIG, opts || {});
  }

  document.addEventListener("click", function (e) {
    const trigger = e.target.closest("[data-paz-modal]");
    if (trigger) { e.preventDefault(); open(trigger.getAttribute("data-paz-modal")); return; }

    const closer = e.target.closest(".paz-modal-close, [data-paz-modal-close]");
    if (closer) {
      e.preventDefault();
      const parent = closer.closest(".paz-modal");
      close(parent ? parent.id : null);
      return;
    }

    if (e.target.classList &&
        e.target.classList.contains("paz-modal") &&
        e.target.classList.contains("is-open")) {
      close(e.target.id);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openStack.length) close(openStack[openStack.length - 1]);
  });

  // Pre-inject close buttons on load so they exist before the first open.
  function sweep() {
    document.querySelectorAll(".paz-modal").forEach(ensureCloseButton);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sweep);
  } else {
    sweep();
  }

  window.PazModal = { open: open, close: close, closeAll: closeAll, config: config };
})();
