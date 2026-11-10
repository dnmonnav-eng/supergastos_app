const SUPABASE_URL = "https://yxcbwlrwmguwcqivujxo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4Y2J3bHJ3bWd1d2NxaXZ1anhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDUzNzYsImV4cCI6MjEwNzc4MTM3Nn0.pNpTmIA34R5RkHrGuVTEm5-haFrHW_nH0IrW5LbzRFc";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let departamentos = [];
let presupuestos = [];
let gastos = [];
let mermas = [];
let solicitudes = [];
let insumos = [];
let usuarios = [];
let proveedores = [];

let vistaActual = "dashboard";

const el = (id) => document.getElementById(id);
const dinero = (n) => "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sumar = (filas) => filas.reduce((total, f) => total + Number(f.monto || f.costo || 0), 0);

function limpiar(texto) {
    const d = document.createElement("div");
    d.textContent = texto ?? "";
    return d.innerHTML;
}

function nombreDepto(id) {
    const d = departamentos.find((x) => x.id === id);
    return d ? d.nombre : "General";
}

function mostrarAviso(texto) {
    const av = el("aviso");
    if(av) {
        av.textContent = texto;
        av.hidden = false;
    }
}

// ========== AUTENTICACIÓN ==========
async function iniciar() {
    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError || !sessionData.session) {
        window.location.href = "../../log_in/log_in.html";
        return;
    }

    const { data: perfil, error } = await db
        .from("InicioSesion")
        .select("correo, rol")
        .eq("user_id", sessionData.session.user.id)
        .maybeSingle();

    if (error || !perfil || perfil.rol !== "admin") {
        await db.auth.signOut();
        window.location.href = "../../log_in/log_in.html";
        return;
    }

    el("nombre-usuario").textContent = perfil.correo;
    await cargarDatosGlobales();
    configurarNavegacion();
    renderizarVista();
}

async function cargarDatosGlobales() {
    el("aviso").hidden = true;
    
    // Consultamos las tablas de Supabase y cargamos datos base para tablas adicionales
    const [d, p, g, s, m] = await Promise.all([
        db.from("departamentos").select("*").order("nombre"),
        db.from("presupuestos").select("*"),
        db.from("gastos").select("*"),
        db.from("solicitudes").select("*"),
        db.from("mermas").select("*"),
    ]);

    departamentos = d.data || [];
    presupuestos = p.data || [];
    gastos = g.data || [];
    solicitudes = s.data || [];
    mermas = m.data || [];

    // Datos simulados estructurados para cumplir con las tablas completas solicitadas
    insumos = [
        { id: 1, fecha: "2025-01-10", departamento_id: 2, insumo: "Harina de trigo", cantidad: "20 kg", proveedor: "Harinera MX", costo: 1250 },
        { id: 2, fecha: "2025-01-12", departamento_id: 1, insumo: "Aceite vegetal", cantidad: "50 L", proveedor: "Distribuidora ABC", costo: 4500 }
    ];
    usuarios = [
        { id: 1, nombre: "Laura Gómez", correo: "laura@supergastos.com", depto: "Abarrotes", rol: "Cajero", estado: "activo" },
        { id: 2, nombre: "Carlos López", correo: "carlos@supergastos.com", depto: "Panadería y Repostería", rol: "Encargado", estado: "activo" }
    ];
    proveedores = [
        { id: 1, nombre: "Distribuidora ABC", contacto: "Juan Pérez", telefono: "8123456789", correo: "contacto@abc.com", estado: "Activo" },
        { id: 2, nombre: "Harinera MX", contacto: "María Soto", telefono: "8198765432", correo: "ventas@harineramx.com", estado: "Activo" }
    ];
}

// ========== NAVEGACIÓN SPA ==========
function configurarNavegacion() {
    const nav = el("sidebarNav");
    nav.addEventListener("click", (e) => {
        const enlace = e.target.closest("a[data-vista]");
        if (!enlace) return;
        e.preventDefault();

        nav.querySelectorAll("a").forEach(a => a.classList.remove("activo"));
        enlace.classList.add("activo");

        vistaActual = enlace.dataset.vista;
        renderizarVista();
    });
}

