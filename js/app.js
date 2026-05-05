// ==========================================
// js/app.js - Lógica Principal de GameStore Web
// Corregido: Login requerido para carrito,
// botones +/-/eliminar funcionan en vivo
// + US19 Pago, US21 Comprobante, US24-27 CRUD,
//   US28 Gestionar Pedidos, US29 Gestionar Usuarios
// ==========================================

// ==========================================
// 1. CÓDIGO DE MARICELA (Supabase) - NO BORRAR
// ==========================================
const supabaseUrl = 'https://xgsmcwjpmaoluvosppfm.supabase.co';
const supabaseKey = 'sb_publishable_q4NBJPrvDHIaI1ejvdErHw_QCXqYTbG';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function getVideojuegos() {
    try {
        const { data, error } = await _supabase.from('videojuegos').select('*');
        if (error) {
            console.error('Error al obtener datos:', error.message);
            return;
        }
        console.log('Conexión exitosa a Supabase. Datos:', data);
    } catch (err) {
        console.error('Error inesperado:', err);
    }
}
getVideojuegos();

// US37: Cargar tasa de cambio al iniciar
async function loadExchangeRate() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) throw new Error('Error en API de tasas');
        const data = await response.json();
        const rate = data.rates?.COP || 4200;
        localStorage.setItem('exchangeRate', rate);
        localStorage.setItem('exchangeRateDate', new Date().toISOString());
        console.log(`Tasa USD/COP: ${rate}`);
    } catch (error) {
        console.warn('Exchange rate fallback:', error);
    }
}
loadExchangeRate();

// ==========================================
// 2. ESTADO GLOBAL DE LA APP
// ==========================================
const AppState = {
    currentView: 'catalog',
    currentPage: 1,
    hasMore: true,
    isLoading: false,
    searchDebounceTimer: null,
    currentUser: null, // Cache del usuario logueado
    lastOrderId: null, // US21: Guardar último orderId para comprobante
    lastOrderTotal: 0,
    lastOrderItems: []
};

// ==========================================
// 3. CÓDIGO DE FELIPE (API RAWG & Renderizado)
// ==========================================
const RAWG_KEY = '528ce5b0381f45098f72533abf93952c';
const BASE_URL = 'https://api.rawg.io/api/games';

// Caché de precios determinísticos por ID de juego
const priceCache = {};

function getGamePrice(rawgId) {
    if (priceCache[rawgId]) return priceCache[rawgId];
    const base = ((rawgId * 7919) % 160) + 90; // 90,000 - 250,000 COP
    const price = base * 1000;
    priceCache[rawgId] = price;
    return price;
}

function formatPrice(price) {
    return price.toLocaleString('es-CO');
}

const catalogContainer = document.getElementById('game-catalog');
const searchForm = document.querySelector('.search-bar-premium');
const searchInput = searchForm ? searchForm.querySelector('input') : null;
const langSelect = document.getElementById('lang-select');
const genreFilter = document.getElementById('genre-filter');
const sortFilter = document.getElementById('sort-filter');
const platformFilter = document.getElementById('platform-filter');

async function fetchRawgGames(searchTerm = '') {
    try {
        const query = searchTerm ? `&search=${searchTerm}` : '';
        const response = await fetch(`${BASE_URL}?key=${RAWG_KEY}&page_size=12${query}`);
        if (!response.ok) throw new Error("Error en la API de RAWG");
        const data = await response.json();
        renderStore(data.results);
    } catch (error) {
        console.error("Error al cargar RAWG:", error);
    }
}

function renderStore(games) {
    if (!catalogContainer) return;
    catalogContainer.innerHTML = '';
    const currentLang = langSelect ? langSelect.value : 'es';

    if (!games || games.length === 0) {
        catalogContainer.innerHTML = `<p class="no-games-msg">${currentLang === 'es' ? 'No se encontraron videojuegos.' : 'No games found.'}</p>`;
        return;
    }

    const favorites = JSON.parse(localStorage.getItem('gamestore-favorites')) || [];

    games.forEach(game => {
        const price = getGamePrice(game.id);
        const formattedPrice = formatPrice(price);
        const btnText = currentLang === 'es' ? '+ Añadir' : '+ Add';
        const isFav = favorites.some(f => f.rawgId === game.id);

        const article = document.createElement('article');
        article.className = 'game-card-premium';
        article.tabIndex = 0;
        article.dataset.id = game.id;

        article.innerHTML = `
            <figure class="card-media-premium">
                <img src="${game.background_image || 'https://via.placeholder.com/600x400'}" alt="${game.name}" loading="lazy">
                <aside class="card-overlay-aside">
                    <button class="btn-add-cart-premium" data-game-id="${game.id}">${btnText}</button>
                </aside>
                <button class="btn-favorite ${isFav ? 'active' : ''}" data-game-id="${game.id}" data-game-name="${game.name}" data-game-image="${game.background_image || ''}" title="${currentLang === 'es' ? 'Favorito' : 'Favorite'}">${isFav ? '❤️' : '🤍'}</button>
            </figure>
            <section class="card-info-premium">
                <h3>${game.name}</h3>
                <p class="platforms">${game.platforms?.slice(0, 4).map(p => p.platform.name).join(' | ') || 'PC'}</p>
                <p class="price">$${formattedPrice} <abbr title="Peso Colombiano">COP</abbr></p>
            </section>
        `;
        catalogContainer.appendChild(article);
    });
}

