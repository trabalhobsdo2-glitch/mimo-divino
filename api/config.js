/**
 * GET /api/config
 * ------------------------------------------------------------------
 * Devolve a Public Key do Mercado Pago para o front-end poder
 * inicializar o SDK MercadoPago.js (Bricks). A Public Key é feita
 * para ser exposta no navegador — ela não processa pagamentos sozinha,
 * só serve para desenhar o formulário e gerar o token do cartão.
 *
 * A chave secreta (Access Token) NUNCA passa por aqui — ela só existe
 * em /api/create-order.js e /api/order-status.js, no servidor.
 * ------------------------------------------------------------------
 */

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const publicKey = process.env.MP_PUBLIC_KEY || null;
  res.status(200).json({
    publicKey,
    configured: Boolean(publicKey),
  });
};
