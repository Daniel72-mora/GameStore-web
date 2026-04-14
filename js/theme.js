/**
 * Lógica de Transición de Temas (Modo Claro / Oscuro)
 * Misión: Karol (Diseño y Estructura)
 */

// 1. Selección de elementos semánticos
const themeToggle = document.getElementById('theme-toggle');
const bodyElement = document.body;

// 2. Función para aplicar el tema y actualizar la accesibilidad
const applyTheme = (theme) => {
    // Aplicamos la clase al body (dark-theme o light-theme)
    bodyElement.className = theme;
    
    // Guardamos la preferencia para futuras visitas (Sprint 2)
    localStorage.setItem('game-store-theme', theme);
    
    // Actualizamos el atributo de accesibilidad para lectores de pantalla
    const isDark = theme === 'dark-theme';
    themeToggle.setAttribute('aria-pressed', isDark);
    
    // Opcional: Cambiar el icono del botón internamente
    themeToggle.textContent = isDark ? '☀️' : '🌙';
};

// 3. Verificación de preferencia guardada o del sistema operativo
const savedTheme = localStorage.getItem('game-store-theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Inicializamos el sitio con el tema guardado o el del sistema
if (savedTheme) {
    applyTheme(savedTheme);
} else {
    applyTheme(systemPrefersDark ? 'dark-theme' : 'light-theme');
}

// 4. Evento de escucha para el cambio de tema
themeToggle.addEventListener('click', () => {
    const newTheme = bodyElement.classList.contains('dark-theme') 
        ? 'light-theme' 
        : 'dark-theme';
    
    applyTheme(newTheme);
});