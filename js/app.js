// 1. Configuración de Supabase
const supabaseUrl = 'https://xgsmcwjpmaoluvosppfm.supabase.co';
const supabaseKey = 'sb_publishable_q4NBJPrvDHIaI1ejvdErHw_QCXqYTbG';

// CORRECCIÓN: Usamos un nombre diferente para la instancia (ej. _supabase) 
// para no confundirla con la librería global
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Función para obtener los videojuegos
async function getVideojuegos() {
    try {
        const { data, error } = await _supabase
            .from('videojuegos')
            .select('*');

        if (error) {
            console.error('Error al obtener datos:', error.message);
            return;
        }

        // --- CRITERIO DE ACEPTACIÓN ---
        // Si ves esto en la consola, ¡tarea completada!
        console.log('Conexión exitosa. Datos de la tabla:', data);
        
    } catch (err) {
        console.error('Error inesperado:', err);
    }
}

// 3. Ejecutar la prueba
getVideojuegos();