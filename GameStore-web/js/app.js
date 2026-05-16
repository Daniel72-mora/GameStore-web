// ==========================================
// js/app.js - Lógica Principal de GameStore Web
// ALL 15 BUGS FIXED + CRUD IMPROVEMENTS
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
// getVideojuegos() kept for CRUD section use, but auto-call removed

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
// loadExchangeRate() kept for future conversion features, auto-call removed

// ==========================================
// CRUD IMPROVEMENT: Toast Notification System
// ==========================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('article');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, duration);
}

// ==========================================
// CRUD IMPROVEMENT: Custom Confirmation Dialog
// ==========================================
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('aside');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <article class="confirm-dialog">
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(message)}</p>
                <footer class="confirm-actions">
                    <button class="btn-success btn-sm confirm-yes">${typeof t === 'function' ? t('confirm') : 'Confirmar'}</button>
                    <button class="btn-danger btn-sm confirm-no">${typeof t === 'function' ? t('cancel') : 'Cancelar'}</button>
                </footer>
            </article>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.confirm-yes').addEventListener('click', () => { document.body.removeChild(overlay); resolve(true); });
        overlay.querySelector('.confirm-no').addEventListener('click', () => { document.body.removeChild(overlay); resolve(false); });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) { document.body.removeChild(overlay); resolve(false); } });
    });
}

// ==========================================
// CRUD IMPROVEMENT: Custom Prompt Dialog (replaces prompt())
// ==========================================
function showCustomPrompt(title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('aside');
        overlay.className = 'custom-prompt-overlay';
        overlay.innerHTML = `
            <article class="custom-prompt-dialog">
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(message)}</p>
                <input type="password" class="pay-input custom-prompt-input" placeholder="••••••••" minLength="6" />
                <footer class="confirm-actions">
                    <button class="btn-success btn-sm custom-prompt-ok">OK</button>
                    <button class="btn-danger btn-sm custom-prompt-cancel">Cancelar</button>
                </footer>
            </article>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('.custom-prompt-input');
        if (input) input.focus();
        overlay.querySelector('.custom-prompt-ok').addEventListener('click', () => {
            const val = input ? input.value : '';
            document.body.removeChild(overlay);
            resolve(val || null);
        });
        overlay.querySelector('.custom-prompt-cancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(null);
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) { document.body.removeChild(overlay); resolve(null); }
        });
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const val = input.value;
                    document.body.removeChild(overlay);
                    resolve(val || null);
                }
            });
        }
    });
}

// ==========================================
// 2. ESTADO GLOBAL DE LA APP
// ==========================================
// Bug #16: Safe JSON parse helper
function safeJSONParse(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
}

// Bug #29: Store current games for re-render on language change
let currentGames = [];

const AppState = {
    currentView: 'catalog',
    currentPage: 1,
    hasMore: true,
    isLoading: false,
    searchDebounceTimer: null,
    currentUser: null,
    lastOrderId: null,
    lastOrderTotal: 0,
    lastOrderItems: [],
    adminListenersSetup: false // FIXED Bug 5: Track if admin listeners are set up
};

// ==========================================
// 3. CÓDIGO DE FELIPE (API RAWG & Renderizado)
// FIXED Bug 8: XSS - sanitize function
// ==========================================
const RAWG_KEY = '528ce5b0381f45098f72533abf93952c';
const BASE_URL = 'https://api.rawg.io/api/games';

const priceCache = {};

function getGamePrice(rawgId) {
    if (priceCache[rawgId]) return priceCache[rawgId];
    const base = ((rawgId * 7919) % 160) + 90;
    const price = base * 1000;
    priceCache[rawgId] = price;
    return price;
}

function formatPrice(price) {
    return price.toLocaleString('es-CO');
}

// FIXED Bug 8: XSS sanitization
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const catalogContainer = document.getElementById('game-catalog');
const searchForm = document.querySelector('.search-bar-premium');
const searchInput = searchForm ? searchForm.querySelector('input') : null;
const langSelect = document.getElementById('lang-select');
const genreFilter = document.getElementById('genre-filter');
const sortFilter = document.getElementById('sort-filter');
const platformFilter = document.getElementById('platform-filter');

// fetchRawgGames removed - was dead code (app uses applyFiltersAndSort instead)

// FIXED Bug 8: Use escapeHtml for game names in innerHTML
function renderStore(games) {
    if (!catalogContainer) return;
    catalogContainer.innerHTML = '';
    const currentLang = langSelect ? langSelect.value : 'es';

    if (!games || games.length === 0) {
        catalogContainer.innerHTML = `<p class="no-games-msg">${currentLang === 'es' ? 'No se encontraron videojuegos.' : 'No games found.'}</p>`;
        return;
    }

    const favorites = safeJSONParse('gamestore-favorites') || [];

    games.forEach(game => {
        const price = getGamePrice(game.id);
        const formattedPrice = formatPrice(price);
        const btnText = currentLang === 'es' ? '+ Añadir' : '+ Add';
        const isFav = favorites.some(f => f.rawgId === game.id);
        const safeName = escapeHtml(game.name);
        const safeImg = escapeHtml(game.background_image || 'https://via.placeholder.com/600x400');

        const article = document.createElement('article');
        article.className = 'game-card-premium';
        article.tabIndex = 0;
        article.dataset.id = game.id;

        article.innerHTML = `
            <figure class="card-media-premium">
                <img src="${safeImg}" alt="${safeName}" loading="lazy">
                <aside class="card-overlay-aside">
                    <button class="btn-add-cart-premium" data-game-id="${game.id}">${btnText}</button>
                </aside>
                <button class="btn-favorite ${isFav ? 'active' : ''}" data-game-id="${game.id}" data-game-name="${safeName}" data-game-image="${safeImg}" title="${currentLang === 'es' ? 'Favorito' : 'Favorite'}">${isFav ? '❤️' : '🤍'}</button>
            </figure>
            <section class="card-info-premium">
                <h3>${safeName}</h3>
                <p class="platforms">${game.platforms?.slice(0, 4).map(p => escapeHtml(p.platform.name)).join(' | ') || 'PC'}</p>
                <p class="price">$${formattedPrice} <abbr title="Peso Colombiano">COP</abbr></p>
            </section>
        `;
        catalogContainer.appendChild(article);
    });
    currentGames = games;
}

// ==========================================
// 4. FILTROS Y BÚSQUEDA
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
    const favorites = safeJSONParse('gamestore-favorites') || [];

    games.forEach(game => {
        const price = getGamePrice(game.id);
        const formattedPrice = formatPrice(price);
        const btnText = currentLang === 'es' ? '+ Añadir' : '+ Add';
        const isFav = favorites.some(f => f.rawgId === game.id);
        const safeName = escapeHtml(game.name);
        const safeImg = escapeHtml(game.background_image || 'https://via.placeholder.com/600x400');

        const article = document.createElement('article');
        article.className = 'game-card-premium';
        article.tabIndex = 0;
        article.dataset.id = game.id;

        article.innerHTML = `
            <figure class="card-media-premium">
                <img src="${safeImg}" alt="${safeName}" loading="lazy">
                <aside class="card-overlay-aside">
                    <button class="btn-add-cart-premium" data-game-id="${game.id}">${btnText}</button>
                </aside>
                <button class="btn-favorite ${isFav ? 'active' : ''}" data-game-id="${game.id}" data-game-name="${safeName}" data-game-image="${safeImg}" title="${currentLang === 'es' ? 'Favorito' : 'Favorite'}">${isFav ? '❤️' : '🤍'}</button>
            </figure>
            <section class="card-info-premium">
                <h3>${safeName}</h3>
                <p class="platforms">${game.platforms?.slice(0, 4).map(p => escapeHtml(p.platform.name)).join(' | ') || 'PC'}</p>
                <p class="price">$${formattedPrice} <abbr title="Peso Colombiano">COP</abbr></p>
            </section>
        `;
        catalogContainer.appendChild(article);
    });
}

function toggleLoadMoreBtn() {
    const btn = document.getElementById('load-more-btn');
    if (btn) btn.classList.toggle('is-hidden', !AppState.hasMore);
}

function loadMoreGames() {
    AppState.currentPage++;
    applyFiltersAndSort(false);
}

// ==========================================
// 5. INTERNACIONALIZACIÓN
// ==========================================
function translatePageLocal(lang) {
    localStorage.setItem('idiomaPreferido', lang);

    document.querySelectorAll('[data-es]').forEach(el => {
        const translation = (lang === 'en') ? el.getAttribute('data-en') : el.getAttribute('data-es');
        if (translation) el.textContent = translation;
    });

    document.querySelectorAll('[data-placeholder-es]').forEach(el => {
        const translation = (lang === 'en') ? el.getAttribute('data-placeholder-en') : el.getAttribute('data-placeholder-es');
        if (translation) el.placeholder = translation;
    });

    if (langSelect) langSelect.value = lang;
    if (searchInput) {
        searchInput.placeholder = (lang === 'en') ? "Search your next game..." : "Buscar tu próximo juego...";
    }

    // Bug #29: Don't re-fetch from API on language change, just re-render current games
    if (currentGames && currentGames.length > 0) {
        renderStore(currentGames);
    }
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

// ==========================================
// 6. DETALLE DEL VIDEOJUEGO
// FIXED Bug 8: XSS - use textContent and escapeHtml
// ==========================================
const modal = document.getElementById('game-detail-modal');
const closeModal = document.getElementById('close-modal');
const closeBtnLower = document.getElementById('btn-cerrar-inferior');

async function openGameDetail(gameId) {
    if (!modal) return;

    // Bug #17: Use language variable for loading message
    const loadingLang = langSelect ? langSelect.value : 'es';
    document.getElementById('modal-title').textContent = loadingLang === 'es' ? 'Cargando...' : 'Loading...';
    document.getElementById('modal-description').textContent = '';
    document.getElementById('modal-img').src = '';
    modal.showModal();

    try {
        const response = await fetch(`${BASE_URL}/${gameId}?key=${RAWG_KEY}`);
        if (!response.ok) throw new Error('Error al obtener detalle');
        const game = await response.json();

        const price = getGamePrice(game.id);
        const lang = langSelect ? langSelect.value : 'es';

        // FIXED Bug 8: Use textContent for title
        document.getElementById('modal-title').textContent = game.name;
        
        // FIXED Bug 8: Sanitize description
        const descEl = document.getElementById('modal-description');
        if (game.description_raw) {
            const p = document.createElement('p');
            p.style.whiteSpace = 'pre-line';
            p.textContent = game.description_raw;
            descEl.innerHTML = '';
            descEl.appendChild(p);
        } else {
            descEl.textContent = game.description || (lang === 'es' ? 'No hay descripción disponible.' : 'No description available.');
        }

        const modalImg = document.getElementById('modal-img');
        if (modalImg) {
            modalImg.src = game.background_image_additional || game.background_image;
            modalImg.alt = game.name;
            modalImg.classList.remove('is-hidden');
        }

        const ratingEl = document.getElementById('modal-rating');
        const dateEl = document.getElementById('modal-date');
        const priceEl = document.getElementById('modal-price');
        const platformsEl = document.getElementById('modal-platforms');
        const genresEl = document.getElementById('modal-genres');

        if (ratingEl) {
            const stars = '⭐'.repeat(Math.round(game.rating || 0));
            ratingEl.textContent = `${game.rating || 'N/A'} ${stars}`;
        }
        if (dateEl) dateEl.textContent = game.released || 'N/A';
        if (priceEl) priceEl.textContent = `$${formatPrice(price)} COP`;
        if (platformsEl) {
            platformsEl.innerHTML = game.platforms
                ? game.platforms.map(p => `<span class="detail-tag">${escapeHtml(p.platform.name)}</span>`).join('')
                : '';
        }
        if (genresEl) {
            genresEl.innerHTML = game.genres
                ? game.genres.map(g => `<span class="detail-tag genre-tag">${escapeHtml(g.name)}</span>`).join('')
                : '';
        }

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

        const favBtn = document.getElementById('modal-fav-btn');
        if (favBtn) {
            const favorites = safeJSONParse('gamestore-favorites') || [];
            const isFav = favorites.some(f => f.rawgId === game.id);
            updateFavoriteBtn(favBtn, isFav);
            favBtn.onclick = () => {
                toggleFavorite(game.id, game.name, game.background_image || '');
                const favs = safeJSONParse('gamestore-favorites') || [];
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
            <section class="screenshots-grid">
                ${screenshots.slice(0, 6).map(ss => `
                    <img src="${escapeHtml(ss.image)}" alt="Screenshot" class="screenshot-img" loading="lazy">
                `).join('')}
            </section>
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

if (closeModal) closeModal.onclick = () => { if (modal) modal.close(); };
if (closeBtnLower) closeBtnLower.onclick = () => { if (modal) modal.close(); };
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.close();
    });
}

// ==========================================
// 7. SISTEMA DE CARRITO - CORREGIDO
// ==========================================
function getCart() {
    return safeJSONParse('carrito') || [];
}

function saveCart(cart) {
    localStorage.setItem('carrito', JSON.stringify(cart));
    updateCartBadge();
    const cartModalEl = document.getElementById('cart-modal');
    if (cartModalEl && cartModalEl.open) {
        renderCartModal();
    }
}

function addToCart(game) {
    if (!AppState.currentUser) {
        const lang = langSelect ? langSelect.value : 'es';
        showToast(lang === 'es' ? 'Debes iniciar sesión para añadir juegos al carrito.' : 'You must log in to add games to cart.', 'warning');
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
    showToast(`${game.titulo || game.name} ${lang === 'es' ? 'añadido al carrito' : 'added to cart'}`, 'success');
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
        badge.classList.toggle('is-hidden', count === 0);
    }
}

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
        if (checkoutBtn) checkoutBtn.classList.add('is-hidden');
        return;
    }

    if (checkoutBtn) checkoutBtn.classList.remove('is-hidden');

    let totalGeneral = 0;
    listContainer.innerHTML = cart.map((item) => {
        const subtotal = item.precio * item.cantidad;
        totalGeneral += subtotal;
        return `
            <li class="cart-item-row">
                <article class="cart-item-content">
                    ${item.imagen ? `<img src="${escapeHtml(item.imagen)}" alt="${escapeHtml(item.titulo)}" class="cart-item-img" loading="lazy">` : ''}
                    <section class="cart-item-info">
                        <p><strong>${escapeHtml(item.titulo)}</strong></p>
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
    let favorites = safeJSONParse('gamestore-favorites') || [];
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
    const favorites = safeJSONParse('gamestore-favorites') || [];
    return favorites.some(f => f.rawgId === rawgId);
}

