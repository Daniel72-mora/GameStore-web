// ==========================================
// js/theme.js - Toggle de Tema Claro/Oscuro
// Misión: Karol (Diseño y Estructura) | US31
// ==========================================

const themeToggle = document.getElementById('theme-toggle');
const bodyElement = document.body;

/**
 * Aplica el tema y guarda la preferencia
 */
function applyTheme(theme) {
    bodyElement.className = theme;
    localStorage.setItem('game-store-theme', theme);

    const isDark = theme === 'dark-theme';
    if (themeToggle) {
        themeToggle.setAttribute('aria-pressed', isDark);
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    }

    // Disparar evento para que otros componentes reaccionen
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme, isDark } }));
}

/**
 * Inicializa el tema basado en preferencia guardada o del sistema
 */
function initTheme() {
    const savedTheme = localStorage.getItem('game-store-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(systemPrefersDark ? 'dark-theme' : 'light-theme');
    }
}

// Evento de toggle
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const newTheme = bodyElement.classList.contains('dark-theme')
            ? 'light-theme'
            : 'dark-theme';
        applyTheme(newTheme);
    });
}

// Escuchar cambios del sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('game-store-theme')) {
        applyTheme(e.matches ? 'dark-theme' : 'light-theme');
    }
});

// Inicializar
initTheme();

