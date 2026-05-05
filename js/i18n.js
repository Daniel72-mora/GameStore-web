// ==========================================
// js/i18n.js - Sistema de Internacionalización (ES/EN)
// Misión: Daniel (Internacionalización) | US33/US34
// ==========================================

const translations = {
    es: {
        // Navegación
        navCatalog: "Catálogo",
        navOrders: "Mis Pedidos",
        navAdmin: "Admin",
        navFavorites: "Favoritos",
        btnLogin: "Entrar",
        btnLogout: "Salir",
        // Hero
        heroTitle: "TU PRÓXIMA AVENTURA COMIENZA AQUÍ",
        heroSubtitle: "Explora, descubre y domina. Los mejores títulos a precios inmejorables.",
        heroBtn: "EXPLORAR CATÁLOGO",
        // Catálogo
        catalogTitle: "Catálogo de Videojuegos",
        searchPlaceholder: "Buscar tu próximo juego...",
        allGenres: "Todos los Géneros",
        allPlatforms: "Todas las Plataformas",
        sortBy: "Ordenar por...",
        mostPopular: "Más Populares",
        newest: "Novedades",
        nameAZ: "Nombre (A-Z)",
        recentlyAdded: "Recientes",
        noGames: "No se encontraron videojuegos.",
        addBtn: "+ Añadir",
        // Géneros
        genreAction: "Acción",
        genreAdventure: "Aventura",
        genreRPG: "RPG",
        genreShooter: "Shooter",
        genreStrategy: "Estrategia",
        genreSports: "Deportes",
        genrePuzzle: "Puzzle",
        genreRacing: "Carreras",
        // Plataformas
        platformPC: "PC (Windows)",
        platformPS: "PlayStation",
        platformXbox: "Xbox",
        platformNintendo: "Nintendo",
        // Detalle
        rating: "Rating",
        releaseDate: "Fecha de Lanzamiento",
        description: "Descripción",
        platforms: "Plataformas",
        genres: "Géneros",
        addToCart: "Añadir al Carrito",
        backToCatalog: "Volver al Catálogo",
        noDescription: "No hay descripción disponible.",
        screenshots: "Capturas de Pantalla",
        // Carrito
        cartTitle: "TU CARRITO",
        cartEmpty: "Tu carrito está vacío",
        cartTotal: "Total",
        checkoutBtn: "Finalizar Compra",
        removeFromCart: "Vaciar Carrito",
        // Autenticación
        loginTitle: "INICIAR SESIÓN",
        registerTitle: "REGISTRARSE",
        recoveryTitle: "RECUPERAR CONTRASEÑA",
        emailLabel: "Correo Electrónico",
        emailPlaceholder: "ejemplo@correo.com",
        passwordLabel: "Contraseña",
        nameLabel: "Nombre Completo",
        namePlaceholder: "Tu nombre",
        submitLogin: "Entrar",
        submitRegister: "Registrarse",
        noAccount: "¿No tienes cuenta? Regístrate",
        hasAccount: "¿Ya tienes cuenta? Inicia sesión",
        forgotPassword: "Olvidé mi contraseña",
        recoveryBtn: "Enviar enlace de recuperación",
        // Pedidos
        orderHistory: "Historial de Compras",
        orderDate: "Fecha",
        orderTotal: "Total",
        orderStatus: "Estado",
        orderItems: "Productos",
        noOrders: "No tienes pedidos todavía",
        // Compra
        purchaseTitle: "Confirmar Compra",
        purchaseSuccess: "¡Compra realizada con éxito!",
        generateReceipt: "Generar Comprobante",
        receiptTitle: "Comprobante de Compra",
        // Admin
        adminTitle: "Panel de Administración",
        adminGames: "Videojuegos",
        adminOrders: "Pedidos",
        adminUsers: "Usuarios",
        adminCreate: "Crear Videojuego",
        adminEdit: "Editar",
        adminDelete: "Eliminar",
        adminSave: "Guardar",
        adminCancel: "Cancelar",
        adminName: "Nombre",
        adminPrice: "Precio",
        adminImage: "URL de Imagen",
        adminPlatform: "Plataforma",
        adminGenre: "Género",
        adminDescription: "Descripción",
        // Favoritos
        favoritesTitle: "Mis Favoritos",
        noFavorites: "No tienes favoritos todavía",
        addFavorite: "Añadir a Favoritos",
        removeFavorite: "Quitar de Favoritos",
        // Recomendaciones
        recommendations: "Recomendados para ti",
        topSellers: "Más Vendidos",
        // Footer
        footerCopy: "2026 GameStore Web. Proyecto Final - Sprint 1.",
        footerSlogan: "LEVEL UP.",
        // Común
        loading: "Cargando...",
        loadMore: "Cargar más",
        close: "Cerrar",
        confirm: "Confirmar",
        cancel: "Cancelar",
        COP: "COP",
        quantity: "Cantidad",
        price: "Precio",
        subtotal: "Subtotal",
        accessDenied: "Acceso denegado",
        actions: "Acciones",
        role: "Rol",
        email: "Correo",
        toggleStatus: "Cambiar estado",
    },
    en: {
        navCatalog: "Catalog",
        navOrders: "My Orders",
        navAdmin: "Admin",
        navFavorites: "Favorites",
        btnLogin: "Login",
        btnLogout: "Logout",
        heroTitle: "YOUR NEXT ADVENTURE STARTS HERE",
        heroSubtitle: "Explore, discover, and dominate. The best titles at unbeatable prices.",
        heroBtn: "EXPLORE CATALOG",
        catalogTitle: "Video Game Catalog",
        searchPlaceholder: "Search your next game...",
        allGenres: "All Genres",
        allPlatforms: "All Platforms",
        sortBy: "Sort by...",
        mostPopular: "Most Popular",
        newest: "Newest",
        nameAZ: "Name (A-Z)",
        recentlyAdded: "Recently Added",
        noGames: "No games found.",
        addBtn: "+ Add",
        genreAction: "Action",
        genreAdventure: "Adventure",
        genreRPG: "RPG",
        genreShooter: "Shooter",
        genreStrategy: "Strategy",
        genreSports: "Sports",
        genrePuzzle: "Puzzle",
        genreRacing: "Racing",
        platformPC: "PC (Windows)",
        platformPS: "PlayStation",
        platformXbox: "Xbox",
        platformNintendo: "Nintendo",
        rating: "Rating",
        releaseDate: "Release Date",
        description: "Description",
        platforms: "Platforms",
        genres: "Genres",
        addToCart: "Add to Cart",
        backToCatalog: "Back to Catalog",
        noDescription: "No description available.",
        screenshots: "Screenshots",
        cartTitle: "YOUR CART",
        cartEmpty: "Your cart is empty",
        cartTotal: "Total",
        checkoutBtn: "Checkout",
        removeFromCart: "Clear Cart",
        loginTitle: "LOGIN",
        registerTitle: "REGISTER",
        recoveryTitle: "RECOVER PASSWORD",
        emailLabel: "Email Address",
        emailPlaceholder: "example@email.com",
        passwordLabel: "Password",
        nameLabel: "Full Name",
        namePlaceholder: "Your name",
        submitLogin: "Sign In",
        submitRegister: "Sign Up",
        noAccount: "Don't have an account? Register",
        hasAccount: "Already have an account? Login",
        forgotPassword: "Forgot password?",
        recoveryBtn: "Send recovery link",
        orderHistory: "Order History",
        orderDate: "Date",
        orderTotal: "Total",
        orderStatus: "Status",
        orderItems: "Items",
        noOrders: "You don't have any orders yet",
        purchaseTitle: "Confirm Purchase",
        purchaseSuccess: "Purchase completed successfully!",
        generateReceipt: "Generate Receipt",
        receiptTitle: "Purchase Receipt",
        adminTitle: "Administration Panel",
        adminGames: "Video Games",
        adminOrders: "Orders",
        adminUsers: "Users",
        adminCreate: "Create Video Game",
        adminEdit: "Edit",
        adminDelete: "Delete",
        adminSave: "Save",
        adminCancel: "Cancel",
        adminName: "Name",
        adminPrice: "Price",
        adminImage: "Image URL",
        adminPlatform: "Platform",
        adminGenre: "Genre",
        adminDescription: "Description",
        favoritesTitle: "My Favorites",
        noFavorites: "You don't have favorites yet",
        addFavorite: "Add to Favorites",
        removeFavorite: "Remove from Favorites",
        recommendations: "Recommended for you",
        topSellers: "Top Sellers",
        footerCopy: "2026 GameStore Web. Final Project - Sprint 1.",
        footerSlogan: "LEVEL UP.",
        loading: "Loading...",
        loadMore: "Load More",
        close: "Close",
        confirm: "Confirm",
        cancel: "Cancel",
        COP: "COP",
        quantity: "Quantity",
        price: "Price",
        subtotal: "Subtotal",
        accessDenied: "Access Denied",
        actions: "Actions",
        role: "Role",
        email: "Email",
        toggleStatus: "Toggle Status",
    }
};