// ==========================================
// 4. FILTROS Y BÚSQUEDA (US07, US08, US09)
// ==========================================
async function applyFiltersAndSort(resetPage = true) {
    if (AppState.isLoading) return;
    AppState.isLoading = true;

    if (resetPage) {
        AppState.currentPage = 1;
        AppState.hasMore = true;
    }

    const searchTerm = searchInput ? searchInput.value : '';
    const genre = genreFilter ? genreFilter.value : '';
    const sort = sortFilter ? sortFilter.value : '';
    const platform = platformFilter ? platformFilter.value : '';

    try {
        const genreParam = genre ? `&genres=${genre}` : '';
        const platformParam = platform ? `&platforms=${platform}` : '';
        const queryParam = searchTerm ? `&search=${searchTerm}` : '';
        const sortParam = sort ? `&ordering=${sort}` : '';

        const url = `${BASE_URL}?key=${RAWG_KEY}&page_size=12&page=${AppState.currentPage}${queryParam}${genreParam}${platformParam}${sortParam}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Error en la API al filtrar");
        const data = await response.json();

        // US09: Client-side price sort (RAWG doesn't have prices)
        if (sort === 'price-asc' || sort === 'price-desc') {
            data.results.sort((a, b) => {
                const priceA = getGamePrice(a.id);
                const priceB = getGamePrice(b.id);
                return sort === 'price-asc' ? priceA - priceB : priceB - priceA;
            });
        }

        if (resetPage) {
            renderStore(data.results);
        } else {
            appendGames(data.results);
        }

        AppState.hasMore = !!data.next;
        toggleLoadMoreBtn();
    } catch (error) {
        console.error("Error en filtros:", error);
    } finally {
        AppState.isLoading = false;
    }
}

function appendGames(games) {
    if (!catalogContainer || !games) return;
    const currentLang = langSelect ? langSelect.value : 'es';

    const favorites = JSON.parse(localStorage.getItem('gamestore-favorites')) || [];

    games.forEach(game => {
        const price = getGamePrice(game.id);
        const formattedPrice = formatPrice(price);
        const btnText = currentLang === 'es' ? '+ Añadir' : '+ Add';
        const isFav = favorites.some(f => f.rawgId === game.id);

        const article = document.createElement('article');
        article.className = 'game-card-premium';
        article.tabIndex = 0;
        article.dataset.id = game.id;

        article.innerHTML = `
            <figure class="card-media-premium">
                <img src="${game.background_image || 'https://via.placeholder.com/600x400'}" alt="${game.name}" loading="lazy">
                <aside class="card-overlay-aside">
                    <button class="btn-add-cart-premium" data-game-id="${game.id}">${btnText}</button>
                </aside>
                <button class="btn-favorite ${isFav ? 'active' : ''}" data-game-id="${game.id}" data-game-name="${game.name}" data-game-image="${game.background_image || ''}" title="${currentLang === 'es' ? 'Favorito' : 'Favorite'}">${isFav ? '❤️' : '🤍'}</button>
            </figure>
            <section class="card-info-premium">
                <h3>${game.name}</h3>
                <p class="platforms">${game.platforms?.slice(0, 4).map(p => p.platform.name).join(' | ') || 'PC'}</p>
                <p class="price">$${formattedPrice} <abbr title="Peso Colombiano">COP</abbr></p>
            </section>
        `;
        catalogContainer.appendChild(article);
    });
}

function toggleLoadMoreBtn() {
    const btn = document.getElementById('load-more-btn');
    if (btn) btn.style.display = AppState.hasMore ? 'block' : 'none';
}

function loadMoreGames() {
    AppState.currentPage++;
    applyFiltersAndSort(false);
}

// ==========================================
// 5. INTERNACIONALIZACIÓN (integrada con i18n.js)
// ==========================================
function translatePageLocal(lang) {
    localStorage.setItem('idiomaPreferido', lang);

    document.querySelectorAll('[data-es]').forEach(el => {
        const translation = (lang === 'en') ? el.getAttribute('data-en') : el.getAttribute('data-es');
        if (translation) el.innerHTML = translation;
    });

    document.querySelectorAll('[data-placeholder-es]').forEach(el => {
        const translation = (lang === 'en') ? el.getAttribute('data-placeholder-en') : el.getAttribute('data-placeholder-es');
        if (translation) el.placeholder = translation;
    });

    if (langSelect) langSelect.value = lang;
    if (searchInput) {
        searchInput.placeholder = (lang === 'en') ? "Search your next game..." : "Buscar tu próximo juego...";
    }

    applyFiltersAndSort();
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

// ==========================================
// 6. DETALLE DEL VIDEOJUEGO (Astrid)
// ==========================================
const modal = document.getElementById('game-detail-modal');
const closeModal = document.getElementById('close-modal');
const closeBtnLower = document.getElementById('btn-cerrar-inferior');

async function openGameDetail(gameId) {
    if (!modal) return;

    document.getElementById('modal-title').textContent = 'Cargando...';
    document.getElementById('modal-description').innerHTML = '';
    document.getElementById('modal-img').src = '';
    modal.showModal();

    try {
        const response = await fetch(`${BASE_URL}/${gameId}?key=${RAWG_KEY}`);
        if (!response.ok) throw new Error('Error al obtener detalle');
        const game = await response.json();

        const price = getGamePrice(game.id);
        const lang = langSelect ? langSelect.value : 'es';

        document.getElementById('modal-title').innerText = game.name;
        document.getElementById('modal-description').innerHTML = game.description_raw
            ? `<p style="white-space:pre-line;">${game.description_raw}</p>`
            : (game.description || (lang === 'es' ? 'No hay descripción disponible.' : 'No description available.'));

        const modalImg = document.getElementById('modal-img');
        if (modalImg) {
            modalImg.src = game.background_image_additional || game.background_image;
            modalImg.alt = game.name;
        }

        const ratingEl = document.getElementById('modal-rating');
        const dateEl = document.getElementById('modal-date');
        const priceEl = document.getElementById('modal-price');
        const platformsEl = document.getElementById('modal-platforms');
        const genresEl = document.getElementById('modal-genres');

        if (ratingEl) {
            const stars = '⭐'.repeat(Math.round(game.rating || 0));
            ratingEl.innerText = `${game.rating || 'N/A'} ${stars}`;
        }
        if (dateEl) dateEl.innerText = game.released || 'N/A';
        if (priceEl) priceEl.innerText = `$${formatPrice(price)} COP`;
        if (platformsEl) {
            platformsEl.innerHTML = game.platforms
                ? game.platforms.map(p => `<span class="detail-tag">${p.platform.name}</span>`).join('')
                : '';
        }
        if (genresEl) {
            genresEl.innerHTML = game.genres
                ? game.genres.map(g => `<span class="detail-tag genre-tag">${g.name}</span>`).join('')
                : '';
        }

        // Botón añadir al carrito del modal
        const addCartBtn = document.getElementById('modal-add-cart-btn');
        if (addCartBtn) {
            addCartBtn.onclick = () => {
                addToCart({
                    rawgId: game.id,
                    titulo: game.name,
                    imagen: game.background_image || '',
                    precio: price,
                    plataforma: game.platforms?.[0]?.platform?.name || ''
                });
            };
        }

        // Favorito en modal
        const favBtn = document.getElementById('modal-fav-btn');
        if (favBtn) {
            const favorites = JSON.parse(localStorage.getItem('gamestore-favorites')) || [];
            const isFav = favorites.some(f => f.rawgId === game.id);
            updateFavoriteBtn(favBtn, isFav);
            favBtn.onclick = () => {
                toggleFavorite(game.id, game.name, game.background_image || '');
                const favs = JSON.parse(localStorage.getItem('gamestore-favorites')) || [];
                const nowFav = favs.some(f => f.rawgId === game.id);
                updateFavoriteBtn(favBtn, nowFav);
            };
        }

        loadScreenshots(gameId);

        const cardContainer = document.querySelector('.detail-full-card');
        if (cardContainer) cardContainer.scrollTop = 0;

    } catch (error) {
        console.error("Error al cargar detalle:", error);
    }
}

async function loadScreenshots(gameId) {
    const container = document.getElementById('modal-screenshots');
    if (!container) return;

    try {
        const response = await fetch(`${BASE_URL}/${gameId}/screenshots?key=${RAWG_KEY}`);
        if (!response.ok) throw new Error('Error al obtener screenshots');
        const data = await response.json();
        const screenshots = data.results || [];

        if (screenshots.length === 0) {
            container.innerHTML = '';
            return;
        }

        const lang = langSelect ? langSelect.value : 'es';
        container.innerHTML = `
            <h3 class="detail-subtitle">${lang === 'es' ? 'Capturas de Pantalla' : 'Screenshots'}</h3>
            <div class="screenshots-grid">
                ${screenshots.slice(0, 6).map(ss => `
                    <img src="${ss.image}" alt="Screenshot" class="screenshot-img" loading="lazy">
                `).join('')}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '';
    }
}

function updateFavoriteBtn(btn, isFav) {
    const lang = langSelect ? langSelect.value : 'es';
    btn.textContent = isFav
        ? '❤️ ' + (lang === 'es' ? 'Quitar de Favoritos' : 'Remove from Favorites')
        : '🤍 ' + (lang === 'es' ? 'Añadir a Favoritos' : 'Add to Favorites');
    btn.className = isFav ? 'btn-fav-active' : 'btn-fav';
}

// Controladores de cierre del modal detalle
if (closeModal) closeModal.onclick = () => modal.close();
if (closeBtnLower) closeBtnLower.onclick = () => modal.close();
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.close();
    });
}

// ==========================================
// 7. SISTEMA DE CARRITO (Daniel) - CORREGIDO
//    - Requiere login para añadir
//    - Re-render inmediato al hacer +/-/eliminar
//    - Delegación de eventos (no onclick inline)
// ==========================================

function getCart() {
    return JSON.parse(localStorage.getItem('carrito')) || [];
}

function saveCart(cart) {
    localStorage.setItem('carrito', JSON.stringify(cart));
    updateCartBadge();
    // === RE-RENDER INMEDIATO ===
    // Si el modal del carrito está abierto, re-renderizar al instante
    const cartModalEl = document.getElementById('cart-modal');
    if (cartModalEl && cartModalEl.open) {
        renderCartModal();
    }
}

function addToCart(game) {
    // ===== REQUERIR LOGIN =====
    if (!AppState.currentUser) {
        const lang = langSelect ? langSelect.value : 'es';
        alert(lang === 'es' ? 'Debes iniciar sesión para añadir juegos al carrito.' : 'You must log in to add games to cart.');
        const authModalEl = document.getElementById('auth-modal');
        if (authModalEl) authModalEl.showModal();
        return;
    }

    let cart = getCart();
    const existingIndex = cart.findIndex(item => item.rawgId === game.rawgId);

    if (existingIndex !== -1) {
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
    const lang = langSelect ? langSelect.value : 'es';
    alert(`${game.titulo || game.name} ${lang === 'es' ? 'añadido al carrito' : 'added to cart'}`);
}

function removeFromCart(rawgId) {
    let cart = getCart();
    cart = cart.filter(item => item.rawgId !== rawgId);
    saveCart(cart);
}

function updateCartQuantity(rawgId, change) {
    let cart = getCart();
    const index = cart.findIndex(item => item.rawgId === rawgId);

    if (index !== -1) {
        cart[index].cantidad += change;
        if (cart[index].cantidad < 1) {
            cart.splice(index, 1);
        }
    }

    saveCart(cart);
}

function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.precio * item.cantidad), 0);
}