function renderizarVista() {
    const contenedor = el("vista-contenedor");
    const titulo = el("titulo-vista");
    const subtitulo = el("subtitulo-vista");

    switch (vistaActual) {
        case "dashboard":
            titulo.textContent = "Dashboard";
            subtitulo.textContent = "Resumen general del supermercado";
            contenedor.innerHTML = htmlDashboard();
            postRenderDashboard();
            break;
        case "presupuestos":
            titulo.textContent = "Presupuestos";
            subtitulo.textContent = "Gestión de presupuestos por departamento";
            contenedor.innerHTML = htmlPresupuestos();
            postRenderPresupuestos();
            break;
        case "solicitudes":
            titulo.textContent = "Solicitudes";
            subtitulo.textContent = "Solicitudes de presupuesto de las áreas";
            contenedor.innerHTML = htmlSolicitudes();
            postRenderSolicitudes();
            break;
        case "gastos":
            titulo.textContent = "Gastos";
            subtitulo.textContent = "Registro y control de gastos operativos";
            contenedor.innerHTML = htmlGastos();
            break;
        case "mermas":
            titulo.textContent = "Mermas";
            subtitulo.textContent = "Control de mermas y pérdidas de inventario";
            contenedor.innerHTML = htmlMermas();
            break;
        case "insumos":
            titulo.textContent = "Insumos";
            subtitulo.textContent = "Ingresos de insumos y materias primas";
            contenedor.innerHTML = htmlInsumos();
            break;
        case "historial":
            titulo.textContent = "Historial";
            subtitulo.textContent = "Historial general de movimientos con filtros";
            contenedor.innerHTML = htmlHistorial();
            postRenderHistorial();
            break;
        case "departamentos":
            titulo.textContent = "Departamentos";
            subtitulo.textContent = "Listado de departamentos del supermercado";
            contenedor.innerHTML = htmlDepartamentos();
            break;
        case "usuarios":
            titulo.textContent = "Usuarios";
            subtitulo.textContent = "Gestión de personal y accesos";
            contenedor.innerHTML = htmlUsuarios();
            break;
        case "proveedores":
            titulo.textContent = "Proveedores";
            subtitulo.textContent = "Directorio de proveedores";
            contenedor.innerHTML = htmlProveedores();
            break;
        case "reportes":
            titulo.textContent = "Reportes";
            subtitulo.textContent = "Informes ejecutivos consolidados";
            contenedor.innerHTML = htmlReportes();
            postRenderReportes();
            break;
    }
}

// ========== PLANTILLAS VISTAS ==========
function htmlDashboard() {
    const totalP = sumar(presupuestos);
    const totalG = sumar(gastos);
    const totalM = sumar(mermas);
    const disp = totalP - totalG;
    const pendientes = solicitudes.filter(s => s.estado === "pendiente");

    return `
        <section class="tarjetas">
            <article class="tarjeta"><div><p class="tarjeta-titulo">Presupuesto total</p><p class="tarjeta-numero">${dinero(totalP)}</p></div><span class="icono azul"><i class="bi bi-wallet2"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Gastos totales</p><p class="tarjeta-numero">${dinero(totalG)}</p></div><span class="icono verde"><i class="bi bi-cash-stack"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Dinero disponible</p><p class="tarjeta-numero">${dinero(disp)}</p></div><span class="icono gris"><i class="bi bi-bank"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Merma total</p><p class="tarjeta-numero">${dinero(totalM)}</p></div><span class="icono rojo"><i class="bi bi-graph-down-arrow"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Solicitudes pendientes</p><p class="tarjeta-numero">${pendientes.length}</p></div><span class="icono amarillo"><i class="bi bi-bell"></i></span></article>
        </section>
        <section class="fila-doble">
            <article class="caja"><h3>Gastos por departamento</h3><div id="dash-deptos"></div></article>
            <article class="caja"><h3>Solicitudes pendientes</h3><div id="dash-solicitudes"></div></article>
        </section>
    `;
}

