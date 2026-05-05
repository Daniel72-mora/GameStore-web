// ==========================================
// js/cart.js - Sistema de Carrito de Compras
// Misión: Daniel (Carrito) | US14-US18
// CORREGIDO: Login requerido, re-render inmediato
// ==========================================

/**
 * Obtiene el carrito desde localStorage
 */
function getCart() {
    return JSON.parse(localStorage.getItem('carrito')) || [];
}

/**
 * Guarda el carrito en localStorage y re-renderiza si el modal está abierto
 */
function saveCart(cart) {
    localStorage.setItem('carrito', JSON.stringify(cart));
    updateCartBadge();
    // === RE-RENDER INMEDIATO ===
    // Si el modal del carrito está abierto, re-renderizar al instante
    const cartModal = document.getElementById('cart-modal');
    if (cartModal && cartModal.open) {
        renderCartModal();
    }
}

/**
 * US14: Agregar videojuego al carrito
 * CORREGIDO: Requiere login para añadir
 */
function addToCart(game) {
    // ===== VERIFICAR AUTENTICACIÓN =====
    // Solo permitir agregar al carrito si hay usuario logueado
    const isLoggedIn = (typeof AppState !== 'undefined' && AppState.currentUser !== null && AppState.currentUser !== undefined);

    if (!isLoggedIn) {
        const lang = (typeof langSelect !== 'undefined' && langSelect) ? langSelect.value : 'es';
        alert(lang === 'es'
            ? 'Debes iniciar sesión para añadir juegos al carrito.'
            : 'You must log in to add games to cart.');
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.showModal();
        return;
    }

    let cart = getCart();
    const existingIndex = cart.findIndex(item => item.rawgId === game.rawgId);

    if (existingIndex !== -1) {
        // US17: Si ya existe, aumentar cantidad
        cart[existingIndex].cantidad += 1;
    } else {
        cart.push({
            rawgId: game.rawgId,
            titulo: game.titulo || game.name,
            imagen: game.imagen || game.image || '',
            precio: game.precio || game.price,
            plataforma: game.plataforma || game.platform || '',
            cantidad: 1
        });
    }

    saveCart(cart);

    const lang = (typeof langSelect !== 'undefined' && langSelect) ? langSelect.value : 'es';
    alert(`${game.titulo || game.name} ${lang === 'es' ? 'añadido al carrito' : 'added to cart'}`);
}

/**
 * US16: Eliminar producto del carrito
 */
function removeFromCart(rawgId) {
    let cart = getCart();
    cart = cart.filter(item => item.rawgId !== rawgId);
    saveCart(cart);
}

/**
 * US17: Actualizar cantidades (+/-)
 */
function updateCartQuantity(rawgId, change) {
    let cart = getCart();
    const index = cart.findIndex(item => item.rawgId === rawgId);

    if (index !== -1) {
        cart[index].cantidad += change;
        // Si la cantidad es menor a 1, eliminar el producto
        if (cart[index].cantidad < 1) {
            cart.splice(index, 1);
        }
    }

    saveCart(cart);
}

/**
 * US18: Calcular total del carrito
 */
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.precio * item.cantidad), 0);
}

/**
 * Obtener cantidad total de items
 */
function getCartItemCount() {
    const cart = getCart();
    return cart.reduce((count, item) => count + item.cantidad, 0);
}

/**
 * Vaciar carrito
 */
function clearCart() {
    saveCart([]);
    return [];
}

/**
 * Actualizar badge del carrito en el navbar
 */
function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
        const count = getCartItemCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

/**
 * Renderizar contenido del carrito en el modal
 * US15: Ver carrito
 * CORREGIDO: Usa data-rawg-id + delegación de eventos
 * para que +/-/eliminar funcionen INMEDIATAMENTE
 */
