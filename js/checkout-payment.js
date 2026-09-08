/**
 * MIMO DIVINO — pagamento transparente (checkout-payment.js)
 * ------------------------------------------------------------------
 * O cliente nunca sai do site. Três meios de pagamento, cada um
 * tratado da forma mais simples e correta possível:
 *
 *   - Cartão: usa o "Card Payment Brick" do Mercado Pago, que desenha
 *     o formulário e tokeniza o cartão com segurança no navegador.
 *     Nenhum número de cartão passa pelo nosso servidor.
 *   - Pix e Boleto: não têm dado sensível para tokenizar, então usamos
 *     os próprios campos do formulário de checkout (nome, e-mail, CPF,
 *     endereço) e mandamos direto para o servidor criar o pagamento.
 *
 * Backend correspondente: api/create-order.js (cria a "order" na API
 * do Mercado Pago) e api/order-status.js (consulta o status, usado
 * para Pix e boleto, que não têm resultado imediato).
 * ------------------------------------------------------------------
 */

let mpInstance = null;
let cardBrickController = null;
let pollTimer = null;
let paymentSectionReady = false;

/* ---------------- Utilitários ---------------- */
async function getPublicKey() {
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    return data.publicKey || null;
  } catch (e) {
    console.warn("Não foi possível obter a chave pública do Mercado Pago.", e);
    return null;
  }
}

function collectCustomerAndAddress() {
  const form = document.getElementById("checkout-form");
  return {
    customer: {
      name: form.querySelector("#full-name").value.trim(),
      email: form.querySelector("#email").value.trim(),
      phone: form.querySelector("#phone").value.trim(),
    },
    address: {
      cep: form.querySelector("#cep").value.trim(),
      street: form.querySelector("#street").value.trim(),
      number: form.querySelector("#number").value.trim(),
      complement: form.querySelector("#complement").value.trim(),
      neighborhood: form.querySelector("#neighborhood").value.trim(),
      city: form.querySelector("#city").value.trim(),
      state: form.querySelector("#state").value.trim(),
    },
    document: form.querySelector("#document").value.trim(),
  };
}

function buildItemsPayload() {
  return getCartDetailed().map((item) => ({
    id: item.product.id,
    title: item.product.fullName,
    quantity: item.qty,
    unit_price: item.product.price,
  }));
}

/* ---------------- Habilita a seção de pagamento após o frete ---------------- */
function onShippingReady() {
  const gate = document.getElementById("payment-gate");
  const tabs = document.getElementById("payment-tabs-wrap");
  if (gate) gate.hidden = true;
  if (tabs) tabs.hidden = false;
  paymentSectionReady = true;
  renderCardBrick(); // (re)monta o Brick já com o valor final (produtos + frete)
}

/* As abas Cartão / Pix / Boleto reaproveitam o sistema de abas genérico
   que já existe em main.js (mesmo usado nas abas da página de produto) —
   basta usar os atributos data-tab-target / data-tab-panel no HTML. */

