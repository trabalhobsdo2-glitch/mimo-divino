/**
 * POST /api/webhook
 * ------------------------------------------------------------------
 * Endpoint que o Mercado Pago chama automaticamente quando o status de
 * uma "order" muda (aprovada, recusada, Pix pago, boleto vencido etc).
 *
 * Formato da notificação (tópico "order", da API de Orders):
 *   { "action": "order.updated", "type": "order", "data": { "id": "ORD..." } }
 *
 * Este arquivo é um ESTOQUE MÍNIMO: hoje ele só confirma o recebimento
 * (200 OK) para o Mercado Pago não ficar reenviando a notificação.
 *
 * PARA DEIXAR PRONTO PARA PRODUÇÃO, adicione aqui:
 *   1. Buscar os detalhes da order: GET /v1/orders/{data.id}
 *      (o arquivo api/order-status.js já faz exatamente essa chamada
 *      e pode ser reaproveitado).
 *   2. Dar baixa no estoque (hoje o estoque só existe em js/products.js,
 *      que é estático e não pode ser alterado pelo servidor — seria
 *      necessário um banco de dados).
 *   3. Enviar e-mail de confirmação para o cliente.
 *   4. Guardar o pedido em um banco de dados (hoje não existe nenhum).
 *
 * Configuração no painel do Mercado Pago: Suas integrações > sua
 * aplicação > Webhooks > Configurar notificações > evento "Order".
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

    // TODO: buscar a order e processar o pedido (ver comentário acima).

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Erro em /api/webhook:", err);
    res.status(200).json({ received: true }); // sempre 200 para o MP não reenviar em loop
  }
};
