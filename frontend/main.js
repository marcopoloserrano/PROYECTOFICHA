const userAuth = JSON.parse(localStorage.getItem('userAuth') || 'null');
if (!userAuth || userAuth.rol === 'paciente') {
    window.location.href = '/login.html';
}
document.body.classList.add('admin-layout');
const isSecretaria = userAuth.rol === 'secretaria';

const API_URL = '/api';
let pacientesGlobales = [];
let medicosGlobales = [];
let especialidadesGlobales = [];
let fichasAgendadasCache = [];

let tabsHtml = `
  <!-- Logo/Info -->
  <div style="padding: 0 10px; margin-bottom: 20px;">
    <h2 style="margin:0; color:var(--primary-color);">🏥 Clínica</h2>
    <p style="margin:5px 0 0; font-size:0.8rem; color:#64748b;">Panel de Control</p>
    <div style="margin-top: 10px; background:#f1f5f9; padding:8px; border-radius:8px; font-size:0.8rem;">
      👤 <b>${userAuth.nombre || "Usuario"}</b><br>
      <span style="color:var(--primary-color); text-transform:capitalize;">${userAuth.rol}</span>
    </div>
  </div>
  
  <button class="tab-btn active" id="tab-lista">📋 Dasboard Citas</button>
  <button class="tab-btn" id="tab-ficha">🩺 Agendar Cita</button>
  <button class="tab-btn" id="tab-paciente">👤 Gestionar Pacientes</button>
  <button class="tab-btn" id="tab-ausencia">🛑 Permisos</button>
`;

if (!isSecretaria) {
    tabsHtml += `
      <hr style="border-top:1px solid #cbd5e1; margin: 10px 0; width:100%;">
      <p style="font-size:0.7rem; color:#94a3b8; font-weight:bold; margin-left:10px; text-transform:uppercase;">Administración</p>
      <button class="tab-btn" id="tab-medico">👨‍⚕️ Médicos</button>
      <button class="tab-btn" id="tab-horario">🕒 Horarios</button>
      <button class="tab-btn" id="tab-especialidad">⚕️ Especialidades</button>
      <button class="tab-btn" id="tab-gestion">⚙️ CRUD / BD</button>
      <button class="tab-btn" id="tab-usuario">🔑 Usuarios de Sistema</button>
      <a href="/docs/diagrama_logica.html" target="_blank" style="text-decoration:none;" class="tab-btn">🧩 Ver Diagrama Lógica</a>
    `;
}

tabsHtml += `
  <div style="margin-top: auto;">
    <button id="btn-logout" style="width:100%; border:none; background:#fee2e2; color:#991b1b; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;">Cerrar Sesión</button>
  </div>
  
  <!-- MODAL MASIVO DE EDICIÓN PARA HORARIOS -->
  <div id="modal-horario-masivo" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
     <div style="background:white; padding:2rem; border-radius:12px; max-width:600px; width:90%; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
         <h2 style="color:var(--primary-color); margin-top:0;">📝 Modificar Turnos de Médico</h2>
         <p id="edit-horario-doc-name" style="font-weight:bold; color:#334155; margin-bottom:1.5rem;"></p>
         <form id="form-horario-masivo">
             <input type="hidden" id="edit-horario-medico-id">
             <div class="form-group" style="background:#f1f5f9; padding:15px; border-radius:8px; border:1px solid #cbd5e1;">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">Días de Atención:</label>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px;">
                  <label><input type="checkbox" name="edit_dias_chk" value="Lunes"> Lunes</label>
                  <label><input type="checkbox" name="edit_dias_chk" value="Martes"> Martes</label>
                  <label><input type="checkbox" name="edit_dias_chk" value="Miércoles"> Miércoles</label>
                  <label><input type="checkbox" name="edit_dias_chk" value="Jueves"> Jueves</label>
                  <label><input type="checkbox" name="edit_dias_chk" value="Viernes"> Viernes</label>
                  <label><input type="checkbox" name="edit_dias_chk" value="Sábado"> Sábado</label>
                  <label><input type="checkbox" name="edit_dias_chk" value="Domingo"> Domingo</label>
                </div>
             </div>
             <div class="row" style="margin-top:1rem;">
                <div class="form-group"><label>Hora Ingreso</label><input type="time" id="edit_hora_inicio" required></div>
                <div class="form-group"><label>Hora Salida</label><input type="time" id="edit_hora_fin" required></div>
                <div class="form-group"><label>Cupos/Día</label><input type="number" id="edit_limite_fichas" required min="1"></div>
             </div>
             <div style="display:flex; gap:10px; margin-top:20px;">
                 <button type="button" style="flex:1; padding:12px; border:none; background:#e2e8f0; border-radius:8px; font-weight:bold; cursor:pointer;" onclick="document.getElementById('modal-horario-masivo').style.display='none'">Cancelar</button>
                 <button type="submit" class="action-btn" style="flex:2; margin-top:0;">Actualizar Calendario Médico</button>
             </div>
         </form>
     </div>
  </div>
`;

