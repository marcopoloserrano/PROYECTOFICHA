
const API_URL = 'http://localhost:4000/api';
let medicosDisponibles = [];
let todosLosHorarios = [];
let pacientesTotal = []; // Cache para búsqueda
let horarioSeleccionadoCache = null;
let horaSeleccionadaFinal = null;

document.querySelector('#patient-app').innerHTML = `
  <div class="glass-card" style="border-top: 5px solid var(--primary-color);">
    <div style="margin-bottom: 1rem;">
      <a href="/index.html" style="color:#64748b; font-size:0.9rem; text-decoration:none;">⬅ Volver a Recepción (Admin)</a>
    </div>

    <h1>🏥 Portal del Paciente</h1>
    <p class="subtitle">Agenda tu visita con búsqueda rápida y selección visual.</p>
    
    <div id="ausencias-alert-box" style="margin-bottom: 1.5rem; display:none; background:#ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 1.2rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);">
      <h3 style="color:#065f46; margin-top:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.4rem;">📅</span> Avisos de la Semana
      </h3>
      <ul id="lista-ausencias-paciente" style="margin-bottom:0; color:#064e3b; font-size:0.95rem; padding-left:1.2rem; line-height:1.6;">
      </ul>
    </div>

    <form id="patient-ficha-form">
      <!-- PASO 1: PACIENTE CON BÚSQUEDA POR CI -->
      <div class="form-group" style="background: rgba(255,255,255,0.4); padding: 1.2rem; border-radius: 12px;">
        <label style="color:var(--primary-color); font-weight:800;">Paso 1: Busca tu perfil por C.I.</label>
        <div class="search-container">
            <input type="text" id="paciente-search-input" placeholder="Escribe tu número de carnet..." autocomplete="off">
            <div id="paciente-suggestions" class="suggestions-list"></div>
        </div>
        <input type="hidden" id="id_paciente" required>
        <div id="paciente-seleccionado-info" style="margin-top:10px; font-size:0.9rem; font-weight:700; color:var(--primary-color); display:none;">
            ✅ Paciente identificado: <span id="nombre-paciente-display"></span>
        </div>
      </div>

      <!-- PASO 2: ESPECIALIDADES CON BOTONES -->
      <div class="form-group" style="margin-top:1.5rem;">
        <label style="font-weight:700; color:#064e3b;">Paso 2: ¿Qué atención necesitas?</label>
        <div id="especialidades-grid" class="especialidad-grid">
            <p style="font-size:0.8rem; color:#94a3b8;">Cargando especialidades...</p>
        </div>
        <input type="hidden" id="id_especialidad" required>
      </div>

      <!-- PASO 3: MÉDICO -->
      <div class="form-group" style="margin-top:1.5rem;">
        <label style="font-weight:700; color:#064e3b;">Paso 3: Especialista Médico</label>
        <select id="id_medico" disabled required><option value="">Primero elige una especialidad</option></select>
      </div>

      <!-- PASO 4: DÍAS -->
      <div class="form-group" id="step-horario-container" style="display:none;">
        <label style="font-weight:700; color:#064e3b;">Paso 4: Selecciona el día de atención</label>
        <div id="horarios-btn-list" class="horario-btn-container">
            <!-- Botones de horarios se cargarán aquí -->
        </div>
        <input type="hidden" id="id_horario" value="">
      </div>

      <!-- PASO 5: SLOTS -->
      <div class="form-group" style="background: rgba(5, 150, 105, 0.05); padding: 1.2rem; border-radius: 12px; margin-top: 1.5rem; display:none;" id="step-fecha-container">
        <div id="availability-card" style="display:none; margin-top: 1rem;">
            <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #a7f3d0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); text-align:center; margin-bottom: 1.5rem;">
                <p style="margin:0; font-size:0.9rem; color:#065f46; font-weight:600;">Fecha agendada: <span id="fecha-texto-auto" style="color:var(--primary-color)">-</span></p>
                <p style="margin:5px 0 0 0; font-size:1.1rem; font-weight:800; color:var(--primary-color);" id="cupos-number">Cargando turnos...</p>
                <input type="hidden" id="fecha" value="">
            </div>

            <label style="color:#065f46; font-size:0.9rem; font-weight:700; display:block; margin-bottom:10px;">Selecciona tu hora de atención (Segmentos de 15 min):</label>
            <div id="slots-grid-container" class="slots-grid">
                <!-- Botones de 15 minutos aquí -->
            </div>
        </div>
      </div>

      <button type="submit" class="action-btn" id="btn-submit" disabled>Completa los pasos anteriores</button>
    </form>

    <div id="patient-message" class="message"></div>
  </div>

  <!-- MODAL RECIBO -->
  <div id="modal-confirm" class="modal-overlay">
    <div class="modal-content">
      <div class="ticket-header">
        <h2>✅ Ficha Confirmada</h2>
        <p style="font-size: 0.8rem; color: #059669; font-weight: bold; margin-top: 5px;">¡Listo! Tu atención está agendada.</p>
      </div>
      <div class="ticket-body">
        <div class="ticket-row"><span>Paciente:</span> <span id="res-paciente">-</span></div>
        <div class="ticket-row"><span>Especialidad:</span> <span id="res-especialidad">-</span></div>
        <div class="ticket-row"><span>Médico:</span> <span id="res-medico">-</span></div>
        <div class="ticket-row"><span>Fecha:</span> <span id="res-fecha">-</span></div>
        <div class="ticket-row"><span>Hora:</span> <span id="res-hora">-</span></div>
        <div style="text-align: center; margin-top: 15px; border-top: 1px dashed #a7f3d0; padding-top: 10px;">
           <span style="font-size: 0.75rem; color: #065f46;">Por favor, llega 15 minutos antes de tu cita.</span>
        </div>
      </div>
      <div class="ticket-footer">
        <button type="button" class="btn-close-modal" id="btn-cerrar-modal">Entendido, Cerrar</button>
      </div>
    </div>
  </div>
`;