/**
 * Obtiene una traducción por clave e idioma
 * US33: Cambiar idioma (ES/EN)
 * US34: Traducir contenido dinámico
 */
function t(key, lang) {
    lang = lang || getCurrentLang();
    return (translations[lang] && translations[lang][key]) || key;
}

/**
 * Obtiene el idioma actual desde localStorage
 */
function getCurrentLang() {
    return localStorage.getItem('idiomaPreferido') || 'es';
}

/**
 * Traduce todos los elementos con data-es/data-en
 */
function translatePage(lang) {
    if (!lang) lang = getCurrentLang();
    localStorage.setItem('idiomaPreferido', lang);

    // Traducir elementos con data-es/data-en
    document.querySelectorAll('[data-es]').forEach(el => {
        const translation = (lang === 'en') ? el.getAttribute('data-en') : el.getAttribute('data-es');
        if (translation) el.innerHTML = translation;
    });

    // Traducir placeholders
    document.querySelectorAll('[data-placeholder-es]').forEach(el => {
        const translation = (lang === 'en') ? el.getAttribute('data-placeholder-en') : el.getAttribute('data-placeholder-es');
        if (translation) el.placeholder = translation;
    });

    // Actualizar selector de idioma
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = lang;

    // Disparar evento personalizado para que otros módulos reaccionen
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

// Exportar
window.GameStoreI18n = { t, getCurrentLang, translatePage, translations };
