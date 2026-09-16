/**
 * MIMO DIVINO — pagamento transparente (checkout-payment.js)
 * ------------------------------------------------------------------
 * O cliente nunca sai do site. Único meio de pagamento: Pix.
 * Não há dado sensível a tokenizar — usamos os próprios campos do
 * formulário de checkout (nome, e-mail, CPF, endereço) e mandamos
 * direto para o servidor criar a transação.
 *
 * Backend correspondente: api/create-order.js (cria a transação na
 * Beehive Pay) e api/order-status.js (consulta o status, já que o
 * Pix não tem resultado imediato).
 * ------------------------------------------------------------------
 */

let pollTimer = null;

/* ---------------- Utilitários ---------------- */
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
        payment: { type: "pix", document: info.document },
      });
    } finally {
      btn.disabled = false;
      btn.textContent = "Gerar Pix";
    }
  });
}

/* ---------------- Envio ---------------- */
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

  handleTransactionResult(data);
}

/* ---------------- Trata o resultado da transação ---------------- */
function handleTransactionResult(transaction) {
  const status = transaction.status;

  if (status === "paid" || status === "authorized") {
    clearCart();
    window.location.href = `obrigado.html?status=approved&order=${transaction.id}`;
    return;
  }

  if (status === "refused") {
    showCheckoutNotice("O Pix foi recusado. Tente novamente.", true);
    return;
  }

  // Fica "processing"/"created" até o pagamento cair — mostramos o QR
  // Code e passamos a consultar o status periodicamente.
  showPixResult(transaction);
}

function showPixResult(transaction) {
  const pix = transaction.pix || {};
  const qrCode = pix.qrCode || pix.qrcode || pix.copyPaste;
  const qrImageUrl = qrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrCode)}`
    : null;

  const wrap = document.getElementById("payment-result");
  wrap.hidden = false;
  document.getElementById("payment-tabs-wrap").hidden = true;
  wrap.innerHTML = `
    <div class="pix-result">
      <h3>Pague com Pix para concluir</h3>
      <p>Escaneie o QR Code no app do seu banco ou copie o código abaixo.</p>
      ${qrImageUrl ? `<img class="pix-qr" src="${qrImageUrl}" alt="QR Code Pix">` : ""}
      ${qrCode ? `
        <div class="field" style="max-width:420px;margin-inline:auto;">
          <label for="pix-copy">Pix copia e cola</label>
          <input id="pix-copy" type="text" readonly value="${qrCode}">
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
  startPolling(transaction.id, 4000, 5 * 60 * 1000);
}

/* ---------------- Consulta / polling de status ---------------- */
async function checkOrderStatus(transactionId) {
  try {
    const res = await fetch(`/api/order-status?id=${encodeURIComponent(transactionId)}`);
    const data = await res.json();
    if (!res.ok) return;
    if (data.status === "paid" || data.status === "authorized") {
      clearTimeout(pollTimer);
      clearCart();
      window.location.href = `obrigado.html?status=approved&order=${transactionId}`;
    }
  } catch (e) {
    console.warn("Não foi possível consultar o status do pedido.", e);
  }
}

function startPolling(transactionId, intervalMs, timeoutMs) {
  clearTimeout(pollTimer);
  const start = Date.now();
  const tick = async () => {
    if (Date.now() - start > timeoutMs) return;
    await checkOrderStatus(transactionId);
    pollTimer = setTimeout(tick, intervalMs);
  };
  pollTimer = setTimeout(tick, intervalMs);
}

/* ---------------- Inicialização ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initPixButton();
});