function renderCartModal() {
    const cart = getCart();
    const listContainer = document.getElementById('cart-items-list');
    const totalElement = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!listContainer) return;

    const lang = (typeof langSelect !== 'undefined' && langSelect) ? langSelect.value : 'es';
    const formatFn = (typeof formatPrice === 'function') ? formatPrice :
                     (typeof window.GameStoreAPI !== 'undefined' && window.GameStoreAPI.formatPrice) ? window.GameStoreAPI.formatPrice :
                     (p) => p.toLocaleString('es-CO');

    if (cart.length === 0) {
        listContainer.innerHTML = `<li class="cart-empty"><p>${lang === 'es' ? 'Tu carrito está vacío' : 'Your cart is empty'}</p></li>`;
        if (totalElement) totalElement.textContent = '$0';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    if (checkoutBtn) checkoutBtn.style.display = 'block';

    let totalGeneral = 0;
    listContainer.innerHTML = cart.map((item) => {
        const subtotal = item.precio * item.cantidad;
        totalGeneral += subtotal;
        return `
            <li class="cart-item-row">
                <article class="cart-item-content">
                    ${item.imagen ? `<img src="${item.imagen}" alt="${item.titulo}" class="cart-item-img" loading="lazy">` : ''}
                    <section class="cart-item-info">
                        <p><strong>${item.titulo}</strong></p>
                        <small>$${formatFn(item.precio)} c/u</small>
                        <footer class="quantity-controls">
                            <button class="btn-qty cart-btn-minus" data-rawg-id="${item.rawgId}">-</button>
                            <span>${item.cantidad}</span>
                            <button class="btn-qty cart-btn-plus" data-rawg-id="${item.rawgId}">+</button>
                            <button class="btn-remove cart-btn-delete" data-rawg-id="${item.rawgId}" title="Eliminar">🗑️</button>
                        </footer>
                    </section>
                </article>
                <p class="cart-item-subtotal"><strong>$${formatFn(subtotal)}</strong></p>
            </li>
        `;
    }).join('');

    if (totalElement) totalElement.textContent = `$${formatFn(totalGeneral)}`;
}

/**
 * Configurar delegación de eventos para los botones del carrito
 * SE LLAMA UNA SOLA VEZ - los botones funcionan después de re-renderizar
 * porque usamos data-rawg-id + delegación, no onclick inline
 */
function setupCartEventListeners() {
    const cartItemsList = document.getElementById('cart-items-list');
    if (cartItemsList) {
        cartItemsList.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const rawgId = parseInt(btn.dataset.rawgId);
            if (isNaN(rawgId)) return;

            if (btn.classList.contains('cart-btn-minus')) {
                updateCartQuantity(rawgId, -1);
                return;
            }

            if (btn.classList.contains('cart-btn-plus')) {
                updateCartQuantity(rawgId, 1);
                return;
            }

            if (btn.classList.contains('cart-btn-delete')) {
                removeFromCart(rawgId);
                return;
            }
        });
    }

    // Carrito - abrir/cerrar
    const btnOpenCart = document.getElementById('cart-btn');
    const btnCloseCart = document.getElementById('close-cart');
    const cartModal = document.getElementById('cart-modal');

    if (btnOpenCart) {
        btnOpenCart.addEventListener('click', () => {
            renderCartModal();
            if (cartModal) cartModal.showModal();
        });
    }
    if (btnCloseCart) {
        btnCloseCart.addEventListener('click', () => {
            if (cartModal) cartModal.close();
        });
    }
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) cartModal.close();
        });
    }

    // Checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (typeof showCheckout === 'function') {
                showCheckout();
            }
        });
    }
}

// Exportar funciones globales
window.GameStoreCart = {
    get: getCart,
    add: addToCart,
    remove: removeFromCart,
    updateQuantity: updateCartQuantity,
    getTotal: getCartTotal,
    getItemCount: getCartItemCount,
    clear: clearCart,
    updateBadge: updateCartBadge,
    renderModal: renderCartModal,
    setupListeners: setupCartEventListeners
};

// Inicializar badge al cargar
updateCartBadge();
