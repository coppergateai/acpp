/** Inline browser script for nav, copy, and wedge demo panel. */

export function landingClientScript(): string {
  return `
(function () {
  var header = document.getElementById("site-header");
  var toggle = document.getElementById("nav-toggle");
  var mobile = document.getElementById("mobile-nav");
  var copyBtn = document.getElementById("copy-code");
  var raw = document.getElementById("sdk-sample-raw");
  var wedgeDataEl = document.getElementById("wedge-data");
  var wedgeSteps = [];
  try {
    wedgeSteps = JSON.parse(wedgeDataEl ? wedgeDataEl.textContent || "[]" : "[]");
  } catch (e) {
    wedgeSteps = [];
  }

  function onScroll() {
    if (!header) return;
    if (window.scrollY > 8) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && mobile) {
    toggle.addEventListener("click", function () {
      var open = mobile.classList.toggle("open");
      mobile.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    mobile.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobile.classList.remove("open");
        mobile.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  if (copyBtn && raw) {
    copyBtn.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText((raw.textContent || "").replace(/\\u003c/g, "<"));
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 1600);
      } catch (e) {
        copyBtn.textContent = "Failed";
      }
    });
  }

  var tabs = document.querySelectorAll(".step-tab");
  var title = document.getElementById("wedge-panel-title");
  var detail = document.getElementById("wedge-panel-detail");
  var meta = document.getElementById("wedge-panel-meta");
  var status = document.getElementById("wedge-panel-status");
  var panel = document.getElementById("wedge-panel");

  function selectStep(index) {
    var step = wedgeSteps[index];
    if (!step) return;
    tabs.forEach(function (tab, i) {
      tab.setAttribute("aria-selected", i === index ? "true" : "false");
    });
    if (title) title.textContent = step.title;
    if (detail) detail.textContent = step.detail;
    if (meta) meta.textContent = step.meta;
    if (status) {
      status.textContent = index === wedgeSteps.length - 1
        ? "Revoke proves subsequent deny (403)"
        : "Demonstration step " + (index + 1) + " of " + wedgeSteps.length;
    }
    if (panel) panel.setAttribute("aria-labelledby", "wedge-tab-" + index);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      selectStep(Number(tab.getAttribute("data-step") || "0"));
    });
    tab.addEventListener("keydown", function (ev) {
      var i = Number(tab.getAttribute("data-step") || "0");
      if (ev.key === "ArrowDown" || ev.key === "ArrowRight") {
        ev.preventDefault();
        var next = Math.min(i + 1, tabs.length - 1);
        tabs[next].focus();
        selectStep(next);
      } else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        var prev = Math.max(i - 1, 0);
        tabs[prev].focus();
        selectStep(prev);
      }
    });
  });
})();`;
}
