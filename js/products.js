/**
 * MIMO DIVINO — catálogo de produtos
 * ------------------------------------------------------------------
 * Fonte única de verdade para preço, estoque, imagens e textos.
 * Edite APENAS este arquivo para atualizar preços/estoque em todo o site
 * (início, páginas de produto, carrinho e checkout leem daqui).
 *
 * ATENÇÃO — valores assumidos que você deve conferir antes de publicar:
 *  - price: R$ 29,90 para os dois produtos (era o valor do briefing original,
 *    que previa um único produto).
 *  - stock: 31 unidades para cada um (mesma origem do briefing original).
 *  - battery: "3 pilhas pequenas (não inclusas)" — confirmado visualmente
 *    nas fotos do passo a passo, mas confirme o tamanho exato (AA ou AAA)
 *    antes de publicar.
 * ------------------------------------------------------------------
 */

const PRODUCTS = {
  maria: {
    id: "maria",
    name: "Maria",
    fullName: "Pelúcia Maria — Presença de Paz",
    tagline: "Uma presença que acalma o coração.",
    price: 29.90,
    stock: 31,
    weightKg: 0.35,
    image: "assets/images/maria-produto.jpg",
    gallery: [
      "assets/images/maria-produto.jpg",
      "assets/images/maria-medidas.jpg",
      "assets/images/momento-aconchego.jpg",
    ],
    specs: {
      "Altura": "38 cm",
      "Largura (braço a braço)": "28 cm",
      "Material": "Pelúcia macia, costura reforçada",
      "Funcionamento": "3 pilhas pequenas, não inclusas",
      "Recursos": "Movimento suave de respiração, luz suave no coração e melodia",
    },
    description:
      "Inspirada em Nossa Senhora, esta pelúcia foi pensada para quem busca um instante de calma no meio da rotina. O corpo macio e o movimento suave de respiração criam uma sensação de companhia tranquila — para abraçar, para decorar ou para presentear alguém que você ama.",
  },
  jesus: {
    id: "jesus",
    name: "Jesus",
    fullName: "Pelúcia Jesus — Presença de Luz",
    tagline: "Uma presença que acolhe e reconforta.",
    price: 29.90,
    stock: 31,
    weightKg: 0.32,
    image: "assets/images/jesus-produto.jpg",
    gallery: [
      "assets/images/jesus-produto.jpg",
      "assets/images/jesus-medidas.jpg",
    ],
    specs: {
      "Altura": "32 cm",
      "Largura (braço a braço)": "26 cm",
      "Material": "Pelúcia macia, costura reforçada",
      "Funcionamento": "3 pilhas pequenas, não inclusas",
      "Recursos": "Movimento suave de respiração, luz suave no coração e melodia",
    },
    description:
      "Com o símbolo do Sagrado Coração bordado no peito, esta pelúcia foi criada para transmitir acolhimento em qualquer momento do dia — no colo, na cama ou na estante do quarto. Um mimo delicado, pensado para ficar por perto.",
  },
};

const FREE_SHIPPING_THRESHOLD = null; // ex: 99.90 — deixe null para não usar frete grátis
const CURRENCY = "BRL";

function formatBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: CURRENCY });
}

function getProduct(id) {
  return PRODUCTS[id] || null;
}

function getAllProducts() {
  return Object.values(PRODUCTS);
}
