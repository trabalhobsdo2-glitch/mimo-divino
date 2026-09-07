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

function addToCart(productId, qty = 1, options = {}) {
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
  if (!options.silent) {
    openCartDrawer();
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

/**
 * ------------------------------------------------------------------
 * Carrinho lateral (drawer)
 * Abre automaticamente sempre que um produto é adicionado, mostrando
 * o que está no carrinho e duas opções: finalizar compra ou continuar
 * comprando. O HTML do drawer é criado por JavaScript na primeira vez
 * que é preciso, então não precisa existir na página de antemão.
 * ------------------------------------------------------------------
 */
function ensureCartDrawer() {
  if (document.getElementById("cart-drawer")) return;

  const overlay = document.createElement("div");
  overlay.className = "cart-drawer-overlay";
  overlay.id = "cart-drawer-overlay";

  const drawer = document.createElement("aside");
  drawer.className = "cart-drawer";
  drawer.id = "cart-drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML = `
    <div class="cart-drawer-head">
      <h3>
        <svg class="icon" aria-hidden="true"><use href="#icon-check-circle"></use></svg>
        Adicionado ao carrinho
      </h3>
      <button class="btn-icon" id="cart-drawer-close" type="button" aria-label="Fechar carrinho">
        <svg class="icon" aria-hidden="true"><use href="#icon-close"></use></svg>
      </button>
    </div>
    <div class="cart-drawer-body" id="cart-drawer-items"></div>
    <div class="cart-drawer-footer">
      <div class="summary-row total">
        <span>Total</span>
        <span id="cart-drawer-total">R$ 0,00</span>
      </div>
      <a href="checkout.html" class="btn btn-primary btn-lg btn-block">Finalizar compra</a>
      <button type="button" class="btn btn-outline btn-lg btn-block" id="cart-drawer-continue">Continuar comprando</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  overlay.addEventListener("click", closeCartDrawer);
  document.getElementById("cart-drawer-close").addEventListener("click", closeCartDrawer);
  document.getElementById("cart-drawer-continue").addEventListener("click", closeCartDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCartDrawer();
  });
}

function renderCartDrawer() {
  ensureCartDrawer();
  const items = getCartDetailed();
  const body = document.getElementById("cart-drawer-items");

  if (!items.length) {
    body.innerHTML = '<p class="empty">Seu carrinho está vazio.</p>';
  } else {
    body.innerHTML = items
      .map(
        (item) => `
      <div class="drawer-item">
        <img src="${item.product.image}" alt="${item.product.name}">
        <div>
          <div class="drawer-item-name">${item.product.name} <span style="color:var(--ink-faint);font-weight:400;">× ${item.qty}</span></div>
          <div class="drawer-item-price">${formatBRL(item.lineTotal)}</div>
        </div>
      </div>`
      )
      .join("");
  }

  document.getElementById("cart-drawer-total").textContent = formatBRL(getCartSubtotal());
}

function openCartDrawer() {
  renderCartDrawer();
  document.getElementById("cart-drawer").classList.add("open");
  document.getElementById("cart-drawer-overlay").classList.add("open");
  document.getElementById("cart-drawer").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-drawer-overlay");
  if (drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}
