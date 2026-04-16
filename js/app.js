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

/**
 * FETCH INICIAL Y BÚSQUEDA
 */
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

/**
 * FUNCIÓN DE INYECCIÓN DINÁMICA
 */
function renderStore(games) {
    if (!catalogContainer) return;
    catalogContainer.innerHTML = ''; 
    const currentLang = langSelect ? langSelect.value : 'es';

    // Manejo de búsqueda sin resultados
    if (games.length === 0) {
        catalogContainer.innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; padding: 3rem; font-size: 1.2rem; color: var(--accent-color);">
                ${currentLang === 'es' ? 'No se encontraron videojuegos con ese nombre.' : 'No video games found with that name.'}
            </p>`;
        return;
    }

    games.forEach(game => {
        const randomPrice = (Math.floor(Math.random() * (250 - 90) + 90) * 1000).toLocaleString('es-CO');
        const btnText = currentLang === 'es' ? '+ Añadir' : '+ Add';

        const article = document.createElement('article');
        article.className = 'game-card-premium';
        article.tabIndex = 0;

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
// 3. SISTEMA DE INTERNACIONALIZACIÓN Y PERSISTENCIA
// ==========================================

/**
 * Traduce elementos estáticos y guarda preferencia en LocalStorage
 */
function translatePage(lang) {
    // Guardar preferencia para que no se borre al recargar (F5)
    localStorage.setItem('idiomaPreferido', lang);

    const elements = document.querySelectorAll('[data-es]');
    elements.forEach(el => {
        // Usamos innerHTML para mantener el diseño de <em> en el Hero
        const translation = (lang === 'en') ? el.getAttribute('data-en') : el.getAttribute('data-es');
        el.innerHTML = translation;
    });

    // Traducir placeholder
    if (searchInput) {
        searchInput.placeholder = (lang === 'en') ? "Search your next game..." : "Buscar tu próximo juego...";
    }
    
    // Refrescar catálogo para traducir los botones de las cartas
    fetchRawgGames(searchInput.value);
}

/**
 * Carga el idioma guardado al abrir la página
 */
function cargarIdiomaPrevio() {
    const idiomaGuardado = localStorage.getItem('idiomaPreferido');
    if (idiomaGuardado && langSelect) {
        langSelect.value = idiomaGuardado;
        translatePage(idiomaGuardado);
    } else {
        fetchRawgGames(); // Carga inicial si no hay idioma guardado
    }
}

// --- EVENTOS ---

// Búsqueda
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    fetchRawgGames(searchInput.value);
});

// Cambio de idioma
if (langSelect) {
    langSelect.addEventListener('change', (e) => {
        translatePage(e.target.value);
    });
}

// Inicio automático al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarIdiomaPrevio();
});