function clearCart() {
    saveCart([]);
}

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
        const cart = getCart();
        const count = cart.reduce((acc, item) => acc + item.cantidad, 0);
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

/**
 * Renderizar contenido del carrito en el modal
 * CORREGIDO: Usa data-rawg-id + delegación de eventos
 * para que +/-/eliminar funcionen INMEDIATAMENTE
 */
function renderCartModal() {
    const cart = getCart();
    const listContainer = document.getElementById('cart-items-list');
    const totalElement = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const lang = langSelect ? langSelect.value : 'es';

    if (!listContainer) return;

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
                        <small>$${formatPrice(item.precio)} c/u</small>
                        <footer class="quantity-controls">
                            <button class="btn-qty cart-btn-minus" data-rawg-id="${item.rawgId}">-</button>
                            <span>${item.cantidad}</span>
                            <button class="btn-qty cart-btn-plus" data-rawg-id="${item.rawgId}">+</button>
                            <button class="btn-remove cart-btn-delete" data-rawg-id="${item.rawgId}" title="Eliminar">🗑️</button>
                        </footer>
                    </section>
                </article>
                <p class="cart-item-subtotal"><strong>$${formatPrice(subtotal)}</strong></p>
            </li>
        `;
    }).join('');

    if (totalElement) totalElement.textContent = `$${formatPrice(totalGeneral)}`;
}

// ==========================================
// 8. FAVORITOS
// ==========================================
function toggleFavorite(rawgId, name, image) {
    let favorites = JSON.parse(localStorage.getItem('gamestore-favorites')) || [];
    const index = favorites.findIndex(f => f.rawgId === rawgId);

    if (index !== -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({ rawgId, name, image });
    }

    localStorage.setItem('gamestore-favorites', JSON.stringify(favorites));
    return favorites;
}

function isFavorite(rawgId) {
    const favorites = JSON.parse(localStorage.getItem('gamestore-favorites')) || [];
    return favorites.some(f => f.rawgId === rawgId);
}

// ==========================================
// 9. SISTEMA DE VISTAS (SPA-like)
// ==========================================
function switchView(view) {
    AppState.currentView = view;

    const sections = ['catalog-section', 'orders-section', 'favorites-section', 'admin-section', 'checkout-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const heroEl = document.querySelector('.hero-gaming');
    const kenedyEl = document.getElementById('kenedy-section');
    const activeId = view + '-section';
    const activeEl = document.getElementById(activeId);

    if (view === 'catalog') {
        if (heroEl) heroEl.style.display = 'flex';
        if (kenedyEl) kenedyEl.style.display = 'flex';
        if (activeEl) activeEl.style.display = 'block';
    } else {
        if (heroEl) heroEl.style.display = 'none';
        if (kenedyEl) kenedyEl.style.display = 'none';
        if (activeEl) activeEl.style.display = 'block';
    }

    document.querySelectorAll('.nav-link-btn').forEach(btn => btn.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${view}`);
    if (activeNav) activeNav.classList.add('active');

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.remove('open');

    // Close auth modal if open when switching views
    const authModalEl = document.getElementById('auth-modal');
    if (authModalEl && authModalEl.open) authModalEl.close();

    if (view === 'orders') loadOrders();
    if (view === 'favorites') loadFavorites();
    if (view === 'admin') loadAdmin();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.switchView = switchView;

// ==========================================
// 10. AUTENTICACIÓN (US01-US04)
// ==========================================
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const toggleAuthBtn = document.getElementById('toggle-auth-mode');
const nameField = document.getElementById('name-field-group');
const btnLogin = document.getElementById('login-btn');
const btnLogout = document.getElementById('logout-btn');
const closeAuth = document.getElementById('close-auth');
const submitBtn = document.getElementById('auth-submit-btn');
const recoveryLink = document.getElementById('link-recovery');
const recoveryBtn = document.getElementById('auth-recovery-btn');
const passField = document.getElementById('auth-password');
const labelPass = document.getElementById('label-pass');

let isLoginMode = true;

function setupAuth() {
    if (toggleAuthBtn) {
        toggleAuthBtn.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            const lang = langSelect ? langSelect.value : 'es';

            submitBtn.style.display = 'block';
            recoveryBtn.style.display = 'none';
            passField.style.display = 'block';
            if (labelPass) labelPass.style.display = 'block';

            authTitle.innerText = isLoginMode
                ? (lang === 'es' ? "INICIAR SESIÓN" : "LOGIN")
                : (lang === 'es' ? "REGISTRARSE" : "REGISTER");
            submitBtn.innerText = isLoginMode
                ? (lang === 'es' ? "Entrar" : "Sign In")
                : (lang === 'es' ? "Registrarse" : "Sign Up");
            nameField.style.display = isLoginMode ? 'none' : 'block';
        });
    }

    if (recoveryLink) {
        recoveryLink.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = langSelect ? langSelect.value : 'es';
            authTitle.innerText = lang === 'es' ? "RECUPERAR POR CORREO" : "RECOVER PASSWORD";
            submitBtn.style.display = 'none';
            nameField.style.display = 'none';
            passField.style.display = 'none';
            if (labelPass) labelPass.style.display = 'none';
            recoveryBtn.style.display = 'block';
        });
    }

    if (recoveryBtn) {
        recoveryBtn.addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value.trim();
            if (!email) return alert("Ingresa tu correo.");

            const { error } = await _supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/index.html',
            });

            if (error) alert("Error: " + error.message);
            else alert("✅ Enlace enviado. Revisa tu bandeja de entrada.");
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value.trim();
            const password = passField.value;
            const fullName = document.getElementById('auth-name').value.trim();

            try {
                if (!isLoginMode) {
                    const { data, error: authError } = await _supabase.auth.signUp({ email, password });
                    if (authError) throw authError;

                    if (data.user) {
                        await _supabase.from('perfiles').insert([{
                            id: data.user.id,
                            nombre_completo: fullName,
                            email: email,
                            rol: 'cliente'
                        }]);
                        alert("✅ ¡Cuenta creada! Revisa tu email para confirmar.");
                    }
                } else {
                    const { error: loginError } = await _supabase.auth.signInWithPassword({ email, password });
                    if (loginError) throw loginError;
                    alert("✅ ¡Bienvenido!");
                }
                authModal.close();
                checkUser();
            } catch (err) {
                alert("Error: " + err.message);
            }
        });
    }

    _supabase.auth.onAuthStateChange(async (event, session) => {
        checkUser();
        if (event === "PASSWORD_RECOVERY") {
            const newPassword = prompt("Ingresa tu nueva contraseña (mínimo 6 caracteres):");
            if (newPassword && newPassword.length >= 6) {
                const { error } = await _supabase.auth.updateUser({ password: newPassword });
                if (error) alert("Error: " + error.message);
                else {
                    alert("✅ Contraseña actualizada.");
                    await _supabase.auth.signOut();
                    location.reload();
                }
            }
        }
    });
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    AppState.currentUser = user;

    if (btnLogin) btnLogin.style.display = user ? 'none' : 'block';
    if (btnLogout) btnLogout.style.display = user ? 'block' : 'none';

    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) {
        let role = 'cliente';
        if (user) {
            try {
                const { data: perfil } = await _supabase
                    .from('perfiles')
                    .select('rol')
                    .eq('id', user.id)
                    .single();
                role = perfil?.rol || 'cliente';
            } catch (e) {
                console.warn('No se pudo obtener rol:', e);
            }
        }
        navAdmin.style.display = role === 'admin' ? 'block' : 'none';
    }

    const catalogSection = document.getElementById('catalog-section');
    if (catalogSection && AppState.currentView === 'catalog') {
        catalogSection.style.display = user ? 'block' : 'none';
    }

    const heroEl = document.querySelector('.hero-gaming');
    const kenedyEl = document.getElementById('kenedy-section');
    if (!user && AppState.currentView === 'catalog') {
        if (heroEl) heroEl.style.display = 'flex';
        if (kenedyEl) kenedyEl.style.display = 'none';
        if (catalogSection) catalogSection.style.display = 'none';
    }

    if (user && AppState.currentView === 'catalog') {
        if (kenedyEl) kenedyEl.style.display = 'flex';
        applyFiltersAndSort();
    }
}