// ==========================================
// 9. SISTEMA DE VISTAS (SPA-like)
// ==========================================
function switchView(view) {
    AppState.currentView = view;

    const sections = ['catalog-section', 'orders-section', 'favorites-section', 'admin-section', 'checkout-section', 'crud-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('is-hidden');
    });

    const heroEl = document.querySelector('.hero-gaming');
    const kenedyEl = document.getElementById('kenedy-section');
    const activeId = view + '-section';
    const activeEl = document.getElementById(activeId);

    if (view === 'catalog') {
        if (heroEl) heroEl.classList.remove('is-hidden');
        if (kenedyEl) kenedyEl.classList.remove('is-hidden');
        if (activeEl) activeEl.classList.remove('is-hidden');
    } else {
        if (heroEl) heroEl.classList.add('is-hidden');
        if (kenedyEl) kenedyEl.classList.add('is-hidden');
        if (activeEl) activeEl.classList.remove('is-hidden');
    }

    document.querySelectorAll('.nav-link-btn').forEach(btn => btn.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${view}`);
    if (activeNav) activeNav.classList.add('active');
    // Bug #25: Also set active class on corresponding mobile nav button
    const mobileActiveNav = document.querySelector(`.mobile-menu .nav-link-btn[data-view="${view}"]`);
    if (mobileActiveNav) mobileActiveNav.classList.add('active');

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.remove('open');

    const authModalEl = document.getElementById('auth-modal');
    if (authModalEl && authModalEl.open) authModalEl.close();

    if (view === 'orders') loadOrders();
    if (view === 'favorites') loadFavorites();
    if (view === 'admin') loadAdmin();
    if (view === 'crud') loadCrud();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.switchView = switchView;

// ==========================================
// 10. AUTENTICACIÓN
// FIXED Bug 15: Reset auth form on close
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

// FIXED Bug 15: Function to reset auth form to default login mode
function resetAuthForm() {
    isLoginMode = true;
    const lang = langSelect ? langSelect.value : 'es';
    if (authTitle) authTitle.textContent = lang === 'es' ? 'INICIAR SESIÓN' : 'LOGIN';
    if (submitBtn) {
        submitBtn.classList.remove('is-hidden');
        submitBtn.textContent = lang === 'es' ? 'Entrar' : 'Sign In';
    }
    if (nameField) nameField.classList.add('is-hidden');
    if (passField) passField.classList.remove('is-hidden');
    if (labelPass) labelPass.classList.remove('is-hidden');
    if (recoveryBtn) recoveryBtn.classList.add('is-hidden');
    if (authForm) authForm.reset();
}

function setupAuth() {
    if (toggleAuthBtn) {
        toggleAuthBtn.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            const lang = langSelect ? langSelect.value : 'es';

            submitBtn.classList.remove('is-hidden');
            recoveryBtn.classList.add('is-hidden');
            passField.classList.remove('is-hidden');
            if (labelPass) labelPass.classList.remove('is-hidden');

            authTitle.textContent = isLoginMode
                ? (lang === 'es' ? "INICIAR SESIÓN" : "LOGIN")
                : (lang === 'es' ? "REGISTRARSE" : "REGISTER");
            submitBtn.textContent = isLoginMode
                ? (lang === 'es' ? "Entrar" : "Sign In")
                : (lang === 'es' ? "Registrarse" : "Sign Up");
            nameField.classList.toggle('is-hidden', isLoginMode);
        });
    }

    if (recoveryLink) {
        recoveryLink.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = langSelect ? langSelect.value : 'es';
            authTitle.textContent = lang === 'es' ? "RECUPERAR POR CORREO" : "RECOVER PASSWORD";
            submitBtn.classList.add('is-hidden');
            nameField.classList.add('is-hidden');
            passField.classList.add('is-hidden');
            if (labelPass) labelPass.classList.add('is-hidden');
            recoveryBtn.classList.remove('is-hidden');
        });
    }

    if (recoveryBtn) {
        recoveryBtn.addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value.trim();
            if (!email) { showToast('Ingresa tu correo.', 'warning'); return; }

            const { error } = await _supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });

            if (error) showToast("Error: " + error.message, 'error');
            else showToast("✅ Enlace enviado. Revisa tu bandeja de entrada.", 'success');
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
                        showToast("✅ ¡Cuenta creada! Revisa tu email para confirmar.", 'success');
                    }
                } else {
                    const { error: loginError } = await _supabase.auth.signInWithPassword({ email, password });
                    if (loginError) throw loginError;
                    showToast("✅ ¡Bienvenido!", 'success');
                }
                // Misc Bug: Null check for authModal.close()
                if (authModal) authModal.close();
                // FIXED Bug 15: Reset form after successful auth
                resetAuthForm();
                checkUser();
            } catch (err) {
                showToast("Error: " + err.message, 'error');
            }
        });
    }

    _supabase.auth.onAuthStateChange(async (event, session) => {
        checkUser();
        if (event === "PASSWORD_RECOVERY") {
            const newPassword = await showCustomPrompt(
                "Nueva Contraseña",
                "Ingresa tu nueva contraseña (mínimo 6 caracteres):"
            );
            if (newPassword && newPassword.length >= 6) {
                const { error } = await _supabase.auth.updateUser({ password: newPassword });
                if (error) showToast("Error: " + error.message, 'error');
                else {
                    showToast("✅ Contraseña actualizada.", 'success');
                    await _supabase.auth.signOut();
                    location.reload();
                }
            } else if (newPassword !== null) {
                showToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
            }
        }
    });
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    AppState.currentUser = user;

    if (btnLogin) btnLogin.classList.toggle('is-hidden', !!user);
    if (btnLogout) btnLogout.classList.toggle('is-hidden', !user);

    let role = 'cliente';
    if (user) {
        try {
            console.log('Buscando perfil para usuario:', user.id, user.email);
            const { data: perfil, error: perfilError } = await _supabase
                .from('perfiles')
                .select('rol')
                .eq('id', user.id)
                .single();

            if (perfilError) {
                console.warn('Error al buscar por ID, intentando por email:', perfilError.message);
                // Fallback: buscar por email si el ID no coincide
                const { data: perfilByEmail } = await _supabase
                    .from('perfiles')
                    .select('rol')
                    .eq('email', user.email)
                    .single();
                role = perfilByEmail?.rol || 'cliente';
            } else {
                role = perfil?.rol || 'cliente';
            }
            console.log('Rol del usuario:', role);
        } catch (e) {
            console.warn('No se pudo obtener rol:', e);
        }
    }

    const navAdmin = document.getElementById('nav-admin');
    const mobileNavAdmin = document.getElementById('mobile-nav-admin');
    const navCrud = document.getElementById('nav-crud');
    const mobileNavCrud = document.getElementById('mobile-nav-crud');

    const isAdmin = role === 'admin';
    console.log('Mostrando Admin/CRUD:', isAdmin);

    if (navAdmin) navAdmin.classList.toggle('is-hidden', !isAdmin);
    if (mobileNavAdmin) mobileNavAdmin.classList.toggle('is-hidden', !isAdmin);
    if (navCrud) navCrud.classList.toggle('is-hidden', !isAdmin);
    if (mobileNavCrud) mobileNavCrud.classList.toggle('is-hidden', !isAdmin);

    const catalogSection = document.getElementById('catalog-section');
    const heroEl = document.querySelector('.hero-gaming');
    const kenedyEl = document.getElementById('kenedy-section');
    if (!user && AppState.currentView === 'catalog') {
        if (heroEl) heroEl.classList.remove('is-hidden');
        if (kenedyEl) kenedyEl.classList.remove('is-hidden');
        if (catalogSection) {
            catalogSection.classList.remove('is-hidden');
            // Show catalog but add login prompt if not present
            let loginPrompt = document.getElementById('catalog-login-prompt');
            if (!loginPrompt) {
                loginPrompt = document.createElement('article');
                loginPrompt.id = 'catalog-login-prompt';
                loginPrompt.className = 'catalog-login-prompt';
                const lang = langSelect ? langSelect.value : 'es';
                loginPrompt.innerHTML = `
                    <p>${lang === 'es' ? '🔑 Inicia sesión para añadir juegos al carrito y realizar compras.' : '🔑 Log in to add games to cart and make purchases.'}</p>
                    <button class="btn-premium-outline" id="catalog-login-btn">${lang === 'es' ? 'Iniciar Sesión' : 'Log In'}</button>
                `;
                catalogSection.insertBefore(loginPrompt, catalogSection.firstChild);
                const catalogLoginBtn = document.getElementById('catalog-login-btn');
                if (catalogLoginBtn) {
                    catalogLoginBtn.addEventListener('click', () => {
                        const authModalEl = document.getElementById('auth-modal');
                        if (authModalEl) authModalEl.showModal();
                    });
                }
            }
        }
        // Load catalog even for non-logged users
        applyFiltersAndSort();
    }

    if (user && AppState.currentView === 'catalog') {
        // Remove login prompt if it exists
        const loginPrompt = document.getElementById('catalog-login-prompt');
        if (loginPrompt) loginPrompt.remove();
        if (kenedyEl) kenedyEl.classList.remove('is-hidden');
        applyFiltersAndSort();
    }
}

// ==========================================
// 11. PEDIDOS
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
            const orders = safeJSONParse('gamestore-orders') || [];
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
                        <p><strong>#${escapeHtml(orderId.slice(0, 8).toUpperCase())}</strong></p>
                        <small>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date(pedido.fecha_creacion).toLocaleDateString()}</small>
                    </header>
                    <section class="order-items">
                        ${items.map(item => `
                            <p>${escapeHtml(item.titulo)} x${item.cantidad} — $${formatPrice(item.precio * item.cantidad)}</p>
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
        const orders = safeJSONParse('gamestore-orders') || [];
        const userOrders = orders.filter(o => o.userId === AppState.currentUser.id);
        renderOrdersFromLocal(container, userOrders, lang);
    }
}