document.querySelector('#app').innerHTML = `
  <!-- BARRA LATERAL -->
  <div class="sidebar">
    ${tabsHtml}
  </div>

  <!-- AREA PRINCIPAL -->
  <div class="main-content">
    <div class="admin-card">
    
      <!-- VISTA 0: LISTADO DE FICHAS DIARIAS (Modificado para agrupar por especialidad) -->
      <div id="vista-lista-fichas">
        <h1>Monitor Diario de Citas</h1>
        <p class="subtitle">Visualiza todas las fichas reservadas para el día de hoy o filtra por fecha.</p>
        
        <div class="form-group" style="max-width:250px;">
           <label>Filtrar por Fecha:</label>
           <input type="date" id="filtro-fecha-ficha">
        </div>
        
        <div id="tabla-fichas-agrupadas" style="margin-top:1.5rem;">
           <p>Cargando dashboard...</p>
        </div>
      </div>

      <!-- VISTA 1: AGENDAR FICHA -->
      <div id="vista-ficha" style="display: none;">
        <h1>Agendar Cita (Manual)</h1>
        <form id="ficha-form">
          <div class="form-group"><label>Paciente</label><select id="seleccionar-paciente" required><option value="">Cargando...</option></select></div>
          <div class="form-group"><label>Médico</label><select id="seleccionar-medico" required><option value="">Cargando...</option></select></div>
          
          <div id="manual-dias-step" style="display:none; margin-top: 1rem;">
             <label style="color:#0f172a; font-weight:800; margin-bottom: 10px; display:block; color:var(--primary-color);">Día de Atención</label>
             <div id="manual-dias-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;"></div>
          </div>
          
          <div id="manual-slots-step" style="display:none; background: #f8fafc; padding: 1.2rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 1rem;">
             <label style="color:#0f172a; font-weight:800; margin-bottom: 15px; display:block; color:var(--primary-color);">Horario de la Cita</label>
             <div id="manual-slots-container" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
             <p id="manual-slot-selected-text" style="color:var(--primary-color); font-size:1.1rem; font-weight:bold; margin-top:15px; display:none; text-align:center; padding-top:10px; border-top:1px dashed #cbd5e1;"></p>
          </div>

          <input type="hidden" id="fecha_ficha" required>
          <input type="hidden" id="hora_ficha" required>

          <button type="submit" class="action-btn" id="btn-submit-manual" disabled style="margin-top:20px;">Agendar Ficha Médica</button>
        </form>
      </div>

      <!-- VISTA PACIENTE, AUSENCIAS y DEMÁS (Mantenemos HTML estructural) -->
      <div id="vista-ausencia" style="display: none;">
          <h1>Excepción o Permiso Méd.</h1>
          <form id="ausencia-form">
              <div class="form-group"><label>Afectar al Médico:</label><select id="reg-ausencia-medico" required></select></div>
              <div class="row">
                  <div class="form-group"><label>Fecha Inicio:</label><input type="date" id="ausencia_fecha_inicio" required></div>
                  <div class="form-group"><label>Fecha Fin (Mismo día si vacío):</label><input type="date" id="ausencia_fecha_fin"></div>
              </div>
              <div class="form-group"><label>Motivo a mostrar al paciente (Opcional):</label><input type="text" id="ausencia_motivo" placeholder="Ej. Permiso médico"></div>
              <button type="submit" class="action-btn" style="background:#dc2626;">Deshabilitar Reservas ese Día</button>
          </form>
      </div>

      <div id="vista-paciente" style="display: none;">
        <h1>Registro de Pacientes</h1>
        <form id="paciente-form">
          <div class="row">
            <div class="form-group"><label>Nombre</label><input type="text" id="nombre" required></div>
            <div class="form-group"><label>Apellido</label><input type="text" id="apellido" required></div>
          </div>
          <div class="row">
            <div class="form-group"><label>CI</label><input type="text" id="ci" required></div>
            <!-- SE AGREGÓ FECHA DE NACIMIENTO AQUI POR PETICION 2 -->
            <div class="form-group"><label>Fecha Nacimiento</label><input type="date" id="fecha_nac" required></div>
          </div>
          <div class="row">
            <div class="form-group"><label>Teléfono</label><input type="text" id="telefono"></div>
            <div class="form-group"><label>Correo</label><input type="email" id="correo"></div>
          </div>
          <div class="form-group">
            <label>Cobertura</label>
            <select id="id_cobertura" required><option value="1">SUS</option><option value="2">PARTICULAR</option><option value="3">SEGURO</option></select>
          </div>
          <button type="submit" class="action-btn">Registrar Paciente</button>
        </form>
      </div>

      <!-- EXCLUSIVOS ADMIN -->
      ${!isSecretaria ? `
        <div id="vista-medico" style="display: none;">
          <h1>Registro de Médico</h1>
          <form id="medico-form">
            <div class="row">
                <div class="form-group"><label>Nombre</label><input type="text" id="med_nombre" required></div>
                <div class="form-group"><label>Apellido</label><input type="text" id="med_apellido" required></div>
            </div>
            <div class="form-group"><label>Teléfono</label><input type="text" id="med_telefono"></div>
            <div class="form-group">
                <label>Especialidades</label>
                <select id="med_especialidades" multiple style="height: 100px; padding: 0.5rem;" required></select>
            </div>
            <button type="submit" class="action-btn">Registrar Médico</button>
          </form>
        </div>

        <div id="vista-especialidad" style="display: none;">
            <h1>Crear Especialidad</h1>
            <form id="especialidad-form">
               <div class="form-group"><label>Nombre Especialidad</label><input type="text" id="esp_nombre" required></div>
               <button type="submit" class="action-btn">Crear Especialidad</button>
            </form>
        </div>

        <div id="vista-horario" style="display: none;">
          <h1>Calendario Semanal de Médicos</h1>
          <p class="subtitle">Configura y gestiona los horarios de atención de forma agrupada.</p>
          
          <div style="background:#f8fafc; padding:1.5rem; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:2rem;">
            <h3 style="margin-top:0; color:var(--primary-color);">➕ Registrar Nuevo Horario</h3>
            <form id="horario-form">
              <div class="form-group"><label>Médico Tratante</label><select id="reg-horario-medico" required></select></div>
              <div class="form-group" style="background:white; padding:12px; border-radius:8px; border:1px solid #cbd5e1;">
                <label style="margin-bottom:8px; display:block; font-weight:700;">Días de Trabajo:</label>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;">
                  <label><input type="checkbox" name="dias_chk" value="Lunes"> Lunes</label>
                  <label><input type="checkbox" name="dias_chk" value="Martes"> Martes</label>
                  <label><input type="checkbox" name="dias_chk" value="Miércoles"> Miércoles</label>
                  <label><input type="checkbox" name="dias_chk" value="Jueves"> Jueves</label>
                  <label><input type="checkbox" name="dias_chk" value="Viernes"> Viernes</label>
                  <label><input type="checkbox" name="dias_chk" value="Sábado"> Sábado</label>
                  <label><input type="checkbox" name="dias_chk" value="Domingo"> Domingo</label>
                </div>
              </div>
              <div class="row">
                <div class="form-group"><label>Hora Ingreso</label><input type="time" id="hora_inicio" required></div>
                <div class="form-group"><label>Hora Salida</label><input type="time" id="hora_fin" required></div>
                <div class="form-group"><label>Cupos/Día</label><input type="number" id="limite_fichas" required min="1" value="10"></div>
              </div>
              <button type="submit" class="action-btn" id="btn-horario" style="margin-top:0.5rem;">Guardar Horario Múltiple</button>
            </form>
          </div>

          <div id="lista-horarios-agrupados">
            <p style="text-align:center; color:#64748b; padding:2rem;">Cargando horarios agrupados...</p>
          </div>
        </div>

        <div id="vista-gestion" style="display: none;">
          <h1>Gestión Integral Interactiva</h1>
          <select id="gestion-tabla-select" style="padding:10px; margin-bottom:1rem; width:100%; border:1px solid #cbd5e1; border-radius:5px;">
            <option value="paciente">👤 Pacientes</option>
            <option value="medico">👨‍⚕️ Médicos</option>
            <option value="especialidad">⚕️ Especialidades</option>
            <option value="ficha">📋 Fichas Asignadas</option>
            <option value="ausencia_medico">🛑 Permisos y Ausencias</option>
            <option value="horario">🕒 Horarios Médicos</option>
          </select>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse: collapse; text-align:left; font-size: 0.85rem; background:white;">
               <thead id="gestion-thead"></thead>
               <tbody id="gestion-tbody"></tbody>
            </table>
          </div>
        </div>

        <div id="vista-usuario" style="display: none;">
            <h1>Crear Nuevo Usuario Personal</h1>
            <p class="subtitle">Registra nuevas Secretarias o Administradores de Sistema.</p>
            <form id="usuario-form">
               <div class="form-group"><label>Nombre de Usuario</label><input type="text" id="usr_nombre" required></div>
               <div class="form-group"><label>Contraseña</label><input type="password" id="usr_pass" required></div>
               <div class="form-group"><label>Rol</label>
                   <select id="usr_rol" required>
                       <option value="1">Administrador</option>
                       <option value="2">Secretaria / Recepcionista</option>
                   </select>
               </div>
               <button type="submit" class="action-btn">Crear Usuario</button>
            </form>
        </div>
      ` : ''}

      <div id="status-message" class="message"></div>
    </div>
  </div>
  
  ${!isSecretaria ? `
  <!-- MODAL DE EDICIÓN PARA VISTA GESTIÓN -->
  <div id="gestion-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
     <div style="background:white; padding:2rem; border-radius:8px; max-width:500px; width:90%; max-height:90vh; overflow-y:auto;">
         <h2 id="gestion-modal-title">Modificar Registro</h2>
         <form id="gestion-modal-form">
             <div id="gestion-modal-fields"></div>
             <div style="display:flex; gap:10px; margin-top:20px;">
                 <button type="button" style="padding:10px;" onclick="document.getElementById('gestion-modal').style.display='none'">Cancelar</button>
                 <button type="submit" class="action-btn" style="flex:1;">Guardar Cambios</button>
             </div>
         </form>
     </div>
  </div>
  ` : ''}
`;

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('userAuth');
    window.location.href = '/login.html';
});