// ==========================================
// 11. PEDIDOS - CORREGIDO: Lee desde Supabase
// ==========================================
async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    if (!AppState.currentUser) {
        container.innerHTML = `<p class="empty-msg">${langSelect && langSelect.value === 'en' ? 'You must log in to see your orders.' : 'Debes iniciar sesión para ver tus pedidos.'}</p>`;
        return;
    }

    const lang = langSelect ? langSelect.value : 'es';

    try {
        // Obtener pedidos del usuario desde Supabase
        const { data: pedidos, error: pedidosError } = await _supabase
            .from('pedidos')
            .select(`
                id,
                total,
                estado,
                fecha_creacion,
                detalle_pedidos (
                    rawg_id,
                    titulo,
                    imagen,
                    precio,
                    plataforma,
                    cantidad
                )
            `)
            .eq('user_id', AppState.currentUser.id)
            .order('fecha_creacion', { ascending: false });

        if (pedidosError) {
            console.error('Error al cargar pedidos desde Supabase:', pedidosError.message);
            // Fallback a localStorage si Supabase falla
            const orders = JSON.parse(localStorage.getItem('gamestore-orders')) || [];
            const userOrders = orders.filter(o => o.userId === AppState.currentUser.id);
            renderOrdersFromLocal(container, userOrders, lang);
            return;
        }

        if (!pedidos || pedidos.length === 0) {
            container.innerHTML = `<p class="empty-msg">📦 ${lang === 'es' ? 'No tienes pedidos todavía' : "You don't have any orders yet"}</p>`;
            return;
        }

        container.innerHTML = pedidos.map(pedido => {
            const orderId = pedido.id.toString();
            const items = pedido.detalle_pedidos || [];
            return `
                <article class="order-card">
                    <header class="order-header">
                        <p><strong>#${orderId.slice(0, 8).toUpperCase()}</strong></p>
                        <small>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date(pedido.fecha_creacion).toLocaleDateString()}</small>
                    </header>
                    <section class="order-items">
                        ${items.map(item => `
                            <p>${item.titulo} x${item.cantidad} — $${formatPrice(item.precio * item.cantidad)}</p>
                        `).join('')}
                    </section>
                    <footer class="order-footer">
                        <span class="order-status ${pedido.estado}">${pedido.estado}</span>
                        <strong>${lang === 'es' ? 'Total' : 'Total'}: $${formatPrice(pedido.total)} COP</strong>
                    </footer>
                </article>
            `;
        }).join('');
    } catch (err) {
        console.error('Error inesperado al cargar pedidos:', err);
        // Fallback a localStorage
        const orders = JSON.parse(localStorage.getItem('gamestore-orders')) || [];
        const userOrders = orders.filter(o => o.userId === AppState.currentUser.id);
        renderOrdersFromLocal(container, userOrders, lang);
    }
}

/**
 * Renderizar pedidos desde localStorage (fallback)
 */
function renderOrdersFromLocal(container, userOrders, lang) {
    if (userOrders.length === 0) {
        container.innerHTML = `<p class="empty-msg">📦 ${lang === 'es' ? 'No tienes pedidos todavía' : "You don't have any orders yet"}</p>`;
        return;
    }
    container.innerHTML = userOrders.map(order => `
        <article class="order-card">
            <header class="order-header">
                <p><strong>#${order.id.slice(0, 8).toUpperCase()}</strong></p>
                <small>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date(order.createdAt).toLocaleDateString()}</small>
            </header>
            <section class="order-items">
                ${order.items.map(item => `
                    <p>${item.titulo} x${item.cantidad} — $${formatPrice(item.precio * item.cantidad)}</p>
                `).join('')}
            </section>
            <footer class="order-footer">
                <span class="order-status ${order.status}">${order.status}</span>
                <strong>${lang === 'es' ? 'Total' : 'Total'}: $${formatPrice(order.total)} COP</strong>
            </footer>
        </article>
    `).join('');
}

// ==========================================
// 12. CHECKOUT / COMPRA (US19 - Simular Pago)
// ==========================================

/**
 * US19: Validar formulario de pago simulado
 */
function validatePaymentForm() {
    const lang = langSelect ? langSelect.value : 'es';
    const cardNumber = document.getElementById('pay-card-number');
    const expiry = document.getElementById('pay-expiry');
    const cvv = document.getElementById('pay-cvv');
    const cardName = document.getElementById('pay-card-name');

    if (!cardNumber || !expiry || !cvv || !cardName) return false;

    // Limpiar estados de error previos
    [cardNumber, expiry, cvv, cardName].forEach(el => el.classList.remove('pay-input-error'));

    let isValid = true;

    // Card number: 16 dígitos
    const cardVal = cardNumber.value.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cardVal)) {
        cardNumber.classList.add('pay-input-error');
        isValid = false;
    }

    // Expiry: MM/YY
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.value)) {
        expiry.classList.add('pay-input-error');
        isValid = false;
    }

    // CVV: 3 dígitos
    if (!/^\d{3}$/.test(cvv.value)) {
        cvv.classList.add('pay-input-error');
        isValid = false;
    }

    // Cardholder name: no vacío
    if (cardName.value.trim().length < 2) {
        cardName.classList.add('pay-input-error');
        isValid = false;
    }

    if (!isValid) {
        alert(lang === 'es' ? 'Por favor completa correctamente los datos de la tarjeta.' : 'Please fill in the card details correctly.');
    }

    return isValid;
}

function showCheckout() {
    const cart = getCart();
    if (cart.length === 0) return;

    const cartModalEl = document.getElementById('cart-modal');
    if (cartModalEl) cartModalEl.close();
    switchView('checkout');

    const container = document.getElementById('checkout-content');
    if (!container) return;

    const total = getCartTotal();
    const lang = langSelect ? langSelect.value : 'es';

    // US19: Formulario de pago simulado ANTES del botón de confirmar
    container.innerHTML = `
        <h2 class="font-oswald section-title">${lang === 'es' ? 'Confirmar Compra' : 'Confirm Purchase'}</h2>
        <ul class="checkout-items">
            ${cart.map(item => `
                <li class="checkout-item">
                    <span>${item.titulo}</span>
                    <span>x${item.cantidad} — $${formatPrice(item.precio * item.cantidad)}</span>
                </li>
            `).join('')}
        </ul>
        <hr>
        <p class="checkout-total"><strong>${lang === 'es' ? 'Total' : 'Total'}: $${formatPrice(total)} COP</strong></p>

        <section class="payment-form-section">
            <h3 class="payment-form-title">${lang === 'es' ? '💳 Datos de Pago' : '💳 Payment Details'}</h3>
            <form id="payment-form" class="payment-form" onsubmit="return false;">
                <article class="pay-field-group">
                    <label for="pay-card-number">${lang === 'es' ? 'Número de Tarjeta' : 'Card Number'}</label>
                    <input type="text" id="pay-card-number" class="pay-input" placeholder="1234 5678 9012 3456" maxlength="19" autocomplete="cc-number">
                </article>
                <article class="pay-row">
                    <article class="pay-field-group">
                        <label for="pay-expiry">${lang === 'es' ? 'Vencimiento' : 'Expiry'}</label>
                        <input type="text" id="pay-expiry" class="pay-input" placeholder="MM/YY" maxlength="5" autocomplete="cc-exp">
                    </article>
                    <article class="pay-field-group">
                        <label for="pay-cvv">CVV</label>
                        <input type="text" id="pay-cvv" class="pay-input" placeholder="123" maxlength="3" autocomplete="cc-csc">
                    </article>
                </article>
                <article class="pay-field-group">
                    <label for="pay-card-name">${lang === 'es' ? 'Nombre del Titular' : 'Cardholder Name'}</label>
                    <input type="text" id="pay-card-name" class="pay-input" placeholder="${lang === 'es' ? 'Nombre completo' : 'Full name'}" autocomplete="cc-name">
                </article>
                <button type="button" id="pay-btn" class="btn-success btn-pay">${lang === 'es' ? '💰 Pagar' : '💰 Pay'}</button>
            </form>
            <p class="pay-simulated-note">${lang === 'es' ? '🔒 Pago simulado — No se realizarán cargos reales' : '🔒 Simulated payment — No real charges will be made'}</p>
        </section>
    `;

    // Formatear número de tarjeta con espacios cada 4 dígitos
    const cardInput = document.getElementById('pay-card-number');
    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').slice(0, 16);
            val = val.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = val;
        });
    }

    // Formatear fecha de vencimiento MM/YY
    const expiryInput = document.getElementById('pay-expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').slice(0, 4);
            if (val.length >= 2) {
                val = val.slice(0, 2) + '/' + val.slice(2);
            }
            e.target.value = val;
        });
    }

    // CVV solo números
    const cvvInput = document.getElementById('pay-cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
        });
    }

    // US19: Botón Pagar → validar → confirmPurchase
    const payBtn = document.getElementById('pay-btn');
    if (payBtn) {
        payBtn.addEventListener('click', () => {
            if (validatePaymentForm()) {
                confirmPurchase();
            }
        });
    }
}

