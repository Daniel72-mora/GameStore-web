document.addEventListener('DOMContentLoaded', () => {
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCart = document.getElementById('close-cart');
    const checkoutBtn = document.getElementById('checkout-btn'); // Asegúrate de tener este ID en tu botón de pago

    if (!cartBtn || !cartModal) return;

    // Abrir modal y renderizar productos
    cartBtn.addEventListener('click', () => {
        const cartList = document.getElementById('cart-items-list');
        cartList.innerHTML = ''; 
        
        const carritoActual = JSON.parse(localStorage.getItem('carrito')) || [];

        if (carritoActual.length === 0) {
            cartList.innerHTML = '<li>Tu carrito está vacío</li>';
            if(checkoutBtn) checkoutBtn.style.display = 'none'; // Ocultar pago si está vacío
        } else {
            if(checkoutBtn) checkoutBtn.style.display = 'block';
            carritoActual.forEach((item, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${item.titulo} - ${item.precio} 
                    <button onclick="window.eliminarProducto(${index})">❌</button>
                `;
                cartList.appendChild(li);
            });
        }
        cartModal.showModal();
    });

    closeCart.addEventListener('click', () => cartModal.close());

    // --- NUEVA FUNCIÓN PARA PROCESAR LA COMPRA ---
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
            
            if (carrito.length > 0) {
                // AQUÍ es donde enviarías los datos a tu servidor/base de datos con un fetch()
                console.log("Enviando compra al servidor...", carrito);

                // SIMULACIÓN DE ÉXITO:
                alert("¡Compra exitosa! Gracias por tu compra.");
                
                // IMPORTANTE: Limpiar el carrito para que se "asimile" que ya no están pendientes
                localStorage.removeItem('carrito'); 
                
                // Actualizar la interfaz
                document.getElementById('cart-count').textContent = '0';
                cartModal.close();
            } else {
                alert("El carrito está vacío.");
            }
        });
    }
});

window.eliminarProducto = (index) => {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    
    document.getElementById('cart-count').textContent = carrito.length;
    
    // En lugar de cerrar y reabrir, podrías simplemente volver a renderizar la lista
    document.getElementById('cart-btn').click(); 
};