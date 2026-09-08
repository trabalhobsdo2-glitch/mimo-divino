/**
 * MIMO DIVINO — checkout (dados, endereço e frete)
 * ------------------------------------------------------------------
 * Este arquivo cuida de 3 coisas:
 *   1) Preencher o resumo do pedido a partir do carrinho (products.js + cart.js)
 *   2) Buscar endereço pelo CEP (API pública ViaCEP — gratuita, sem chave)
 *   3) Calcular uma ESTIMATIVA de frete (placeholder — ver aviso abaixo)
 *
 * O pagamento em si (cartão via Card Payment Brick, Pix e boleto via
 * API de Orders) é tratado em js/checkout-payment.js, que assume a
 * partir do momento em que o frete é escolhido aqui.
 *
 * ⚠️ FRETE — IMPORTANTE
 * A função calculateShippingEstimate() abaixo é um placeholder por região,
 * só para a experiência funcionar de ponta a ponta antes de você contratar
 * uma transportadora. ANTES DE PUBLICAR O SITE, troque por uma cotação real
 * (Melhor Envio, Correios, etc.), ou o valor mostrado ao cliente pode não
 * bater com o custo real de envio.
 * ------------------------------------------------------------------
 */

/* ---------------- Resumo do pedido ---------------- */
function renderOrderSummary() {
  const items = getCartDetailed();
  const wrap = document.getElementById("order-items");
  if (!wrap) return;

  if (!items.length) {
    window.location.href = "carrinho.html";
    return;
  }

  wrap.innerHTML = items.map((item) => `
    <div class="mini-item">
      <img src="${item.product.image}" alt="${item.product.name}">
      <div>
        <div class="mini-name">${item.product.name} <span style="color:var(--ink-faint);font-weight:400;">× ${item.qty}</span></div>
        <div class="mini-price">${formatBRL(item.lineTotal)}</div>
      </div>
    </div>
  `).join("");

  document.getElementById("order-subtotal").textContent = formatBRL(getCartSubtotal());
  updateOrderTotal();
}

function getOrderTotal() {
  return getCartSubtotal() + (getSelectedShippingPrice() || 0);
}

function updateOrderTotal() {
  const shipping = getSelectedShippingPrice();
  const totalEl = document.getElementById("order-total");
  const shippingEl = document.getElementById("order-shipping");
  if (shippingEl) {
    shippingEl.textContent = shipping === null ? "Informe o CEP" : formatBRL(shipping);
  }
  if (totalEl) {
    totalEl.textContent = formatBRL(getOrderTotal());
  }
}

/* ---------------- CEP → endereço (ViaCEP, gratuito) ---------------- */
async function lookupCEP(cep) {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data; // { logradouro, bairro, localidade, uf, ... }
  } catch (e) {
    console.warn("Não foi possível consultar o CEP agora.", e);
    return null;
  }
}

/* ---------------- Estimativa de frete (PLACEHOLDER) ---------------- */
const REGION_BY_UF = {
  SP: "sudeste", RJ: "sudeste", MG: "sudeste", ES: "sudeste",
  PR: "sul", SC: "sul", RS: "sul",
  DF: "centro-oeste", GO: "centro-oeste", MT: "centro-oeste", MS: "centro-oeste",
  BA: "nordeste", PE: "nordeste", CE: "nordeste", MA: "nordeste", PB: "nordeste",
  RN: "nordeste", AL: "nordeste", SE: "nordeste", PI: "nordeste",
  AM: "norte", PA: "norte", RO: "norte", RR: "norte", AC: "norte", AP: "norte", TO: "norte",
};

const SHIPPING_BASE = {
  sudeste: { standard: 14.9, express: 24.9, daysStandard: "4 a 7", daysExpress: "2 a 3" },
  sul: { standard: 17.9, express: 28.9, daysStandard: "5 a 8", daysExpress: "3 a 4" },
  "centro-oeste": { standard: 19.9, express: 31.9, daysStandard: "5 a 9", daysExpress: "3 a 5" },
  nordeste: { standard: 21.9, express: 34.9, daysStandard: "6 a 10", daysExpress: "3 a 5" },
  norte: { standard: 26.9, express: 39.9, daysStandard: "7 a 12", daysExpress: "4 a 6" },
};

