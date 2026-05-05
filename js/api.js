// ==========================================
// js/api.js - API Integration (RAWG + Exchange Rate)
// Misión: Felipe (API RAWG) + US35/US36/US37
// ==========================================

const RAWG_KEY = '528ce5b0381f45098f72533abf93952c';
const BASE_URL = 'https://api.rawg.io/api/games';

// Caché de precios determinísticos por ID de juego
const priceCache = {};

/**
 * Genera un precio determinístico en COP basado en el ID del juego
 * Garantiza que el mismo juego siempre tenga el mismo precio
 */
function getGamePrice(rawgId) {
    if (priceCache[rawgId]) return priceCache[rawgId];
    const base = ((rawgId * 7919) % 160) + 90; // 90,000 - 250,000 COP
    const price = base * 1000;
    priceCache[rawgId] = price;
    return price;
}

/**
 * Formatea un precio en COP con separadores de miles
 */
function formatPrice(price) {
    return price.toLocaleString('es-CO');
}

/**
 * Obtiene la tasa de cambio USD -> COP
 * US37: API de tasas de cambio
 */
async function fetchExchangeRate() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) throw new Error('Error en API de tasas');
        const data = await response.json();
        const rate = data.rates?.COP || 4200;
        localStorage.setItem('exchangeRate', rate);
        return rate;
    } catch (error) {
        console.warn('Exchange rate fallback:', error);
        return parseFloat(localStorage.getItem('exchangeRate')) || 4200;
    }
}

/**
 * Obtiene videojuegos desde la API de RAWG con filtros
 * US05: Ver catálogo | US06: Buscar | US07: Plataforma | US08: Género | US09: Ordenar
 */
async function fetchGames(options = {}) {
    const {
        search = '',
        genre = '',
        platform = '',
        ordering = '',
        page = 1,
        pageSize = 20
    } = options;

    try {
        const params = new URLSearchParams();
        params.set('key', RAWG_KEY);
        params.set('page', page);
        params.set('page_size', pageSize);

        if (search) params.set('search', search);
        if (genre) params.set('genres', genre);
        if (platform) params.set('platforms', platform);
        if (ordering) params.set('ordering', ordering);

        const response = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Error en la API de RAWG');
        return await response.json();
    } catch (error) {
        console.error('Error fetching games:', error);
        return { results: [], count: 0, next: null };
    }
}

/**
 * Obtiene el detalle completo de un videojuego
 * US10: Ver detalle del videojuego
 */
async function fetchGameDetail(gameId) {
    try {
        const response = await fetch(`${BASE_URL}/${gameId}?key=${RAWG_KEY}`);
        if (!response.ok) throw new Error('Error al obtener detalle');
        return await response.json();
    } catch (error) {
        console.error('Error fetching game detail:', error);
        return null;
    }
}

/**
 * Obtiene screenshots de un videojuego
 * US11: Ver imágenes/screenshots
 */
async function fetchGameScreenshots(gameId) {
    try {
        const response = await fetch(`${BASE_URL}/${gameId}/screenshots?key=${RAWG_KEY}`);
        if (!response.ok) throw new Error('Error al obtener screenshots');
        return await response.json();
    } catch (error) {
        console.error('Error fetching screenshots:', error);
        return { results: [] };
    }
}

/**
 * Obtiene juegos recomendados por género
 * Funcionalidad diferencial: Recomendaciones simples por género
 */
async function fetchRecommendedGames(genreSlug) {
    try {
        const params = new URLSearchParams();
        params.set('key', RAWG_KEY);
        params.set('genres', genreSlug);
        params.set('ordering', '-rating');
        params.set('page_size', '6');

        const response = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Error al obtener recomendaciones');
        return await response.json();
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return { results: [] };
    }
}

/**
 * Obtiene los juegos más vendidos (más populares)
 * Funcionalidad diferencial: Top juegos más vendidos
 */
async function fetchTopGames() {
    try {
        const params = new URLSearchParams();
        params.set('key', RAWG_KEY);
        params.set('ordering', '-added');
        params.set('page_size', '10');

        const response = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Error al obtener top juegos');
        return await response.json();
    } catch (error) {
        console.error('Error fetching top games:', error);
        return { results: [] };
    }
}

// Exportar para uso global
window.GameStoreAPI = {
    fetchGames,
    fetchGameDetail,
    fetchGameScreenshots,
    fetchRecommendedGames,
    fetchTopGames,
    fetchExchangeRate,
    getGamePrice,
    formatPrice,
    RAWG_KEY,
    BASE_URL
};