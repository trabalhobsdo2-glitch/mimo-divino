/**
 * POST /api/webhook
 * ------------------------------------------------------------------
 * Endpoint que o Mercado Pago chama automaticamente quando o status de
 * um pagamento muda (aprovado, recusado, estornado, etc.) — o chamado
 * "IPN" / webhook.
 *
 * Este arquivo é um ESTOQUE MÍNIMO: hoje ele só confirma o recebimento
 * (200 OK) para o Mercado Pago não ficar reenviando a notificação.
 *
 * PARA DEIXAR PRONTO PARA PRODUÇÃO, adicione aqui:
 *   1. Buscar os detalhes do pagamento na API do Mercado Pago:
 *        GET https://api.mercadopago.com/v1/payments/{id}
 *        Header: Authorization: Bearer <MP_ACCESS_TOKEN>
 *   2. Dar baixa no estoque (reduzir PRODUCTS[id].stock em algum banco
 *      de dados — hoje o estoque só existe em js/products.js, que é
 *      estático e não pode ser alterado pelo servidor).
 *   3. Enviar e-mail de confirmação para o cliente.
 *   4. Guardar o pedido em um banco de dados (hoje não existe nenhum).
 *
 * Sem um banco de dados, o site funciona (o cliente paga e recebe a
 * confirmação do Mercado Pago), mas o controle de estoque e o histórico
 * de pedidos precisam ser feitos manualmente pelo painel do Mercado Pago
 * até que essa parte seja implementada.
 * ------------------------------------------------------------------
 */

module.exports = async (req, res) => {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).end();
    return;
  }

  try {
    console.log("Webhook Mercado Pago recebido:", {
      query: req.query,
      body: req.body,
    });

    // TODO: buscar o pagamento e processar o pedido (ver comentário acima).

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Erro em /api/webhook:", err);
    res.status(200).json({ received: true }); // sempre 200 para o MP não reenviar em loop
  }
};