let currentShipping = null; // { standard: {price, days}, express: {price, days} }
let selectedShippingKey = null; // "standard" | "express"

function calculateShippingEstimate(uf) {
  const region = REGION_BY_UF[uf] || "sudeste";
  const base = SHIPPING_BASE[region];
  return {
    standard: { price: base.standard, days: base.daysStandard },
    express: { price: base.express, days: base.daysExpress },
  };
}

function getSelectedShippingPrice() {
  if (!currentShipping || !selectedShippingKey) return null;
  return currentShipping[selectedShippingKey].price;
}

function getSelectedShippingMethod() {
  return selectedShippingKey;
}

function renderShippingOptions() {
  const wrap = document.getElementById("shipping-options");
  if (!wrap || !currentShipping) return;
  wrap.hidden = false;
  wrap.innerHTML = `
    <div class="shipping-option ${selectedShippingKey === "standard" ? "selected" : ""}" data-shipping="standard">
      <div class="opt-left">
        <svg class="icon" aria-hidden="true"><use href="#icon-truck"></use></svg>
        <div>
          <div class="opt-title">Padrão</div>
          <div class="opt-sub">${currentShipping.standard.days} dias úteis</div>
        </div>
      </div>
      <span class="opt-price">${formatBRL(currentShipping.standard.price)}</span>
    </div>
    <div class="shipping-option ${selectedShippingKey === "express" ? "selected" : ""}" data-shipping="express">
      <div class="opt-left">
        <svg class="icon" aria-hidden="true"><use href="#icon-package"></use></svg>
        <div>
          <div class="opt-title">Expressa</div>
          <div class="opt-sub">${currentShipping.express.days} dias úteis</div>
        </div>
      </div>
      <span class="opt-price">${formatBRL(currentShipping.express.price)}</span>
    </div>
  `;
  wrap.querySelectorAll("[data-shipping]").forEach((el) => {
    el.addEventListener("click", () => {
      selectedShippingKey = el.getAttribute("data-shipping");
      renderShippingOptions();
      updateOrderTotal();
      if (typeof onShippingReady === "function") onShippingReady();
    });
  });
}

/* ---------------- Validação simples ---------------- */
function setFieldError(field, hasError) {
  field.closest(".field").classList.toggle("error", hasError);
}

function validateCheckoutForm(form) {
  let valid = true;
  const required = form.querySelectorAll("[required]");
  required.forEach((field) => {
    const isEmpty = !field.value || !field.value.trim();
    setFieldError(field, isEmpty);
    if (isEmpty) valid = false;
  });

  const email = form.querySelector("#email");
  if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    setFieldError(email, true);
    valid = false;
  }

  if (!selectedShippingKey) {
    valid = false;
    const cepField = form.querySelector("#cep");
    if (cepField) setFieldError(cepField, true);
  }

  return valid;
}

function showCheckoutNotice(message, isError) {
  let el = document.getElementById("checkout-notice");
  if (!el) {
    el = document.createElement("div");
    el.id = "checkout-notice";
    el.className = "payment-note";
    const anchor = document.querySelector(".payment-tabs") || document.querySelector(".payment-methods");
    if (anchor) anchor.after(el);
  }
  el.style.borderColor = isError ? "var(--error)" : "";
  el.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-shield-check"></use></svg><span>${message}</span>`;
}

/* ---------------- Inicialização ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderOrderSummary();

  const cepField = document.getElementById("cep");
  if (cepField) {
    cepField.addEventListener("blur", async () => {
      const data = await lookupCEP(cepField.value);
      if (!data) return;
      document.getElementById("street").value = data.logradouro || "";
      document.getElementById("neighborhood").value = data.bairro || "";
      document.getElementById("city").value = data.localidade || "";
      document.getElementById("state").value = data.uf || "";
      currentShipping = calculateShippingEstimate(data.uf);
      selectedShippingKey = "standard";
      renderShippingOptions();
      updateOrderTotal();
      if (typeof onShippingReady === "function") onShippingReady();
      document.getElementById("number").focus();
    });
  }
});
