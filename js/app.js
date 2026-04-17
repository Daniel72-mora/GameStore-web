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
// 2. CÓDIGO DE FELIPE (API RAWG & Renderizado)
// ==========================================

const RAWG_KEY = '528ce5b0381f45098f72533abf93952c';
const BASE_URL = 'https://api.rawg.io/api/games';

const catalogContainer = document.getElementById('game-catalog');
const searchForm = document.querySelector('.search-bar-premium');
const searchInput = searchForm.querySelector('input');
const langSelect = document.getElementById('lang-select');

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

    if (games.length === 0) {
        catalogContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 3rem; font-size: 1.2rem; color: var(--accent-color);">${currentLang === 'es' ? 'No se encontraron videojuegos.' : 'No games found.'}</p>`;
        return;
    }

    games.forEach(game => {
        const randomPrice = (Math.floor(Math.random() * (250 - 90) + 90) * 1000).toLocaleString('es-CO');
        const btnText = currentLang === 'es' ? '+ Añadir' : '+ Add';

        const article = document.createElement('article');
        article.className = 'game-card-premium';
        article.tabIndex = 0;
        article.dataset.id = game.id; 

        article.innerHTML = `
            <figure class="card-media-premium">
                <img src="${game.background_image || 'https://via.placeholder.com/600x400'}" alt="${game.name}" loading="lazy">
                <aside class="card-overlay-aside">
                    <button class="btn-add-cart-premium">${btnText}</button>
                </aside>
            </figure>
            <section class="card-info-premium">
                <h3>${game.name}</h3>
                <p class="platforms">${game.platforms?.slice(0, 2).map(p => p.platform.name).join(' | ') || 'PC'}</p>
                <p class="price">$${randomPrice} <abbr title="Peso Colombiano">COP</abbr></p>
            </section>
        `;
        catalogContainer.appendChild(article);
    });
}

// ==========================================
// 3. SISTEMA DE INTERNACIONALIZACIÓN
// ==========================================

function translatePage(lang) {
    localStorage.setItem('idiomaPreferido', lang);
    const elements = document.querySelectorAll('[data-es]');
    elements.forEach(el => {
        const translation = (lang === 'en') ? el.getAttribute('data-en') : el.getAttribute('data-es');
        el.innerHTML = translation;
    });
    if (searchInput) {
        searchInput.placeholder = (lang === 'en') ? "Search your next game..." : "Buscar tu próximo juego...";
    }
    fetchRawgGames(searchInput.value);
}

function cargarIdiomaPrevio() {
    const idiomaGuardado = localStorage.getItem('idiomaPreferido');
    if (idiomaGuardado && langSelect) {
        langSelect.value = idiomaGuardado;
        translatePage(idiomaGuardado);
    } else {
        fetchRawgGames();
    }
}

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    fetchRawgGames(searchInput.value);
});

if (langSelect) {
    langSelect.addEventListener('change', (e) => translatePage(e.target.value));
}

document.addEventListener('DOMContentLoaded', () => {
    cargarIdiomaPrevio();
});

// ==========================================
// 4. LÓGICA DE ASTRID - SPRINT 1 (Full Screen Detail)
// ==========================================

const modal = document.getElementById('game-detail-modal');
const closeModal = document.getElementById('close-modal');
const closeBtnLower = document.getElementById('btn-cerrar-inferior');

async function openGameDetail(gameId) {
    try {
        const response = await fetch(`${BASE_URL}/${gameId}?key=${RAWG_KEY}`);
        const game = await response.json();

        // 1. Inyectar Textos
        document.getElementById('modal-title').innerText = game.name;
        document.getElementById('modal-description').innerHTML = game.description || "No description available.";
        
        // 2. Inyectar Multimedia
        const modalImg = document.getElementById('modal-img');
        if (modalImg) {
            modalImg.src = game.background_image_additional || game.background_image;
            modalImg.alt = game.name;
        }

        // 3. Info Adicional
        if(document.getElementById('modal-rating')) document.getElementById('modal-rating').innerText = game.rating;
        if(document.getElementById('modal-date')) document.getElementById('modal-date').innerText = game.released;

        // 4. Mostrar Modal y Resetear Scroll para vista Full Screen
        modal.showModal();
        
        // Asegura que si la tarjeta tiene scroll interno, empiece desde arriba
        const cardContainer = document.querySelector('.detail-full-card');
        if (cardContainer) cardContainer.scrollTop = 0;

    } catch (error) {
        console.error("Error al cargar el detalle Full Screen:", error);
    }
}

// Escuchar clics en el catálogo
if (catalogContainer) {
    catalogContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-add-cart-premium')) return;

        const card = e.target.closest('.game-card-premium');
        if (card && card.dataset.id) {
            openGameDetail(card.dataset.id);
        }
    });
}

