/**
 * MIMO DIVINO — comportamentos de interface compartilhados
 * ------------------------------------------------------------------
 */

/* ---- Menu mobile ---- */
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---- Toast de feedback ---- */
let toastTimer = null;
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <svg class="icon" aria-hidden="true"><use href="#icon-check-circle"></use></svg>
      <span class="toast-text"></span>`;
    document.body.appendChild(toast);
  }
  toast.querySelector(".toast-text").textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* ---- Galeria de imagens (página de produto) ---- */
function initGallery() {
  const main = document.querySelector("[data-gallery-main]");
  const thumbs = document.querySelectorAll("[data-gallery-thumb]");
  if (!main || !thumbs.length) return;
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const src = thumb.getAttribute("data-gallery-thumb");
      main.src = src;
      thumbs.forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });
}

/* ---- Abas de detalhes do produto ---- */
function initTabs() {
  const buttons = document.querySelectorAll("[data-tab-target]");
  if (!buttons.length) return;
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab-target");
      document.querySelectorAll("[data-tab-target]").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll("[data-tab-panel]").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-tab-panel="${target}"]`).classList.add("active");
    });
  });
}

/* ---- Contador de quantidade (produto e carrinho) ---- */
function initQtysteppers() {
  document.querySelectorAll("[data-qty-stepper]").forEach((stepper) => {
    const input = stepper.querySelector("input");
    const minus = stepper.querySelector("[data-qty-minus]");
    const plus = stepper.querySelector("[data-qty-plus]");
    const max = parseInt(input.getAttribute("max") || "99", 10);

    const clamp = (v) => Math.max(1, Math.min(max, v));

    minus.addEventListener("click", () => {
      input.value = clamp(parseInt(input.value || "1", 10) - 1);
      input.dispatchEvent(new Event("change"));
    });
    plus.addEventListener("click", () => {
      input.value = clamp(parseInt(input.value || "1", 10) + 1);
      input.dispatchEvent(new Event("change"));
    });
    input.addEventListener("change", () => {
      input.value = clamp(parseInt(input.value || "1", 10));
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initGallery();
  initTabs();
  initQtysteppers();
});