async function confirmPurchase() {
    const cart = getCart();
    const total = getCartTotal();

    if (!AppState.currentUser) {
        if (authModal) authModal.showModal();
        return;
    }

    const lang = langSelect ? langSelect.value : 'es';
    const orderId = 'ord_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

    // US21: Guardar items para el comprobante
    AppState.lastOrderId = orderId;
    AppState.lastOrderTotal = total;
    AppState.lastOrderItems = cart.map(item => ({ ...item }));

    try {
        // ======================================
        // GUARDAR PEDIDO EN SUPABASE
        // ======================================

        // 1. Insertar en tabla 'pedidos'
        const { data: pedidoData, error: pedidoError } = await _supabase
            .from('pedidos')
            .insert([{
                id: orderId,
                user_id: AppState.currentUser.id,
                total: total,
                estado: 'completed',
                fecha_creacion: new Date().toISOString()
            }])
            .select();

        if (pedidoError) {
            console.error('Error al guardar pedido en Supabase:', pedidoError.message);
            throw pedidoError;
        }

        // 2. Insertar cada item del carrito en tabla 'detalle_pedidos'
        const detalleItems = cart.map(item => ({
            pedido_id: orderId,
            rawg_id: item.rawgId,
            titulo: item.titulo || item.name || '',
            imagen: item.imagen || item.image || '',
            precio: item.precio || item.price || 0,
            plataforma: item.plataforma || item.platform || '',
            cantidad: item.cantidad || 1
        }));

        const { error: detalleError } = await _supabase
            .from('detalle_pedidos')
            .insert(detalleItems);

        if (detalleError) {
            console.error('Error al guardar detalle del pedido en Supabase:', detalleError.message);
            throw detalleError;
        }

        console.log('Pedido guardado exitosamente en Supabase:', orderId);

    } catch (err) {
        console.error('Error al guardar en Supabase, usando localStorage como fallback:', err);
        // Fallback: guardar en localStorage si Supabase falla
        const order = {
            id: orderId,
            userId: AppState.currentUser.id,
            items: cart.map(item => ({ ...item })),
            total: total,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        const orders = JSON.parse(localStorage.getItem('gamestore-orders')) || [];
        orders.unshift(order);
        localStorage.setItem('gamestore-orders', JSON.stringify(orders));
    }

    // Limpiar carrito
    clearCart();

    // Mostrar confirmación con botón de comprobante (US21)
    const container = document.getElementById('checkout-content');
    if (container) {
        container.innerHTML = `
            <div class="purchase-success">
                <p class="success-icon">✅</p>
                <h2 class="font-oswald">${lang === 'es' ? '¡Compra realizada con éxito!' : 'Purchase completed successfully!'}</h2>
                <p>Order #${orderId.slice(0, 8).toUpperCase()}</p>
                <p>${lang === 'es' ? 'Total' : 'Total'}: $${formatPrice(total)} COP</p>
                <footer class="purchase-success-actions">
                    <button class="btn-success" onclick="generateReceipt()">${lang === 'es' ? '📄 Generar Comprobante' : '📄 Generate Receipt'}</button>
                    <button class="btn-danger" onclick="switchView('catalog')">${lang === 'es' ? 'Volver al Catálogo' : 'Back to Catalog'}</button>
                </footer>
            </div>
        `;
    }
}

// ==========================================
// 12B. US21 - GENERAR COMPROBANTE
// ==========================================
function generateReceipt() {
    const lang = langSelect ? langSelect.value : 'es';
    const orderId = AppState.lastOrderId || 'N/A';
    const total = AppState.lastOrderTotal || 0;
    const items = AppState.lastOrderItems || [];
    const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const receiptHtml = `
        <!DOCTYPE html>
        <html lang="${lang}">
        <head>
            <meta charset="UTF-8">
            <title>${lang === 'es' ? 'Comprobante de Compra' : 'Purchase Receipt'}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    background: #f5f5f5;
                    color: #1a1a1a;
                    padding: 2rem;
                }
                .receipt {
                    max-width: 600px;
                    margin: 0 auto;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .receipt-header {
                    background: linear-gradient(135deg, #731486, #e915d7);
                    color: #fff;
                    padding: 2rem;
                    text-align: center;
                }
                .receipt-header h1 {
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                .receipt-header p {
                    opacity: 0.9;
                    font-size: 0.9rem;
                }
                .receipt-body {
                    padding: 2rem;
                }
                .receipt-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px dashed #e0e0e0;
                }
                .receipt-info article {
                    flex: 1;
                }
                .receipt-info label {
                    font-size: 0.75rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .receipt-info p {
                    font-weight: 700;
                    font-size: 0.95rem;
                    margin-top: 4px;
                }
                .receipt-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1rem 0;
                }
                .receipt-table th {
                    text-align: left;
                    padding: 10px;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #888;
                    border-bottom: 2px solid #e0e0e0;
                }
                .receipt-table td {
                    padding: 10px;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 0.9rem;
                }
                .receipt-table td:last-child {
                    text-align: right;
                    font-weight: 600;
                }
                .receipt-total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 0;
                    border-top: 2px solid #1a1a1a;
                    margin-top: 1rem;
                }
                .receipt-total p {
                    font-size: 1.1rem;
                    font-weight: 700;
                }
                .receipt-total .total-amount {
                    font-size: 1.5rem;
                    color: #731486;
                }
                .receipt-footer {
                    text-align: center;
                    padding: 1.5rem;
                    background: #fafafa;
                    border-top: 1px solid #e0e0e0;
                }
                .receipt-footer p {
                    font-size: 0.85rem;
                    color: #888;
                }
                .btn-print {
                    display: inline-block;
                    margin-top: 1rem;
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #6e45e2, #e915d7);
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                }
                .btn-print:hover {
                    filter: brightness(1.1);
                }
                @media print {
                    body { background: #fff; padding: 0; }
                    .receipt { box-shadow: none; border-radius: 0; }
                    .btn-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <article class="receipt">
                <header class="receipt-header">
                    <h1>🎮 GAMESTORE WEB</h1>
                    <p>${lang === 'es' ? 'Comprobante de Compra' : 'Purchase Receipt'}</p>
                </header>
                <section class="receipt-body">
                    <section class="receipt-info">
                        <article>
                            <label>${lang === 'es' ? 'Orden' : 'Order'}</label>
                            <p>#${orderId.slice(0, 8).toUpperCase()}</p>
                        </article>
                        <article>
                            <label>${lang === 'es' ? 'Fecha' : 'Date'}</label>
                            <p>${date}</p>
                        </article>
                    </section>
                    <table class="receipt-table">
                        <thead>
                            <tr>
                                <th>${lang === 'es' ? 'Producto' : 'Product'}</th>
                                <th>${lang === 'es' ? 'Cant.' : 'Qty'}</th>
                                <th>${lang === 'es' ? 'Precio' : 'Price'}</th>
                                <th>${lang === 'es' ? 'Subtotal' : 'Subtotal'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${item.titulo || item.name || 'N/A'}</td>
                                    <td>${item.cantidad}</td>
                                    <td>$${formatPrice(item.precio)}</td>
                                    <td>$${formatPrice(item.precio * item.cantidad)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <footer class="receipt-total">
                        <p>${lang === 'es' ? 'TOTAL' : 'TOTAL'}</p>
                        <p class="total-amount">$${formatPrice(total)} COP</p>
                    </footer>
                </section>
                <footer class="receipt-footer">
                    <p>🎮 GameStore Web — ${lang === 'es' ? 'Gracias por tu compra' : 'Thank you for your purchase'}</p>
                    <button class="btn-print" onclick="window.print()">🖨️ ${lang === 'es' ? 'Imprimir' : 'Print'}</button>
                </footer>
            </article>
        </body>
        </html>
    `;

    const receiptWindow = window.open('', '_blank', 'width=700,height=800');
    if (receiptWindow) {
        receiptWindow.document.write(receiptHtml);
        receiptWindow.document.close();
    }
}

window.generateReceipt = generateReceipt;

// ==========================================
// 13. FAVORITOS
// ==========================================
function loadFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;

    const favorites = JSON.parse(localStorage.getItem('gamestore-favorites')) || [];
    const lang = langSelect ? langSelect.value : 'es';

    if (favorites.length === 0) {
        container.innerHTML = `<p class="empty-msg">❤️ ${lang === 'es' ? 'No tienes favoritos todavía' : "You don't have favorites yet"}</p>`;
        return;
    }

    container.innerHTML = favorites.map(fav => `
        <article class="game-card-premium" data-id="${fav.rawgId}">
            <figure class="card-media-premium">
                <img src="${fav.image || 'https://via.placeholder.com/600x400'}" alt="${fav.name}" loading="lazy">
                <aside class="card-overlay-aside">
                    <button class="btn-add-cart-premium" data-game-id="${fav.rawgId}">${lang === 'es' ? '+ Añadir' : '+ Add'}</button>
                </aside>
                <button class="btn-favorite active" data-game-id="${fav.rawgId}" data-game-name="${fav.name}" data-game-image="${fav.image || ''}" title="${lang === 'es' ? 'Quitar de Favoritos' : 'Remove from Favorites'}">❤️</button>
            </figure>
            <section class="card-info-premium">
                <h3>${fav.name}</h3>
                <p class="price">$${formatPrice(getGamePrice(fav.rawgId))} <abbr title="Peso Colombiano">COP</abbr></p>
            </section>
        </article>
    `).join('');
}

