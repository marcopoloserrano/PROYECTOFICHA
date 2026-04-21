const API_URL = 'http://localhost:4000/api';

document.querySelector('#consultas-app').innerHTML = `
  <div class="glass-card" style="border-top: 5px solid purple; max-width: 1200px; margin: 0 auto;">
    <div style="margin-bottom: 1rem;">
      <a href="/index.html" style="color:#64748b; font-size:0.9rem; text-decoration:none;">⬅ Volver a Administración Principal</a>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:0.5rem;">
      <h1 style="margin:0;">📊 Panel General de Consultas</h1>
      <div id="rt-badge" style="display:flex; align-items:center; gap:0.5rem; background:rgba(22,163,74,0.1); border:1px solid rgba(22,163,74,0.3); border-radius:20px; padding:6px 14px; font-size:0.82rem; color:#15803d; font-weight:600;">
        <span id="rt-dot" style="width:8px;height:8px;border-radius:50%;background:#16a34a;display:inline-block;animation:pulse-rt 1.5s infinite;"></span>
        EN VIVO &nbsp;·&nbsp; última actualización: <span id="ultima-actualizacion">--:--:--</span>
      </div>
    </div>
    <p class="subtitle">Disponibilidad para hoy (<span id="fecha-hoy-text"></span>) y ausencias, organizadas directamente por especialidades.</p>
    <style>
      @keyframes pulse-rt {
        0%,100%{opacity:1;transform:scale(1);}
        50%{opacity:0.4;transform:scale(1.4);}
      }
    </style>

    <div id="resultados-panel">
        <div id="contenedor-especialidades" style="display:flex; flex-direction:column; gap:2rem; margin-top:2rem;">
            <div style="text-align:center; padding:2rem; color:#64748b;">Cargando información médica global...</div>
        </div>
    </div>
    
    <div id="consultas-message" class="message"></div>
  </div>
`;

const contenedorEspecialidades = document.getElementById('contenedor-especialidades');
const fechaHoyText = document.getElementById('fecha-hoy-text');
const msg = document.getElementById('consultas-message');

let intervaloConsultas = null;

// Obtener fecha del día local
function obtenerFechaHoy() {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
}

// Formato bonito DD/MM/YYYY
function formatearFechaBolivia(fecha_dt) {
    if (!fecha_dt) return '';
    const p = fecha_dt.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
}

async function cargarVistaCompleta() {
    try {
        const fechaHoy = obtenerFechaHoy();
        fechaHoyText.textContent = formatearFechaBolivia(fechaHoy);

        // 1. Cargar todas las especialidades
        const reqEsp = await fetch(API_URL + '/especialidades');
        const especialidades = await reqEsp.json();

        // 2. Consultar disponibilidad y ausencias en paralelo para todas
        const renderData = await Promise.all(especialidades.map(async (esp) => {
            const resDisp = await fetch(`${API_URL}/consultas/disponibilidad?especialidad_id=${esp.id_especialidad}&fecha=${fechaHoy}`);
            const dataDisp = await resDisp.json();

            const resAuse = await fetch(`${API_URL}/consultas/ausencias?especialidad_id=${esp.id_especialidad}`);
            const dataAuse = await resAuse.json();

            return { esp, dataDisp, dataAuse };
        }));

        let htmlGlobal = '';

        renderData.forEach(({ esp, dataDisp, dataAuse }) => {
            htmlGlobal += `
            <div style="background: rgba(126, 34, 206, 0.03); border:1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <h2 style="color: purple; margin-top: 0; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 2px solid rgba(126, 34, 206, 0.2); padding-bottom: 0.5rem;">
                    🩺 Especialidad: ${esp.nombre}
                </h2>
            `;

            // Tabla de Disponibilidad
            htmlGlobal += `
                <h4 style="margin-bottom:0.5rem; color:#334155;">➤ Doctores y Horarios (Hoy)</h4>
                <div style="overflow-x:auto; margin-bottom:1.5rem;">
                    <table style="width:100%; border-collapse: collapse; text-align:left; font-size: 0.95rem; background:white; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                        <thead>
                            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
                                <th style="padding:10px;">Médico</th>
                                <th style="padding:10px;">Horario</th>
                                <th style="padding:10px;">Fichas Totales</th>
                                <th style="padding:10px;">Fichas Libres</th>
                                <th style="padding:10px;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if(dataDisp.length === 0) {
                htmlGlobal += `<tr><td colspan="5" style="text-align:center; padding:10px; color:#64748b;">No hay turnos habilitados hoy.</td></tr>`;
            } else {
                dataDisp.forEach(d => {
                    let badge = d.estado === 'Disponible' ? 'background:#16a34a' : (d.estado === 'Lleno' ? 'background:#ea580c' : 'background:#dc2626');
                    htmlGlobal += `
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <td style="padding:10px; font-weight:500; color:#0f172a;">${d.medico}</td>
                            <td style="padding:10px; color:#475569;">${d.horario}</td>
                            <td style="padding:10px; font-weight:bold; color:#475569;">${d.limite}</td>
                            <td style="padding:10px; font-weight:bold; font-size:1.1em; color:${d.disponibles > 0 ? '#16a34a' : '#dc2626'}">${d.disponibles}</td>
                            <td style="padding:10px;"><span style="${badge}; color:white; padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">${d.estado} ${d.causa ? '(' + d.causa + ')' : ''}</span></td>
                        </tr>
                    `;
                });
            }

            htmlGlobal += `</tbody></table></div>`;

            // Tabla de Ausencias (Vacaciones)
            if (dataAuse.length > 0) {
                htmlGlobal += `
                    <h4 style="margin-bottom:0.5rem; color:#be123c;">➤ Médicos en Vacaciones / Permisos</h4>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse: collapse; text-align:left; font-size: 0.95rem; background:white; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                            <thead>
                                <tr style="background:#fee2e2; border-bottom:2px solid #fca5a5;">
                                    <th style="padding:10px;">Médico</th>
                                    <th style="padding:10px;">Fecha de Ausencia</th>
                                    <th style="padding:10px;">Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                dataAuse.forEach(a => {
                    const shortDate = a.fecha_ausencia ? a.fecha_ausencia.substring(0, 10) : '';
                    htmlGlobal += `
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <td style="padding:10px; font-weight:600; color:#881337;">Dr(a). ${a.nombre} ${a.apellido}</td>
                            <td style="padding:10px; font-weight:bold; color:#be123c;">${formatearFechaBolivia(shortDate)}</td>
                            <td style="padding:10px; color:#b91c1c;">${a.motivo || 'Permiso personal'}</td>
                        </tr>
                    `;
                });
                htmlGlobal += `</tbody></table></div>`;
            }

            htmlGlobal += `</div>`; // Fin del bloque de la especialidad
        });

        // Actualizar el DOM
        contenedorEspecialidades.innerHTML = htmlGlobal;
        msg.className = 'message';
        msg.textContent = '';

        // Actualizar hora de última actualización
        const ahora = new Date();
        document.getElementById('ultima-actualizacion').textContent =
            ahora.toLocaleTimeString('es-BO');
    } catch(err) {
        console.error(err);
        msg.textContent = '⚠️ Error en el servidor calculando disponibilidad y ausencias.';
        msg.className = 'message error';
    }
}

// Inicializar la carga a la primera vista
cargarVistaCompleta();

// Refrescar automáticamente cada 3 segundos en tiempo real
intervaloConsultas = setInterval(() => {
    cargarVistaCompleta();
}, 3000);