/* ---------------- Cartão (Card Payment Brick) ---------------- */
async function renderCardBrick() {
  if (!paymentSectionReady) return;
  const container = document.getElementById("cardPaymentBrick_container");
  if (!container) return;

  const publicKey = await getPublicKey();
  if (!publicKey) {
    container.innerHTML = "";
    showCheckoutNotice(
      "O pagamento ainda não está configurado neste ambiente. Assim que o Access Token e a Public Key do Mercado Pago forem adicionados no Vercel, o formulário de cartão aparece automaticamente aqui."
    );
    return;
  }

  if (!window.MercadoPago) {
    console.warn("SDK do Mercado Pago (MercadoPago.js) não carregou.");
    return;
  }

  if (!mpInstance) {
    mpInstance = new window.MercadoPago(publicKey, { locale: "pt-BR" });
  }

  if (cardBrickController) {
    await cardBrickController.unmount();
    cardBrickController = null;
  }
  container.innerHTML = "";

  const bricksBuilder = mpInstance.bricks();
  cardBrickController = await bricksBuilder.create("cardPayment", "cardPaymentBrick_container", {
    initialization: {
      amount: getOrderTotal(),
    },
    callbacks: {
      onReady: () => {},
      onSubmit: (formData, additionalData) => {
        return new Promise((resolve, reject) => {
          const info = collectCustomerAndAddress();
          if (!validateCheckoutForm(document.getElementById("checkout-form"))) {
            showToast("Confira os campos destacados");
            reject();
            return;
          }
          submitPayment({
            customer: info.customer,
            address: info.address,
            payment: {
              type: additionalData.paymentTypeId, // "credit_card" | "debit_card"
              payment_method_id: formData.payment_method_id,
              token: formData.token,
              installments: formData.installments,
              identification: formData.payer && formData.payer.identification,
            },
          })
            .then(resolve)
            .catch(reject);
        });
      },
      onError: (error) => {
        console.error(error);
        showCheckoutNotice("Não foi possível processar o cartão. Confira os dados e tente novamente.", true);
      },
    },
  });
}

/* ---------------- Pix ---------------- */
function initPixButton() {
  const btn = document.getElementById("pay-pix");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!validateCheckoutForm(document.getElementById("checkout-form"))) {
      showToast("Confira os campos destacados");
      return;
    }
    const info = collectCustomerAndAddress();
    if (!info.document) {
      setFieldError(document.getElementById("document"), true);
      showToast("Informe o CPF para pagar com Pix");
      return;
    }
    btn.disabled = true;
    btn.textContent = "Gerando Pix...";
    try {
      await submitPayment({
        customer: info.customer,
        address: info.address,
        payment: {
          type: "bank_transfer",
          payment_method_id: "pix",
          identification: { type: "CPF", number: info.document.replace(/\D/g, "") },
        },
      });
    } finally {
      btn.disabled = false;
      btn.textContent = "Gerar Pix";
    }
  });
}

/* ---------------- Boleto ---------------- */
function initBoletoButton() {
  const btn = document.getElementById("pay-boleto");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!validateCheckoutForm(document.getElementById("checkout-form"))) {
      showToast("Confira os campos destacados");
      return;
    }
    const info = collectCustomerAndAddress();
    if (!info.document) {
      setFieldError(document.getElementById("document"), true);
      showToast("Informe o CPF para gerar o boleto");
      return;
    }
    btn.disabled = true;
    btn.textContent = "Gerando boleto...";
    try {
      await submitPayment({
        customer: info.customer,
        address: info.address,
        payment: {
          type: "ticket",
          payment_method_id: "boleto",
          identification: { type: "CPF", number: info.document.replace(/\D/g, "") },
        },
      });
    } finally {
      btn.disabled = false;
      btn.textContent = "Gerar boleto";
    }
  });
}

/* ---------------- Envio comum (cartão, Pix e boleto passam por aqui) ---------------- */
async function submitPayment({ customer, address, payment }) {
  const payload = {
    customer,
    address,
    shipping: {
      method: getSelectedShippingMethod(),
      price: getSelectedShippingPrice(),
    },
    items: buildItemsPayload(),
    payment,
  };

  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    showCheckoutNotice(data.error || "Não foi possível processar o pagamento.", true);
    throw new Error(data.error || "payment_failed");
  }

  handleOrderResult(data);
}

/* ---------------- Trata o resultado da order ---------------- */
function handleOrderResult(order) {
  const payment = order.transactions && order.transactions.payments && order.transactions.payments[0];
  const status = order.status;
  const detail = order.status_detail;

  if (status === "processed" || status === "accredited" || (payment && payment.status === "processed")) {
    clearCart();
    window.location.href = `obrigado.html?status=approved&order=${order.id}`;
    return;
  }

  if (status === "action_required" && payment && payment.payment_method) {
    const pm = payment.payment_method;
    if (pm.type === "bank_transfer") {
      showPixResult(pm, order.id);
    } else if (pm.type === "ticket") {
      showBoletoResult(pm, order.id);
    }
    return;
  }

  if (status === "rejected" || (payment && payment.status === "rejected")) {
    showCheckoutNotice(
      "O pagamento foi recusado. Verifique os dados do cartão ou tente outro meio de pagamento.",
      true
    );
    return;
  }

  showCheckoutNotice("Pedido recebido. Assim que o pagamento for confirmado, você recebe um e-mail.", false);
}