function renderOrdersFromLocal(container, userOrders, lang) {
    if (userOrders.length === 0) {
        container.innerHTML = `<p class="empty-msg">📦 ${lang === 'es' ? 'No tienes pedidos todavía' : "You don't have any orders yet"}</p>`;
        return;
    }
    container.innerHTML = userOrders.map(order => `
        <article class="order-card">
            <header class="order-header">
                <p><strong>#${escapeHtml(order.id.slice(0, 8).toUpperCase())}</strong></p>
                <small>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date(order.createdAt).toLocaleDateString()}</small>
            </header>
            <section class="order-items">
                ${order.items.map(item => `
                    <p>${escapeHtml(item.titulo)} x${item.cantidad} — $${formatPrice(item.precio * item.cantidad)}</p>
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
// 12. CHECKOUT / COMPRA
// ==========================================
function validatePaymentForm() {
    const lang = langSelect ? langSelect.value : 'es';
    const cardNumber = document.getElementById('pay-card-number');
    const expiry = document.getElementById('pay-expiry');
    const cvv = document.getElementById('pay-cvv');
    const cardName = document.getElementById('pay-card-name');

    if (!cardNumber || !expiry || !cvv || !cardName) return false;

    [cardNumber, expiry, cvv, cardName].forEach(el => el.classList.remove('pay-input-error'));

    let isValid = true;

    const cardVal = cardNumber.value.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cardVal)) {
        cardNumber.classList.add('pay-input-error');
        isValid = false;
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.value)) {
        expiry.classList.add('pay-input-error');
        isValid = false;
    }

    if (!/^\d{3}$/.test(cvv.value)) {
        cvv.classList.add('pay-input-error');
        isValid = false;
    }

    if (cardName.value.trim().length < 2) {
        cardName.classList.add('pay-input-error');
        isValid = false;
    }

    if (!isValid) {
        showToast(lang === 'es' ? 'Por favor completa correctamente los datos de la tarjeta.' : 'Please fill in the card details correctly.', 'warning');
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

    container.innerHTML = `
        <h2 class="font-oswald section-title">${lang === 'es' ? 'Confirmar Compra' : 'Confirm Purchase'}</h2>
        <ul class="checkout-items">
            ${cart.map(item => `
                <li class="checkout-item">
                    <span>${escapeHtml(item.titulo)}</span>
                    <span>x${item.cantidad} — $${formatPrice(item.precio * item.cantidad)}</span>
                </li>
            `).join('')}
        </ul>
        <hr>
        <p class="checkout-total"><strong>${lang === 'es' ? 'Total' : 'Total'}: $${formatPrice(total)} COP</strong></p>

        <section class="payment-form-section">
            <h3 class="payment-form-title">${lang === 'es' ? '💳 Datos de Pago' : '💳 Payment Details'}</h3>
            <form id="payment-form" class="payment-form">
                <article class="pay-field-group">
                    <label for="pay-card-number">${lang === 'es' ? 'Número de Tarjeta' : 'Card Number'}</label>
                    <input type="text" id="pay-card-number" class="pay-input" placeholder="1234 5678 9012 3456" maxlength="19" autocomplete="cc-number" />
                </article>
                <article class="pay-row">
                    <article class="pay-field-group">
                        <label for="pay-expiry">${lang === 'es' ? 'Vencimiento' : 'Expiry'}</label>
                        <input type="text" id="pay-expiry" class="pay-input" placeholder="MM/YY" maxlength="5" autocomplete="cc-exp" />
                    </article>
                    <article class="pay-field-group">
                        <label for="pay-cvv">CVV</label>
                        <input type="password" id="pay-cvv" class="pay-input" placeholder="123" maxlength="3" autocomplete="cc-csc" />
                    </article>
                </article>
                <article class="pay-field-group">
                    <label for="pay-card-name">${lang === 'es' ? 'Nombre del Titular' : 'Cardholder Name'}</label>
                    <input type="text" id="pay-card-name" class="pay-input" placeholder="${lang === 'es' ? 'Nombre completo' : 'Full name'}" autocomplete="cc-name" />
                </article>
                <button type="button" id="pay-btn" class="btn-success btn-pay">${lang === 'es' ? '💰 Pagar' : '💰 Pay'}</button>
            </form>
            <p class="pay-simulated-note">${lang === 'es' ? '🔒 Pago simulado — No se realizarán cargos reales' : '🔒 Simulated payment — No real charges will be made'}</p>
        </section>
    `;

    const cardInput = document.getElementById('pay-card-number');
    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').slice(0, 16);
            val = val.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = val;
        });
    }

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

    const cvvInput = document.getElementById('pay-cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
        });
    }

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
    // FIXED Bug 13: Replace deprecated substr() with substring()
    const orderId = 'ord_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    AppState.lastOrderId = orderId;
    AppState.lastOrderTotal = total;
    AppState.lastOrderItems = cart.map(item => ({ ...item }));

    try {
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
        const order = {
            id: orderId,
            userId: AppState.currentUser.id,
            items: cart.map(item => ({ ...item })),
            total: total,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        const orders = safeJSONParse('gamestore-orders') || [];
        orders.unshift(order);
        localStorage.setItem('gamestore-orders', JSON.stringify(orders));
    }

    clearCart();

    const container = document.getElementById('checkout-content');
    if (container) {
        container.innerHTML = `
            <section class="purchase-success">
                <p class="success-icon">✅</p>
                <h2 class="font-oswald">${lang === 'es' ? '¡Compra realizada con éxito!' : 'Purchase completed successfully!'}</h2>
                <p>Order #${escapeHtml(orderId.slice(0, 8).toUpperCase())}</p>
                <p>${lang === 'es' ? 'Total' : 'Total'}: $${formatPrice(total)} COP</p>
                <footer class="purchase-success-actions">
                    <button class="btn-success" onclick="generateReceipt()">${lang === 'es' ? '📄 Generar Comprobante' : '📄 Generate Receipt'}</button>
                    <button class="btn-danger" onclick="switchView('catalog')">${lang === 'es' ? 'Volver al Catálogo' : 'Back to Catalog'}</button>
                </footer>
            </section>
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
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; color: #1a1a1a; padding: 2rem; }
                .receipt { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                .receipt-header { background: linear-gradient(135deg, #731486, #e915d7); color: #fff; padding: 2rem; text-align: center; }
                .receipt-header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
                .receipt-header p { opacity: 0.9; font-size: 0.9rem; }
                .receipt-body { padding: 2rem; }
                .receipt-info { display: flex; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px dashed #e0e0e0; }
                .receipt-info article { flex: 1; }
                .receipt-info label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
                .receipt-info p { font-weight: 700; font-size: 0.95rem; margin-top: 4px; }
                .receipt-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                .receipt-table th { text-align: left; padding: 10px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 2px solid #e0e0e0; }
                .receipt-table td { padding: 10px; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
                .receipt-table td:last-child { text-align: right; font-weight: 600; }
                .receipt-total { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 0; border-top: 2px solid #1a1a1a; margin-top: 1rem; }
                .receipt-total p { font-size: 1.1rem; font-weight: 700; }
                .receipt-total .total-amount { font-size: 1.5rem; color: #731486; }
                .receipt-footer { text-align: center; padding: 1.5rem; background: #fafafa; border-top: 1px solid #e0e0e0; }
                .receipt-footer p { font-size: 0.85rem; color: #888; }
                .btn-print { display: inline-block; margin-top: 1rem; padding: 12px 30px; background: linear-gradient(135deg, #6e45e2, #e915d7); color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; }
                .btn-print:hover { filter: brightness(1.1); }
                @media print { body { background: #fff; padding: 0; } .receipt { box-shadow: none; border-radius: 0; } .btn-print { display: none !important; } }
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
                                    <td>${escapeHtml(item.titulo || item.name || 'N/A')}</td>
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
// FIXED Bug 4: Add favorites view click delegation
// ==========================================
function loadFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;

    const favorites = safeJSONParse('gamestore-favorites') || [];
    const lang = langSelect ? langSelect.value : 'es';

    if (favorites.length === 0) {
        container.innerHTML = `<p class="empty-msg">❤️ ${lang === 'es' ? 'No tienes favoritos todavía' : "You don't have favorites yet"}</p>`;
        return;
    }

    container.innerHTML = favorites.map(fav => `
        <article class="game-card-premium" data-id="${fav.rawgId}">
            <figure class="card-media-premium">
                <img src="${escapeHtml(fav.image || 'https://via.placeholder.com/600x400')}" alt="${escapeHtml(fav.name)}" loading="lazy">
                <aside class="card-overlay-aside">
                    <button class="btn-add-cart-premium" data-game-id="${fav.rawgId}">${lang === 'es' ? '+ Añadir' : '+ Add'}</button>
                </aside>
                <button class="btn-favorite active" data-game-id="${fav.rawgId}" data-game-name="${escapeHtml(fav.name)}" data-game-image="${escapeHtml(fav.image || '')}" title="${lang === 'es' ? 'Quitar de Favoritos' : 'Remove from Favorites'}">❤️</button>
            </figure>
            <section class="card-info-premium">
                <h3>${escapeHtml(fav.name)}</h3>
                <p class="price">$${formatPrice(getGamePrice(fav.rawgId))} <abbr title="Peso Colombiano">COP</abbr></p>
            </section>
        </article>
    `).join('');
}

// ==========================================
// 14. ADMIN
// FIXED Bug 5: Use AbortController pattern to prevent duplicate listeners
// ==========================================
let adminGamesAbort = null;
let adminOrdersAbort = null;
let adminUsersAbort = null;

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
            <header class="admin-header">
                <h3>${lang === 'es' ? 'Videojuegos' : 'Video Games'}</h3>
                <button class="btn-success btn-sm" id="btn-create-game">${lang === 'es' ? '+ Crear Videojuego' : '+ Create Game'}</button>
            </header>
            <article id="admin-games-form-area"></article>
            <article id="admin-games-search" class="admin-search-bar">
                <input type="text" id="admin-games-search-input" placeholder="${lang === 'es' ? 'Buscar juego...' : 'Search game...'}" />
            </article>
            <article id="admin-games-list">
                <p class="empty-msg">${lang === 'es' ? 'Cargando...' : 'Loading...'}</p>
            </article>
        </section>
        <section id="admin-orders-tab" class="admin-tab-content" style="display:none">
            <header class="admin-header">
                <h3>${lang === 'es' ? 'Pedidos' : 'Orders'}</h3>
                <article id="admin-orders-search" class="admin-search-bar">
                    <input type="text" id="admin-orders-search-input" placeholder="${lang === 'es' ? 'Buscar pedido...' : 'Search order...'}" />
                </article>
            </header>
            <article id="admin-orders-list">
                <p class="empty-msg">${lang === 'es' ? 'Cargando pedidos...' : 'Loading orders...'}</p>
            </article>
        </section>
        <section id="admin-users-tab" class="admin-tab-content" style="display:none">
            <header class="admin-header">
                <h3>${lang === 'es' ? 'Usuarios' : 'Users'}</h3>
                <article id="admin-users-search" class="admin-search-bar">
                    <input type="text" id="admin-users-search-input" placeholder="${lang === 'es' ? 'Buscar usuario...' : 'Search user...'}" />
                </article>
            </header>
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

    // FIXED Bug 5: Abort previous listeners before adding new ones
    if (adminGamesAbort) adminGamesAbort.abort();
    if (adminOrdersAbort) adminOrdersAbort.abort();
    if (adminUsersAbort) adminUsersAbort.abort();
    adminGamesAbort = new AbortController();
    adminOrdersAbort = new AbortController();
    adminUsersAbort = new AbortController();

    loadAdminGames();
    loadAdminOrders();
    loadAdminUsers();

    const btnCreateGame = document.getElementById('btn-create-game');
    if (btnCreateGame) {
        btnCreateGame.addEventListener('click', () => showGameForm(null));
    }
}

// ==========================================
// 14A. CRUD VIDEOJUEGOS
// ==========================================
let allAdminGames = []; // For search filtering

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

        allAdminGames = games;
        renderAdminGamesTable(games);

        // CRUD IMPROVEMENT: Admin games search
        const searchInput = document.getElementById('admin-games-search-input');
        if (searchInput) {
            searchInput.oninput = () => {
                const term = searchInput.value.toLowerCase();
                const filtered = allAdminGames.filter(g =>
                    (g.nombre || '').toLowerCase().includes(term) ||
                    (g.plataforma || '').toLowerCase().includes(term) ||
                    (g.genero || '').toLowerCase().includes(term)
                );
                renderAdminGamesTable(filtered);
            };
        }

    } catch (err) {
        console.error('Error al cargar videojuegos admin:', err);
        listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'Error al cargar videojuegos' : 'Error loading games'}</p>`;
    }
}

