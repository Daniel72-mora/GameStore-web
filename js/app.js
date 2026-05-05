// ==========================================
// js/app.js - Lógica Principal de GameStore Web
// Corregido: Login requerido para carrito,
// botones +/-/eliminar funcionan en vivo
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

// ==========================================
// 2. ESTADO GLOBAL DE LA APP
// ==========================================
const AppState = {
    currentView: 'catalog',
    currentPage: 1,
    hasMore: true,
    isLoading: false,
    searchDebounceTimer: null,
    currentUser: null // Cache del usuario logueado
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

    games.forEach(game => {
        const price = getGamePrice(game.id);
        const formattedPrice = formatPrice(price);
        const btnText = currentLang === 'es' ? '+ Añadir' : '+ Add';

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

    games.forEach(game => {
        const price = getGamePrice(game.id);
        const formattedPrice = formatPrice(price);
        const btnText = currentLang === 'es' ? '+ Añadir' : '+ Add';

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
        const meta = user?.user_metadata || {};
        const role = meta.role || 'cliente';
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
// 11. PEDIDOS
// ==========================================
async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    if (!AppState.currentUser) {
        container.innerHTML = `<p class="empty-msg">${langSelect && langSelect.value === 'en' ? 'You must log in to see your orders.' : 'Debes iniciar sesión para ver tus pedidos.'}</p>`;
        return;
    }

    const orders = JSON.parse(localStorage.getItem('gamestore-orders')) || [];
    const userOrders = orders.filter(o => o.userId === AppState.currentUser.id);

    if (userOrders.length === 0) {
        container.innerHTML = `<p class="empty-msg">📦 ${langSelect && langSelect.value === 'en' ? "You don't have any orders yet" : 'No tienes pedidos todavía'}</p>`;
        return;
    }

    const lang = langSelect ? langSelect.value : 'es';
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
// 12. CHECKOUT / COMPRA
// ==========================================
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
                    <span>${item.titulo}</span>
                    <span>x${item.cantidad} — $${formatPrice(item.precio * item.cantidad)}</span>
                </li>
            `).join('')}
        </ul>
        <hr>
        <p class="checkout-total"><strong>${lang === 'es' ? 'Total' : 'Total'}: $${formatPrice(total)} COP</strong></p>
        <button id="confirm-purchase-btn" class="btn-success">${lang === 'es' ? 'Confirmar' : 'Confirm'}</button>
    `;

    document.getElementById('confirm-purchase-btn').addEventListener('click', () => confirmPurchase());
}

async function confirmPurchase() {
    const cart = getCart();
    const total = getCartTotal();

    if (!AppState.currentUser) {
        if (authModal) authModal.showModal();
        return;
    }

    const order = {
        id: 'ord_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        userId: AppState.currentUser.id,
        items: cart.map(item => ({ ...item })),
        total: total,
        status: 'completed',
        createdAt: new Date().toISOString()
    };

    const orders = JSON.parse(localStorage.getItem('gamestore-orders')) || [];
    orders.unshift(order);
    localStorage.setItem('gamestore-orders', JSON.stringify(orders));

    clearCart();

    const container = document.getElementById('checkout-content');
    const lang = langSelect ? langSelect.value : 'es';
    if (container) {
        container.innerHTML = `
            <div class="purchase-success">
                <p class="success-icon">✅</p>
                <h2 class="font-oswald">${lang === 'es' ? '¡Compra realizada con éxito!' : 'Purchase completed successfully!'}</h2>
                <p>Order #${order.id.slice(0, 8).toUpperCase()}</p>
                <p>${lang === 'es' ? 'Total' : 'Total'}: $${formatPrice(total)} COP</p>
                <button class="btn-success" onclick="switchView('catalog')">${lang === 'es' ? 'Volver al Catálogo' : 'Back to Catalog'}</button>
            </div>
        `;
    }
}

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
// 14. ADMIN
// ==========================================
function loadAdmin() {
    const container = document.getElementById('admin-content');
    if (!container) return;

    const orders = JSON.parse(localStorage.getItem('gamestore-orders')) || [];
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
            </div>
            <p class="empty-msg">${lang === 'es' ? 'Gestión de videojuegos desde Supabase Dashboard' : 'Game management from Supabase Dashboard'}</p>
        </section>
        <section id="admin-orders-tab" class="admin-tab-content" style="display:none">
            <h3>${lang === 'es' ? 'Pedidos' : 'Orders'}</h3>
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
        </section>
        <section id="admin-users-tab" class="admin-tab-content" style="display:none">
            <h3>${lang === 'es' ? 'Usuarios' : 'Users'}</h3>
            <p class="empty-msg">${lang === 'es' ? 'Gestión de usuarios en Supabase Dashboard' : 'User management in Supabase Dashboard'}</p>
        </section>
    `;

    container.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            container.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(`admin-${tabName}-tab`).style.display = 'block';
        });
    });
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