function showPixResult(pm, orderId) {
  const wrap = document.getElementById("payment-result");
  wrap.hidden = false;
  document.getElementById("payment-tabs-wrap").hidden = true;
  wrap.innerHTML = `
    <div class="pix-result">
      <h3>Pague com Pix para concluir</h3>
      <p>Escaneie o QR Code no app do seu banco ou copie o código abaixo.</p>
      ${pm.qr_code_base64 ? `<img class="pix-qr" src="data:image/png;base64,${pm.qr_code_base64}" alt="QR Code Pix">` : ""}
      ${pm.qr_code ? `
        <div class="field" style="max-width:420px;margin-inline:auto;">
          <label for="pix-copy">Pix copia e cola</label>
          <input id="pix-copy" type="text" readonly value="${pm.qr_code}">
        </div>
        <button type="button" class="btn btn-outline" id="pix-copy-btn">Copiar código</button>
      ` : ""}
      <p class="summary-note" style="margin-top:1rem;">Assim que o pagamento for confirmado, esta página atualiza automaticamente.</p>
    </div>
  `;
  const copyBtn = document.getElementById("pix-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const input = document.getElementById("pix-copy");
      input.select();
      navigator.clipboard?.writeText(input.value);
      showToast("Código copiado");
    });
  }
  startPolling(orderId, 4000, 5 * 60 * 1000);
}

function showBoletoResult(pm, orderId) {
  const wrap = document.getElementById("payment-result");
  wrap.hidden = false;
  document.getElementById("payment-tabs-wrap").hidden = true;
  wrap.innerHTML = `
    <div class="pix-result">
      <h3>Seu boleto foi gerado</h3>
      <p>O pagamento pode levar até 2 dias úteis para ser confirmado após pago.</p>
      ${pm.ticket_url ? `<a href="${pm.ticket_url}" target="_blank" class="btn btn-primary btn-lg">Ver e imprimir boleto</a>` : ""}
      ${pm.digitable_line ? `
        <div class="field" style="max-width:420px;margin-inline:auto;">
          <label for="boleto-line">Linha digitável</label>
          <input id="boleto-line" type="text" readonly value="${pm.digitable_line}">
        </div>
      ` : ""}
      <button type="button" class="btn btn-outline" id="boleto-check">Já paguei, verificar</button>
    </div>
  `;
  document.getElementById("boleto-check")?.addEventListener("click", () => checkOrderStatus(orderId));
  startPolling(orderId, 15000, 10 * 60 * 1000);
}

/* ---------------- Consulta / polling de status ---------------- */
async function checkOrderStatus(orderId) {
  try {
    const res = await fetch(`/api/order-status?id=${encodeURIComponent(orderId)}`);
    const data = await res.json();
    if (!res.ok) return;
    if (data.status === "processed" || data.status === "accredited") {
      clearTimeout(pollTimer);
      clearCart();
      window.location.href = `obrigado.html?status=approved&order=${orderId}`;
    }
  } catch (e) {
    console.warn("Não foi possível consultar o status do pedido.", e);
  }
}

function startPolling(orderId, intervalMs, timeoutMs) {
  clearTimeout(pollTimer);
  const start = Date.now();
  const tick = async () => {
    if (Date.now() - start > timeoutMs) return;
    await checkOrderStatus(orderId);
    pollTimer = setTimeout(tick, intervalMs);
  };
  pollTimer = setTimeout(tick, intervalMs);
}

/* ---------------- Inicialização ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initPixButton();
  initBoletoButton();
});