function renderAdminGamesTable(games) {
    let listContainer = document.getElementById('admin-games-list');
    if (!listContainer) return;
    // Bug #2: Clone container to remove old event listeners
    const newContainer = listContainer.cloneNode(false);
    listContainer.parentNode.replaceChild(newContainer, listContainer);
    listContainer = newContainer;
    const lang = langSelect ? langSelect.value : 'es';

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
                        <td>${escapeHtml(g.nombre || '')}</td>
                        <td>$${formatPrice(g.precio || 0)}</td>
                        <td>${escapeHtml(g.plataforma || '')}</td>
                        <td>${escapeHtml(g.genero || '')}</td>
                        <td class="admin-actions-cell">
                            <button class="btn-admin-edit" data-game-id="${g.id}" title="${lang === 'es' ? 'Editar' : 'Edit'}">✏️</button>
                            <button class="btn-admin-delete" data-game-id="${g.id}" data-game-name="${escapeHtml(g.nombre || '')}" title="${lang === 'es' ? 'Eliminar' : 'Delete'}">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // FIXED Bug 5: Use AbortController signal for delegation
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('btn-admin-edit')) {
            const gameId = btn.dataset.gameId;
            const game = allAdminGames.find(g => g.id == gameId);
            if (game) showGameForm(game);
        }

        if (btn.classList.contains('btn-admin-delete')) {
            const gameId = btn.dataset.gameId;
            const gameName = btn.dataset.gameName;
            const lang2 = langSelect ? langSelect.value : 'es';
            // CRUD IMPROVEMENT: Use custom confirm dialog
            const confirmed = await showConfirm(
                lang2 === 'es' ? '¿Eliminar videojuego?' : 'Delete game?',
                lang2 === 'es' ? `¿Eliminar "${gameName}"? Esta acción no se puede deshacer.` : `Delete "${gameName}"? This action cannot be undone.`
            );
            if (confirmed) {
                deleteGame(gameId);
            }
        }
    }, { signal: adminGamesAbort?.signal });
}

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
                        <input type="text" id="game-nombre" value="${isEdit ? escapeHtml(game.nombre || '') : ''}" required />
                    </article>
                    <article class="admin-form-field">
                        <label for="game-precio">${lang === 'es' ? 'Precio (COP)' : 'Price (COP)'} *</label>
                        <input type="number" id="game-precio" value="${isEdit ? (game.precio || '') : ''}" min="0" required />
                    </article>
                    <article class="admin-form-field">
                        <label for="game-imagen">${lang === 'es' ? 'URL de Imagen' : 'Image URL'}</label>
                        <input type="url" id="game-imagen" value="${isEdit ? escapeHtml(game.imagen_url || '') : ''}" placeholder="https://..." />
                    </article>
                    <article class="admin-form-field">
                        <label for="game-plataforma">${lang === 'es' ? 'Plataforma' : 'Platform'}</label>
                        <input type="text" id="game-plataforma" value="${isEdit ? escapeHtml(game.plataforma || '') : ''}" placeholder="PC, PlayStation, Xbox..." />
                    </article>
                    <article class="admin-form-field">
                        <label for="game-genero">${lang === 'es' ? 'Género' : 'Genre'}</label>
                        <input type="text" id="game-genero" value="${isEdit ? escapeHtml(game.genero || '') : ''}" placeholder="Acción, RPG, Aventura..." />
                    </article>
                    <article class="admin-form-field">
                        <label for="game-rating">Rating</label>
                        <input type="number" id="game-rating" value="${isEdit ? (game.rating || '') : ''}" min="0" max="5" step="0.1" placeholder="0-5" />
                    </article>
                </article>
                <article class="admin-form-field full-width">
                    <label for="game-descripcion">${lang === 'es' ? 'Descripción' : 'Description'}</label>
                    <textarea id="game-descripcion" rows="3" placeholder="${lang === 'es' ? 'Descripción del videojuego...' : 'Game description...'}">${isEdit ? escapeHtml(game.descripcion || '') : ''}</textarea>
                </article>
                <footer class="admin-form-actions">
                    <button type="submit" class="btn-success">${lang === 'es' ? '💾 Guardar' : '💾 Save'}</button>
                    <button type="button" class="btn-danger" id="btn-cancel-game-form2">${lang === 'es' ? 'Cancelar' : 'Cancel'}</button>
                </footer>
            </form>
        </article>
    `;

    document.getElementById('btn-cancel-game-form')?.addEventListener('click', () => { formArea.innerHTML = ''; });
    document.getElementById('btn-cancel-game-form2')?.addEventListener('click', () => { formArea.innerHTML = ''; });

    document.getElementById('admin-game-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombreInput = document.getElementById('game-nombre');
        const precioInput = document.getElementById('game-precio');

        // CRUD IMPROVEMENT: Validation feedback
        let valid = true;
        document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
        document.querySelectorAll('.field-error-msg').forEach(el => el.remove());

        if (!nombreInput.value.trim()) {
            nombreInput.classList.add('field-error');
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.textContent = lang === 'es' ? 'El nombre es obligatorio' : 'Name is required';
            nombreInput.parentNode.appendChild(msg);
            valid = false;
        }

        if (!precioInput.value || parseInt(precioInput.value) < 0) {
            precioInput.classList.add('field-error');
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.textContent = lang === 'es' ? 'Precio inválido' : 'Invalid price';
            precioInput.parentNode.appendChild(msg);
            valid = false;
        }

        if (!valid) return;

        const gameData = {
            nombre: nombreInput.value.trim(),
            precio: parseInt(precioInput.value) || 0,
            imagen_url: document.getElementById('game-imagen').value.trim(),
            plataforma: document.getElementById('game-plataforma').value.trim(),
            genero: document.getElementById('game-genero').value.trim(),
            descripcion: document.getElementById('game-descripcion').value.trim(),
            rating: parseFloat(document.getElementById('game-rating').value) || 0
        };

        try {
            if (isEdit) {
                const { error } = await _supabase
                    .from('videojuegos')
                    .update(gameData)
                    .eq('id', game.id);

                if (error) throw error;
                showToast(lang === 'es' ? '✅ Videojuego actualizado' : '✅ Game updated', 'success');
            } else {
                const { error } = await _supabase
                    .from('videojuegos')
                    .insert([gameData]);

                if (error) throw error;
                showToast(lang === 'es' ? '✅ Videojuego creado' : '✅ Game created', 'success');
            }

            formArea.innerHTML = '';
            loadAdminGames();
        } catch (err) {
            console.error('Error al guardar videojuego:', err);
            showToast((lang === 'es' ? 'Error: ' : 'Error: ') + err.message, 'error');
        }
    });

    formArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteGame(gameId) {
    const lang = langSelect ? langSelect.value : 'es';
    try {
        const { error } = await _supabase
            .from('videojuegos')
            .delete()
            .eq('id', gameId);

        if (error) throw error;
        showToast(lang === 'es' ? '✅ Videojuego eliminado' : '✅ Game deleted', 'success');
        loadAdminGames();
    } catch (err) {
        console.error('Error al eliminar videojuego:', err);
        showToast((lang === 'es' ? 'Error al eliminar: ' : 'Error deleting: ') + err.message, 'error');
    }
}

// ==========================================
// 14B. GESTIONAR PEDIDOS (Admin)
// CRUD IMPROVEMENT: View order details + search
// ==========================================
let allAdminOrders = [];

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
                detalle_pedidos (
                    rawg_id,
                    titulo,
                    imagen,
                    precio,
                    plataforma,
                    cantidad
                ),
                perfiles ( nombre_completo )
            `)
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        if (!pedidos || pedidos.length === 0) {
            listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'No hay pedidos' : 'No orders'}</p>`;
            return;
        }

        allAdminOrders = pedidos;

        const statusOptions = ['pending', 'processing', 'completed', 'cancelled'];
        const statusLabels = {
            pending: lang === 'es' ? 'Pendiente' : 'Pending',
            processing: lang === 'es' ? 'En Proceso' : 'Processing',
            completed: lang === 'es' ? 'Completado' : 'Completed',
            cancelled: lang === 'es' ? 'Cancelado' : 'Cancelled'
        };

        renderAdminOrdersTable(pedidos, statusOptions, statusLabels, lang);

        // CRUD IMPROVEMENT: Search orders
        const searchInput = document.getElementById('admin-orders-search-input');
        if (searchInput) {
            searchInput.oninput = () => {
                const term = searchInput.value.toLowerCase();
                const filtered = allAdminOrders.filter(p => {
                    const customerName = p.perfiles?.nombre_completo || '';
                    return p.id.toString().toLowerCase().includes(term) ||
                           customerName.toLowerCase().includes(term) ||
                           p.estado.toLowerCase().includes(term);
                });
                renderAdminOrdersTable(filtered, statusOptions, statusLabels, lang);
            };
        }

    } catch (err) {
        console.error('Error al cargar pedidos admin:', err);
        listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'Error al cargar pedidos' : 'Error loading orders'}</p>`;
    }
}

