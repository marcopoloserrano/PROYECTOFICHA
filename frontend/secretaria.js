const API_URL = '/api';

document.querySelector('#secretaria-app').innerHTML = `
  <div class="glass-card" style="border-top: 5px solid #0ea5e9; max-width: 1100px; margin: 0 auto;">
    <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <a href="/index.html" style="color:#64748b; font-size:0.9rem; text-decoration:none;">⬅ Volver al Inicio</a>
      <h1 style="margin:0; font-size:1.5rem;">📋 Confirmación de Asistencia</h1>
    </div>
    
    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
            <h3 style="margin:0; color:#0369a1;">Fichas para Hoy</h3>
            <p id="fecha-actual" style="margin:5px 0 0 0; color:#075985; font-weight:bold;"></p>
        </div>
        <button id="btn-refresh" class="action-btn" style="width:auto; padding:8px 16px; background:#0ea5e9;">🔄 Actualizar Lista</button>
    </div>

    <div id="tabla-fichas-container" style="overflow-x:auto;">
        <table style="width:100%; border-collapse: collapse; text-align:left; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <thead>
                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                    <th style="padding:15px;">Hora</th>
                    <th style="padding:15px;">Paciente</th>
                    <th style="padding:15px;">CI</th>
                    <th style="padding:15px;">Especialidad / Médico</th>
                    <th style="padding:15px;">Estado</th>
                    <th style="padding:15px; text-align:center;">Acción</th>
                </tr>
            </thead>
            <tbody id="lista-fichas-hoy">
                <tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">Cargando fichas...</td></tr>
            </tbody>
        </table>
    </div>

    <div id="sec-message" class="message"></div>
  </div>
`;

const listaFichas = document.getElementById('lista-fichas-hoy');
const msg = document.getElementById('sec-message');
const btnRefresh = document.getElementById('btn-refresh');

async function cargarFichasHoy() {
    try {
        const res = await fetch(`${API_URL}/fichas/hoy`);
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Error en el servidor');
        }
        const fichas = await res.json();
        
        document.getElementById('fecha-actual').textContent = new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        if (fichas.length === 0) {
            listaFichas.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No hay fichas programadas para hoy.</td></tr>';
            return;
        }

        listaFichas.innerHTML = '';
        fichas.forEach(f => {
            const esVigente = f.estado === 'Vigente' || f.estado === 'Pendiente';
            const colorEstado = f.estado === 'Confirmado' ? '#10b981' : (f.estado === 'Vigente' ? '#3b82f6' : '#64748b');
            
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            tr.innerHTML = `
                <td style="padding:15px; font-weight:bold; color:#0f172a;">${f.hora.substring(0,5)}</td>
                <td style="padding:15px;">${f.paciente_nombre} ${f.paciente_apellido}</td>
                <td style="padding:15px; color:#64748b;">${f.ci}</td>
                <td style="padding:15px;">
                    <span style="display:block; font-weight:600; font-size:0.85rem;">${f.especialidad_nombre}</span>
                    <span style="font-size:0.75rem; color:#64748b;">Dr. ${f.medico_nombre} ${f.medico_apellido}</span>
                </td>
                <td style="padding:15px;">
                    <span style="background:${colorEstado}; color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold;">${f.estado}</span>
                </td>
                <td style="padding:15px; text-align:center;">
                    ${f.estado === 'Vigente' || f.estado === 'Pendiente' ? 
                        `<button class="action-btn btn-confirm" data-id="${f.id_ficha}" style="width:auto; padding:6px 12px; font-size:0.8rem; background:#10b981;">✅ Confirmar Llegada</button>` : 
                        `<span style="color:#10b981; font-weight:bold;">Presente</span>`
                    }
                </td>
            `;
            listaFichas.appendChild(tr);
        });

        // Asignar eventos a los botones
        document.querySelectorAll('.btn-confirm').forEach(btn => {
            btn.onclick = () => confirmarAsistencia(btn.dataset.id);
        });

    } catch (e) {
        msg.textContent = '❌ ' + e.message;
        msg.className = 'message error';
    }
}

async function confirmarAsistencia(id) {
    if (!confirm('¿Confirmar que el paciente ha llegado y está listo para su atención?')) return;
    
    try {
        const res = await fetch(`${API_URL}/fichas/confirmar/${id}`, { method: 'PATCH' });
        const data = await res.json();
        
        if (res.ok) {
            msg.textContent = '✅ Paciente confirmado correctamente.';
            msg.className = 'message success';
            cargarFichasHoy();
        } else {
            msg.textContent = '⚠️ ' + data.message;
            msg.className = 'message error';
        }
    } catch (e) {
        msg.textContent = '❌ Error en la red.';
        msg.className = 'message error';
    }
    
    setTimeout(() => { msg.textContent = ''; msg.className = 'message'; }, 3000);
}

btnRefresh.onclick = cargarFichasHoy;
cargarFichasHoy();

// Auto-refresco cada 30 segundos
setInterval(cargarFichasHoy, 30000);
