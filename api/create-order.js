const crypto = require("crypto");

/**
 * POST /api/create-order
 * ------------------------------------------------------------------
 * Cria a transação Pix na Beehive Pay — único meio de pagamento deste
 * checkout. Não há dado sensível a tokenizar, então os dados do pagador
 * coletados no formulário são enviados direto.
 *
 * COMO ATIVAR (depois de criar sua conta Beehive Pay):
 *   1. Painel do Vercel → seu projeto → Settings → Environment Variables
 *   2. Adicione DUAS variáveis:
 *        BEEHIVE_SECRET_KEY  → chave secreta (usada aqui, no servidor)
 *        BEEHIVE_PUBLIC_KEY  → chave pública (usada no navegador, via /api/config)
 *   3. Redeploy.
 *
 * Referência oficial: https://docs.beehivehub.io/api-reference
 * ------------------------------------------------------------------
 */

const BEEHIVE_API = "https://api.conta.paybeehive.com.br/v1";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const secretKey = process.env.BEEHIVE_SECRET_KEY;
  if (!secretKey) {
    res.status(501).json({
      error:
        "BEEHIVE_SECRET_KEY não configurado. Adicione essa variável de ambiente no painel do Vercel para ativar os pagamentos.",
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
    if (!customer.email || !payment.document) {
      res.status(400).json({ error: "Dados do cliente incompletos (e-mail e CPF são obrigatórios)." });
      return;
    }

    const itemsTotal = items.reduce(
      (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
      0
    );
    const shippingPrice = Number(shipping.price) || 0;
    const totalAmountCents = Math.round((itemsTotal + shippingPrice) * 100);

    const orderId = `mimodivino-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const origin = req.headers.origin || `https://${req.headers.host}`;

    // "type" chega do front-end já no formato da Beehive: credit_card | pix | boleto
    const beehiveItems = items.map((item) => ({
      title: item.title,
      unitPrice: Math.round(Number(item.unit_price) * 100),
      quantity: Number(item.quantity),
      tangible: true,
    }));

    if (shippingPrice > 0) {
      beehiveItems.push({
        title: "Frete",
        unitPrice: Math.round(shippingPrice * 100),
        quantity: 1,
        tangible: false,
      });
    }

    const transactionBody = {
      amount: totalAmountCents,
      paymentMethod: payment.type, // "credit_card" | "pix" | "boleto"
      customer: {
        name: customer.name || "Cliente Mimo Divino",
        email: customer.email,
        document: { type: "cpf", number: String(payment.document).replace(/\D/g, "") },
      },
      items: beehiveItems,
      metadata: {
        provider: "mimo-divino",
        user_email: customer.email,
        order_id: orderId,
        checkout_url: `${origin}/checkout.html`,
        shop_url: origin,
      },
      postbackUrl: `${origin}/api/webhook`,
    };

    if (payment.type !== "pix") {
      res.status(400).json({ error: "Este checkout só aceita Pix." });
      return;
    }
    transactionBody.pix = { expiresInSeconds: 900 };

    const authHeader = "Basic " + Buffer.from(`${secretKey}:x`).toString("base64");

    const beehiveRes = await fetch(`${BEEHIVE_API}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(transactionBody),
    });

    const data = await beehiveRes.json();

    if (!beehiveRes.ok) {
      console.error("Beehive Pay respondeu com erro:", JSON.stringify(data));
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