function renderAdminOrdersTable(pedidos, statusOptions, statusLabels, lang) {
    let listContainer = document.getElementById('admin-orders-list');
    if (!listContainer) return;
    // Bug #2: Clone container to remove old event listeners
    const newContainer = listContainer.cloneNode(false);
    listContainer.parentNode.replaceChild(newContainer, listContainer);
    listContainer = newContainer;

    listContainer.innerHTML = `
        <table class="admin-table admin-table-scroll">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>${lang === 'es' ? 'Cliente' : 'Customer'}</th>
                    <th>${lang === 'es' ? 'Fecha' : 'Date'}</th>
                    <th>${lang === 'es' ? 'Total' : 'Total'}</th>
                    <th>${lang === 'es' ? 'Estado' : 'Status'}</th>
                    <th>${lang === 'es' ? 'Acciones' : 'Actions'}</th>
                </tr>
            </thead>
            <tbody>
                ${pedidos.map(p => {
                    const customerName = p.perfiles?.nombre_completo || 'N/A';
                    return `
                        <tr>
                            <td>#${p.id.toString().slice(0, 8).toUpperCase()}</td>
                            <td>${escapeHtml(customerName)}</td>
                            <td>${new Date(p.fecha_creacion).toLocaleDateString()}</td>
                            <td>$${formatPrice(p.total)}</td>
                            <td>
                                <select class="admin-status-select" data-order-id="${p.id}">
                                    ${statusOptions.map(s =>
                                        `<option value="${s}" ${p.estado === s ? 'selected' : ''}>${statusLabels[s]}</option>`
                                    ).join('')}
                                </select>
                            </td>
                            <td>
                                <button class="btn-view-details" data-order-id="${p.id}" title="${lang === 'es' ? 'Ver detalles' : 'View details'}">👁️</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    // FIXED Bug 5: Use AbortController signal
    listContainer.addEventListener('change', async (e) => {
        if (e.target.classList.contains('admin-status-select')) {
            const orderId = e.target.dataset.orderId;
            const newStatus = e.target.value;
            await updateOrderStatus(orderId, newStatus);
        }
    }, { signal: adminOrdersAbort?.signal });

    // CRUD IMPROVEMENT: View order details
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-view-details');
        if (!btn) return;
        const orderId = btn.dataset.orderId;
        const order = allAdminOrders.find(p => p.id === orderId);
        if (order) {
            showOrderDetails(order, lang);
        }
    }, { signal: adminOrdersAbort?.signal });
}