// Elementos UI
const searchInput = document.getElementById('paciente-search-input');
const suggestionsList = document.getElementById('paciente-suggestions');
const inputPacienteId = document.getElementById('id_paciente');
const pacienteDisplay = document.getElementById('paciente-seleccionado-info');
const nombrePacienteText = document.getElementById('nombre-paciente-display');

const especialidadesGrid = document.getElementById('especialidades-grid');
const inputEspecialidadId = document.getElementById('id_especialidad');
const selectMedico = document.getElementById('id_medico');

const inputHorarioId = document.getElementById('id_horario');
const horariosBtnList = document.getElementById('horarios-btn-list');
const stepHorario = document.getElementById('step-horario-container');
const stepFecha = document.getElementById('step-fecha-container');
const slotsGrid = document.getElementById('slots-grid-container');
const inputFecha = document.getElementById('fecha');
const cardDisponibilidad = document.getElementById('availability-card');
const formFicha = document.getElementById('patient-ficha-form');
const btnSubmit = document.getElementById('btn-submit');
const msg = document.getElementById('patient-message');
const modalOverlay = document.getElementById('modal-confirm');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

async function inicializarPortal() {
  try {
    // 1. Cargar Pacientes para búsqueda
    const req1 = await fetch(API_URL + '/pacientes');
    pacientesTotal = await req1.json();

    // 2. Cargar Especialidades en botones
    const reqEsp = await fetch(API_URL + '/especialidades');
    const especialidades = await reqEsp.json();
    renderEspecialidades(especialidades);

    const req2 = await fetch(API_URL + '/medicos');
    medicosDisponibles = await req2.json();

    const req3 = await fetch(API_URL + '/horarios');
    todosLosHorarios = await req3.json();

    // 3. Cargar ausencias FILTRADAS (Hoy hasta Domingo)
    const req4 = await fetch(API_URL + '/ausencias');
    const ausenciasRaw = await req4.json();
    
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const domingoRelativo = new Date(hoy);
    const diffDomCount = 7 - (hoy.getDay() === 0 ? 7 : hoy.getDay());
    domingoRelativo.setDate(hoy.getDate() + diffDomCount);
    domingoRelativo.setHours(23,59,59,999);

    const ausenciasFiltradas = ausenciasRaw.filter(a => {
        const f = new Date(a.fecha_ausencia);
        return f >= hoy && f <= domingoRelativo;
    });

    if(ausenciasFiltradas.length > 0) {
       document.getElementById('ausencias-alert-box').style.display = 'block';
       const listaUI = document.getElementById('lista-ausencias-paciente');
       listaUI.innerHTML = '';
       ausenciasFiltradas.forEach(a => {
           const d = new Date(a.fecha_ausencia);
           const fStr = `${d.getDate()}/${d.getMonth()+1}`;
           listaUI.innerHTML += `<li><b>Día ${fStr}</b>: Dr. ${a.nombre} ${a.apellido} (${a.motivo || 'Motivo interno'})</li>`;
       });
    }
  } catch(e) { console.error("Init Error", e); }
}
inicializarPortal();

