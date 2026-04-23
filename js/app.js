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
};

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
// 6. LÓGICA DE AUTENTICACIÓN (Sin Email)
// ==========================================
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const toggleAuthBtn = document.getElementById('toggle-auth-mode');
const nameField = document.getElementById('name-field-group');
const btnLogin = document.getElementById('login-btn');
const btnLogout = document.getElementById('logout-btn');
const closeAuth = document.getElementById('close-auth');

let isLoginMode = true; 

// Cambiar entre Login y Registro
toggleAuthBtn?.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    const isEn = langSelect.value === 'en';

    authTitle.innerText = isLoginMode 
        ? (isEn ? "LOGIN" : "INICIAR SESIÓN") 
        : (isEn ? "REGISTER" : "REGISTRARSE");
    
    document.getElementById('auth-submit-btn').innerText = isLoginMode 
        ? (isEn ? "Sign In" : "Entrar") 
        : (isEn ? "Sign Up" : "Registrarse");

    toggleAuthBtn.innerText = isLoginMode 
        ? (isEn ? "Don't have an account? Register" : "¿No tienes cuenta? Regístrate")
        : (isEn ? "Already have an account? Login" : "¿Ya tienes cuenta? Inicia sesión");

    nameField.style.display = isLoginMode ? 'none' : 'block';
    document.getElementById('auth-name').required = !isLoginMode;
});

// Enviar Formulario a Supabase
authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Capturamos el nombre de usuario (que antes era el email)
    const username = document.getElementById('auth-email').value.trim(); 
    const password = document.getElementById('auth-password').value;
    const fullName = document.getElementById('auth-name').value.trim();

    // Creamos un correo ficticio para que Supabase lo acepte internamente
    const cleanUsername = username.replace(/\s+/g, '').toLowerCase();
    const fakeEmail = `${cleanUsername}@gamestore.local`;
    try {
        if (!isLoginMode) {
            // US01: REGISTRO
            const { data, error: authError } = await _supabase.auth.signUp({ 
                email: fakeEmail, 
                password,
                options: { data: { full_name: fullName, user_nickname: username } }
            });

            if (authError) throw authError;

            if (data.user) {
                const { error: profileError } = await _supabase
                    .from('perfiles')
                    .insert([{ 
                        id: data.user.id, 
                        nombre_completo: fullName, 
                        rol: 'cliente',
                        email: fakeEmail // Guardamos el rastro del usuario
                    }]);
                
                if (profileError) throw profileError;
                alert("¡Cuenta creada con éxito!");
            }
        } else {
            // US02: INICIO DE SESIÓN
            const { error: loginError } = await _supabase.auth.signInWithPassword({ 
                email: fakeEmail, 
                password 
            });
            if (loginError) throw loginError;
            alert("¡Bienvenido de nuevo!");
        }

        authModal.close();
        checkUser(); 
    } catch (err) {
        alert("Error: " + err.message);
    }
});

// Controladores de apertura y cierre
btnLogin?.addEventListener('click', () => authModal.showModal());
closeAuth?.addEventListener('click', () => authModal.close());
authModal?.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.close();
});

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'block';
    } else {
        if (btnLogin) btnLogin.style.display = 'block';
        if (btnLogout) btnLogout.style.display = 'none';
    }
}

checkUser();

btnLogout?.addEventListener('click', async () => {
    await _supabase.auth.signOut();
    checkUser();
    alert("Sesión cerrada");
});