// ==========================================
// 14. ADMIN (US24-27 CRUD, US28 Pedidos, US29 Usuarios)
// ==========================================
function loadAdmin() {
    const container = document.getElementById('admin-content');
    if (!container) return;

    const lang = langSelect ? langSelect.value : 'es';

    container.innerHTML = `
        <nav class="admin-tabs">
            <button class="admin-tab active" data-tab="games">${lang === 'es' ? 'Videojuegos' : 'Video Games'}</button>
            <button class="admin-tab" data-tab="orders">${lang === 'es' ? 'Pedidos' : 'Orders'}</button>
            <button class="admin-tab" data-tab="users">${lang === 'es' ? 'Usuarios' : 'Users'}</button>
        </nav>
        <section id="admin-games-tab" class="admin-tab-content">
            <div class="admin-header">
                <h3>${lang === 'es' ? 'Videojuegos' : 'Video Games'}</h3>
                <button class="btn-success btn-sm" id="btn-create-game">${lang === 'es' ? '+ Crear Videojuego' : '+ Create Game'}</button>
            </div>
            <article id="admin-games-form-area"></article>
            <article id="admin-games-list">
                <p class="empty-msg">${lang === 'es' ? 'Cargando...' : 'Loading...'}</p>
            </article>
        </section>
        <section id="admin-orders-tab" class="admin-tab-content" style="display:none">
            <h3>${lang === 'es' ? 'Pedidos' : 'Orders'}</h3>
            <article id="admin-orders-list">
                <p class="empty-msg">${lang === 'es' ? 'Cargando pedidos...' : 'Loading orders...'}</p>
            </article>
        </section>
        <section id="admin-users-tab" class="admin-tab-content" style="display:none">
            <h3>${lang === 'es' ? 'Usuarios' : 'Users'}</h3>
            <article id="admin-users-list">
                <p class="empty-msg">${lang === 'es' ? 'Cargando usuarios...' : 'Loading users...'}</p>
            </article>
        </section>
    `;

    // Tab navigation
    container.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            container.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(`admin-${tabName}-tab`).style.display = 'block';
        });
    });

    // US24-27: Load games CRUD
    loadAdminGames();

    // US28: Load admin orders
    loadAdminOrders();

    // US29: Load admin users
    loadAdminUsers();

    // Botón crear juego
    const btnCreateGame = document.getElementById('btn-create-game');
    if (btnCreateGame) {
        btnCreateGame.addEventListener('click', () => showGameForm(null));
    }
}

// ==========================================
// 14A. US24-27 - CRUD VIDEOJUEGOS
// ==========================================