// Controladores de cierre
const cerrarModal = () => modal.close();

if (closeModal) closeModal.onclick = cerrarModal;
if (closeBtnLower) closeBtnLower.onclick = cerrarModal;

modal?.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
});

// ==========================================
// 5. IMPLEMENTACIÓN US08 Y US09 (Filtros y Orden)
// ==========================================

// Referencias a los nuevos elementos del DOM
const genreFilter = document.getElementById('genre-filter');
const sortFilter = document.getElementById('sort-filter');

/**
 * Esta función extiende la funcionalidad de Felipe sin modificar su fetch original.
 * Redefinimos ligeramente la llamada para incluir los nuevos parámetros.
 */
async function applyFiltersAndSort() {
    const searchTerm = searchInput ? searchInput.value : '';
    const genre = genreFilter ? genreFilter.value : '';
    const sort = sortFilter ? sortFilter.value : '';

    try {
        // Construimos la URL con los parámetros adicionales para la API
        const genreParam = genre ? `&genres=${genre}` : '';
        const sortParam = sort ? `&ordering=${sort}` : '';
        const queryParam = searchTerm ? `&search=${searchTerm}` : '';
        
        const response = await fetch(`${BASE_URL}?key=${RAWG_KEY}&page_size=12${queryParam}${genreParam}${sortParam}`);
        
        if (!response.ok) throw new Error("Error en la API al filtrar");
        
        const data = await response.json();
        
        // Usamos la función de renderizado que ya existe en el código de Felipe
        renderStore(data.results);
        
    } catch (error) {
        console.error("Error en US08/US09:", error);
    }
}

// Escuchadores de eventos para los filtros
if (genreFilter) {
    genreFilter.addEventListener('change', applyFiltersAndSort);
}

if (sortFilter) {
    sortFilter.addEventListener('change', applyFiltersAndSort);
}

/**
 * Ajuste para que la búsqueda también respete los filtros activos
 * Reasignamos el evento submit del formulario original
 */
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        applyFiltersAndSort();
    });
}

// ==========================================
// 6. LÓGICA DE FORMULARIO DE AUTENTICACIÓN
// ==========================================
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const btnLoginHeader = document.getElementById('login-btn');
const closeAuth = document.getElementById('close-auth');

// Abrir el formulario al dar clic en "Entrar"
btnLoginHeader?.addEventListener('click', () => authModal.showModal());

// Cerrar modal
closeAuth?.addEventListener('click', () => authModal.close());

// Manejar el envío del formulario (Login / Registro)
authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const isRegister = document.getElementById('auth-title').innerText.includes("REGISTRO");

    try {
        if (isRegister) {
            // US01: Registro
            const { error } = await _supabase.auth.signUp({ email, password });
            if (error) throw error;
            alert("Registro exitoso. Revisa tu correo.");
        } else {
            // US02: Inicio de sesión
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            alert("¡Bienvenido!");
        }
        authModal.close();
        checkUser(); // Función que ya definimos para actualizar botones
    } catch (err) {
        alert("Error: " + err.message);
    }
});

// Cambiar entre Login y Registro dentro del modal
document.getElementById('link-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit');
    
    if (title.innerText.includes("INICIAR")) {
        title.innerText = "REGISTRO DE USUARIO";
        submitBtn.innerText = "Crear Cuenta";
        e.target.innerText = "¿Ya tienes cuenta? Inicia sesión";
    } else {
        title.innerText = "INICIAR SESIÓN";
        submitBtn.innerText = "Entrar";
        e.target.innerText = "¿No tienes cuenta? Regístrate";
    }
});
/**
 * US03: Cerrar Sesión
 */
async function cerrarSesion() {
    const { error } = await _supabase.auth.signOut();
    if (error) console.error("Error al salir:", error.message);
    else {
        alert("Sesión cerrada.");
        checkUser();
    }
}

/**
 * Función para verificar el estado del usuario y cambiar botones
 */
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'block';
        console.log("Usuario activo:", user.email);
    } else {
        if (btnLogin) btnLogin.style.display = 'block';
        if (btnLogout) btnLogout.style.display = 'none';
    }
}

// Eventos
btnLogin?.addEventListener('click', iniciarSesion);
btnLogout?.addEventListener('click', cerrarSesion);

// Revisar si hay usuario al cargar la página
document.addEventListener('DOMContentLoaded', checkUser);

/**
 * US04: Recuperar contraseña
 */
async function recuperarPassword() {
    const email = prompt("Introduce tu email para enviarte un enlace de recuperación:");
    if (email) {
        const { error } = await _supabase.auth.resetPasswordForEmail(email);
        if (error) alert("Error: " + error.message);
        else alert("Se ha enviado un correo para restablecer tu contraseña.");
    }
}