const crypto = require("crypto");

/**
 * POST /api/create-order
 * ------------------------------------------------------------------
 * Checkout Transparente — cria a "order" no Mercado Pago (API de
 * Orders, o padrão atual para o Checkout Transparente) com a
 * transação de pagamento já associada: cartão, Pix ou boleto.
 *
 * O cliente nunca sai do site: o Card Payment Brick (no front-end)
 * tokeniza o cartão com segurança, e para Pix/boleto não existe
 * nenhum dado sensível a tokenizar — só precisamos dos dados do
 * pagador, que já são coletados no formulário de checkout.
 *
 * COMO ATIVAR (depois de criar sua conta Mercado Pago):
 *   1. Painel do Vercel → seu projeto → Settings → Environment Variables
 *   2. Adicione DUAS variáveis (a Transparente precisa das duas,
 *      diferente do Checkout Pro que só precisava do Access Token):
 *        MP_ACCESS_TOKEN  → chave privada (usada aqui, no servidor)
 *        MP_PUBLIC_KEY    → chave pública (usada no navegador, via /api/config)
 *   3. Redeploy.
 *
 * Referência oficial:
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/overview
 * ------------------------------------------------------------------
 */

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    res.status(501).json({
      error:
        "MP_ACCESS_TOKEN não configurado. Adicione essa variável de ambiente no painel do Vercel para ativar os pagamentos.",
    });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { customer = {}, address = {}, shipping = {}, items = [], payment = {} } = body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Carrinho vazio." });
      return;
    }
    if (!payment.type) {
      res.status(400).json({ error: "Meio de pagamento não informado." });
      return;
    }

    const itemsTotal = items.reduce(
      (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
      0
    );
    const shippingPrice = Number(shipping.price) || 0;
    const totalAmount = (itemsTotal + shippingPrice).toFixed(2);

    // Monta o payment_method de acordo com o meio escolhido.
    // Referência dos valores de "type" por meio de pagamento:
    //   cartão de crédito -> "credit_card" | cartão de débito -> "debit_card"
    //   Pix -> "bank_transfer" (id sempre "pix")
    //   Boleto -> "ticket" (id sempre "boleto")
    const paymentMethod = {
      id: payment.payment_method_id,
      type: payment.type,
    };

    if (payment.type === "credit_card" || payment.type === "debit_card") {
      paymentMethod.token = payment.token;
      paymentMethod.installments = Number(payment.installments) || 1;
    }

    const payer = { email: customer.email || "" };

    if (payment.identification && payment.identification.number) {
      payer.identification = payment.identification;
    }

    // Boleto exige nome e endereço completo do pagador.
    if (payment.type === "ticket") {
      const parts = (customer.name || "").trim().split(/\s+/);
      payer.first_name = parts[0] || "Cliente";
      payer.last_name = parts.slice(1).join(" ") || "Mimo Divino";
      payer.address = {
        street_name: address.street || "",
        street_number: address.number || "S/N",
        zip_code: (address.cep || "").replace(/\D/g, ""),
        neighborhood: address.neighborhood || "",
        state: address.state || "",
        city: address.city || "",
      };
    }

    const transactionPayment = {
      amount: totalAmount,
      payment_method: paymentMethod,
    };

    const orderBody = {
      type: "online",
      processing_mode: "automatic",
      total_amount: totalAmount,
      external_reference: `mimodivino-${Date.now()}`,
      payer,
      transactions: { payments: [transactionPayment] },
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(orderBody),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Mercado Pago respondeu com erro:", JSON.stringify(data));
      res.status(502).json({
        error:
          (data && (data.message || data.error)) ||
          "Não foi possível processar o pagamento. Confira os dados e tente novamente.",
      });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Erro em /api/create-order:", err);
    res.status(500).json({ error: "Erro interno ao processar o pedido." });
  }
};