// Navegación Dinámica
const tabs = {
  lista: { btn: document.getElementById('tab-lista'), vista: document.getElementById('vista-lista-fichas') },
  ficha: { btn: document.getElementById('tab-ficha'), vista: document.getElementById('vista-ficha') },
  ausencia: { btn: document.getElementById('tab-ausencia'), vista: document.getElementById('vista-ausencia') },
  paciente: { btn: document.getElementById('tab-paciente'), vista: document.getElementById('vista-paciente') }
};

if (!isSecretaria) {
  tabs.horario = { btn: document.getElementById('tab-horario'), vista: document.getElementById('vista-horario') };
  tabs.especialidad = { btn: document.getElementById('tab-especialidad'), vista: document.getElementById('vista-especialidad') };
  tabs.medico = { btn: document.getElementById('tab-medico'), vista: document.getElementById('vista-medico') };
  tabs.gestion = { btn: document.getElementById('tab-gestion'), vista: document.getElementById('vista-gestion') };
  tabs.usuario = { btn: document.getElementById('tab-usuario'), vista: document.getElementById('vista-usuario') };
}

const statusMessage = document.getElementById('status-message');

function activateTab(key) {
  Object.values(tabs).forEach(t => { t.btn.classList.remove('active'); t.vista.style.display = 'none'; });
  tabs[key].btn.classList.add('active'); tabs[key].vista.style.display = 'block'; statusMessage.className = 'message';
  
  if (key === 'lista') renderFichasAgrupadas();
  if (key === 'horario' && !isSecretaria) renderHorariosAgrupados();
  if (key === 'gestion' && !isSecretaria) cargarDatosGestion();
}
Object.keys(tabs).forEach(key => { tabs[key].btn.addEventListener('click', () => activateTab(key)); });

/* LOGICA: LISTADO TABLA DE FICHAS DIARIAS AGRUPADAS POR ESPECIALIDAD */
async function cargarFichasDesdeBackend() {
   try {
       const res = await fetch(API_URL + '/fichas');
       fichasAgendadasCache = await res.json();
       renderFichasAgrupadas();
   } catch(e) { console.error("Error al obtener fichas", e); }
}

function renderFichasAgrupadas() {
    const contenedor = document.getElementById('tabla-fichas-agrupadas');
    contenedor.innerHTML = '';
    
    // Filtro por Fecha (o Día Actual por defecto)
    let fechaFiltro = document.getElementById('filtro-fecha-ficha').value;
    if (!fechaFiltro) {
        // Fijar a la fecha de hoy por defecto si esta vacío
        const hoy = new Date();
        const y = hoy.getFullYear(); const m = String(hoy.getMonth()+1).padStart(2,'0'); const d = String(hoy.getDate()).padStart(2,'0');
        fechaFiltro = `${y}-${m}-${d}`;
        document.getElementById('filtro-fecha-ficha').value = fechaFiltro;
    }
    
    // Filtrar fichas que corresponden a la fecha elegida
    const fichasHoy = fichasAgendadasCache.filter(f => f.fecha && f.fecha.substring(0,10) === fechaFiltro);
    
    if(fichasHoy.length === 0){
        contenedor.innerHTML = '<div style="background:white; padding:20px; border-radius:8px; text-align:center; color:#64748b;">No hay citas agendadas para esta fecha.</div>';
        return;
    }

    // Agrupar fichas por Especialidad (buscando la especialidad del doctor en los datos globales)
    const agrupado = {};
    
    fichasHoy.forEach(f => {
        // Buscar médico para saber su especialidad principal
        const docInfo = medicosGlobales.find(m => m.id_medico == f.id_medico);
        let nombreEspecialidad = "General / Sin Asignar";
        
        if (docInfo && docInfo.especialidades && docInfo.especialidades.length > 0) {
            // Tomamos la primera especialidad principal del doctor
            const espObj = especialidadesGlobales.find(e => e.id_especialidad == docInfo.especialidades[0]);
            if (espObj) nombreEspecialidad = espObj.nombre;
        }
        
        if (!agrupado[nombreEspecialidad]) agrupado[nombreEspecialidad] = [];
        agrupado[nombreEspecialidad].push(f);
    });
    
    // Renderizado HTML
    Object.keys(agrupado).forEach(especialidad => {
        const fichasEsp = agrupado[especialidad];
        
        let htmlTabla = `
            <div style="background: white; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 20px; overflow: hidden;">
                <div style="background: var(--primary-color); color: white; padding: 10px 15px; font-weight: bold; font-size: 1.1rem; display:flex; justify-content: space-between;">
                    ${especialidad}
                    <span>${fichasEsp.length} cita(s)</span>
                </div>
                <table style="width:100%; border-collapse: collapse; text-align:left; font-size: 0.9rem;">
                  <thead>
                    <tr style="background:#f8fafc; border-bottom:1px solid #cbd5e1;">
                      <th style="padding:10px;">Hora</th>
                      <th style="padding:10px;">Paciente</th>
                      <th style="padding:10px;">Doctor</th>
                      <th style="padding:10px;">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
        `;
        
        // Ordenar por hora
        fichasEsp.sort((a,b) => a.hora.localeCompare(b.hora)).forEach(f => {
           const badgeColor = f.estado === 'Pendiente' ? '#eab308' : (f.estado.includes('Reserva') ? '#3b82f6' : '#16a34a');
           htmlTabla += `
             <tr style="border-bottom:1px solid #e2e8f0;">
               <td style="padding:10px; font-weight:bold; color:#334155;">${f.hora.substring(0,5)}</td>
               <td style="padding:10px;"><b>${f.paciente_nombre} ${f.paciente_apellido}</b><br><small style="color:#64748b;">CI: ${f.ci}</small></td>
               <td style="padding:10px; color:#475569;">Dr. ${f.medico_nombre}</td>
               <td style="padding:10px;"><span style="background:${badgeColor}; color:white; padding:4px 8px; border-radius:12px; font-size:0.7rem; font-weight:bold;">${f.estado}</span></td>
             </tr>
           `;
        });
        
        htmlTabla += `</tbody></table></div>`;
        contenedor.innerHTML += htmlTabla;
    });
}
document.getElementById('filtro-fecha-ficha').addEventListener('change', renderFichasAgrupadas);


/* Cargar Selectores Base */
async function cargarDatosIniciales() {
  try {
    cargarFichasDesdeBackend(); // Load list globally
    
    const espReq = await fetch(API_URL + '/especialidades');
    especialidadesGlobales = await espReq.json();
    const selectEsp = document.getElementById('med_especialidades');
    if (selectEsp) {
        selectEsp.innerHTML = '';
        especialidadesGlobales.forEach(e => selectEsp.innerHTML += '<option value="' + e.id_especialidad + '">' + e.nombre + '</option>');
    }

    const medReq = await fetch(API_URL + '/medicos');
    medicosGlobales = await medReq.json();
    let htmlMedicos = '<option value="">-- Selecciona un Médico --</option>';
    medicosGlobales.forEach(m => htmlMedicos += '<option value="' + m.id_medico + '">Dr. ' + m.nombre + ' ' + m.apellido + '</option>');
    
    if(document.getElementById('seleccionar-medico')) document.getElementById('seleccionar-medico').innerHTML = htmlMedicos;
    if(document.getElementById('reg-horario-medico')) document.getElementById('reg-horario-medico').innerHTML = htmlMedicos;
    if(document.getElementById('reg-ausencia-medico')) document.getElementById('reg-ausencia-medico').innerHTML = htmlMedicos;

    const pacReq = await fetch(API_URL + '/pacientes');
    pacientesGlobales = await pacReq.json();
    const selectPac = document.getElementById('seleccionar-paciente');
    if (selectPac) {
        selectPac.innerHTML = '<option value="">-- Selecciona un Paciente --</option>';
        pacientesGlobales.forEach(p => selectPac.innerHTML += '<option value="' + p.id_paciente + '">' + p.nombre + ' ' + p.apellido + '</option>');
    }
  } catch(e) { console.error("Error cargando selects:", e); }
}
cargarDatosIniciales();

