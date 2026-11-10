const SUPABASE_URL = "https://yxcbwlrwmguwcqivujxo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4Y2J3bHJ3bWd1d2NxaXZ1anhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDUzNzYsImV4cCI6MjEwNzc4MTM3Nn0.pNpTmIA34R5RkHrGuVTEm5-haFrHW_nH0IrW5LbzRFc";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 
// ========== ELEMENTOS DE LA PÁGINA ==========
const formulario = document.querySelector("form");
const campoCorreo = document.getElementById("correo");
// Acepta tanto id="password" como id="contrasena" en tu HTML
const campoClave = document.getElementById("password") || document.getElementById("contrasena");
const mensaje = document.getElementById("mensaje");
 
function mostrar(texto) {
    if (mensaje) mensaje.textContent = texto;
    else if (texto) alert(texto);
}
 
// ========== REDIRIGIR SEGÚN EL ROL ==========
async function irSegunRol(userId) {
    const { data: perfil, error } = await db
        .from("InicioSesion")
        .select("rol")
        .eq("user_id", userId)
        .maybeSingle();
 
    if (error || !perfil) {
        console.error(error);
        mostrar("Tu cuenta no tiene un rol asignado");
        await db.auth.signOut();
        return;
    }
 
    window.location.href = perfil.rol === "admin"
        ? "../admin/dashboard/inicio_admin.html"
        : "../usuario/inicio_usuario.html";
}
 
// ========== INICIAR SESIÓN ==========
formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrar("");
 
    const { data, error } = await db.auth.signInWithPassword({
        email: campoCorreo.value.trim(),
        password: campoClave.value,
    });
 
    if (error) {
        console.error(error);
        mostrar("Correo o contraseña incorrectos");
        return;
    }
 
    await irSegunRol(data.user.id);
});
 
// ========== SI YA HAY UNA SESIÓN ABIERTA, ENTRA DIRECTO ==========
(async () => {
    const { data } = await db.auth.getSession();
    if (data.session) irSegunRol(data.session.user.id);
})();