// CRUD IMPROVEMENT: Show order details modal
function showOrderDetails(order, lang) {
    const items = order.detalle_pedidos || [];
    // Remove any existing detail popup
    const existingDetail = document.getElementById('order-detail-popup');
    if (existingDetail) existingDetail.remove();
    const existingOverlay = document.getElementById('order-detail-popup-overlay');
    if (existingOverlay) existingOverlay.remove();

    // BUG 11 fix: Create proper background overlay
    const overlay = document.createElement('aside');
    overlay.id = 'order-detail-popup-overlay';
    overlay.className = 'order-detail-popup-overlay';

    const detailArticle = document.createElement('article');
    detailArticle.id = 'order-detail-popup';
    detailArticle.className = 'order-detail-modal';
    detailArticle.innerHTML = `
        <button class="btn-close-top" id="close-order-detail">×</button>
        <h3>${lang === 'es' ? 'Pedido' : 'Order'} #${order.id.toString().slice(0, 8).toUpperCase()}</h3>
        <p>${lang === 'es' ? 'Estado' : 'Status'}: <span class="order-status ${order.estado}">${order.estado}</span></p>
        <p>${lang === 'es' ? 'Fecha' : 'Date'}: ${new Date(order.fecha_creacion).toLocaleDateString()}</p>
        <hr style="border-color:var(--border-subtle);margin:10px 0;">
        ${items.map(item => `
            <article class="order-detail-item">
                <output>${escapeHtml(item.titulo)} x${item.cantidad}</output>
                <output>$${formatPrice(item.precio * item.cantidad)}</output>
            </article>
        `).join('')}
        <footer class="order-detail-total">
            <output>${lang === 'es' ? 'Total' : 'Total'}</output>
            <output style="color:var(--accent-cyan-hover);">$${formatPrice(order.total)} COP</output>
        </footer>
    `;

    overlay.appendChild(detailArticle);
    document.body.appendChild(overlay);

    // Close handlers
    const closeBtn = detailArticle.querySelector('#close-order-detail');
    if (closeBtn) closeBtn.addEventListener('click', () => { overlay.remove(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

async function updateOrderStatus(orderId, newStatus) {
    const lang = langSelect ? langSelect.value : 'es';
    try {
        const { error } = await _supabase
            .from('pedidos')
            .update({ estado: newStatus })
            .eq('id', orderId);

        if (error) throw error;
        console.log(`Pedido ${orderId} actualizado a: ${newStatus}`);
        showToast(lang === 'es' ? 'Estado actualizado' : 'Status updated', 'success');

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
        showToast((lang === 'es' ? 'Error al actualizar estado: ' : 'Error updating status: ') + err.message, 'error');
    }
}

// ==========================================
// 14C. GESTIONAR USUARIOS (Admin)
// CRUD IMPROVEMENT: Search + responsive
// ==========================================
let allAdminUsers = [];

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

        allAdminUsers = users;

        const userCount = users.length;
        const adminCount = users.filter(u => u.rol === 'admin').length;
        const clientCount = users.filter(u => u.rol === 'cliente').length;

        renderAdminUsersTable(users, userCount, adminCount, clientCount, lang);

        // CRUD IMPROVEMENT: Search users
        const searchInput = document.getElementById('admin-users-search-input');
        if (searchInput) {
            searchInput.oninput = () => {
                const term = searchInput.value.toLowerCase();
                const filtered = allAdminUsers.filter(u =>
                    (u.nombre_completo || '').toLowerCase().includes(term) ||
                    (u.email || '').toLowerCase().includes(term) ||
                    (u.rol || '').toLowerCase().includes(term)
                );
                renderAdminUsersTable(filtered, filtered.length, filtered.filter(u => u.rol === 'admin').length, filtered.filter(u => u.rol === 'cliente').length, lang);
            };
        }

    } catch (err) {
        console.error('Error al cargar usuarios admin:', err);
        listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'Error al cargar usuarios' : 'Error loading users'}</p>`;
    }
}

function renderAdminUsersTable(users, userCount, adminCount, clientCount, lang) {
    let listContainer = document.getElementById('admin-users-list');
    if (!listContainer) return;
    // Bug #2: Clone container to remove old event listeners
    const newContainer = listContainer.cloneNode(false);
    listContainer.parentNode.replaceChild(newContainer, listContainer);
    listContainer = newContainer;

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
                        <td>${escapeHtml(u.nombre_completo || 'N/A')}</td>
                        <td>${escapeHtml(u.email || 'N/A')}</td>
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

    // FIXED Bug 5: Use AbortController signal
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-toggle-role');
        if (!btn) return;

        const userId = btn.dataset.userId;
        const currentRole = btn.dataset.currentRole;
        const newRole = currentRole === 'admin' ? 'cliente' : 'admin';
        const lang2 = langSelect ? langSelect.value : 'es';
        // CRUD IMPROVEMENT: Use custom confirm
        const confirmed = await showConfirm(
            lang2 === 'es' ? '¿Cambiar rol?' : 'Change role?',
            lang2 === 'es' ? `¿Cambiar rol a "${newRole}"?` : `Change role to "${newRole}"?`
        );
        if (confirmed) {
            await updateUserRole(userId, newRole);
        }
    }, { signal: adminUsersAbort?.signal });
}

async function updateUserRole(userId, newRole) {
    const lang = langSelect ? langSelect.value : 'es';
    try {
        const { error } = await _supabase
            .from('perfiles')
            .update({ rol: newRole })
            .eq('id', userId);

        if (error) throw error;
        showToast(lang === 'es' ? `✅ Rol cambiado a ${newRole}` : `✅ Role changed to ${newRole}`, 'success');
        loadAdminUsers();
    } catch (err) {
        console.error('Error al cambiar rol de usuario:', err);
        showToast((lang === 'es' ? 'Error al cambiar rol: ' : 'Error changing role: ') + err.message, 'error');
    }
}

// ==========================================
// 14D. CRUD SECTION (Dedicated CRUD view)
// ==========================================
function loadCrud() {
    const container = document.getElementById('crud-content');
    if (!container) return;

    const lang = langSelect ? langSelect.value : 'es';

    container.innerHTML = `
        <nav class="crud-tabs">
            <button class="crud-tab active" data-crud-tab="games">${lang === 'es' ? 'Videojuegos' : 'Video Games'}</button>
            <button class="crud-tab" data-crud-tab="orders">${lang === 'es' ? 'Pedidos' : 'Orders'}</button>
            <button class="crud-tab" data-crud-tab="users">${lang === 'es' ? 'Usuarios' : 'Users'}</button>
        </nav>
        <section id="crud-games-tab" class="crud-tab-content" style="display:block">
            <header class="admin-header">
                <h3>${lang === 'es' ? 'Gestión de Videojuegos' : 'Video Game Management'}</h3>
                <button class="btn-success btn-sm" id="crud-btn-create-game">${lang === 'es' ? '+ Crear Videojuego' : '+ Create Game'}</button>
            </header>
            <article id="crud-games-form-area"></article>
            <article class="admin-search-bar">
                <input type="text" id="crud-games-search-input" placeholder="${lang === 'es' ? 'Buscar juego...' : 'Search game...'}" />
            </article>
            <article id="crud-games-list">
                <p class="empty-msg">${lang === 'es' ? 'Cargando...' : 'Loading...'}</p>
            </article>
        </section>
        <section id="crud-orders-tab" class="crud-tab-content" style="display:none">
            <header class="admin-header">
                <h3>${lang === 'es' ? 'Gestión de Pedidos' : 'Order Management'}</h3>
                <article class="admin-search-bar">
                    <input type="text" id="crud-orders-search-input" placeholder="${lang === 'es' ? 'Buscar pedido...' : 'Search order...'}" />
                </article>
            </header>
            <article id="crud-orders-list">
                <p class="empty-msg">${lang === 'es' ? 'Cargando pedidos...' : 'Loading orders...'}</p>
            </article>
        </section>
        <section id="crud-users-tab" class="crud-tab-content" style="display:none">
            <header class="admin-header">
                <h3>${lang === 'es' ? 'Gestión de Usuarios' : 'User Management'}</h3>
                <article class="admin-search-bar">
                    <input type="text" id="crud-users-search-input" placeholder="${lang === 'es' ? 'Buscar usuario...' : 'Search user...'}" />
                </article>
            </header>
            <article id="crud-users-list">
                <p class="empty-msg">${lang === 'es' ? 'Cargando usuarios...' : 'Loading users...'}</p>
            </article>
        </section>
    `;

    // Tab navigation
    container.querySelectorAll('.crud-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.crud-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.crudTab;
            container.querySelectorAll('.crud-tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(`crud-${tabName}-tab`).style.display = 'block';
        });
    });

    // Abort previous listeners
    if (adminGamesAbort) adminGamesAbort.abort();
    if (adminOrdersAbort) adminOrdersAbort.abort();
    if (adminUsersAbort) adminUsersAbort.abort();
    adminGamesAbort = new AbortController();
    adminOrdersAbort = new AbortController();
    adminUsersAbort = new AbortController();

    // Reuse existing admin CRUD functions but render into CRUD containers
    loadCrudGames();
    loadCrudOrders();
    loadCrudUsers();

    const btnCreateGame = document.getElementById('crud-btn-create-game');
    if (btnCreateGame) {
        btnCreateGame.addEventListener('click', () => showCrudGameForm(null));
    }
}

// CRUD Games - reuses admin logic but renders into CRUD containers
let crudAdminGames = [];

async function loadCrudGames() {
    const listContainer = document.getElementById('crud-games-list');
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

        crudAdminGames = games;
        renderCrudGamesTable(games);

        const searchInput = document.getElementById('crud-games-search-input');
        if (searchInput) {
            searchInput.oninput = () => {
                const term = searchInput.value.toLowerCase();
                const filtered = crudAdminGames.filter(g =>
                    (g.nombre || '').toLowerCase().includes(term) ||
                    (g.plataforma || '').toLowerCase().includes(term) ||
                    (g.genero || '').toLowerCase().includes(term)
                );
                renderCrudGamesTable(filtered);
            };
        }
    } catch (err) {
        console.error('Error al cargar videojuegos CRUD:', err);
        listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'Error al cargar videojuegos' : 'Error loading games'}</p>`;
    }
}

function renderCrudGamesTable(games) {
    let listContainer = document.getElementById('crud-games-list');
    if (!listContainer) return;
    // Bug #2: Clone container to remove old event listeners
    const newContainer = listContainer.cloneNode(false);
    listContainer.parentNode.replaceChild(newContainer, listContainer);
    listContainer = newContainer;
    const lang = langSelect ? langSelect.value : 'es';

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
                        <td>${escapeHtml(g.nombre || '')}</td>
                        <td>$${formatPrice(g.precio || 0)}</td>
                        <td>${escapeHtml(g.plataforma || '')}</td>
                        <td>${escapeHtml(g.genero || '')}</td>
                        <td class="admin-actions-cell">
                            <button class="btn-admin-edit" data-crud-game-id="${g.id}" title="${lang === 'es' ? 'Editar' : 'Edit'}">✏️</button>
                            <button class="btn-admin-delete" data-crud-game-id="${g.id}" data-crud-game-name="${escapeHtml(g.nombre || '')}" title="${lang === 'es' ? 'Eliminar' : 'Delete'}">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('btn-admin-edit')) {
            const gameId = btn.dataset.crudGameId;
            const game = crudAdminGames.find(g => g.id == gameId);
            if (game) showCrudGameForm(game);
        }

        if (btn.classList.contains('btn-admin-delete')) {
            const gameId = btn.dataset.crudGameId;
            const gameName = btn.dataset.crudGameName;
            const lang2 = langSelect ? langSelect.value : 'es';
            const confirmed = await showConfirm(
                lang2 === 'es' ? '¿Eliminar videojuego?' : 'Delete game?',
                lang2 === 'es' ? `¿Eliminar "${gameName}"? Esta acción no se puede deshacer.` : `Delete "${gameName}"? This action cannot be undone.`
            );
            if (confirmed) {
                await deleteCrudGame(gameId);
            }
        }
    }, { signal: adminGamesAbort?.signal });
}

