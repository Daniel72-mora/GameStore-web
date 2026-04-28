// // =================================================================
// // INTEGRACIÓN CARRITO (Añadir esto al final de app.js)
// // =================================================================

// let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// function actualizarBadge() {
//     const badge = document.getElementById('cart-count');
//     if (badge) badge.innerText = carrito.length;
// }

// function renderizarCarritoDrawer() {
//     const contenedor = document.getElementById('cart-items-container');
//     const totalEl = document.getElementById('cart-total-price');
    
//     if (!contenedor) return;
    
//     contenedor.innerHTML = carrito.map((item, index) => `
//         <article class="cart-item">
//             <p>${item.nombre}</p>
//             <p>$${parseInt(item.precio).toLocaleString()} COP</p>
//             <button onclick="window.removerDelCarrito(${index})">🗑️</button>
//         </article>
//     `).join('');
    
//     const total = carrito.reduce((sum, item) => sum + parseInt(item.precio), 0);
//     if (totalEl) totalEl.innerText = `$${total.toLocaleString()} COP`;
// }

// window.removerDelCarrito = (index) => {
//     carrito.splice(index, 1);
//     localStorage.setItem('carrito', JSON.stringify(carrito));
//     actualizarBadge();
//     renderizarCarritoDrawer();
// };

// // Escuchador global de clics para el carrito
// document.addEventListener('click', (e) => {
//     // 1. Botón de añadir (delegación de eventos para tarjetas generadas dinámicamente)
//     if (e.target.classList.contains('btn-add-cart-premium')) {
//         const article = e.target.closest('article');
//         const nombre = article.querySelector('h3').innerText;
//         // Limpiamos el texto del precio (ej: "$199.900 COP" -> "199900")
//         const precioRaw = article.querySelector('.price').innerText;
//         const precio = precioRaw.replace(/[^0-9]/g, '');
        
//         carrito.push({ nombre, precio });
//         localStorage.setItem('carrito', JSON.stringify(carrito));
        
//         actualizarBadge();
//         renderizarCarritoDrawer();
//         alert(nombre + " añadido al carrito.");
//     }

//     // 2. Abrir/Cerrar Drawer
//     const drawer = document.getElementById('cart-drawer');
//     if (e.target.closest('#cart-btn')) {
//         drawer.showModal();
//         renderizarCarritoDrawer();
//     }
//     if (e.target.id === 'close-cart-drawer') {
//         drawer.close();
//     }
// });

// // Inicializar al cargar la página
// document.addEventListener('DOMContentLoaded', () => {
//     actualizarBadge();
//     renderizarCarritoDrawer();
// });