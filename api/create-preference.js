/**
 * POST /api/create-preference
 * ------------------------------------------------------------------
 * Cria uma "preference" (preferência de pagamento) no Mercado Pago e
 * devolve a URL de checkout (init_point) para o front-end redirecionar
 * o cliente.
 *
 * COMO ATIVAR (depois de criar sua conta Mercado Pago):
 *   1. Painel do Vercel → seu projeto → Settings → Environment Variables
 *   2. Adicione a variável:  MP_ACCESS_TOKEN  =  <seu Access Token>
 *      (em developers.mercadopago.com.br, no painel de credenciais)
 *   3. (Opcional) Adicione SITE_URL = https://seudominio.com quando tiver
 *      o domínio definitivo, para os links de retorno ficarem corretos.
 *   4. Faça um novo deploy para a variável entrar em vigor.
 *
 * Até a variável ser configurada, este endpoint responde 501 e o site
 * mostra um aviso amigável ao cliente em vez de quebrar o checkout.
 *
 * Referência oficial da API:
 * https://www.mercadopago.com.br/developers/pt/reference/preferences/_checkout_preferences/post
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
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { customer = {}, address = {}, shipping = {}, items = [] } = body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Carrinho vazio." });
      return;
    }

    const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

    const mpItems = items.map((item) => ({
      title: String(item.title || "Mimo Divino"),
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      currency_id: "BRL",
    }));

    if (shipping && shipping.price) {
      mpItems.push({
        title: `Frete (${shipping.method === "express" ? "entrega expressa" : "entrega padrão"})`,
        quantity: 1,
        unit_price: Number(shipping.price),
        currency_id: "BRL",
      });
    }

    const preference = {
      items: mpItems,
      payer: {
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone ? { number: String(customer.phone) } : undefined,
        address: {
          zip_code: address.cep || "",
          street_name: address.street || "",
          street_number: address.number || "",
        },
      },
      back_urls: {
        success: `${siteUrl}/obrigado.html?status=approved`,
        pending: `${siteUrl}/obrigado.html?status=pending`,
        failure: `${siteUrl}/obrigado.html?status=failure`,
      },
      auto_return: "approved",
      statement_descriptor: "MIMO DIVINO",
      notification_url: `${siteUrl}/api/webhook`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Mercado Pago respondeu com erro:", data);
      res.status(502).json({ error: "Não foi possível criar a preferência de pagamento." });
      return;
    }

    res.status(200).json({ init_point: data.init_point, id: data.id });
  } catch (err) {
    console.error("Erro em /api/create-preference:", err);
    res.status(500).json({ error: "Erro interno ao processar o pedido." });
  }
};