function showCrudGameForm(game) {
    const formArea = document.getElementById('crud-games-form-area');
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
                <button class="btn-admin-cancel" id="crud-btn-cancel-game-form">✕</button>
            </header>
            <form id="crud-game-form" class="admin-form">
                <article class="admin-form-grid">
                    <article class="admin-form-field">
                        <label for="crud-game-nombre">${lang === 'es' ? 'Nombre' : 'Name'} *</label>
                        <input type="text" id="crud-game-nombre" value="${isEdit ? escapeHtml(game.nombre || '') : ''}" required />
                    </article>
                    <article class="admin-form-field">
                        <label for="crud-game-precio">${lang === 'es' ? 'Precio (COP)' : 'Price (COP)'} *</label>
                        <input type="number" id="crud-game-precio" value="${isEdit ? (game.precio || '') : ''}" min="0" required />
                    </article>
                    <article class="admin-form-field">
                        <label for="crud-game-imagen">${lang === 'es' ? 'URL de Imagen' : 'Image URL'}</label>
                        <input type="url" id="crud-game-imagen" value="${isEdit ? escapeHtml(game.imagen_url || '') : ''}" placeholder="https://..." />
                    </article>
                    <article class="admin-form-field">
                        <label for="crud-game-plataforma">${lang === 'es' ? 'Plataforma' : 'Platform'}</label>
                        <input type="text" id="crud-game-plataforma" value="${isEdit ? escapeHtml(game.plataforma || '') : ''}" placeholder="PC, PlayStation, Xbox..." />
                    </article>
                    <article class="admin-form-field">
                        <label for="crud-game-genero">${lang === 'es' ? 'Género' : 'Genre'}</label>
                        <input type="text" id="crud-game-genero" value="${isEdit ? escapeHtml(game.genero || '') : ''}" placeholder="Acción, RPG, Aventura..." />
                    </article>
                    <article class="admin-form-field">
                        <label for="crud-game-rating">Rating</label>
                        <input type="number" id="crud-game-rating" value="${isEdit ? (game.rating || '') : ''}" min="0" max="5" step="0.1" placeholder="0-5" />
                    </article>
                </article>
                <article class="admin-form-field full-width">
                    <label for="crud-game-descripcion">${lang === 'es' ? 'Descripción' : 'Description'}</label>
                    <textarea id="crud-game-descripcion" rows="3" placeholder="${lang === 'es' ? 'Descripción del videojuego...' : 'Game description...'}">${isEdit ? escapeHtml(game.descripcion || '') : ''}</textarea>
                </article>
                <footer class="admin-form-actions">
                    <button type="submit" class="btn-success">${lang === 'es' ? '💾 Guardar' : '💾 Save'}</button>
                    <button type="button" class="btn-danger" id="crud-btn-cancel-game-form2">${lang === 'es' ? 'Cancelar' : 'Cancel'}</button>
                </footer>
            </form>
        </article>
    `;

    document.getElementById('crud-btn-cancel-game-form')?.addEventListener('click', () => { formArea.innerHTML = ''; });
    document.getElementById('crud-btn-cancel-game-form2')?.addEventListener('click', () => { formArea.innerHTML = ''; });

    document.getElementById('crud-game-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreInput = document.getElementById('crud-game-nombre');
        const precioInput = document.getElementById('crud-game-precio');

        let valid = true;
        formArea.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
        formArea.querySelectorAll('.field-error-msg').forEach(el => el.remove());

        if (!nombreInput.value.trim()) {
            nombreInput.classList.add('field-error');
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.textContent = lang === 'es' ? 'El nombre es obligatorio' : 'Name is required';
            nombreInput.parentNode.appendChild(msg);
            valid = false;
        }

        if (!precioInput.value || parseInt(precioInput.value) < 0) {
            precioInput.classList.add('field-error');
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.textContent = lang === 'es' ? 'Precio inválido' : 'Invalid price';
            precioInput.parentNode.appendChild(msg);
            valid = false;
        }

        if (!valid) return;

        const gameData = {
            nombre: nombreInput.value.trim(),
            precio: parseInt(precioInput.value) || 0,
            imagen_url: document.getElementById('crud-game-imagen').value.trim(),
            plataforma: document.getElementById('crud-game-plataforma').value.trim(),
            genero: document.getElementById('crud-game-genero').value.trim(),
            descripcion: document.getElementById('crud-game-descripcion').value.trim(),
            rating: parseFloat(document.getElementById('crud-game-rating').value) || 0
        };

        try {
            if (isEdit) {
                const { error } = await _supabase.from('videojuegos').update(gameData).eq('id', game.id);
                if (error) throw error;
                showToast(lang === 'es' ? '✅ Videojuego actualizado' : '✅ Game updated', 'success');
            } else {
                const { error } = await _supabase.from('videojuegos').insert([gameData]);
                if (error) throw error;
                showToast(lang === 'es' ? '✅ Videojuego creado' : '✅ Game created', 'success');
            }
            formArea.innerHTML = '';
            loadCrudGames();
        } catch (err) {
            console.error('Error al guardar videojuego CRUD:', err);
            showToast('Error: ' + err.message, 'error');
        }
    });

    formArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteCrudGame(gameId) {
    const lang = langSelect ? langSelect.value : 'es';
    try {
        const { error } = await _supabase.from('videojuegos').delete().eq('id', gameId);
        if (error) throw error;
        showToast(lang === 'es' ? '✅ Videojuego eliminado' : '✅ Game deleted', 'success');
        loadCrudGames();
    } catch (err) {
        console.error('Error al eliminar videojuego CRUD:', err);
        showToast('Error: ' + err.message, 'error');
    }
}

// CRUD Orders - reuses admin logic
let crudAdminOrders = [];

async function loadCrudOrders() {
    const listContainer = document.getElementById('crud-orders-list');
    if (!listContainer) return;
    const lang = langSelect ? langSelect.value : 'es';

    try {
        const { data: pedidos, error } = await _supabase
            .from('pedidos')
            .select(`id, total, estado, fecha_creacion, detalle_pedidos (rawg_id, titulo, imagen, precio, plataforma, cantidad), perfiles (nombre_completo)`)
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;
        if (!pedidos || pedidos.length === 0) {
            listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'No hay pedidos' : 'No orders'}</p>`;
            return;
        }

        crudAdminOrders = pedidos;
        const statusOptions = ['pending', 'processing', 'completed', 'cancelled'];
        const statusLabels = { pending: lang === 'es' ? 'Pendiente' : 'Pending', processing: lang === 'es' ? 'En Proceso' : 'Processing', completed: lang === 'es' ? 'Completado' : 'Completed', cancelled: lang === 'es' ? 'Cancelado' : 'Cancelled' };
        renderCrudOrdersTable(pedidos, statusOptions, statusLabels, lang);

        const searchInput = document.getElementById('crud-orders-search-input');
        if (searchInput) {
            searchInput.oninput = () => {
                const term = searchInput.value.toLowerCase();
                const filtered = crudAdminOrders.filter(p => {
                    const customerName = p.perfiles?.nombre_completo || '';
                    return p.id.toString().toLowerCase().includes(term) || customerName.toLowerCase().includes(term) || p.estado.toLowerCase().includes(term);
                });
                renderCrudOrdersTable(filtered, statusOptions, statusLabels, lang);
            };
        }
    } catch (err) {
        console.error('Error al cargar pedidos CRUD:', err);
        listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'Error al cargar pedidos' : 'Error loading orders'}</p>`;
    }
}

function renderCrudOrdersTable(pedidos, statusOptions, statusLabels, lang) {
    let listContainer = document.getElementById('crud-orders-list');
    if (!listContainer) return;
    // Bug #2: Clone container to remove old event listeners
    const newContainer = listContainer.cloneNode(false);
    listContainer.parentNode.replaceChild(newContainer, listContainer);
    listContainer = newContainer;

    listContainer.innerHTML = `
        <table class="admin-table admin-table-scroll">
            <thead><tr><th>ID</th><th>${lang === 'es' ? 'Cliente' : 'Customer'}</th><th>${lang === 'es' ? 'Fecha' : 'Date'}</th><th>${lang === 'es' ? 'Total' : 'Total'}</th><th>${lang === 'es' ? 'Estado' : 'Status'}</th><th>${lang === 'es' ? 'Acciones' : 'Actions'}</th></tr></thead>
            <tbody>${pedidos.map(p => {
                const customerName = p.perfiles?.nombre_completo || 'N/A';
                return `<tr><td>#${p.id.toString().slice(0,8).toUpperCase()}</td><td>${escapeHtml(customerName)}</td><td>${new Date(p.fecha_creacion).toLocaleDateString()}</td><td>$${formatPrice(p.total)}</td><td><select class="admin-status-select" data-crud-order-id="${p.id}">${statusOptions.map(s => `<option value="${s}" ${p.estado === s ? 'selected' : ''}>${statusLabels[s]}</option>`).join('')}</select></td><td><button class="btn-view-details" data-crud-order-id="${p.id}" title="${lang === 'es' ? 'Ver detalles' : 'View details'}">👁️</button></td></tr>`;
            }).join('')}</tbody>
        </table>`;

    listContainer.addEventListener('change', async (e) => {
        if (e.target.classList.contains('admin-status-select') && e.target.dataset.crudOrderId) {
            await updateOrderStatus(e.target.dataset.crudOrderId, e.target.value);
        }
    }, { signal: adminOrdersAbort?.signal });

    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-view-details');
        if (!btn || !btn.dataset.crudOrderId) return;
        const order = crudAdminOrders.find(p => p.id === btn.dataset.crudOrderId);
        if (order) showOrderDetails(order, lang);
    }, { signal: adminOrdersAbort?.signal });
}

// CRUD Users - reuses admin logic
let crudAdminUsers = [];

async function loadCrudUsers() {
    const listContainer = document.getElementById('crud-users-list');
    if (!listContainer) return;
    const lang = langSelect ? langSelect.value : 'es';

    try {
        const { data: users, error } = await _supabase.from('perfiles').select('id, nombre_completo, email, rol').order('nombre_completo', { ascending: true });
        if (error) throw error;
        if (!users || users.length === 0) {
            listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'No hay usuarios' : 'No users'}</p>`;
            return;
        }
        crudAdminUsers = users;
        const userCount = users.length;
        const adminCount = users.filter(u => u.rol === 'admin').length;
        const clientCount = users.filter(u => u.rol === 'cliente').length;
        renderCrudUsersTable(users, userCount, adminCount, clientCount, lang);

        const searchInput = document.getElementById('crud-users-search-input');
        if (searchInput) {
            searchInput.oninput = () => {
                const term = searchInput.value.toLowerCase();
                const filtered = crudAdminUsers.filter(u => (u.nombre_completo || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term) || (u.rol || '').toLowerCase().includes(term));
                renderCrudUsersTable(filtered, filtered.length, filtered.filter(u => u.rol === 'admin').length, filtered.filter(u => u.rol === 'cliente').length, lang);
            };
        }
    } catch (err) {
        console.error('Error al cargar usuarios CRUD:', err);
        listContainer.innerHTML = `<p class="empty-msg">${lang === 'es' ? 'Error al cargar usuarios' : 'Error loading users'}</p>`;
    }
}

