// ==========================================
// js/theme.js - Toggle de Tema Claro/Oscuro
// FIXED Bug 12: Handle prefers-color-scheme when localStorage cleared
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

// FIXED Bug 12: Listen for system preference changes
// If user clears localStorage, the system preference will be respected
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Check if there's no saved theme, OR if the saved theme was removed
    const savedTheme = localStorage.getItem('game-store-theme');
    if (!savedTheme) {
        applyTheme(e.matches ? 'dark-theme' : 'light-theme');
    }
});

// Also listen for storage changes (e.g., if user clears localStorage from another tab)
window.addEventListener('storage', (e) => {
    if (e.key === 'game-store-theme' && !e.newValue) {
        // localStorage was cleared - fall back to system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(systemPrefersDark ? 'dark-theme' : 'light-theme');
    }
});

// Inicializar
initTheme();
