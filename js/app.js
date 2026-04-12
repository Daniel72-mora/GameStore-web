// 1. Configuración de Supabase
const supabaseUrl = 'https://xgsmcwjpmaoluvosppfm.supabase.co';
const supabaseKey = 'sb_publishable_q4NBJPrvDHIaI1ejvdErHw_QCXqYTbG';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

console.log("Conexión con GameStore-DB establecida.");

// 2. Tarea para Felipe: Lógica de la API de RAWG
async function obtenerJuegos() {
    console.log("Cargando catálogo de juegos...");
    // Aquí Felipe escribirá el fetch a RAWG
}

// Ejecutar al cargar la página
obtenerJuegos();