// --- LÓGICA DE BÚSQUEDA DE PACIENTE ---
searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    inputPacienteId.value = ""; // Reset ID while typing
    pacienteDisplay.style.display = 'none';

    if (val.length < 2) {
        suggestionsList.style.display = 'none';
        return;
    }

    const matches = pacientesTotal.filter(p => p.ci.toLowerCase().includes(val)).slice(0, 5);
    
    if (matches.length > 0) {
        suggestionsList.innerHTML = '';
        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<span>${p.nombre} ${p.apellido}</span> <b>CI: ${p.ci}</b>`;
            div.onclick = () => {
                inputPacienteId.value = p.id_paciente;
                nombrePacienteText.textContent = `${p.nombre} ${p.apellido} (CI: ${p.ci})`;
                pacienteDisplay.style.display = 'block';
                searchInput.value = p.ci;
                suggestionsList.style.display = 'none';
            };
            suggestionsList.appendChild(div);
        });
        suggestionsList.style.display = 'block';
    } else {
        suggestionsList.style.display = 'none';
    }
});

// Cerrar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        suggestionsList.style.display = 'none';
    }
});

// --- LÓGICA DE ESPECIALIDADES ---
function renderEspecialidades(list) {
    especialidadesGrid.innerHTML = '';
    list.forEach(e => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'especialidad-btn';
        btn.innerHTML = `<span>${e.nombre}</span>`;
        btn.onclick = () => {
            document.querySelectorAll('.especialidad-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            inputEspecialidadId.value = e.id_especialidad;
            handleEspecialidadChange(e.id_especialidad);
        };
        especialidadesGrid.appendChild(btn);
    });
}

function handleEspecialidadChange(espId) {
  stepHorario.style.display = 'none';
  resetValidation();
  
  const medicosFiltrados = medicosDisponibles.filter(m => m.especialidades && m.especialidades.includes(espId));
  
  if (medicosFiltrados.length === 0) {
    selectMedico.innerHTML = '<option value="">No hay médicos en esta área</option>'; selectMedico.disabled = true;
  } else {
    selectMedico.disabled = false;
    selectMedico.innerHTML = '<option value="">-- Selecciona al Doctor --</option>';
    medicosFiltrados.forEach(m => selectMedico.innerHTML += '<option value="' + m.id_medico + '">Dr(a). ' + m.nombre + ' ' + m.apellido + '</option>');
  }
}

// --- RESTO DE LÓGICA (MÉDICOS, DÍAS, SLOTS) ---
function resetValidation() {
    stepFecha.style.display = 'none';
    cardDisponibilidad.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Completa los pasos anteriores';
    msg.className = 'message';
    horaSeleccionadaFinal = null;
}

selectMedico.addEventListener('change', (e) => {
  const mdId = parseInt(e.target.value);
  resetValidation();

  if (!mdId) { stepHorario.style.display = 'none'; return; }

  const horariosDr = todosLosHorarios.filter(h => h.id_medico === mdId);
  if (horariosDr.length === 0) {
    stepHorario.style.display = 'block';
    horariosBtnList.innerHTML = '<p style="color:#94a3b8; font-size:0.8rem;">Sin horarios registrados</p>';
  } else {
    stepHorario.style.display = 'block';
    horariosBtnList.innerHTML = '';
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dayOfWeek = hoy.getDay(); 
    const indicesSemana = { 'Lunes':1, 'Martes':2, 'Miércoles':3, 'Jueves':4, 'Viernes':5, 'Sábado':6, 'Domingo':7 };
    const hoyIndex = dayOfWeek === 0 ? 7 : dayOfWeek;

    horariosDr.forEach(h => {
      const targetIndex = indicesSemana[h.dia_semana];
      if (targetIndex >= hoyIndex) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'horario-btn';
          btn.innerHTML = `${h.dia_semana}<br><small>${h.hora_inicio.substring(0,5)} - ${h.hora_fin.substring(0,5)}</small>`;
          btn.onclick = () => seleccionarHorario(h, btn);
          horariosBtnList.appendChild(btn);
      }
    });

    if (horariosBtnList.innerHTML === '') {
        horariosBtnList.innerHTML = '<p style="color:#d97706; font-size:0.9rem; font-weight:600;">⚠️ No hay más turnos esta semana.</p>';
    }
  }
});

function seleccionarHorario(h, btnElement) {
    document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    
    inputHorarioId.value = h.id_horario;
    horarioSeleccionadoCache = h;
    resetValidation();
    
    const fechaAuto = obtenerProximaFecha(h.dia_semana);
    inputFecha.value = fechaAuto;
    document.getElementById('fecha-texto-auto').textContent = formatearFecha(fechaAuto);
    
    stepFecha.style.display = 'block';
    consultarDisponibilidad(fechaAuto, h.id_horario);
}

function obtenerProximaFecha(diaBuscado) {
    const diasSemana = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
    const targetDay = diasSemana[diaBuscado];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let diff = targetDay - hoy.getDay();
    if (diff < 0) diff += 7;
    const proxima = new Date(hoy);
    proxima.setDate(hoy.getDate() + diff);
    return proxima.toISOString().split('T')[0];
}

function formatearFecha(fechaStr) {
    const [y, m, d] = fechaStr.split('-');
    return `${d}/${m}/${y}`;
}

function generarIntervalos(inicioStr, finStr) {
    const intervalos = [];
    let curr = new Date(`2000-01-01T${inicioStr}`);
    const fin = new Date(`2000-01-01T${finStr}`);
    while(curr < fin) {
        intervalos.push(curr.toTimeString().substring(0, 5));
        curr.setMinutes(curr.getMinutes() + 15);
    }
    return intervalos;
}

async function consultarDisponibilidad(fechaValue, idHorario) {
   if(!fechaValue || !horarioSeleccionadoCache) return;
   try {
      cardDisponibilidad.style.display = 'block';
      slotsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center;"><p class="loader"></p> Buscando turnos disponibles...</div>';

      const res = await fetch(`${API_URL}/fichas/disponibles?id_horario=${idHorario}&fecha=${fechaValue}`);
      const payload = await res.json();

      if(res.ok) {
          msg.className = 'message';
          if (payload.motivo_ausencia) {
             slotsGrid.innerHTML = `<p style="color:#991b1b; grid-column: 1/-1; text-align:center; background:#fee2e2; padding:10px; border-radius:8px;">🛑 El médico no atiende este día: <b>${payload.motivo_ausencia}</b></p>`;
             btnSubmit.disabled = true;
             return;
          }
          slotsGrid.innerHTML = '';
          const todosLosBloques = generarIntervalos(horarioSeleccionadoCache.hora_inicio, horarioSeleccionadoCache.hora_fin);
          let hayDisponibles = false;
          todosLosBloques.forEach(hora => {
              const btn = document.createElement('button');
              btn.type = 'button';
              const estaOcupado = payload.horas_ocupadas.includes(hora);
              btn.className = `slot-btn ${estaOcupado ? 'occupied' : 'available'}`;
              btn.disabled = estaOcupado;
              btn.textContent = hora;
              if(!estaOcupado) {
                  hayDisponibles = true;
                  btn.onclick = () => {
                      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                      btn.classList.add('selected');
                      horaSeleccionadaFinal = hora;
                      btnSubmit.disabled = false;
                      btnSubmit.textContent = 'Confirmar Cita a las ' + hora;
                  };
              }
              slotsGrid.appendChild(btn);
          });
          document.getElementById('cupos-number').textContent = payload.disponibles > 0 ? `${payload.disponibles} espacios libres` : 'Sin espacios disponibles';
          if(!hayDisponibles) slotsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#991b1b;">Lo sentimos, este horario está lleno.</p>';
      } else {
          msg.textContent = 'Error: ' + payload.message;
          msg.className = 'message error';
      }
   } catch(error) { console.error("Cupos Error", error); }
}

formFicha.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.className = 'message';
  btnSubmit.disabled = true;

  const data = {
    id_paciente: parseInt(inputPacienteId.value),
    id_medico: parseInt(selectMedico.value),
    id_horario: parseInt(inputHorarioId.value),
    fecha: inputFecha.value,
    hora: horaSeleccionadaFinal,
    estado: 'Vigente'
  };

  try {
    const response = await fetch(API_URL + '/fichas/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (response.ok) {
      document.getElementById('res-paciente').textContent = nombrePacienteText.textContent;
      document.getElementById('res-especialidad').textContent = document.querySelector('.especialidad-btn.active').textContent;
      document.getElementById('res-medico').textContent = selectMedico.options[selectMedico.selectedIndex].text;
      document.getElementById('res-fecha').textContent = formatearFecha(data.fecha);
      document.getElementById('res-hora').textContent = data.hora + " hrs";
      modalOverlay.style.display = 'flex';
    } else {
      const errorData = await response.json();
      msg.textContent = '⚠️ ' + (errorData.message || 'Error al agendar la cita'); 
      msg.className = 'message error';
    }
  } catch (error) {} finally { if (msg.className.includes('error')) btnSubmit.disabled = false; }
});

btnCerrarModal.onclick = () => {
    modalOverlay.style.display = 'none';
    formFicha.reset();
    resetValidation();
    pacienteDisplay.style.display = 'none';
    stepHorario.style.display = 'none';
    document.querySelectorAll('.especialidad-btn').forEach(b => b.classList.remove('active'));
    selectMedico.innerHTML = '<option value="">Primero elige una especialidad</option>'; selectMedico.disabled = true;
};
