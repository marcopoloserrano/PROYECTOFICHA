
const API_URL = 'http://localhost:4000/api';
let pacientesGlobales = [];
let medicosGlobales = [];
let especialidadesGlobales = [];
let fichasAgendadasCache = [];

document.querySelector('#app').innerHTML = `
  <div class="glass-card">
    <div style="margin-bottom: 1.5rem; display: flex; gap: 20px; flex-wrap: wrap;">
      <a href="/paciente.html" style="color:var(--primary-color); font-weight:bold; text-decoration:none;">VISTA DE PACIENTE ➔</a>
      <a href="/consultas.html" style="color:purple; font-weight:bold; text-decoration:none;">VISTA DE CONSULTAS RT ➔</a>
      <a href="/db-view.html" style="color:#ef4444; font-weight:bold; text-decoration:none;">⚙️ GESTIÓN GENERAL (CRUD Base de Datos) ➔</a>
      <a href="/docs/diagrama_logica.html" style="color:#0d9488; font-weight:bold; text-decoration:none;">🧩 DIAGRAMA DE LÓGICA ➔</a>
    </div>

    <!-- Pestañas Principales -->
    <div class="tabs" style="flex-wrap: wrap; gap: 4px;">
      <button class="tab-btn active" id="tab-lista" style="font-size: 0.8rem; border-bottom: 2px solid green;">📋 Ver Citas</button>
      <button class="tab-btn" id="tab-ficha" style="font-size: 0.8rem">🩺 Agendar</button>
      <button class="tab-btn" id="tab-horario" style="font-size: 0.8rem">🕒 Horarios</button>
      <button class="tab-btn" id="tab-ausencia" style="font-size: 0.8rem; border-bottom: 2px solid red;">🛑 Permiso</button>
      <button class="tab-btn" id="tab-paciente" style="font-size: 0.8rem">👤 Paciente</button>
      <button class="tab-btn" id="tab-medico" style="font-size: 0.8rem">👨‍⚕️ Médico</button>
      <button class="tab-btn" id="tab-especialidad" style="font-size: 0.8rem">⚕️ Esp.</button>
      <button class="tab-btn" id="tab-gestion" style="font-size: 0.8rem; border-bottom: 2px solid orange;">⚙️ CRUD/Gestión</button>
    </div>

    <!-- VISTA 0: LISTADO DE FICHAS DIARIAS -->
    <div id="vista-lista-fichas">
      <h1>Dashboard de Citas</h1>
      <p class="subtitle">Visualiza todas las fichas médicas ya reservadas.</p>
      
      <div class="form-group" style="max-width:250px;">
         <label>Filtrar por Fecha:</label>
         <input type="date" id="filtro-fecha-ficha">
      </div>
      
      <div style="overflow-x:auto; margin-top:1rem;">
        <table style="width:100%; border-collapse: collapse; text-align:left; font-size: 0.9rem;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
              <th style="padding:10px;">ID</th>
              <th style="padding:10px;">Fecha y Hora</th>
              <th style="padding:10px;">Paciente</th>
              <th style="padding:10px;">Doctor</th>
              <th style="padding:10px;">Estado</th>
            </tr>
          </thead>
          <tbody id="tabla-fichas-body">
             <tr><td colspan="5" style="text-align:center; padding:10px;">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- VISTA 1: AGENDAR FICHA -->
    <div id="vista-ficha" style="display: none;">
      <h1>Agendar Cita (Manual)</h1>
      <form id="ficha-form">
        <div class="form-group"><label>Paciente</label><select id="seleccionar-paciente" required><option value="">Cargando...</option></select></div>
        <div class="form-group"><label>Médico</label><select id="seleccionar-medico" required><option value="">Cargando...</option></select></div>
        <div class="row">
          <div class="form-group"><label>Fecha</label><input type="date" id="fecha_ficha" required></div>
          <div class="form-group"><label>Hora</label><input type="time" id="hora_ficha" required></div>
        </div>
        <button type="submit" class="action-btn">Agendar Ficha Médica</button>
      </form>
    </div>

    <!-- VISTA 2: AGREGAR HORARIO A MÉDICO -->
    <div id="vista-horario" style="display: none;">
      <h1>Crear Calendario Semanal</h1>
      <form id="horario-form">
        <div class="form-group"><label>Médico Tratante</label><select id="reg-horario-medico" required></select></div>
        
        <div class="form-group" style="background:#f8fafc; padding:10px; border-radius:5px; border:1px solid #e2e8f0;">
          <label style="margin-bottom:5px; color:#1e293b;">Días de Trabajo (Selecciona múltiples):</label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 0.9rem;">
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
          <div class="form-group"><label>Hora de Ingreso</label><input type="time" id="hora_inicio" required></div>
          <div class="form-group"><label>Hora de Salida</label><input type="time" id="hora_fin" required></div>
        </div>
        <div class="form-group"><label>Cupos Máximos por Día</label><input type="number" id="limite_fichas" required min="1" value="10"></div>
        <button type="submit" class="action-btn" id="btn-horario">Inscribir Todo el Horario</button>
      </form>
    </div>

    <!-- VISTA EXCEPCIÓN: MARCAR AUSENCIA -->
    <div id="vista-ausencia" style="display: none;">
        <h1>Excepción o Permiso Méd.</h1>
        <p class="subtitle">Bloquea un día laboral para evitar que se agenden citas si el Doctor no asiste.</p>
        <form id="ausencia-form">
            <div class="form-group"><label>Afectar al Médico:</label><select id="reg-ausencia-medico" required></select></div>
            <div class="row">
                <div class="form-group"><label>Fecha Inicio:</label><input type="date" id="ausencia_fecha_inicio" required></div>
                <div class="form-group"><label>Fecha Fin (Mismo día si vacío):</label><input type="date" id="ausencia_fecha_fin"></div>
            </div>
            <div class="form-group"><label>Motivo a mostrar al paciente (Opcional):</label><input type="text" id="ausencia_motivo" placeholder="Ej. Permiso médico, Vacaciones, etc."></div>
            <button type="submit" class="action-btn" style="background:#dc2626;">Deshabilitar Reservas ese Día</button>
        </form>
    </div>

    <!-- VISTA 3: NUEVA ESPECIALIDAD -->
    <div id="vista-especialidad" style="display: none;">
        <h1>Crear Especialidad</h1>
        <form id="especialidad-form">
           <div class="form-group"><label>Nombre Especialidad</label><input type="text" id="esp_nombre" required></div>
           <button type="submit" class="action-btn">Crear Especialidad</button>
        </form>
    </div>

    <!-- VISTA 4: REGISTRAR MÉDICO -->
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

    <!-- VISTA 5: REGISTRAR PACIENTE -->
    <div id="vista-paciente" style="display: none;">
      <h1>Registro de Pacientes</h1>
      <form id="paciente-form">
        <div class="row">
          <div class="form-group"><label>Nombre</label><input type="text" id="nombre" required></div>
          <div class="form-group"><label>Apellido</label><input type="text" id="apellido" required></div>
        </div>
        <div class="form-group"><label>CI</label><input type="text" id="ci" required></div>
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

    <!-- VISTA GESTIÓN TOTAL INTERACTIVA -->
    <div id="vista-gestion" style="display: none;">
      <h1>Gestión Integral Interactiva</h1>
      <p class="subtitle">Visualiza, modifica o elimina los registros de pacientes, médicos, especialidades y fichas directamente desde aquí.</p>
      
      <select id="gestion-tabla-select" style="padding:10px; margin-bottom:1rem; width:100%; border:1px solid #cbd5e1; border-radius:5px; font-size:1.1rem;">
        <option value="paciente">👤 Pacientes</option>
        <option value="medico">👨‍⚕️ Médicos</option>
        <option value="especialidad">⚕️ Especialidades</option>
        <option value="ficha">📋 Fichas Asignadas</option>
        <option value="ausencia_medico">🛑 Permisos y Ausencias</option>
        <option value="horario">🕒 Horarios Médicos</option>
      </select>
      
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse: collapse; text-align:left; font-size: 0.85rem; background:white; border-radius:5px; overflow:hidden; border: 1px solid #e2e8f0;">
           <thead id="gestion-thead"></thead>
           <tbody id="gestion-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DE EDICIÓN PARA VISTA GESTIÓN -->
    <div id="gestion-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
       <div style="background:white; padding:2rem; border-radius:8px; max-width:500px; width:90%; max-height:90vh; overflow-y:auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
           <h2 id="gestion-modal-title" style="margin-top:0; color:var(--primary-color);">Modificar Registro</h2>
           <form id="gestion-modal-form">
               <div id="gestion-modal-fields"></div>
               <div style="display:flex; gap:10px; margin-top:20px;">
                   <button type="button" style="padding:10px; border:none; background:#cbd5e1; color:#334155; border-radius:5px; cursor:pointer;" onclick="document.getElementById('gestion-modal').style.display='none'">Cancelar</button>
                   <button type="submit" class="action-btn" style="flex:1;">Guardar Cambios</button>
               </div>
           </form>
       </div>
    </div>

    <div id="status-message" class="message"></div>
  </div>
`