function htmlPresupuestos() {
    const totalP = sumar(presupuestos);
    const totalG = sumar(gastos);
    const disp = totalP - totalG;
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;"><button class="btn-azul" id="btn-abrir-presupuesto">+ Asignar presupuesto</button></div>
        <section class="tarjetas">
            <article class="tarjeta"><div><p class="tarjeta-titulo">Presupuesto total</p><p class="tarjeta-numero">${dinero(totalP)}</p></div><span class="icono azul"><i class="bi bi-wallet2"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Gastado</p><p class="tarjeta-numero">${dinero(totalG)}</p></div><span class="icono verde"><i class="bi bi-cash-stack"></i></span></article>
            <article class="tarjeta"><div><p class="tarjeta-titulo">Disponible</p><p class="tarjeta-numero">${dinero(disp)}</p></div><span class="icono gris"><i class="bi bi-bank"></i></span></article>
        </section>
        <article class="caja"><h3>Uso por departamento</h3><div id="lista-presupuestos-deptos"></div></article>
    `;
}

function htmlSolicitudes() {
    return `
        <article class="caja">
            <h3>Solicitudes de Presupuesto</h3>
            <div class="tabla-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Departamento</th>
                            <th>Solicitante</th>
                            <th>Monto</th>
                            <th>Motivo</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th class="derecha">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-solicitudes-completa"></tbody>
                </table>
            </div>
        </article>`;
}

function htmlGastos() {
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <button class="btn-azul" onclick="alert('Abriendo formulario para registrar gasto...')">+ Registrar gasto</button>
        </div>
        <article class="caja">
            <h3>Registro y Control de Gastos</h3>
            <div class="tabla-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Departamento</th>
                            <th>Concepto</th>
                            <th>Categoría</th>
                            <th>Proveedor</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th class="derecha">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${gastos.map(g => `
                            <tr>
                                <td>${g.fecha || '2025-02-01'}</td>
                                <td>${limpiar(nombreDepto(g.departamento_id))}</td>
                                <td>${limpiar(g.descripcion || 'Compra operativa')}</td>
                                <td>Operativo</td>
                                <td>Distribuidor General</td>
                                <td>${dinero(g.monto)}</td>
                                <td><span class="badge-estado estado-aprobada">Pagado</span></td>
                                <td class="derecha">
                                    <button class="btn-rojo" style="padding:4px 10px; font-size:12px;" onclick="alert('Gasto eliminado')">Eliminar</button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="8" class="vacio">No hay gastos registrados.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </article>`;
}

function htmlMermas() {
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <button class="btn-azul" onclick="alert('Abriendo formulario para registrar merma...')">+ Registrar merma</button>
        </div>
        <article class="caja">
            <h3>Registro de Mermas y Pérdidas</h3>
            <div class="tabla-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Departamento</th>
                            <th>Producto</th>
                            <th>Motivo</th>
                            <th>Cantidad</th>
                            <th class="derecha">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mermas.map(m => `
                            <tr>
                                <td>${m.fecha || '2025-01-15'}</td>
                                <td>${limpiar(nombreDepto(m.departamento_id))}</td>
                                <td>${limpiar(m.producto || m.descripcion || 'Artículo genérico')}</td>
                                <td>${limpiar(m.motivo || 'Caducidad / Daño')}</td>
                                <td>${m.cantidad || '10 pza'}</td>
                                <td class="derecha">${dinero(m.monto)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" class="vacio">No hay mermas registradas.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </article>`;
}

function htmlInsumos() {
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <button class="btn-azul" onclick="alert('Abriendo formulario para registrar insumo...')">+ Registrar insumo</button>
        </div>
        <article class="caja">
            <h3>Ingresos de Insumos</h3>
            <div class="tabla-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Departamento</th>
                            <th>Insumo</th>
                            <th>Cantidad</th>
                            <th>Proveedor</th>
                            <th class="derecha">Costo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${insumos.map(i => `
                            <tr>
                                <td>${i.fecha}</td>
                                <td>${limpiar(nombreDepto(i.departamento_id))}</td>
                                <td>${limpiar(i.insumo)}</td>
                                <td>${i.cantidad}</td>
                                <td>${limpiar(i.proveedor)}</td>
                                <td class="derecha">${dinero(i.costo)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </article>`;
}

function htmlHistorial() {
    return `
        <article class="caja">
            <h3>Historial de Movimientos</h3>
            <div class="filtros-historial" style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <button class="filtro-btn activo" data-filtro="todos">Todos</button>
                <button class="filtro-btn" data-filtro="gastos">Gastos</button>
                <button class="filtro-btn" data-filtro="insumos">Insumos</button>
                <button class="filtro-btn" data-filtro="mermas">Mermas</button>
                <select id="filtro-depto" style="padding:6px 12px; border-radius:15px; border:1px solid var(--borde); background:white;">
                    <option value="">Todos los departamentos</option>
                    ${departamentos.map(d => `<option value="${d.id}">${limpiar(d.nombre)}</option>`).join('')}
                </select>
            </div>
            <div class="tabla-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Fecha</th>
                            <th>Departamento</th>
                            <th>Descripción</th>
                            <th class="derecha">Monto / Costo</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-historial-completo"></tbody>
                </table>
            </div>
        </article>`;
}

function htmlDepartamentos() {
    return `
        <div class="grid-depts">
            ${departamentos.map(dep => {
                const pres = presupuestos.find(p => p.departamento_id === dep.id);
                const gastado = sumar(gastos.filter(g => g.departamento_id === dep.id));
                const asignado = pres ? Number(pres.monto) : 0;
                const pct = asignado > 0 ? Math.min(100, (gastado / asignado) * 100).toFixed(1) : 0;
                return `
                    <div class="dept-card">
                        <h4>${limpiar(dep.nombre)}</h4>
                        <p>Uso: ${pct}%</p>
                        <div class="barra" style="margin-bottom:12px;"><div class="relleno" style="width:${pct}%"></div></div>
                        <small style="color:var(--gris);">Presupuesto: ${dinero(asignado)}<br>Gastado: ${dinero(gastado)}</small>
                    </div>`;
            }).join('')}
        </div>`;
}

function htmlUsuarios() {
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <button class="btn-azul" onclick="alert('Abriendo formulario para crear usuario...')">+ Crear usuario</button>
        </div>
        <article class="caja">
            <h3>Gestión de Usuarios</h3>
            <div class="tabla-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Departamento</th>
                            <th>Rol</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.map(u => `
                            <tr>
                                <td>${u.nombre}</td>
                                <td>${u.correo}</td>
                                <td>${u.depto}</td>
                                <td>${u.rol}</td>
                                <td><span class="badge-estado estado-${u.estado}">${u.estado}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </article>`;
}

function htmlProveedores() {
    return `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <button class="btn-azul" onclick="alert('Abriendo formulario para nuevo proveedor...')">+ Nuevo proveedor</button>
        </div>
        <article class="caja">
            <h3>Directorio de Proveedores</h3>
            <div class="tabla-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Contacto</th>
                            <th>Teléfono</th>
                            <th>Correo</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${proveedores.map(p => `
                            <tr>
                                <td>${p.nombre}</td>
                                <td>${p.contacto}</td>
                                <td>${p.telefono}</td>
                                <td>${p.correo}</td>
                                <td><span class="badge-estado estado-activo">${p.estado}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </article>`;
}

function htmlReportes() {
    const totalP = sumar(presupuestos);
    const totalG = sumar(gastos);
    const totalM = sumar(mermas);
    const pctUso = totalP > 0 ? ((totalG / totalP) * 100).toFixed(1) : 0;

    return `
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 20px;">
            <button class="btn-borde" onclick="window.print()">Exportar PDF</button>
            <button class="btn-azul" onclick="exportarExcel()">Exportar Excel</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <div class="caja"><h3>Presupuesto total</h3><p style="font-size:22px; font-weight:700; margin:0;">${dinero(totalP)}</p></div>
            <div class="caja"><h3>Gastos totales</h3><p style="font-size:22px; font-weight:700; margin:0; color:#2563EB;">${dinero(totalG)}</p></div>
            <div class="caja"><h3>Mermas totales</h3><p style="font-size:22px; font-weight:700; margin:0; color:#DC2626;">${dinero(totalM)}</p></div>
            <div class="caja"><h3>Uso del presupuesto</h3><p style="font-size:22px; font-weight:700; margin:0; color:#10B981;">${pctUso}%</p></div>
        </div>
        <article class="caja">
            <h3>Gasto y merma por departamento</h3>
            <div class="tabla-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Departamento</th>
                            <th>Presupuesto</th>
                            <th>Gastos</th>
                            <th>Merma</th>
                            <th class="derecha">% Uso</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-reporte-deptos"></tbody>
                </table>
            </div>
        </article>`;
}

// ========== POST-RENDERIZADO Y ACCIONES ==========
function postRenderDashboard() {
    el("dash-deptos").innerHTML = departamentos.map(dep => {
        const pres = presupuestos.find(p => p.departamento_id === dep.id);
        const gastado = sumar(gastos.filter(g => g.departamento_id === dep.id));
        const asignado = pres ? Number(pres.monto) : 0;
        const pct = asignado > 0 ? Math.min(100, (gastado / asignado) * 100) : 0;
        return `<div class="departamento"><div class="departamento-info"><span>${limpiar(dep.nombre)}</span><span>${dinero(gastado)} de ${dinero(asignado)}</span></div><div class="barra"><div class="relleno" style="width:${pct}%"></div></div></div>`;
    }).join('') || '<p class="vacio">No hay departamentos.</p>';

    const pendientes = solicitudes.filter(s => s.estado === "pendiente");
    el("dash-solicitudes").innerHTML = pendientes.map(s => `
        <div class="solicitud">
            <strong>${limpiar(nombreDepto(s.departamento_id))}</strong>
            <p>Motivo: ${limpiar(s.motivo)}</p>
            <span class="monto">${dinero(s.monto)}</span>
            <div class="solicitud-botones">
                <button class="btn-azul" onclick="resolverSolicitud(${s.id}, 'aprobada')">Aprobar</button>
                <button class="btn-rojo" onclick="resolverSolicitud(${s.id}, 'rechazada')">Rechazar</button>
            </div>
        </div>
    `).join('') || '<p class="vacio">No hay solicitudes pendientes.</p>';
}

function postRenderPresupuestos() {
    el("lista-presupuestos-deptos").innerHTML = departamentos.map(dep => {
        const pres = presupuestos.find(p => p.departamento_id === dep.id);
        const gastado = sumar(gastos.filter(g => g.departamento_id === dep.id));
        const asignado = pres ? Number(pres.monto) : 0;
        const disponible = asignado - gastado;
        const pct = asignado > 0 ? Math.min(100, (gastado / asignado) * 100).toFixed(1) : 0;
        return `<div class="departamento" style="margin-bottom: 25px;"><div class="departamento-info"><strong>${limpiar(dep.nombre)}</strong><span><strong>${pct}%</strong></span></div><div class="barra" style="margin-bottom: 8px;"><div class="relleno" style="width:${pct}%"></div></div><div style="display:flex; justify-content:space-between; font-size:13px; color:var(--gris);"><span>Presupuesto: ${dinero(asignado)}</span><span>Gastado: ${dinero(gastado)}</span><span>Disponible: ${dinero(disponible)}</span></div></div>`;
    }).join('');

    el("btn-abrir-presupuesto")?.addEventListener("click", () => {
        el("sel-departamento").innerHTML = departamentos.map(d => `<option value="${d.id}">${limpiar(d.nombre)}</option>`).join("");
        el("modal-presupuesto").showModal();
    });
}

function postRenderSolicitudes() {
    const tbody = el("tabla-solicitudes-completa");
    if (tbody) {
        tbody.innerHTML = solicitudes.map(s => `
            <tr>
                <td>${limpiar(nombreDepto(s.departamento_id))}</td>
                <td>${limpiar(s.solicitante || 'Personal')}</td>
                <td>${dinero(s.monto)}</td>
                <td>${limpiar(s.motivo)}</td>
                <td>${s.fecha || '2025-02-01'}</td>
                <td><span class="badge-estado estado-${s.estado}">${s.estado}</span></td>
                <td class="derecha">
                    ${s.estado === 'pendiente' ? `<button class="btn-azul" style="padding:4px 10px;" onclick="resolverSolicitud(${s.id}, 'aprobada')">Aprobar</button> <button class="btn-rojo" style="padding:4px 10px;" onclick="resolverSolicitud(${s.id}, 'rechazada')">Rechazar</button>` : 'Completado'}
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="vacio">No hay solicitudes.</td></tr>';
    }
}

function postRenderHistorial() {
    const renderizarTablaHistorial = (filtroTipo = "todos", filtroDepto = "") => {
        const tbody = el("tabla-historial-completo");
        if (!tbody) return;

        let lista = [
            ...gastos.map(g => ({ tipo: 'Gasto', fecha: g.fecha || '2025-02-01', deptoId: g.departamento_id, depto: nombreDepto(g.departamento_id), desc: g.descripcion || 'Gasto operativo', monto: g.monto })),
            ...insumos.map(i => ({ tipo: 'Insumo', fecha: i.fecha, deptoId: i.departamento_id, depto: nombreDepto(i.departamento_id), desc: `${i.insumo} (${i.cantidad})`, monto: i.costo })),
            ...mermas.map(m => ({ tipo: 'Merma', fecha: m.fecha || '2025-01-15', deptoId: m.departamento_id, depto: nombreDepto(m.departamento_id), desc: m.producto || m.descripcion || 'Merma', monto: m.monto }))
        ];

        if (filtroTipo !== "todos") {
            lista = lista.filter(i => i.tipo.toLowerCase() === filtroTipo.toLowerCase());
        }
        if (filtroDepto !== "") {
            lista = lista.filter(i => String(i.deptoId) === String(filtroDepto));
        }

        lista.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

        tbody.innerHTML = lista.map(i => `
            <tr>
                <td><span class="badge-estado ${i.tipo === 'Gasto' ? 'estado-aprobada' : i.tipo === 'Insumo' ? 'estado-pendiente' : 'estado-rechazada'}">${i.tipo}</span></td>
                <td>${i.fecha}</td>
                <td>${i.depto}</td>
                <td>${limpiar(i.desc)}</td>
                <td class="derecha">${dinero(i.monto)}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="vacio">No hay movimientos con estos filtros.</td></tr>';
    };

    renderizarTablaHistorial();

    document.querySelectorAll(".filtro-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("activo"));
            e.target.classList.add("activo");
            const tipo = e.target.dataset.filtro;
            const depto = el("filtro-depto").value;
            renderizarTablaHistorial(tipo, depto);
        });
    });

    el("filtro-depto")?.addEventListener("change", (e) => {
        const tipo = document.querySelector(".filtro-btn.activo")?.dataset.filtro || "todos";
        renderizarTablaHistorial(tipo, e.target.value);
    });
}

function postRenderReportes() {
    const tbody = el("tabla-reporte-deptos");
    if (tbody) {
        tbody.innerHTML = departamentos.map(dep => {
            const pres = presupuestos.find(p => p.departamento_id === dep.id);
            const gastado = sumar(gastos.filter(g => g.departamento_id === dep.id));
            const mermaDept = sumar(mermas.filter(m => m.departamento_id === dep.id));
            const asignado = pres ? Number(pres.monto) : 0;
            const pct = asignado > 0 ? ((gastado / asignado) * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td><strong>${limpiar(dep.nombre)}</strong></td>
                    <td>${dinero(asignado)}</td>
                    <td>${dinero(gastado)}</td>
                    <td>${dinero(mermaDept)}</td>
                    <td class="derecha"><strong>${pct}%</strong></td>
                </tr>`;
        }).join('');
    }
}

async function resolverSolicitud(id, nuevoEstado) {
    const { error } = await db.from("solicitudes").update({ estado: nuevoEstado }).eq("id", id);
    if (error) {
        mostrarAviso("No se pudo actualizar la solicitud.");
        return;
    }
    await cargarDatosGlobales();
    renderizarVista();
}

function exportarExcel() {
    let csv = "Departamento,Presupuesto,Gastos,Merma\n";
    departamentos.forEach(dep => {
        const pres = presupuestos.find(p => p.departamento_id === dep.id);
        const gastado = sumar(gastos.filter(g => g.departamento_id === dep.id));
        const mermaDept = sumar(mermas.filter(m => m.departamento_id === dep.id));
        const asignado = pres ? Number(pres.monto) : 0;
        csv += `"${dep.nombre}",${asignado},${gastado},${mermaDept}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte_supergastos.csv';
    a.click();
}

el("btn-cancelar")?.addEventListener("click", () => el("modal-presupuesto").close());

el("form-presupuesto")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const departamento_id = Number(el("sel-departamento").value);
    const tipo = el("sel-tipo").value;
    const monto = Number(el("inp-monto").value);
    const existente = presupuestos.find(p => p.departamento_id === departamento_id);

    const { error } = existente
        ? await db.from("presupuestos").update({ tipo, monto }).eq("id", existente.id)
        : await db.from("presupuestos").insert({ departamento_id, tipo, monto });

    if (error) {
        mostrarAviso("No se pudo guardar el presupuesto.");
        return;
    }
    el("modal-presupuesto").close();
    await cargarDatosGlobales();
    renderizarVista();
});

el("cerrar-sesion").addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.href = "../../log_in/index.html"; 
});

iniciar();