/* FORMS SUBMITS */
document.getElementById('ausencia-form').addEventListener('submit', async (e) => {
    e.preventDefault(); statusMessage.className = 'message';
    try {
        const payload = {
            id_medico: parseInt(document.getElementById('reg-ausencia-medico').value),
            fecha_inicio: document.getElementById('ausencia_fecha_inicio').value,
            fecha_fin: document.getElementById('ausencia_fecha_fin').value || document.getElementById('ausencia_fecha_inicio').value,
            motivo: document.getElementById('ausencia_motivo').value
        };
        const res = await fetch(API_URL + '/ausencias/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if(res.ok) { statusMessage.textContent = '🛑 Día excluido de reservas para este médico exitosamente.'; statusMessage.className='message success'; e.target.reset(); }
        else { statusMessage.innerHTML = '⚠️ Error guardando ausencia en MySQL.'; statusMessage.className='message error'; }
    } catch(err) {} 
});

document.getElementById('horario-form')?.addEventListener('submit', async (e) => {
  e.preventDefault(); statusMessage.className = 'message';
  
  const checkBoxes = document.querySelectorAll('input[name="dias_chk"]:checked');
  if (checkBoxes.length === 0) {
      statusMessage.textContent = '⚠️ Debes marcar por lo menos un día de la semana.'; statusMessage.className='message error'; return;
  }
  const arrayDias = Array.from(checkBoxes).map(chk => chk.value);

  const data = {
    id_medico: parseInt(document.getElementById('reg-horario-medico').value),
    dias_semana: arrayDias,
    limite_fichas: parseInt(document.getElementById('limite_fichas').value),
    hora_inicio: document.getElementById('hora_inicio').value,
    hora_fin: document.getElementById('hora_fin').value
  };
  try {
    const res = await fetch(API_URL + '/horarios/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if(res.ok) { statusMessage.textContent = '🕒 Horarios de días agregados en masa.'; statusMessage.className = 'message success'; e.target.reset(); }
    else { statusMessage.innerHTML = '⚠️ Error en MySQL. La base de datos falló al guardar.'; statusMessage.className = 'message error'; }
  } catch(e) {}
});

document.getElementById('especialidad-form')?.addEventListener('submit', async (e) => {
  e.preventDefault(); statusMessage.className = 'message';
  try {
    const res = await fetch(API_URL + '/especialidades/crear', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: document.getElementById('esp_nombre').value })
    });
    if (res.ok) { statusMessage.textContent = '⚕️ Especialidad agregada correctamente.'; statusMessage.className = 'message success'; e.target.reset(); cargarDatosIniciales(); }
    else { statusMessage.innerHTML = '⚠️ Error: Endpoint no encontrado.<br><b>Asegúrate de haber reiniciado el servidor Node.</b>'; statusMessage.className = 'message error'; }
  } catch(err) {}
});