// Navegación
const tabs = {
  lista: { btn: document.getElementById('tab-lista'), vista: document.getElementById('vista-lista-fichas') },
  ficha: { btn: document.getElementById('tab-ficha'), vista: document.getElementById('vista-ficha') },
  horario: { btn: document.getElementById('tab-horario'), vista: document.getElementById('vista-horario') },
  ausencia: { btn: document.getElementById('tab-ausencia'), vista: document.getElementById('vista-ausencia') },
  especialidad: { btn: document.getElementById('tab-especialidad'), vista: document.getElementById('vista-especialidad') },
  medico: { btn: document.getElementById('tab-medico'), vista: document.getElementById('vista-medico') },
  paciente: { btn: document.getElementById('tab-paciente'), vista: document.getElementById('vista-paciente') },
  gestion: { btn: document.getElementById('tab-gestion'), vista: document.getElementById('vista-gestion') }
};
const statusMessage = document.getElementById('status-message');

function activateTab(key) {
  Object.values(tabs).forEach(t => { t.btn.classList.remove('active'); t.vista.style.display = 'none'; });
  tabs[key].btn.classList.add('active'); tabs[key].vista.style.display = 'block'; statusMessage.className = 'message';
  
  if (key === 'lista') renderFichas(); // Renderizar tabla al entrar a su pestaña
  if (key === 'gestion') cargarDatosGestion(); // Refrescar Geston
}
Object.keys(tabs).forEach(key => { tabs[key].btn.addEventListener('click', () => activateTab(key)); });

