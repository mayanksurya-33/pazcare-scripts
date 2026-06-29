/* PazAccordion (FAQ) — click a .paz-faq-elem to toggle its [data-state];
   the CSS (paz-faq-answer / paz-faq-btn-wrapper) handles the expand and the
   +/- icon spin.

   Uses click delegation rather than a DOMContentLoaded listener, so it works
   when the loader injects this script late (after that event has fired) and
   for FAQ items added to the DOM later. The one-time guard stops a double
   include from binding twice (which would toggle on every click = look dead).
*/
(function () {
  "use strict";

  if (window.__pazFaqWired) return;
  window.__pazFaqWired = true;

  document.addEventListener("click", function (e) {
    const elem = e.target.closest(".paz-faq-elem");
    if (!elem) return;
    const open = elem.getAttribute("data-state") === "open";
    elem.setAttribute("data-state", open ? "closed" : "open");
  });
})();