document.getElementById('medico-form')?.addEventListener('submit', async (e) => {
  e.preventDefault(); statusMessage.className = 'message';
  const sel = document.getElementById('med_especialidades');
  const arr = Array.from(sel?.selectedOptions || []).map(opt => parseInt(opt.value));
  const data = { nombre: document.getElementById('med_nombre').value, apellido: document.getElementById('med_apellido').value, telefono: document.getElementById('med_telefono').value, especialidades: arr };
  try {
    const res = await fetch(API_URL + '/medicos/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if(res.ok) { statusMessage.textContent = '👨‍⚕️ Médico creado.'; statusMessage.className = 'message success'; e.target.reset(); cargarDatosIniciales(); }
  } catch(e) {}
});

document.getElementById('paciente-form')?.addEventListener('submit', async (e) => {
  e.preventDefault(); statusMessage.className = 'message';
  const data = { 
      nombre: document.getElementById('nombre').value, 
      apellido: document.getElementById('apellido').value, 
      ci: document.getElementById('ci').value, 
      fecha_nacimiento: document.getElementById('fecha_nac').value,
      telefono: document.getElementById('telefono').value, 
      correo: document.getElementById('correo').value, 
      id_cobertura: parseInt(document.getElementById('id_cobertura').value) 
  };
  try {
    const res = await fetch(API_URL + '/pacientes/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if(res.ok) { statusMessage.textContent = '✅ Paciente creado.'; statusMessage.className = 'message success'; e.target.reset(); cargarDatosIniciales(); }
  } catch(e) {}
});

if (!isSecretaria) {
    document.getElementById('usuario-form').addEventListener('submit', async (e) => {
        e.preventDefault(); statusMessage.className = 'message';
        const data = {
            usuario: document.getElementById('usr_nombre').value,
            contraseña: document.getElementById('usr_pass').value,
            id_rol: parseInt(document.getElementById('usr_rol').value)
        };
        try {
            const res = await fetch(API_URL + '/auth/registrar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
            if (res.ok) {
                statusMessage.textContent = '🔑 Usuario Creado correctamente (Podrá Iniciar Sesión de inmediato).';
                statusMessage.className = 'message success'; e.target.reset();
            } else {
                statusMessage.textContent = '❌ Error al crear usuario.';
                statusMessage.className = 'message error';
            }
        }catch(e){}
    });
}

/* ========================================================
   LOGICA AGENDAR MANUAL: GENERACIÓN DE BOTONES
======================================================== */
document.getElementById('seleccionar-medico')?.addEventListener('change', async (e) => {
    const mdId = parseInt(e.target.value);
    const diasContainer = document.getElementById('manual-dias-container');
    const diasStep = document.getElementById('manual-dias-step');
    const slotsContainer = document.getElementById('manual-slots-container');
    const slotsStep = document.getElementById('manual-slots-step');
    const btnSubmit = document.getElementById('btn-submit-manual');
    const txtSelected = document.getElementById('manual-slot-selected-text');
    
    document.getElementById('fecha_ficha').value = '';
    document.getElementById('hora_ficha').value = '';
    btnSubmit.disabled = true;
    txtSelected.style.display = 'none';
    txtSelected.textContent = '';
    slotsStep.style.display = 'none';
    
    if (!mdId) {
        diasStep.style.display = 'none';
        return;
    }
    
    diasStep.style.display = 'block';
    diasContainer.innerHTML = '<p style="color:#64748b;">Calculando disponibilidad...</p>';
    
    try {
        const [horariosRes, ausenciasRes, fichasRes] = await Promise.all([
            fetch(API_URL + '/horarios').then(r => r.json()),
            fetch(API_URL + '/ausencias').then(r => r.json()),
            fetch(API_URL + '/fichas').then(r => r.json())
        ]);
        
        const horariosDr = horariosRes.filter(h => h.id_medico === mdId);
        const ausenciasDr = ausenciasRes.filter(a => a.id_medico === mdId);
        const fichasDr = fichasRes.filter(f => f.id_medico === mdId && (f.estado === 'Pendiente' || f.estado === 'Agendada en Local' || f.estado.includes('Reserva')));
        
        if (horariosDr.length === 0) {
            diasContainer.innerHTML = '<p style="color:#ef4444;">Este médico no tiene horarios configurados.</p>';
            return;
        }
        
        const nomDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const nomMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        
        let diasAgrupados = [];
        
        for (let i = 0; i < 7; i++) {
            const tempDate = new Date(hoy);
            tempDate.setDate(hoy.getDate() + i);
            const wDay = tempDate.getDay();
            
            const nomDia = nomDias[wDay];
            const horarioDia = horariosDr.find(h => h.dia_semana === nomDia);
            
            if (horarioDia) {
                let mesPad = (tempDate.getMonth() + 1).toString().padStart(2, '0');
                let diaPad = tempDate.getDate().toString().padStart(2, '0');
                const tempStr = `${tempDate.getFullYear()}-${mesPad}-${diaPad}`;
                const esAusente = ausenciasDr.some(a => a.fecha_ausencia.startsWith(tempStr));
                
                if (!esAusente) {
                    const [hIni, mIni] = horarioDia.hora_inicio.split(':').map(Number);
                    const [hFin, mFin] = horarioDia.hora_fin.split(':').map(Number);
                    
                    let slotTime = new Date(tempDate);
                    slotTime.setHours(hIni, mIni, 0, 0);
                    const endTime = new Date(tempDate);
                    endTime.setHours(hFin, mFin, 0, 0);
                    
                    let slotsDeEsteDia = [];
                    
                    while (slotTime < endTime) {
                        const hStr = slotTime.getHours().toString().padStart(2, '0');
                        const minStr = slotTime.getMinutes().toString().padStart(2, '0');
                        const horaAct = `${hStr}:${minStr}`;
                        
                        const realNow = new Date();
                        if (i === 0 && slotTime <= realNow) {
                            slotTime.setMinutes(slotTime.getMinutes() + 30);
                            continue;
                        }

                        const fichasEsteTurno = fichasDr.filter(f => f.fecha.startsWith(tempStr) && f.id_horario == horarioDia.id_horario);
                        const numOcupadas = fichasEsteTurno.length;
                        const yaOcupadoExacto = fichasEsteTurno.some(f => f.hora.startsWith(horaAct));
                        
                        if (!yaOcupadoExacto && numOcupadas < horarioDia.limite_fichas) {
                            slotsDeEsteDia.push({
                                fechaFront: `${tempDate.getDate()}/${nomMeses[tempDate.getMonth()]}`,
                                hora: horaAct
                            });
                        }
                        slotTime.setMinutes(slotTime.getMinutes() + 30);
                    }
                    
                    if (slotsDeEsteDia.length > 0) {
                        diasAgrupados.push({
                            nomDia: nomDia,
                            horaTxt: `${horarioDia.hora_inicio.substring(0,5)} - ${horarioDia.hora_fin.substring(0,5)}`,
                            fechaIso: tempStr,
                            fechaFrontStr: `${tempDate.getDate()} de ${nomMeses[tempDate.getMonth()]}`,
                            slots: slotsDeEsteDia
                        });
                    }
                }
            }
        }
        
        diasContainer.innerHTML = '';
        if (diasAgrupados.length === 0) {
            diasContainer.innerHTML = '<p style="color:#d97706;">⚠️ No hay disponibilidad los próximos 7 días.</p>';
            return;
        }
        
        diasAgrupados.forEach(diaData => {
            const btnDia = document.createElement('button');
            btnDia.type = 'button';
            btnDia.style.cssText = "background: white; border: 1px solid #10b981; color: var(--primary-color); padding: 15px; border-radius: 8px; cursor: pointer; text-align: center; transition: 0.2s;";
            btnDia.innerHTML = `<span style="font-weight:bold; font-size:1.1rem; display:block; color:#0f172a;">${diaData.nomDia}</span><span style="font-size:0.9rem; font-weight:600; color:#10b981;">${diaData.fechaFrontStr}</span><br><small style="color:#64748b; font-size:0.8rem;">${diaData.horaTxt}</small>`;
            
            btnDia.onmouseover = () => { if(btnDia.className !== 'active-dia') { btnDia.style.background = '#ecfdf5'; } };
            btnDia.onmouseout = () => { if(btnDia.className !== 'active-dia') { btnDia.style.background = 'white'; } };
            
            btnDia.onclick = () => {
                const previos = diasContainer.querySelectorAll('button');
                previos.forEach(b => {
                    b.style.background = 'white';
                    b.style.border = '1px solid #10b981';
                    b.className = '';
                });
                
                btnDia.style.background = '#10b981';
                btnDia.style.color = 'white';
                btnDia.style.border = '1px solid #10b981';
                btnDia.innerHTML = `<span style="font-weight:bold; font-size:1.1rem; display:block; color:white;">${diaData.nomDia}</span><span style="font-size:0.9rem; font-weight:600; color:white;">${diaData.fechaFrontStr}</span><br><small style="color:white; font-size:0.8rem;">${diaData.horaTxt}</small>`;
                btnDia.className = 'active-dia';
                
                // Limpiar step 2
                document.getElementById('fecha_ficha').value = '';
                document.getElementById('hora_ficha').value = '';
                btnSubmit.disabled = true;
                txtSelected.style.display = 'none';
                
                // Mostrar slots de este dia
                slotsStep.style.display = 'block';
                slotsContainer.innerHTML = '';
                
                diaData.slots.forEach(slot => {
                    const btnSlot = document.createElement('button');
                    btnSlot.type = 'button';
                    btnSlot.style.cssText = "background: white; border: 1px solid var(--primary-color); color: var(--primary-color); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; font-size: 0.95rem;";
                    btnSlot.textContent = slot.hora;
                    
                    btnSlot.onmouseover = () => { if(btnSlot.className !== 'active-slot') { btnSlot.style.background = '#ecfdf5'; } };
                    btnSlot.onmouseout = () => { if(btnSlot.className !== 'active-slot') { btnSlot.style.background = 'white'; } };
                    
                    btnSlot.onclick = () => {
                        slotsContainer.querySelectorAll('button').forEach(b => {
                            b.style.background = 'white';
                            b.style.color = 'var(--primary-color)';
                            b.className = '';
                        });
                        
                        btnSlot.style.background = 'var(--primary-color)';
                        btnSlot.style.color = 'white';
                        btnSlot.className = 'active-slot';
                        
                        document.getElementById('fecha_ficha').value = diaData.fechaIso;
                        document.getElementById('hora_ficha').value = slot.hora;
                        btnSubmit.disabled = false;
                        
                        txtSelected.style.display = 'block';
                        txtSelected.innerHTML = `✅ Cita seleccionada: ${diaData.nomDia} ${diaData.fechaFrontStr} a las ${slot.hora}`;
                    };
                    slotsContainer.appendChild(btnSlot);
                });
            };
            diasContainer.appendChild(btnDia);
        });

    } catch (e) {
        console.error(e);
        diasContainer.innerHTML = '<p style="color:#ef4444;">Error cargando disponibilidad.</p>';
    }
});

document.getElementById('ficha-form').addEventListener('submit', async (e) => {
  e.preventDefault(); statusMessage.className = 'message';
  const data = { id_paciente: parseInt(document.getElementById('seleccionar-paciente').value), id_medico: parseInt(document.getElementById('seleccionar-medico').value), fecha: document.getElementById('fecha_ficha').value, hora: document.getElementById('hora_ficha').value, estado: 'Agendada en Local' };
  try {
    const res = await fetch(API_URL + '/fichas/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { 
      statusMessage.textContent = '🎯 Ficha agendada manualmente.'; 
      statusMessage.className = 'message success'; 
      e.target.reset(); 
      cargarFichasDesdeBackend(); 
    } else {
      const errorData = await res.json();
      statusMessage.textContent = '⚠️ ' + (errorData.message || 'Error al agendar la ficha.'); 
      statusMessage.className = 'message error';
    }
  } catch(err) {
    statusMessage.textContent = '❌ Error de conexión con el servidor.';
    statusMessage.className = 'message error';
  }
});

/* ========================================================
   LÓGICA: GESTIÓN INTERACTIVA (VER, EDITAR, ELIMINAR)
======================================================== */
const gestionSelect = document.getElementById('gestion-tabla-select');
let dbTablesCache = {};
let currentEditTable = null;
let currentEditPk = null;
let currentEditId = null;

async function cargarDatosGestion() {
    try {
        const res = await fetch(`${API_URL}/db-test`);
        const data = await res.json();
        if(data.success) {
            dbTablesCache = data.tables;
            renderTablaGestion();
        }
    } catch(e) { console.error("Error cargando DB para gestión:", e); }
}

function renderTablaGestion() {
    const tableName = gestionSelect.value;
    const tableData = dbTablesCache[tableName];
    if(!tableData) return;

    const thead = document.getElementById('gestion-thead');
    const tbody = document.getElementById('gestion-tbody');

    const pkCol = (tableData.columnsMeta || []).find(c => c.key === 'PRI');
    const pkField = pkCol ? pkCol.field : tableData.columns[0];

    // Cabecera
    let headHtml = '<tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">';

    // Para horario: cabecera personalizada
    if (tableName === 'horario') {
        ['#', 'Doctor', 'Día', 'Hora Inicio', 'Hora Fin', 'Cupos Máx.', 'Acciones'].forEach(h => {
            headHtml += `<th style="padding:10px;">${h}</th>`;
        });
        headHtml += '</tr>';
        thead.innerHTML = headHtml;
    } else {
        tableData.columns.forEach(c => {
            if (tableName === 'paciente' && c === 'id_cobertura') {
                headHtml += `<th style="padding:10px;">Cobertura</th>`;
            } else if (tableName === 'ficha' && c === 'id_paciente') {
                headHtml += `<th style="padding:10px;">Paciente</th>`;
            } else if ((tableName === 'ficha' || tableName === 'ausencia_medico') && c === 'id_medico') {
                headHtml += `<th style="padding:10px;">Médico</th>`;
                if (tableName === 'ficha') headHtml += `<th style="padding:10px;">Especialidades</th>`;
            } else {
                headHtml += `<th style="padding:10px;">${c}</th>`;
            }
        });
        if (tableName === 'medico') headHtml += `<th style="padding:10px;">Especialidades</th>`;
        headHtml += '<th style="padding:10px;">Acciones</th></tr>';
        thead.innerHTML = headHtml;
    }

    // Cuerpo
    let bodyHtml = '';

    // Renderizado especial para Horario (AGRUPADO)
    if (tableName === 'horario') {
        thead.innerHTML = ''; // Limpiar cabecera para el modo agrupado
        tbody.innerHTML = '<tr><td style="padding:0;"><div id="gestion-horarios-container" style="padding:1rem;"></div></td></tr>';
        renderHorariosAgrupados('gestion-horarios-container');
        return;
    }
    
    let colspanVal = tableData.columns.length + 1;
    if (tableName === 'medico' || tableName === 'ficha') colspanVal += 1;

    if (tableData.data.length === 0) {
        bodyHtml = `<tr><td colspan="${colspanVal}" style="text-align:center; padding:20px; color:#64748b;">No hay registros disponibles.</td></tr>`;
    } else {
        tableData.data.forEach(row => {
            const pkValue = row[pkField];
            bodyHtml += '<tr style="border-bottom:1px solid #e2e8f0;">';
            
            tableData.columns.forEach(c => {
                let val = row[c];
                
                // Formateo de Cobertura para paciente
                if (tableName === 'paciente' && c === 'id_cobertura') {
                    if (val === 1) val = '<span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:11px;">SUS</span>';
                    else if (val === 2) val = '<span style="background:#ffedd5; color:#c2410c; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:11px;">PARTICULAR</span>';
                    else if (val === 3) val = '<span style="background:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:11px;">SEGURO</span>';
                    else val = '<span style="color:#94a3b8"><i>N/A</i></span>';
                    bodyHtml += `<td style="padding:8px;">${val}</td>`;
                } 
                // Sustitución de ID por Nombre en Fichas
                else if (tableName === 'ficha' && c === 'id_paciente') {
                    const pic = pacientesGlobales.find(p => p.id_paciente == val);
                    const name = pic ? `<b>${pic.nombre} ${pic.apellido}</b>` : `<i>ID ${val}</i>`;
                    bodyHtml += `<td style="padding:8px; font-size:13px;">${name}</td>`;
                } 
                else if ((tableName === 'ficha' || tableName === 'ausencia_medico') && c === 'id_medico') {
                    const docInfo = medicosGlobales.find(m => m.id_medico == val);
                    const name = docInfo ? `Dr. ${docInfo.nombre} ${docInfo.apellido}` : `<i>ID ${val}</i>`;
                    bodyHtml += `<td style="padding:8px; font-size:13px;">${name}</td>`;
                    
                    if (tableName === 'ficha') {
                        // Columna extra dinámica para Especialidades del Médico
                        let espHtml = '<span style="color:#94a3b8; font-size:12px;"><i>Ninguna</i></span>';
                        if (docInfo && docInfo.especialidades && docInfo.especialidades.length > 0) {
                            const espNombres = docInfo.especialidades.map(idEsp => {
                                const eObj = especialidadesGlobales.find(e => e.id_especialidad == idEsp);
                                return eObj ? eObj.nombre : `Descon. (${idEsp})`;
                            });
                            espHtml = `<span style="font-size:12px; color:#6b7280;"><b>${espNombres.join(', ')}</b></span>`;
                        }
                        bodyHtml += `<td style="padding:8px;">${espHtml}</td>`;
                    }
                } 
                // Campos habituales estandarizados
                else {
                    if(val === null) val = '<span style="color:#94a3b8"><i>Vacío</i></span>';
                    else if(typeof val === 'string' && val.includes('T') && val.length >= 10 && val.includes('-')) val = val.split('T')[0];
                    bodyHtml += `<td style="padding:8px;">${val}</td>`;
                }
            });

            // Columna de Especialidades para medico (Tabla de médicos principal)
            if (tableName === 'medico') {
                const docInfo = medicosGlobales.find(m => m.id_medico == pkValue);
                if (docInfo && docInfo.especialidades && docInfo.especialidades.length > 0) {
                    const nombresEspecialidades = docInfo.especialidades.map(idEsp => {
                        const obj = especialidadesGlobales.find(e => e.id_especialidad == idEsp);
                        return obj ? obj.nombre : `Descon. (${idEsp})`;
                    });
                    bodyHtml += `<td style="padding:8px; font-size:12px; color:#6b7280;"><b>${nombresEspecialidades.join(', ')}</b></td>`;
                } else {
                    bodyHtml += `<td style="padding:8px;"><span style="color:#94a3b8; font-size:12px;"><i>Ninguna</i></span></td>`;
                }
            }

            bodyHtml += `
                <td style="padding:8px; display:flex; gap:5px;">
                    <button class="btn-edit-gestion" title="Modificar Fila" style="background:#3b82f6; color:white; border:none; padding:6px 12px; cursor:pointer; border-radius:4px; font-size:12px;" data-table="${tableName}" data-pk="${pkField}" data-id="${pkValue}">✏️ Editar</button>
                    <button class="btn-delete-gestion" title="Eliminar Fila" style="background:#ef4444; color:white; border:none; padding:6px 12px; cursor:pointer; border-radius:4px; font-size:12px;" data-table="${tableName}" data-pk="${pkField}" data-id="${pkValue}">🗑️ Borrar</button>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = bodyHtml;

    document.querySelectorAll('.btn-delete-gestion').forEach(btn => btn.addEventListener('click', handleDeleteGestion));
    document.querySelectorAll('.btn-edit-gestion').forEach(btn => btn.addEventListener('click', handleEditGestion));
}

gestionSelect.addEventListener('change', renderTablaGestion);

async function handleDeleteGestion(e) {
    const btn = e.currentTarget;
    const {table, pk, id} = btn.dataset;
    
    let msg = `¿Estás completamente seguro de borrar este registro de la tabla "${table}"?`;
    if (table === 'medico' || table === 'paciente') {
        msg += `\n\nATENCIÓN: Borrar este registro TAMBIÉN ELIMINARÁ de forma permanente todas sus citas, horarios e historiales relacionados.`;
    }
    
    if(!confirm(msg)) return;

    try {
        let url = `${API_URL}/db-test/${table}/${id}?pk=${pk}`;
        if (table === 'medico') url = `${API_URL}/medicos/eliminar/${id}`;
        if (table === 'paciente') url = `${API_URL}/pacientes/eliminar/${id}`;
        if (table === 'horario') url = `${API_URL}/horarios/eliminar/${id}`;

        const res = await fetch(url, { method:'DELETE' });
        const result = await res.json();
        if(res.ok || result.success) {
            statusMessage.textContent = '✅ ' + (result.message || 'Borrado correctamente.');
            statusMessage.className = 'message success';
            cargarDatosGestion();
            cargarDatosIniciales(); // Actualiza otras listas de main.js
        } else {
            alert('❌ Error: ' + result.message);
            statusMessage.textContent = '❌ Error al borrar el registro.';
            statusMessage.className = 'message error';
        }
    } catch(err) { 
        console.error("Error borrando:", err);
        alert('❌ Error severo de comunicación al borrar. Pide reinicio de Node.js');
    }
}

async function handleEditGestion(e) {
    const btn = e.currentTarget;
    const {table, pk, id} = btn.dataset;
    currentEditTable = table;
    currentEditPk = pk;
    currentEditId = id;

    const tableData = dbTablesCache[table];
    const row = tableData.data.find(r => String(r[pk]) === String(id));
    if(!row) return;

    document.getElementById('gestion-modal-title').innerText = `Modificar ${table.toUpperCase()} (ID: ${id})`;
    const formFields = document.getElementById('gestion-modal-fields');
    formFields.innerHTML = '';
    
    // ── Modal especial para HORARIO ────────────────────────────────
    if (table === 'horario') {
        const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
        let medOptionsHtml = '';
        medicosGlobales.forEach(m => {
            const sel = String(row.id_medico) === String(m.id_medico) ? 'selected' : '';
            medOptionsHtml += `<option value="${m.id_medico}" ${sel}>Dr. ${m.nombre} ${m.apellido}</option>`;
        });
        let diaOptionsHtml = '';
        dias.forEach(d => {
            const sel = row.dia_semana === d ? 'selected' : '';
            diaOptionsHtml += `<option value="${d}" ${sel}>${d}</option>`;
        });
        formFields.innerHTML = `
            <div class="form-group" style="margin-bottom:10px;">
                <label style="font-weight:bold;color:#334155;display:block;margin-bottom:3px;">Médico</label>
                <select name="id_medico" class="form-input" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:5px;" required>${medOptionsHtml}</select>
            </div>
            <div class="form-group" style="margin-bottom:10px;">
                <label style="font-weight:bold;color:#334155;display:block;margin-bottom:3px;">Día de la Semana</label>
                <select name="dia_semana" class="form-input" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:5px;" required>${diaOptionsHtml}</select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div><label style="font-weight:bold;color:#334155;display:block;margin-bottom:3px;">Hora Inicio</label>
                <input type="time" name="hora_inicio" value="${row.hora_inicio || ''}" class="form-input" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:5px;" required></div>
                <div><label style="font-weight:bold;color:#334155;display:block;margin-bottom:3px;">Hora Fin</label>
                <input type="time" name="hora_fin" value="${row.hora_fin || ''}" class="form-input" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:5px;" required></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div><label style="font-weight:bold;color:#334155;display:block;margin-bottom:3px;">Fecha Inicio</label>
                <input type="date" name="fecha_inicio" value="${row.fecha_inicio ? row.fecha_inicio.substring(0,10) : ''}" class="form-input" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:5px;" required></div>
                <div><label style="font-weight:bold;color:#334155;display:block;margin-bottom:3px;">Fecha Fin</label>
                <input type="date" name="fecha_fin" value="${row.fecha_fin ? row.fecha_fin.substring(0,10) : ''}" class="form-input" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:5px;" required></div>
            </div>
            <div class="form-group" style="margin-bottom:10px;">
                <label style="font-weight:bold;color:#334155;display:block;margin-bottom:3px;">Cupos Máximos por Día</label>
                <input type="number" name="limite_fichas" value="${row.limite_fichas || 10}" min="1" class="form-input" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:5px;" required>
            </div>
        `;
        document.getElementById('gestion-modal').style.display = 'flex';
        return;
    }

    // Generar inputs estándar
    const meta = tableData.columnsMeta || [];
    tableData.columns.forEach(col => {
        const isAutoIncr = meta.find(m => m.field === col)?.extra?.includes('auto_increment');
        if(isAutoIncr) return;

        let val = row[col] === null ? '' : row[col];
        if (typeof val === 'string' && val.includes('T') && val.includes('-') && val.includes(':')) {
           val = val.substring(0, 16); 
        }

        // --- MANEJO ESPECIAL PARA COBERTURA DEL PACIENTE ---
        if (table === 'paciente' && col === 'id_cobertura') {
             formFields.innerHTML += `
               <div class="form-group" style="margin-bottom:10px;">
                   <label style="font-weight:bold; color:#334155; display:block; margin-bottom:3px;">Cobertura (Tipo de Pago)</label>
                   <select name="id_cobertura" class="form-input" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:5px;" required>
                       <option value="1" ${val == 1 ? 'selected' : ''}>SUS (Sistema Único de Salud)</option>
                       <option value="2" ${val == 2 ? 'selected' : ''}>PARTICULAR / PAGO DIRECTO</option>
                       <option value="3" ${val == 3 ? 'selected' : ''}>SEGURO PRIVADO</option>
                   </select>
               </div>
             `;
             return;
        }

        formFields.innerHTML += `
           <div class="form-group" style="margin-bottom:10px;">
               <label style="font-weight:bold; color:#334155; display:block; margin-bottom:3px;">${col}</label>
               <input type="text" name="${col}" value="${val}" class="form-input" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:5px;" required>
           </div>
        `;
    });

    // --- MANEJO ESPECIAL PARA LAS ESPECIALIDADES DEL MEDICO ---
    if (table === 'medico') {
        const docInfo = medicosGlobales.find(m => m.id_medico == id);
        const docEspecialidades = docInfo ? docInfo.especialidades : []; // Array de IDs
        
        let espOptionsHTML = '';
        especialidadesGlobales.forEach(es => {
            const isSelected = docEspecialidades.includes(es.id_especialidad) ? 'selected' : '';
            espOptionsHTML += `<option value="${es.id_especialidad}" ${isSelected}>${es.nombre}</option>`;
        });

        formFields.innerHTML += `
           <div class="form-group" style="margin-bottom:10px;">
               <label style="font-weight:bold; color:#334155; display:block; margin-bottom:3px;">Asignar Especialidades</label>
               <select name="especialidades" multiple class="form-input" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:5px; height:120px;" required>
                   ${espOptionsHTML}
               </select>
               <small style="color:gray;">Manten presionada la tecla Ctrl (o Cmd) para elegir varias.</small>
           </div>
        `;
    }

    document.getElementById('gestion-modal').style.display = 'flex';
}

document.getElementById('gestion-modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // formData.getAll es necesario para campos 'multiple' como especialidades
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Si es médico, extraer las especialidades como arreglo
    if (currentEditTable === 'medico') {
        data.especialidades = formData.getAll('especialidades').map(Number);
    }
    
    try {
         let url = `${API_URL}/db-test/${currentEditTable}/${currentEditId}?pk=${currentEditPk}`;
         
         if (currentEditTable === 'medico') {
             url = `${API_URL}/medicos/actualizar/${currentEditId}`;
         }
         if (currentEditTable === 'horario') {
             url = `${API_URL}/horarios/actualizar/${currentEditId}`;
         }

         const res = await fetch(url, { 
             method:'PUT', 
             headers:{'Content-Type':'application/json'},
             body: JSON.stringify(data)
         });
         
         const result = await res.json();
         if(res.ok || result.success) {
            statusMessage.textContent = '✅ Cambios guardados con éxito.';
            statusMessage.className = 'message success';
            document.getElementById('gestion-modal').style.display = 'none';
            cargarDatosGestion();
            cargarDatosIniciales(); // Recargar selectores y medicos globales
         } else {
            alert('❌ Hubo un error de guardado: ' + (result.message || 'Desconocido'));
         }
    } catch(err) { 
        console.error("Error en la petición:", err);
        alert('❌ Error de comunicación con el servidor. ¿Reiniciaste Node.js? Detalles: ' + err.message);
    }
});

/* ========================================================
   LOGICA: HORARIOS AGRUPADOS (ESPECIALIDAD > DOCTOR)
======================================================== */
async function renderHorariosAgrupados(containerId = 'lista-horarios-agrupados') {
    const contenedor = document.getElementById(containerId);
    if (!contenedor) return;

    try {
        const res = await fetch(API_URL + '/horarios');
        const todosHorarios = await res.json();
        
        contenedor.innerHTML = '<h2 style="margin-top:2rem; border-bottom:2px solid #e2e8f0; padding-bottom:0.5rem; color:#334155;">📋 Listado de Turnos Vigentes</h2>';

        if (especialidadesGlobales.length === 0) {
            contenedor.innerHTML += '<p style="text-align:center; color:#64748b; padding:2rem;">No hay especialidades registradas.</p>';
            return;
        }

        especialidadesGlobales.forEach(esp => {
            // Médicos que pertenecen a esta especialidad
            const medicosDeEsp = medicosGlobales.filter(m => m.especialidades && m.especialidades.includes(esp.id_especialidad));
            
            if (medicosDeEsp.length > 0) {
                let espHtml = `
                    <div style="margin-bottom:2rem; background:white; border-radius:12px; border:1px solid #cbd5e1; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
                        <div style="background:#f1f5f9; padding:12px 20px; font-weight:800; color:purple; font-size:1.1rem; border-bottom:1px solid #cbd5e1; display:flex; align-items:center; gap:10px;">
                            ⚕️ Especialidad: ${esp.nombre}
                        </div>
                        <div style="padding:15px; display:flex; flex-direction:column; gap:15px;">
                `;

                medicosDeEsp.forEach(med => {
                    const horariosMed = todosHorarios.filter(h => h.id_medico === med.id_medico);
                    const diasOcupados = horariosMed.map(h => h.dia_semana);
                    const hoursRange = horariosMed.length > 0 ? `${horariosMed[0].hora_inicio.substring(0,5)} - ${horariosMed[0].hora_fin.substring(0,5)}` : '--:--';
                    const cupos = horariosMed.length > 0 ? horariosMed[0].limite_fichas : '0';

                    espHtml += `
                        <div style="border:1px solid #e2e8f0; border-radius:10px; padding:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; background:rgba(248,250,252,0.5);">
                            <div>
                                <h4 style="margin:0; font-size:1rem; color:#0f172a;">Dr(a). ${med.nombre} ${med.apellido}</h4>
                                <div style="margin-top:8px; display:flex; gap:5px; flex-wrap:wrap;">
                                    ${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => {
                                        const esta = diasOcupados.includes(d);
                                        return `<span style="font-size:0.7rem; padding:3px 8px; border-radius:12px; font-weight:700; ${esta ? 'background:#10b981; color:white;' : 'background:#e2e8f0; color:#94a3b8;'}">${d.substring(0,2)}</span>`;
                                    }).join('')}
                                </div>
                                <p style="margin:8px 0 0; font-size:0.85rem; color:#64748b;">
                                    ⏰ Horario: <b>${hoursRange}</b> &nbsp;|&nbsp; 👥 Cupos: <b>${cupos}</b>
                                </p>
                            </div>
                            <button class="btn-bulk-edit" data-id="${med.id_medico}" data-name="${med.nombre} ${med.apellido}" style="background:var(--primary-color); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem;">✏️ Modificar Turnos</button>
                        </div>
                    `;
                });

                espHtml += `</div></div>`;
                contenedor.innerHTML += espHtml;
            }
        });

        document.querySelectorAll('.btn-bulk-edit').forEach(btn => {
            btn.onclick = () => abrirModalMasivoHorario(btn.dataset.id, btn.dataset.name);
        });

    } catch (e) {
        console.error("Error al cargar horarios agrupados", e);
        contenedor.innerHTML = '<p style="color:red; text-align:center;">Error al conectar con la base de datos de horarios.</p>';
    }
}

async function abrirModalMasivoHorario(id_medico, nombre) {
    document.getElementById('edit-horario-doc-name').textContent = `Doctor: ${nombre}`;
    document.getElementById('edit-horario-medico-id').value = id_medico;
    
    // Reset checks
    document.querySelectorAll('input[name="edit_dias_chk"]').forEach(chk => chk.checked = false);
    
    try {
        const res = await fetch(API_URL + '/horarios');
        const todos = await res.json();
        const mHorarios = todos.filter(h => h.id_medico == id_medico);
        
        if (mHorarios.length > 0) {
            mHorarios.forEach(h => {
                const chk = document.querySelector(`input[name="edit_dias_chk"][value="${h.dia_semana}"]`);
                if (chk) chk.checked = true;
            });
            document.getElementById('edit_hora_inicio').value = mHorarios[0].hora_inicio.substring(0,5);
            document.getElementById('edit_hora_fin').value = mHorarios[0].hora_fin.substring(0,5);
            document.getElementById('edit_limite_fichas').value = mHorarios[0].limite_fichas;
        } else {
            document.getElementById('edit_hora_inicio').value = "08:00";
            document.getElementById('edit_hora_fin').value = "12:00";
            document.getElementById('edit_limite_fichas').value = 10;
        }
        
        document.getElementById('modal-horario-masivo').style.display = 'flex';
    } catch(e) {}
}

document.getElementById('form-horario-masivo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id_medico = document.getElementById('edit-horario-medico-id').value;
    const dias = Array.from(document.querySelectorAll('input[name="edit_dias_chk"]:checked')).map(c => c.value);
    
    if (dias.length === 0) {
        alert("Debes seleccionar al menos un día."); return;
    }
    
    const data = {
        dias_semana: dias,
        hora_inicio: document.getElementById('edit_hora_inicio').value,
        hora_fin: document.getElementById('edit_hora_fin').value,
        limite_fichas: parseInt(document.getElementById('edit_limite_fichas').value)
    };
    
    try {
        const res = await fetch(`${API_URL}/horarios/actualizar-medico/${id_medico}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            statusMessage.textContent = '✅ Horario de médico actualizado correctamente.';
            statusMessage.className = 'message success';
            document.getElementById('modal-horario-masivo').style.display = 'none';
            renderHorariosAgrupados();
            if (gestionSelect.value === 'horario') renderHorariosAgrupados('gestion-horarios-container');
            cargarFichasDesdeBackend(); // Refrescar si hubo cambios que afecten visualmente
        } else {
            alert("Error al actualizar el horario.");
        }
    } catch(e) {
        console.error(e);
        alert("Error de conexión.");
    }
});