/* LOGICA: LISTADO TABLA DE FICHAS DIARIAS */
async function cargarFichasDesdeBackend() {
   try {
       const res = await fetch(API_URL + '/fichas');
       fichasAgendadasCache = await res.json();
       renderFichas();
   } catch(e) { console.error("Error al obtener fichas", e); }
}

function renderFichas() {
    const tbody = document.getElementById('tabla-fichas-body');
    tbody.innerHTML = '';
    
    // Aplicar Filtro Si Hay Fecha Seleccionada
    const fechaFiltro = document.getElementById('filtro-fecha-ficha').value;
    let arrayARenderizar = fichasAgendadasCache;
    
    if (fechaFiltro) {
        arrayARenderizar = fichasAgendadasCache.filter(f => f.fecha && f.fecha.substring(0,10) === fechaFiltro);
    }
    
    if(!arrayARenderizar || arrayARenderizar.length === 0){
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:10px; color:#64748b;">No hay citas agendadas para este filtro.</td></tr>';
        return;
    }
    
    arrayARenderizar.forEach(f => {
       const badgeColor = f.estado === 'Pendiente' ? '#eab308' : (f.estado.includes('Reservado') ? '#3b82f6' : '#16a34a');
       const shortDate = f.fecha ? f.fecha.substring(0,10) : 'Sin Fecha';

       tbody.innerHTML += `
         <tr style="border-bottom:1px solid #e2e8f0;">
           <td style="padding:10px; font-weight:bold;">#${f.id_ficha}</td>
           <td style="padding:10px;"><b>${shortDate}</b> <br><span style="color:#64748b; font-size:0.8rem;">${f.hora}</span></td>
           <td style="padding:10px;">${f.paciente_nombre} ${f.paciente_apellido}<br><span style="color:#64748b; font-size:0.8rem;">CI: ${f.ci}</span></td>
           <td style="padding:10px;">Dr(a). ${f.medico_nombre} ${f.medico_apellido}</td>
           <td style="padding:10px;"><span style="background:${badgeColor}; color:white; padding:4px 8px; border-radius:12px; font-size:0.7rem; font-weight:bold;">${f.estado}</span></td>
         </tr>
       `;
    });
}
document.getElementById('filtro-fecha-ficha').addEventListener('change', renderFichas);


/* Cargar Selectores Base */
async function cargarDatosIniciales() {
  try {
    cargarFichasDesdeBackend(); // Load list globally
    
    const espReq = await fetch(API_URL + '/especialidades');
    especialidadesGlobales = await espReq.json();
    const selectEsp = document.getElementById('med_especialidades');
    selectEsp.innerHTML = '';
    especialidadesGlobales.forEach(e => selectEsp.innerHTML += '<option value="' + e.id_especialidad + '">' + e.nombre + '</option>');

    const medReq = await fetch(API_URL + '/medicos');
    medicosGlobales = await medReq.json();
    let htmlMedicos = '<option value="">-- Selecciona un Médico --</option>';
    medicosGlobales.forEach(m => htmlMedicos += '<option value="' + m.id_medico + '">Dr. ' + m.nombre + ' ' + m.apellido + '</option>');
    document.getElementById('seleccionar-medico').innerHTML = htmlMedicos;
    document.getElementById('reg-horario-medico').innerHTML = htmlMedicos;
    document.getElementById('reg-ausencia-medico').innerHTML = htmlMedicos;

    const pacReq = await fetch(API_URL + '/pacientes');
    pacientesGlobales = await pacReq.json();
    const selectPac = document.getElementById('seleccionar-paciente');
    selectPac.innerHTML = '<option value="">-- Selecciona un Paciente --</option>';
    pacientesGlobales.forEach(p => selectPac.innerHTML += '<option value="' + p.id_paciente + '">' + p.nombre + ' ' + p.apellido + '</option>');
  } catch(e) {}
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

document.getElementById('horario-form').addEventListener('submit', async (e) => {
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

document.getElementById('especialidad-form').addEventListener('submit', async (e) => {
  e.preventDefault(); statusMessage.className = 'message';
  try {
    const res = await fetch(API_URL + '/especialidades/crear', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: document.getElementById('esp_nombre').value })
    });
    if (res.ok) { statusMessage.textContent = '⚕️ Especialidad agregada correctamente.'; statusMessage.className = 'message success'; e.target.reset(); cargarDatosIniciales(); }
    else { statusMessage.innerHTML = '⚠️ Error: Endpoint no encontrado.<br><b>Asegúrate de haber reiniciado el servidor Node.</b>'; statusMessage.className = 'message error'; }
  } catch(err) {}
});

