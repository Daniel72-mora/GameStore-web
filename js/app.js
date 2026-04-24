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
                <p class="platforms">${game.platforms?.slice(0, 4).map(p => p.platform.name).join(' | ') || 'PC'}</p>
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
// 5. IMPLEMENTACIÓN US07, US08 Y US09 (Filtros y Orden)
// ==========================================

// Referencias a los elementos del DOM (Incluyendo el nuevo filtro de plataforma)
const genreFilter = document.getElementById('genre-filter');
const sortFilter = document.getElementById('sort-filter');
const platformFilter = document.getElementById('platform-filter'); // US07

/**
 * Función unificada para aplicar todos los criterios de búsqueda y filtrado.
 */
async function applyFiltersAndSort() {
    const searchTerm = searchInput ? searchInput.value : '';
    const genre = genreFilter ? genreFilter.value : '';
    const sort = sortFilter ? sortFilter.value : '';
    const platform = platformFilter ? platformFilter.value : ''; // Captura la plataforma

    try {
        // 1. Construcción de parámetros para la API de RAWG
        const genreParam = genre ? `&genres=${genre}` : '';
        const platformParam = platform ? `&platforms=${platform}` : '';
        const queryParam = searchTerm ? `&search=${searchTerm}` : '';
        
        // El ordenamiento nativo de la API (Popularidad, Novedades, Nombre)
        const sortParam = sort ? `&ordering=${sort}` : '';
        
        const url = `${BASE_URL}?key=${RAWG_KEY}&page_size=12${queryParam}${genreParam}${platformParam}${sortParam}`;
        
        const response = await fetch(url);
        
        if (!response.ok) throw new Error("Error en la API al filtrar");
        
        const data = await response.json();
        
        // 2. Lógica para US09: Ordenamiento por Precio (Simulado)
        // Como el precio no viene de la API, si el usuario elige "Precio", 
        // deberíamos ordenar los resultados aquí antes de renderizar.
        let gamesToRender = data.results;

        // Nota: Para ordenar por precio real, necesitarías asignar un precio 
        // fijo a cada juego en lugar de uno aleatorio en el renderStore.
        
        renderStore(gamesToRender);
        
    } catch (error) {
        console.error("Error en US07/08/09:", error);
    }
}

// Escuchadores de eventos para detectar cambios en los filtros
if (genreFilter) genreFilter.addEventListener('change', applyFiltersAndSort);
if (sortFilter) sortFilter.addEventListener('change', applyFiltersAndSort);
if (platformFilter) platformFilter.addEventListener('change', applyFiltersAndSort); // Listener US07

/**
 * Reasignamos el evento submit del formulario para que respete los filtros
 */
if (searchForm) {
    searchForm.removeEventListener('submit', fetchRawgGames); // Limpiamos evento anterior si existe
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        applyFiltersAndSort();
    });
}

// ==========================================
// 6. LÓGICA DE AUTENTICACIÓN Y RECUPERACIÓN (CORREGIDA)
// ==========================================
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const toggleAuthBtn = document.getElementById('toggle-auth-mode');
const nameField = document.getElementById('name-field-group');
const btnLogin = document.getElementById('login-btn');
const btnLogout = document.getElementById('logout-btn');
const closeAuth = document.getElementById('close-auth');

const recoveryLink = document.getElementById('link-recovery');
const submitBtn = document.getElementById('auth-submit-btn');
const recoveryBtn = document.getElementById('auth-recovery-btn');
const passField = document.getElementById('auth-password');
const labelPass = document.getElementById('label-pass');

let isLoginMode = true; 

// 1. Alternar entre Login y Registro
toggleAuthBtn?.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    const isEn = langSelect.value === 'en';

    submitBtn.style.display = 'block';
    recoveryBtn.style.display = 'none';
    passField.style.display = 'block';
    if(labelPass) labelPass.style.display = 'block';

    authTitle.innerText = isLoginMode ? (isEn ? "LOGIN" : "INICIAR SESIÓN") : (isEn ? "REGISTER" : "REGISTRARSE");
    submitBtn.innerText = isLoginMode ? (isEn ? "Sign In" : "Entrar") : (isEn ? "Sign Up" : "Registrarse");
    nameField.style.display = isLoginMode ? 'none' : 'block';
});

// 2. Modo Recuperación
recoveryLink?.addEventListener('click', (e) => {
    e.preventDefault();
    authTitle.innerText = "RECUPERAR POR CORREO";
    submitBtn.style.display = 'none';
    nameField.style.display = 'none';
    passField.style.display = 'none'; 
    if(labelPass) labelPass.style.display = 'none';
    
    recoveryBtn.style.display = 'block';
});

// 3. Enviar correo de recuperación (URL Fija para evitar el 'null')
recoveryBtn?.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    if (!email) return alert("Ingresa tu correo.");

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        // Usamos la URL exacta de tu Live Server en Bogotá
        redirectTo: 'http://127.0.0.1:5500/index.html', 
    });

    if (error) alert("Error: " + error.message);
    else alert("✅ Enlace enviado. Revisa tu bandeja de entrada y haz clic en el botón del correo.");
});

// 4. Capturar el regreso del usuario (Cuando hace clic en el correo)
_supabase.auth.onAuthStateChange(async (event, session) => {
    checkUser();
    if (event === "PASSWORD_RECOVERY") {
        const newPassword = prompt("Ingresa tu nueva contraseña (mínimo 6 caracteres):");
        if (newPassword && newPassword.length >= 6) {
            const { error } = await _supabase.auth.updateUser({ password: newPassword });
            if (error) alert("Error al actualizar: " + error.message);
            else {
                alert("✅ ¡Éxito! Contraseña actualizada. Ahora puedes iniciar sesión.");
                await _supabase.auth.signOut();
                location.reload();
            }
        }
    }
});

// 5. Lógica de Envío (Login / Registro)
authForm?.addEventListener('submit', async (e) => {
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
                alert("¡Cuenta creada! Revisa tu email para confirmar.");
            }
        } else {
            const { error: loginError } = await _supabase.auth.signInWithPassword({ email, password });
            if (loginError) throw loginError;
            alert("¡Bienvenido!");
        }
        authModal.close();
        checkUser(); 
    } catch (err) {
        alert("Error: " + err.message);
    }
});

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const catalogSection = document.getElementById('catalogo'); // Referencia a tu sección

    if (btnLogin) btnLogin.style.display = user ? 'none' : 'block';
    if (btnLogout) btnLogout.style.display = user ? 'block' : 'none';

    // LÓGICA PARA EL CATÁLOGO:
    if (catalogSection) {
        if (user) {
            catalogSection.style.display = 'block';
            // Cargamos los juegos una vez que el usuario está adentro
            applyFiltersAndSort(); 
        } else {
            catalogSection.style.display = 'none';
        }
    }
}

btnLogin?.addEventListener('click', () => { isLoginMode = true; authModal.showModal(); });
closeAuth?.addEventListener('click', () => authModal.close());
btnLogout?.addEventListener('click', async () => { await _supabase.auth.signOut(); checkUser(); alert("Sesión cerrada"); });

checkUser();