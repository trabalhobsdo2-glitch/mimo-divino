/**
 * GET /api/order-status?id=ORD...
 * ------------------------------------------------------------------
 * Consulta o status atual de uma order — usado para o Pix (o
 * front-end pergunta a cada poucos segundos se o pagamento já caiu)
 * e para o botão "já paguei, verificar" do boleto.
 *
 * Referência oficial:
 * https://www.mercadopago.com.br/developers/pt/reference/orders/online-payments/get/get
 * ------------------------------------------------------------------
 */

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    res.status(501).json({ error: "MP_ACCESS_TOKEN não configurado." });
    return;
  }

  const id = req.query && req.query.id;
  if (!id) {
    res.status(400).json({ error: "Parâmetro id é obrigatório." });
    return;
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await mpRes.json();

    if (!mpRes.ok) {
      res.status(502).json({ error: "Não foi possível consultar o pedido." });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Erro em /api/order-status:", err);
    res.status(500).json({ error: "Erro interno." });
  }
};