document.getElementById('medico-form').addEventListener('submit', async (e) => {
  e.preventDefault(); statusMessage.className = 'message';
  const sel = document.getElementById('med_especialidades');
  const arr = Array.from(sel.selectedOptions).map(opt => parseInt(opt.value));
  const data = { nombre: document.getElementById('med_nombre').value, apellido: document.getElementById('med_apellido').value, telefono: document.getElementById('med_telefono').value, especialidades: arr };
  try {
    const res = await fetch(API_URL + '/medicos/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if(res.ok) { statusMessage.textContent = '👨‍⚕️ Médico creado.'; statusMessage.className = 'message success'; e.target.reset(); cargarDatosIniciales(); }
  } catch(e) {}
});

document.getElementById('paciente-form').addEventListener('submit', async (e) => {
  e.preventDefault(); statusMessage.className = 'message';
  const data = { nombre: document.getElementById('nombre').value, apellido: document.getElementById('apellido').value, ci: document.getElementById('ci').value, telefono: document.getElementById('telefono').value, correo: document.getElementById('correo').value, id_cobertura: parseInt(document.getElementById('id_cobertura').value) };
  try {
    const res = await fetch(API_URL + '/pacientes/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if(res.ok) { statusMessage.textContent = '✅ Paciente creado.'; statusMessage.className = 'message success'; e.target.reset(); cargarDatosIniciales(); }
  } catch(e) {}
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

    // Renderizado especial para Horario
    if (tableName === 'horario') {
        if (tableData.data.length === 0) {
            bodyHtml = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#64748b;">No hay horarios registrados.</td></tr>`;
        } else {
            tableData.data.forEach(row => {
                const docInfo = medicosGlobales.find(m => m.id_medico == row.id_medico);
                const doctorLabel = docInfo ? `Dr. ${docInfo.nombre} ${docInfo.apellido}` : `<i style="color:#94a3b8">ID ${row.id_medico}</i>`;
                const diaColors = { Lunes:'#dbeafe', Martes:'#dcfce7', Miércoles:'#fef9c3', Jueves:'#ffedd5', Viernes:'#ede9fe', Sábado:'#fce7f3', Domingo:'#fee2e2' };
                const diaBg = diaColors[row.dia_semana] || '#f1f5f9';
                bodyHtml += `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px; font-weight:bold; color:#64748b;">#${row.id_horario}</td>
                    <td style="padding:8px; font-weight:600; color:#0f172a;">${doctorLabel}</td>
                    <td style="padding:8px;">
                        <span style="background:${diaBg}; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600;">${row.dia_semana}</span>
                    </td>
                    <td style="padding:8px; color:#475569;">${row.hora_inicio}</td>
                    <td style="padding:8px; color:#475569;">${row.hora_fin}</td>
                    <td style="padding:8px; text-align:center;"><span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:8px; font-weight:bold;">${row.limite_fichas}</span></td>
                    <td style="padding:8px; display:flex; gap:5px;">
                        <button class="btn-edit-gestion" style="background:#3b82f6; color:white; border:none; padding:6px 12px; cursor:pointer; border-radius:4px; font-size:12px;" data-table="horario" data-pk="id_horario" data-id="${row.id_horario}">✏️ Editar</button>
                        <button class="btn-delete-gestion" style="background:#ef4444; color:white; border:none; padding:6px 12px; cursor:pointer; border-radius:4px; font-size:12px;" data-table="horario" data-pk="id_horario" data-id="${row.id_horario}">🗑️ Borrar</button>
                    </td>
                </tr>`;
            });
        }
        tbody.innerHTML = bodyHtml;
        document.querySelectorAll('.btn-delete-gestion').forEach(btn => btn.addEventListener('click', handleDeleteGestion));
        document.querySelectorAll('.btn-edit-gestion').forEach(btn => btn.addEventListener('click', handleEditGestion));
        return; // Salir, no continuar con el render genérico
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
