/**
 * MIMO DIVINO — carrinho de compras
 * ------------------------------------------------------------------
 * Carrinho simples baseado em localStorage (funciona sem backend).
 * Guarda apenas { id, qty } por item; preço e dados do produto sempre
 * vêm de products.js na hora de exibir, então nunca ficam desatualizados.
 * ------------------------------------------------------------------
 */

const CART_KEY = "mimo_divino_cart_v1";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Carrinho: não foi possível ler o localStorage.", e);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    console.warn("Carrinho: não foi possível salvar no localStorage.", e);
  }
  updateCartBadge();
}

function addToCart(productId, qty = 1) {
  const product = getProduct(productId);
  if (!product) return;
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  const currentQty = existing ? existing.qty : 0;
  const nextQty = Math.min(currentQty + qty, product.stock);

  if (existing) {
    existing.qty = nextQty;
  } else {
    cart.push({ id: productId, qty: Math.min(qty, product.stock) });
  }
  saveCart(cart);
  if (typeof showToast === "function") {
    showToast(`${product.name} adicionada ao carrinho`);
  }
}

function updateCartQty(productId, qty) {
  const product = getProduct(productId);
  if (!product) return;
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((item) => item.id !== productId);
  } else {
    const clamped = Math.min(qty, product.stock);
    const existing = cart.find((item) => item.id === productId);
    if (existing) existing.qty = clamped;
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function getCartDetailed() {
  return getCart()
    .map((item) => {
      const product = getProduct(item.id);
      if (!product) return null;
      return Object.assign({}, item, {
        product: product,
        lineTotal: product.price * item.qty,
      });
    })
    .filter(Boolean);
}

function getCartSubtotal() {
  return getCartDetailed().reduce((sum, item) => sum + item.lineTotal, 0);
}

function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