function renderCrudUsersTable(users, userCount, adminCount, clientCount, lang) {
    let listContainer = document.getElementById('crud-users-list');
    if (!listContainer) return;
    // Bug #2: Clone container to remove old event listeners
    const newContainer = listContainer.cloneNode(false);
    listContainer.parentNode.replaceChild(newContainer, listContainer);
    listContainer = newContainer;

    listContainer.innerHTML = `
        <section class="admin-users-stats">
            <article class="stat-card"><p class="stat-number">${userCount}</p><p class="stat-label">${lang === 'es' ? 'Total Usuarios' : 'Total Users'}</p></article>
            <article class="stat-card"><p class="stat-number">${adminCount}</p><p class="stat-label">${lang === 'es' ? 'Admins' : 'Admins'}</p></article>
            <article class="stat-card"><p class="stat-number">${clientCount}</p><p class="stat-label">${lang === 'es' ? 'Clientes' : 'Clients'}</p></article>
        </section>
        <table class="admin-table admin-table-scroll">
            <thead><tr><th>${lang === 'es' ? 'Nombre' : 'Name'}</th><th>${lang === 'es' ? 'Correo' : 'Email'}</th><th>${lang === 'es' ? 'Rol' : 'Role'}</th><th>${lang === 'es' ? 'Acciones' : 'Actions'}</th></tr></thead>
            <tbody>${users.map(u => `<tr><td>${escapeHtml(u.nombre_completo || 'N/A')}</td><td>${escapeHtml(u.email || 'N/A')}</td><td><span class="role-badge role-${u.rol || 'cliente'}">${u.rol || 'cliente'}</span></td><td class="admin-actions-cell"><button class="btn-toggle-role" data-crud-user-id="${u.id}" data-current-role="${u.rol || 'cliente'}" title="${lang === 'es' ? 'Cambiar rol' : 'Toggle role'}">${u.rol === 'admin' ? '👤→cliente' : '👑→admin'}</button></td></tr>`).join('')}</tbody>
        </table>`;

    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-toggle-role');
        if (!btn) return;
        const userId = btn.dataset.crudUserId;
        const currentRole = btn.dataset.currentRole;
        const newRole = currentRole === 'admin' ? 'cliente' : 'admin';
        const lang2 = langSelect ? langSelect.value : 'es';
        const confirmed = await showConfirm(lang2 === 'es' ? '¿Cambiar rol?' : 'Change role?', lang2 === 'es' ? `¿Cambiar rol a "${newRole}"?` : `Change role to "${newRole}"?`);
        if (confirmed) {
            await updateUserRole(userId, newRole);
            loadCrudUsers();
        }
    }, { signal: adminUsersAbort?.signal });
}

// ==========================================
// 15. EVENT LISTENERS - CORREGIDOS
// FIXED Bug 4: Add ALL missing event listeners
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

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFiltersAndSort(true);
        });
    }

    if (genreFilter) genreFilter.addEventListener('change', () => applyFiltersAndSort());
    if (platformFilter) platformFilter.addEventListener('change', () => applyFiltersAndSort());
    if (sortFilter) sortFilter.addEventListener('change', () => applyFiltersAndSort());

    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            translatePageLocal(e.target.value);
        });
    }

    // === DELEGACIÓN DE EVENTOS EN CATÁLOGO ===
    if (catalogContainer) {
        catalogContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-add-cart-premium')) {
                e.stopPropagation();
                const card = e.target.closest('.game-card-premium');
                if (!card) return;

                const gameId = parseInt(card.dataset.id);
                const title = card.querySelector('h3').textContent;
                // FIXED Bug 7: Use getGamePrice() instead of parsing price text
                const priceNum = getGamePrice(gameId);
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

            const card = e.target.closest('.game-card-premium');
            if (card && card.dataset.id) {
                openGameDetail(parseInt(card.dataset.id));
            }
        });
    }

    // === DELEGACIÓN DE EVENTOS EN CARRITO ===
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

    // FIXED Bug 4: Cart button handler
    const btnOpenCart = document.getElementById('cart-btn');
    const btnCloseCart = document.getElementById('close-cart');
    const cartModalEl = document.getElementById('cart-modal');

    if (btnOpenCart) {
        btnOpenCart.addEventListener('click', () => {
            renderCartModal();
            if (cartModalEl) cartModalEl.showModal();
        });
    }
    if (btnCloseCart) {
        btnCloseCart.addEventListener('click', () => {
            if (cartModalEl) cartModalEl.close();
        });
    }
    // FIXED Bug 4: Cart modal backdrop click
    if (cartModalEl) {
        cartModalEl.addEventListener('click', (e) => {
            if (e.target === cartModalEl) cartModalEl.close();
        });
    }

    // FIXED Bug 4: Checkout button handler
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', showCheckout);
    }

    // FIXED Bug 4: Login button click handler
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            isLoginMode = true;
            resetAuthForm();
            if (authModal) authModal.showModal();
        });
    }

    // FIXED Bug 4: Close auth button handler
    if (closeAuth) {
        closeAuth.addEventListener('click', () => {
            if (authModal) authModal.close();
            // FIXED Bug 15: Reset auth form on close
            resetAuthForm();
        });
    }

    // FIXED Bug 4: Logout button click handler
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await _supabase.auth.signOut();
            checkUser();
            const lang = langSelect ? langSelect.value : 'es';
            showToast(lang === 'es' ? 'Sesión cerrada' : 'Logged out', 'info');
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
    const navCrud = document.getElementById('nav-crud');
    if (navCrud) navCrud.addEventListener('click', () => switchView('crud'));

    // FIXED Bug 4: Load more button handler
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreGames);

    // FIXED Bug 4: Hamburger menu toggle
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    }

    // FIXED Bug 4: Favorites view click delegation (add to cart / unfavorite)
    const favoritesList = document.getElementById('favorites-list');
    if (favoritesList) {
        favoritesList.addEventListener('click', (e) => {
            // Add to cart from favorites
            if (e.target.classList.contains('btn-add-cart-premium')) {
                e.stopPropagation();
                const card = e.target.closest('.game-card-premium');
                if (!card) return;
                const gameId = parseInt(card.dataset.id);
                const title = card.querySelector('h3').textContent;
                const priceNum = getGamePrice(gameId);
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
            // Unfavorite from favorites view
            if (e.target.classList.contains('btn-favorite')) {
                e.stopPropagation();
                const rawgId = parseInt(e.target.dataset.gameId);
                const name = e.target.dataset.gameName;
                const image = e.target.dataset.gameImage;
                toggleFavorite(rawgId, name, image);
                // Reload favorites view
                loadFavorites();
                return;
            }
        });
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
    const savedLang = localStorage.getItem('idiomaPreferido');
    if (savedLang && langSelect) {
        langSelect.value = savedLang;
        translatePageLocal(savedLang);
    }

    await checkUser();

    // Bug #9: Removed redundant applyFiltersAndSort() here - checkUser already calls it for logged-in users

    setupEventListeners();
    setupAuth();

    updateCartBadge();

    console.log('🎮 GameStore Web inicializada correctamente');
}

initApp();