async function loadAdminGames() {
    const listContainer = document.getElementById('admin-games-list');
    if (!listContainer) return;

    const lang = langSelect ? langSelect.value : 'es';

    try {
        const { data: games, error } = await _supabase
            .from('videojuegos')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        if (!games || games.length === 0) {
            listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'No hay videojuegos registrados' : 'No games registered'}</p>`;
            return;
        }

        listContainer.innerHTML = `
            <table class="admin-table admin-table-scroll">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>${lang === 'es' ? 'Nombre' : 'Name'}</th>
                        <th>${lang === 'es' ? 'Precio' : 'Price'}</th>
                        <th>${lang === 'es' ? 'Plataforma' : 'Platform'}</th>
                        <th>${lang === 'es' ? 'Género' : 'Genre'}</th>
                        <th>${lang === 'es' ? 'Acciones' : 'Actions'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${games.map(g => `
                        <tr>
                            <td>${g.id}</td>
                            <td>${g.nombre || ''}</td>
                            <td>$${formatPrice(g.precio || 0)}</td>
                            <td>${g.plataforma || ''}</td>
                            <td>${g.genero || ''}</td>
                            <td class="admin-actions-cell">
                                <button class="btn-admin-edit" data-game-id="${g.id}" title="${lang === 'es' ? 'Editar' : 'Edit'}">✏️</button>
                                <button class="btn-admin-delete" data-game-id="${g.id}" data-game-name="${g.nombre || ''}" title="${lang === 'es' ? 'Eliminar' : 'Delete'}">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Delegación de eventos para editar/eliminar
        listContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            if (btn.classList.contains('btn-admin-edit')) {
                const gameId = btn.dataset.gameId;
                const game = games.find(g => g.id == gameId);
                if (game) showGameForm(game);
            }

            if (btn.classList.contains('btn-admin-delete')) {
                const gameId = btn.dataset.gameId;
                const gameName = btn.dataset.gameName;
                const confirmMsg = lang === 'es'
                    ? `¿Eliminar "${gameName}"? Esta acción no se puede deshacer.`
                    : `Delete "${gameName}"? This action cannot be undone.`;
                if (confirm(confirmMsg)) {
                    deleteGame(gameId);
                }
            }
        });

    } catch (err) {
        console.error('Error al cargar videojuegos admin:', err);
        listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'Error al cargar videojuegos' : 'Error loading games'}</p>`;
    }
}

/**
 * Mostrar formulario de crear/editar videojuego
 */
function showGameForm(game) {
    const formArea = document.getElementById('admin-games-form-area');
    if (!formArea) return;

    const lang = langSelect ? langSelect.value : 'es';
    const isEdit = game !== null;
    const title = isEdit
        ? (lang === 'es' ? 'Editar Videojuego' : 'Edit Game')
        : (lang === 'es' ? 'Crear Videojuego' : 'Create Game');

    formArea.innerHTML = `
        <article class="admin-form-card">
            <header class="admin-form-header">
                <h4>${title}</h4>
                <button class="btn-admin-cancel" id="btn-cancel-game-form">✕</button>
            </header>
            <form id="admin-game-form" class="admin-form">
                <article class="admin-form-grid">
                    <article class="admin-form-field">
                        <label for="game-nombre">${lang === 'es' ? 'Nombre' : 'Name'} *</label>
                        <input type="text" id="game-nombre" value="${isEdit ? (game.nombre || '') : ''}" required>
                    </article>
                    <article class="admin-form-field">
                        <label for="game-precio">${lang === 'es' ? 'Precio (COP)' : 'Price (COP)'} *</label>
                        <input type="number" id="game-precio" value="${isEdit ? (game.precio || '') : ''}" min="0" required>
                    </article>
                    <article class="admin-form-field">
                        <label for="game-imagen">${lang === 'es' ? 'URL de Imagen' : 'Image URL'}</label>
                        <input type="url" id="game-imagen" value="${isEdit ? (game.imagen_url || '') : ''}" placeholder="https://...">
                    </article>
                    <article class="admin-form-field">
                        <label for="game-plataforma">${lang === 'es' ? 'Plataforma' : 'Platform'}</label>
                        <input type="text" id="game-plataforma" value="${isEdit ? (game.plataforma || '') : ''}" placeholder="PC, PlayStation, Xbox...">
                    </article>
                    <article class="admin-form-field">
                        <label for="game-genero">${lang === 'es' ? 'Género' : 'Genre'}</label>
                        <input type="text" id="game-genero" value="${isEdit ? (game.genero || '') : ''}" placeholder="Acción, RPG, Aventura...">
                    </article>
                    <article class="admin-form-field">
                        <label for="game-rating">Rating</label>
                        <input type="number" id="game-rating" value="${isEdit ? (game.rating || '') : ''}" min="0" max="5" step="0.1" placeholder="0-5">
                    </article>
                </article>
                <article class="admin-form-field full-width">
                    <label for="game-descripcion">${lang === 'es' ? 'Descripción' : 'Description'}</label>
                    <textarea id="game-descripcion" rows="3" placeholder="${lang === 'es' ? 'Descripción del videojuego...' : 'Game description...'}">${isEdit ? (game.descripcion || '') : ''}</textarea>
                </article>
                <footer class="admin-form-actions">
                    <button type="submit" class="btn-success">${lang === 'es' ? '💾 Guardar' : '💾 Save'}</button>
                    <button type="button" class="btn-danger" id="btn-cancel-game-form2">${lang === 'es' ? 'Cancelar' : 'Cancel'}</button>
                </footer>
            </form>
        </article>
    `;

    // Cancel buttons
    document.getElementById('btn-cancel-game-form')?.addEventListener('click', () => { formArea.innerHTML = ''; });
    document.getElementById('btn-cancel-game-form2')?.addEventListener('click', () => { formArea.innerHTML = ''; });

    // Submit form
    document.getElementById('admin-game-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const gameData = {
            nombre: document.getElementById('game-nombre').value.trim(),
            precio: parseInt(document.getElementById('game-precio').value) || 0,
            imagen_url: document.getElementById('game-imagen').value.trim(),
            plataforma: document.getElementById('game-plataforma').value.trim(),
            genero: document.getElementById('game-genero').value.trim(),
            descripcion: document.getElementById('game-descripcion').value.trim(),
            rating: parseFloat(document.getElementById('game-rating').value) || 0
        };

        try {
            if (isEdit) {
                // UPDATE
                const { error } = await _supabase
                    .from('videojuegos')
                    .update(gameData)
                    .eq('id', game.id);

                if (error) throw error;
                alert(lang === 'es' ? '✅ Videojuego actualizado' : '✅ Game updated');
            } else {
                // CREATE
                const { error } = await _supabase
                    .from('videojuegos')
                    .insert([gameData]);

                if (error) throw error;
                alert(lang === 'es' ? '✅ Videojuego creado' : '✅ Game created');
            }

            formArea.innerHTML = '';
            loadAdminGames();
        } catch (err) {
            console.error('Error al guardar videojuego:', err);
            alert((lang === 'es' ? 'Error: ' : 'Error: ') + err.message);
        }
    });

    // Scroll al formulario
    formArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Eliminar videojuego por ID
 */
async function deleteGame(gameId) {
    const lang = langSelect ? langSelect.value : 'es';
    try {
        const { error } = await _supabase
            .from('videojuegos')
            .delete()
            .eq('id', gameId);

        if (error) throw error;
        alert(lang === 'es' ? '✅ Videojuego eliminado' : '✅ Game deleted');
        loadAdminGames();
    } catch (err) {
        console.error('Error al eliminar videojuego:', err);
        alert((lang === 'es' ? 'Error al eliminar: ' : 'Error deleting: ') + err.message);
    }
}

// ==========================================
// 14B. US28 - GESTIONAR PEDIDOS (Admin)
// ==========================================

async function loadAdminOrders() {
    const listContainer = document.getElementById('admin-orders-list');
    if (!listContainer) return;

    const lang = langSelect ? langSelect.value : 'es';

    try {
        const { data: pedidos, error } = await _supabase
            .from('pedidos')
            .select(`
                id,
                total,
                estado,
                fecha_creacion,
                perfiles ( nombre_completo )
            `)
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        if (!pedidos || pedidos.length === 0) {
            listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'No hay pedidos' : 'No orders'}</p>`;
            return;
        }

        const statusOptions = ['pending', 'processing', 'completed', 'cancelled'];
        const statusLabels = {
            pending: lang === 'es' ? 'Pendiente' : 'Pending',
            processing: lang === 'es' ? 'En Proceso' : 'Processing',
            completed: lang === 'es' ? 'Completado' : 'Completed',
            cancelled: lang === 'es' ? 'Cancelado' : 'Cancelled'
        };

        listContainer.innerHTML = `
            <table class="admin-table admin-table-scroll">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>${lang === 'es' ? 'Cliente' : 'Customer'}</th>
                        <th>${lang === 'es' ? 'Fecha' : 'Date'}</th>
                        <th>${lang === 'es' ? 'Total' : 'Total'}</th>
                        <th>${lang === 'es' ? 'Estado' : 'Status'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${pedidos.map(p => {
                        const customerName = p.perfiles?.nombre_completo || 'N/A';
                        return `
                            <tr>
                                <td>#${p.id.toString().slice(0, 8).toUpperCase()}</td>
                                <td>${customerName}</td>
                                <td>${new Date(p.fecha_creacion).toLocaleDateString()}</td>
                                <td>$${formatPrice(p.total)}</td>
                                <td>
                                    <select class="admin-status-select" data-order-id="${p.id}">
                                        ${statusOptions.map(s =>
                                            `<option value="${s}" ${p.estado === s ? 'selected' : ''}>${statusLabels[s]}</option>`
                                        ).join('')}
                                    </select>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        // Delegación: cuando cambie el select de estado
        listContainer.addEventListener('change', async (e) => {
            if (e.target.classList.contains('admin-status-select')) {
                const orderId = e.target.dataset.orderId;
                const newStatus = e.target.value;
                await updateOrderStatus(orderId, newStatus);
            }
        });

    } catch (err) {
        console.error('Error al cargar pedidos admin:', err);
        // Fallback a localStorage
        const orders = JSON.parse(localStorage.getItem('gamestore-orders')) || [];
        listContainer.innerHTML = `
            ${orders.length === 0 ? `<p class="empty-msg">${lang === 'es' ? 'No hay pedidos' : 'No orders'}</p>` : `
                <table class="admin-table">
                    <thead><tr><th>ID</th><th>${lang === 'es' ? 'Fecha' : 'Date'}</th><th>${lang === 'es' ? 'Total' : 'Total'}</th><th>${lang === 'es' ? 'Estado' : 'Status'}</th></tr></thead>
                    <tbody>
                        ${orders.map(o => `
                            <tr>
                                <td>#${o.id.slice(0, 8).toUpperCase()}</td>
                                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                                <td>$${formatPrice(o.total)}</td>
                                <td><span class="order-status ${o.status}">${o.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        `;
    }
}

/**
 * US28: Actualizar estado del pedido en Supabase
 */
async function updateOrderStatus(orderId, newStatus) {
    const lang = langSelect ? langSelect.value : 'es';
    try {
        const { error } = await _supabase
            .from('pedidos')
            .update({ estado: newStatus })
            .eq('id', orderId);

        if (error) throw error;
        console.log(`Pedido ${orderId} actualizado a: ${newStatus}`);
        // Mostrar feedback visual
        const select = document.querySelector(`.admin-status-select[data-order-id="${orderId}"]`);
        if (select) {
            const row = select.closest('tr');
            if (row) {
                row.style.transition = 'background 0.5s';
                row.style.background = 'rgba(34,197,94,0.1)';
                setTimeout(() => { row.style.background = ''; }, 1500);
            }
        }
    } catch (err) {
        console.error('Error al actualizar estado del pedido:', err);
        alert((lang === 'es' ? 'Error al actualizar estado: ' : 'Error updating status: ') + err.message);
    }
}

// ==========================================
// 14C. US29 - GESTIONAR USUARIOS (Admin)
// ==========================================

async function loadAdminUsers() {
    const listContainer = document.getElementById('admin-users-list');
    if (!listContainer) return;

    const lang = langSelect ? langSelect.value : 'es';

    try {
        const { data: users, error } = await _supabase
            .from('perfiles')
            .select('id, nombre_completo, email, rol')
            .order('nombre_completo', { ascending: true });

        if (error) throw error;

        if (!users || users.length === 0) {
            listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'No hay usuarios' : 'No users'}</p>`;
            return;
        }

        const userCount = users.length;
        const adminCount = users.filter(u => u.rol === 'admin').length;
        const clientCount = users.filter(u => u.rol === 'cliente').length;

        listContainer.innerHTML = `
            <section class="admin-users-stats">
                <article class="stat-card">
                    <p class="stat-number">${userCount}</p>
                    <p class="stat-label">${lang === 'es' ? 'Total Usuarios' : 'Total Users'}</p>
                </article>
                <article class="stat-card">
                    <p class="stat-number">${adminCount}</p>
                    <p class="stat-label">${lang === 'es' ? 'Admins' : 'Admins'}</p>
                </article>
                <article class="stat-card">
                    <p class="stat-number">${clientCount}</p>
                    <p class="stat-label">${lang === 'es' ? 'Clientes' : 'Clients'}</p>
                </article>
            </section>
            <table class="admin-table admin-table-scroll">
                <thead>
                    <tr>
                        <th>${lang === 'es' ? 'Nombre' : 'Name'}</th>
                        <th>${lang === 'es' ? 'Correo' : 'Email'}</th>
                        <th>${lang === 'es' ? 'Rol' : 'Role'}</th>
                        <th>${lang === 'es' ? 'Acciones' : 'Actions'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${u.nombre_completo || 'N/A'}</td>
                            <td>${u.email || 'N/A'}</td>
                            <td><span class="role-badge role-${u.rol || 'cliente'}">${u.rol || 'cliente'}</span></td>
                            <td class="admin-actions-cell">
                                <button class="btn-toggle-role" data-user-id="${u.id}" data-current-role="${u.rol || 'cliente'}"
                                    title="${lang === 'es' ? 'Cambiar rol' : 'Toggle role'}">
                                    ${u.rol === 'admin' ? '👤→cliente' : '👑→admin'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Delegación: toggle rol
        listContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-toggle-role');
            if (!btn) return;

            const userId = btn.dataset.userId;
            const currentRole = btn.dataset.currentRole;
            const newRole = currentRole === 'admin' ? 'cliente' : 'admin';
            const confirmMsg = lang === 'es'
                ? `¿Cambiar rol a "${newRole}"?`
                : `Change role to "${newRole}"?`;
            if (confirm(confirmMsg)) {
                await updateUserRole(userId, newRole);
            }
        });

    } catch (err) {
        console.error('Error al cargar usuarios admin:', err);
        listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'Error al cargar usuarios' : 'Error loading users'}</p>`;
    }
}

/**
 * US29: Cambiar rol de usuario
 */
async function updateUserRole(userId, newRole) {
    const lang = langSelect ? langSelect.value : 'es';
    try {
        const { error } = await _supabase
            .from('perfiles')
            .update({ rol: newRole })
            .eq('id', userId);

        if (error) throw error;
        alert(lang === 'es' ? `✅ Rol cambiado a ${newRole}` : `✅ Role changed to ${newRole}`);
        loadAdminUsers();
    } catch (err) {
        console.error('Error al cambiar rol de usuario:', err);
        alert((lang === 'es' ? 'Error al cambiar rol: ' : 'Error changing role: ') + err.message);
    }
}

// ==========================================
// 15. EVENT LISTENERS - CORREGIDOS
// ==========================================
function setupEventListeners() {
    // Búsqueda en tiempo real con debounce
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(AppState.searchDebounceTimer);
            AppState.searchDebounceTimer = setTimeout(() => {
                applyFiltersAndSort(true);
            }, 300);
        });
    }

    // Form submit
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFiltersAndSort(true);
        });
    }

    // Filtros
    if (genreFilter) genreFilter.addEventListener('change', () => applyFiltersAndSort());
    if (platformFilter) platformFilter.addEventListener('change', () => applyFiltersAndSort());
    if (sortFilter) sortFilter.addEventListener('change', () => applyFiltersAndSort());

    // Idioma
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            translatePageLocal(e.target.value);
        });
    }

    // === DELEGACIÓN DE EVENTOS EN CATÁLOGO ===
    if (catalogContainer) {
        catalogContainer.addEventListener('click', (e) => {
            // Botón añadir al carrito
            if (e.target.classList.contains('btn-add-cart-premium')) {
                e.stopPropagation();
                const card = e.target.closest('.game-card-premium');
                if (!card) return;

                const gameId = parseInt(card.dataset.id);
                const title = card.querySelector('h3').textContent;
                const priceText = card.querySelector('.price').textContent;
                const priceNum = parseFloat(priceText.replace(/[^0-9]/g, ''));
                const imgEl = card.querySelector('img');
                const imgSrc = imgEl ? imgEl.src : '';

                addToCart({
                    rawgId: gameId,
                    titulo: title,
                    imagen: imgSrc,
                    precio: priceNum,
                    plataforma: ''
                });
                return;
            }

            // Botón favorito
            if (e.target.classList.contains('btn-favorite')) {
                e.stopPropagation();
                const rawgId = parseInt(e.target.dataset.gameId);
                const name = e.target.dataset.gameName;
                const image = e.target.dataset.gameImage;
                toggleFavorite(rawgId, name, image);
                const fav = isFavorite(rawgId);
                e.target.textContent = fav ? '❤️' : '🤍';
                e.target.classList.toggle('active', fav);
                return;
            }

            // Clic en tarjeta (abrir detalle)
            const card = e.target.closest('.game-card-premium');
            if (card && card.dataset.id) {
                openGameDetail(parseInt(card.dataset.id));
            }
        });
    }

    // === DELEGACIÓN DE EVENTOS EN CARRITO ===
    // Un solo listener en el contenedor, funciona después de re-renderizar
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
        checkoutBtn.addEventListener('click', showCheckout);
    }

    // Auth modal
    if (btnLogin) btnLogin.addEventListener('click', () => { isLoginMode = true; if (authModal) authModal.showModal(); });
    if (closeAuth) closeAuth.addEventListener('click', () => { if (authModal) authModal.close(); });
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await _supabase.auth.signOut();
            checkUser();
            const lang = langSelect ? langSelect.value : 'es';
            alert(lang === 'es' ? 'Sesión cerrada' : 'Logged out');
        });
    }

    // Navegación
    const navCatalog = document.getElementById('nav-catalog');
    const navOrders = document.getElementById('nav-orders');
    const navFavorites = document.getElementById('nav-favorites');
    const navAdmin = document.getElementById('nav-admin');

    if (navCatalog) navCatalog.addEventListener('click', () => switchView('catalog'));
    if (navOrders) navOrders.addEventListener('click', () => switchView('orders'));
    if (navFavorites) navFavorites.addEventListener('click', () => switchView('favorites'));
    if (navAdmin) navAdmin.addEventListener('click', () => switchView('admin'));

    // Load more
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreGames);

    // Mobile menu
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    }

    // Language change event
    document.addEventListener('languageChanged', () => {
        updateCartBadge();
    });
}

// ==========================================
// 16. INICIALIZACIÓN
// ==========================================
async function initApp() {
    // Cargar idioma previo
    const savedLang = localStorage.getItem('idiomaPreferido');
    if (savedLang && langSelect) {
        langSelect.value = savedLang;
        translatePageLocal(savedLang);
    }

    // Verificar usuario
    await checkUser();

    // Si hay usuario, cargar catálogo
    if (AppState.currentUser) {
        applyFiltersAndSort();
    }

    // Configurar eventos
    setupEventListeners();
    setupAuth();

    // Inicializar badge del carrito
    updateCartBadge();

    // Cargar tasa de cambio
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (response.ok) {
            const data = await response.json();
            const rate = data.rates?.COP || 4200;
            localStorage.setItem('exchangeRate', rate);
        }
    } catch (e) {
        console.warn('Exchange rate fallback');
    }

    console.log('🎮 GameStore Web inicializada correctamente');
}

// Iniciar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);
initApp();
