import { API_URL } from './config.js';
const userAuth = JSON.parse(localStorage.getItem('userAuth') || 'null');
if (!userAuth || userAuth.rol !== 'paciente') {
    window.location.href = '/login.html';
}

// API_URL imported above
let medicosDisponibles = [];
let todosLosHorarios = [];
let horarioSeleccionadoCache = null;
let horaSeleccionadaFinal = null;
let bloqueoInterval = null; // Timer para el bloqueo
let disponibilidadInterval = null; // Polling para refrescar slots

// Convert cobertura ID a texto
const coberturasMap = { 1: 'SUS', 2: 'PARTICULAR', 3: 'SEGURO' };
const coberturaTexto = coberturasMap[userAuth.id_cobertura] || 'No definida';

document.querySelector('#patient-app').innerHTML = `
  <div class="glass-card" style="border-top: 5px solid var(--primary-color);">
    <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <h1 style="margin: 0; display: flex; align-items: center; gap: 10px;">🏥 Portal del Paciente</h1>
      <button id="btn-logout" class="action-btn" style="background: #ef4444; width: auto; font-size: 0.8rem; padding: 6px 12px;">Cerrar Sesión</button>
    </div>
    
    <div id="ausencias-alert-box" style="margin-bottom: 1.5rem; display:none; background:#ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 1.2rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);">
      <h3 style="color:#065f46; margin-top:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.4rem;">📅</span> Avisos de la Semana
      </h3>
      <ul id="lista-ausencias-paciente" style="margin-bottom:0; color:#064e3b; font-size:0.95rem; padding-left:1.2rem; line-height:1.6;">
      </ul>
    </div>

    <!-- TARJETA PERFIL DEL PACIENTE -->
    <div style="background: rgba(255,255,255,0.8); border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; gap: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="flex: 1; min-width: 200px;">
            <p style="margin:0; font-size:0.8rem; color:#64748b; font-weight:bold;">Paciente Autenticado</p>
            <p style="margin:5px 0 0 0; font-size:1.2rem; color:#0f172a; font-weight:800;">${userAuth.nombre} ${userAuth.apellido}</p>
        </div>
        <div style="flex: 1; min-width: 150px;">
            <p style="margin:0; font-size:0.8rem; color:#64748b; font-weight:bold;">Carnet (C.I.)</p>
            <p style="margin:5px 0 0 0; font-size:1.1rem; color:#0f172a; font-weight:600;">${userAuth.ci}</p>
        </div>
        <div style="flex: 1; min-width: 150px;">
            <p style="margin:0; font-size:0.8rem; color:#64748b; font-weight:bold;">Forma de Pago</p>
            <p style="margin:5px 0 0 0; font-size:1.1rem; color:#0f172a; font-weight:600;">${coberturaTexto}</p>
        </div>
        <div style="flex: 1; min-width: 150px;">
            <p style="margin:0; font-size:0.8rem; color:#64748b; font-weight:bold;">N° Historial Médico</p>
            <p style="margin:5px 0 0 0; font-size:1.1rem; color:var(--primary-color); font-weight:800;">#${userAuth.numero_historial}</p>
        </div>
    </div>

    <!-- MENSAJE ESPECÍFICO SUS (OCULTO POR DEFECTO) -->
    <div id="sus-warning-box" style="display:none; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
        <p style="margin:0; color:#92400e; font-weight:700; font-size:0.9rem;">
            ⚠️ Ya tienes una ficha registrada para esta semana. Al ser beneficiario del SUS, solo puedes reservar una ficha semanal y deberás esperar hasta la próxima semana para una nueva atención.
        </p>
    </div>

    <!-- SECCIÓN: MIS CITAS RECIENTES -->
    <div id="historial-citas-box" style="background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; margin-bottom: 1.5rem; display:none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom:10px;">
            <h3 style="margin:0; color:var(--primary-color); font-size:1rem;">📋 Mis Citas Registradas</h3>
            <div style="display: flex; gap: 5px;">
                <button onclick="imprimirHistorial()" class="action-btn" style="width:auto; padding:5px 10px; font-size:0.7rem; background:#64748b;">🖨️ Imprimir</button>
                <button onclick="compartirHistorial()" class="action-btn" style="width:auto; padding:5px 10px; font-size:0.7rem; background:#25d366;">📲 Compartir</button>
            </div>
        </div>
        
        <!-- Filtros de Historial -->
        <div style="display: flex; gap: 10px; margin-bottom: 15px; align-items: flex-end; background: #f8fafc; padding: 10px; border-radius: 8px;">
            <div style="flex: 1;">
                <label style="font-size: 0.7rem; color: #64748b; font-weight: bold; display: block; margin-bottom: 3px;">Desde:</label>
                <input type="date" id="filtro-fecha-inicio" style="width: 100%; padding: 5px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem;">
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.7rem; color: #64748b; font-weight: bold; display: block; margin-bottom: 3px;">Hasta:</label>
                <input type="date" id="filtro-fecha-fin" style="width: 100%; padding: 5px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem;">
            </div>
            <button onclick="cargarHistorialPaciente()" class="action-btn" style="width:auto; height:32px; padding:0 10px; font-size:0.8rem;">🔍</button>
        </div>

        <div id="lista-fichas-paciente" style="max-height: 250px; overflow-y:auto;">
            <p style="font-size:0.8rem; color:#64748b;">Cargando historial...</p>
        </div>
    </div>
    
    <form id="patient-ficha-form">

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

            <label style="color:#065f46; font-size:0.9rem; font-weight:700; display:block; margin-bottom:10px;">Selecciona tu hora de atención (Segmentos de 30 min):</label>
            <div id="slots-grid-container" class="slots-grid">
                <!-- Botones de 15 minutos aquí -->
            </div>
        </div>
      </div>

      <!-- Botón de submit eliminado para flujo directo -->
    </form>

    <div id="patient-message" class="message"></div>
  </div>

  <!-- MODAL PRE-CONFIRMACIÓN -->
  <div id="modal-pre-confirm" class="modal-overlay">
    <div class="modal-content" style="border-color: #f59e0b;">
      <div class="ticket-header">
        <h2 style="color: #d97706;">⚠️ Confirmar Horario</h2>
        <p style="font-size: 0.8rem; color: #92400e; font-weight: bold; margin-top: 5px;">Revisa los detalles antes de agendar</p>
      </div>
      <div class="ticket-body" style="background: #fffbeb;">
        <div class="ticket-row"><span>Especialidad:</span> <span id="pre-especialidad">-</span></div>
        <div class="ticket-row"><span>Médico:</span> <span id="pre-medico">-</span></div>
        <div class="ticket-row"><span>Fecha:</span> <span id="pre-fecha">-</span></div>
        <div class="ticket-row"><span>Hora:</span> <span id="pre-hora">-</span></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="btn-cancel-modal">Cancelar</button>
        <button type="button" class="btn-accept" id="btn-confirmar-final">Confirmar Ficha</button>
      </div>
    </div>
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
           <span style="font-size: 0.75rem; color: #065f46;">Por favor, llega 30 minutos antes de tu cita.</span>
        </div>
      </div>
      <div class="ticket-footer" style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; gap:10px;">
            <button type="button" class="btn-cancel" style="background:#64748b; flex:1;" onclick="window.print()">🖨️ Imprimir</button>
            <button type="button" class="btn-accept" style="background:#25d366; flex:1;" id="btn-compartir-ficha">📲 Compartir</button>
        </div>
        <button type="button" class="btn-close-modal" id="btn-cerrar-modal" style="width:100%;">Entendido, Cerrar</button>
      </div>
    </div>
  </div>
`;

// Elementos UI
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
const msg = document.getElementById('patient-message');
const modalOverlay = document.getElementById('modal-confirm');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

// Nuevos elementos para confirmación
const modalPreConfirm = document.getElementById('modal-pre-confirm');
const btnConfirmarFinal = document.getElementById('btn-confirmar-final');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const btnCompartirFicha = document.getElementById('btn-compartir-ficha');

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('userAuth');
    localStorage.removeItem('userRole');
    window.location.href = '/login.html';
});

async function inicializarPortal() {
  try {
    // 1. Cargar Especialidades en botones (Primero cargamos la UI)
    const reqEsp = await fetch(API_URL + '/especialidades');
    const especialidades = await reqEsp.json();
    renderEspecialidades(especialidades);

    const req2 = await fetch(API_URL + '/medicos');
    medicosDisponibles = await req2.json();

    const req3 = await fetch(API_URL + '/horarios');
    todosLosHorarios = await req3.json();

    // 2.1 Cargar Historial de Fichas del Paciente (Siempre cargar historial)
    cargarHistorialPaciente();

    // 2. Verificar si ya tiene ficha esta semana (Después de cargar para no trabar la UI)
    try {
        const resVerif = await fetch(`${API_URL}/fichas/verificar-semana/${userAuth.id}`);
        if (resVerif.ok) {
            const dataVerif = await resVerif.json();
                if (dataVerif.tieneFicha) {
                    // Mostrar mensaje general
                    msg.innerHTML = `⚠️ <b>Reserva Existente:</b> ${dataVerif.message}<br>Solo se permite una cita por semana.`;
                    msg.className = 'message error';
                    
                    // Si es SUS (id_cobertura === 1), mostrar mensaje especial debajo de datos
                if (userAuth.id_cobertura == 1) {
                    document.getElementById('sus-warning-box').style.display = 'block';
                }

                // Bloqueamos las especialidades y el formulario
                const form = document.getElementById('patient-ficha-form');
                form.style.opacity = '0.4';
                form.style.pointerEvents = 'none';
                form.style.filter = 'grayscale(1)';
                
                // Mostrar un mensaje flotante o más visible si fuera necesario
                return; // Detenemos aquí si ya tiene ficha
            }
        }
    } catch (verifErr) {
        console.error("Error verificando semana:", verifErr);
    }

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
async function cargarHistorialPaciente() {
    try {
        const fechaInicio = document.getElementById('filtro-fecha-inicio')?.value || '';
        const fechaFin = document.getElementById('filtro-fecha-fin')?.value || '';
        
        let url = `${API_URL}/fichas/paciente/${userAuth.id}`;
        if (fechaInicio || fechaFin) {
            url += `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        }

        const res = await fetch(url);
        const fichas = await res.json();
        const contenedor = document.getElementById('lista-fichas-paciente');
        const box = document.getElementById('historial-citas-box');
        
        if (fichas.length > 0 || (fechaInicio || fechaFin)) {
            box.style.display = 'block';
            contenedor.innerHTML = '';
            
            if (fichas.length === 0) {
                contenedor.innerHTML = '<p style="font-size:0.8rem; color:#64748b; text-align:center; padding:10px;">No se encontraron citas en este rango.</p>';
                return;
            }

            fichas.forEach(f => {
                contenedor.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid #f1f5f9; font-size:0.85rem;">
                        <div>
                            <b style="color:var(--primary-color)">${f.especialidad_nombre}</b> - Dr. ${f.medico_nombre}<br>
                            <span style="color:#64748b;">📅 ${formatearFecha(f.fecha.split('T')[0])} a las 🕒 ${f.hora.substring(0,5)}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            box.style.display = 'none';
        }
    } catch (e) {
        console.error("Error historial", e);
    }
}

window.imprimirHistorial = function() {
    const listContent = document.getElementById('lista-fichas-paciente').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Mis Citas - Hospital</title>');
    printWindow.document.write('<style>body{font-family:sans-serif; padding:20px;} h1{color:#059669;} .cita{border-bottom:1px solid #eee; padding:10px 0;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Historial de Citas: ' + userAuth.nombre + ' ' + userAuth.apellido + '</h1>');
    printWindow.document.write('<div>' + listContent + '</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
};

window.compartirHistorial = async function() {
    const res = await fetch(`${API_URL}/fichas/paciente/${userAuth.id}`);
    const fichas = await res.json();
    if (fichas.length === 0) return alert("No tienes citas para compartir.");

    let texto = `*Mis Citas - Hospital*\n\n`;
    fichas.slice(0, 5).forEach(f => {
        texto += `📍 *${f.especialidad_nombre}*\n👨‍⚕️ Dr. ${f.medico_nombre}\n📅 ${formatearFecha(f.fecha.split('T')[0])} - ${f.hora.substring(0,5)}\n\n`;
    });

    if (navigator.share) {
        navigator.share({ title: 'Mis Citas Médicas', text: texto });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
    }
};

window.compartirFichaUnica = function() {
    const esp = document.getElementById('res-especialidad').textContent;
    const med = document.getElementById('res-medico').textContent;
    const fec = document.getElementById('res-fecha').textContent;
    const hor = document.getElementById('res-hora').textContent;
    
    const texto = `*Confirmación de Cita Médica*\n\n🏥 *Hospital*\n📍 *Especialidad:* ${esp}\n👨‍⚕️ *Médico:* ${med}\n📅 *Fecha:* ${fec}\n🕒 *Hora:* ${hor}\n\n_Por favor, llega 30 minutos antes de tu cita._`;
    
    if (navigator.share) {
        navigator.share({ title: 'Confirmación de Cita', text: texto });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`);
    }
};

inicializarPortal();

// (Búsqueda eliminada, ahora usa el userAuth de localStorage para el ID del paciente)

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
    inputHorarioId.value = '';
    inputFecha.value = '';
    horaSeleccionadaFinal = null;
    cardDisponibilidad.style.display = 'none';
    stepFecha.style.display = 'none';
    msg.className = 'message';
    if (bloqueoInterval) clearInterval(bloqueoInterval);
    if (disponibilidadInterval) clearInterval(disponibilidadInterval);
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
          const fechaReal = obtenerProximaFecha(h.dia_semana);
          const [y, m, d] = fechaReal.split('-');

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'horario-btn';
          btn.innerHTML = `<b>${h.dia_semana} ${d}/${m}</b><br><small>${h.hora_inicio.substring(0,5)} - ${h.hora_fin.substring(0,5)}</small>`;
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
        curr.setMinutes(curr.getMinutes() + 30);
    }
    return intervalos;
}

async function intentarBloquearSlot(hora, btn) {
    // Si ya es nuestra selección actual, deseleccionamos (liberamos)
    if (hora === horaSeleccionadaFinal) {
        msg.textContent = 'Horario deseleccionado y liberado.';
        msg.className = 'message';
        // Refrescar para que otros vean que está libre
        refrescarSlots(inputFecha.value, inputHorarioId.value, true);
        return;
    }

    // Ya no es necesario liberarBloqueo() manual antes, el Backend lo hace automáticamente por id_paciente

    try {
        const res = await fetch(`${API_URL}/bloqueos/reservar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_medico: parseInt(selectMedico.value),
                fecha: inputFecha.value,
                hora: hora,
                id_paciente: userAuth.id
            })
        });

        const data = await res.json();

        if (res.ok) {
            document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            horaSeleccionadaFinal = hora;
            
            // Trigger directo del modal de confirmación
            lanzarModalConfirmacion();
            
            msg.textContent = '✅ Horario seleccionado.';
            msg.className = 'message success';
        } else {
            msg.textContent = '⚠️ ' + data.message;
            msg.className = 'message error';
            // Refrescar disponibilidad de forma silenciosa para no borrar el mensaje de error
            refrescarSlots(inputFecha.value, inputHorarioId.value, true);
        }
    } catch (e) {
        console.error("Error al bloquear", e);
    }
}

// Función de contador eliminada a petición del usuario

async function liberarBloqueo() {
    if (!horaSeleccionadaFinal) return;
    try {
        await fetch(`${API_URL}/bloqueos/liberar`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_medico: parseInt(selectMedico.value),
                fecha: inputFecha.value,
                hora: horaSeleccionadaFinal,
                id_paciente: userAuth.id
            })
        });
    } catch (e) {} finally {
        if (bloqueoInterval) clearInterval(bloqueoInterval);
        horaSeleccionadaFinal = null;
    }
}

// Liberar bloqueo al cerrar página (Best effort)
window.addEventListener('beforeunload', () => {
    if (horaSeleccionadaFinal) {
        navigator.sendBeacon(`${API_URL}/bloqueos/liberar`, JSON.stringify({
            id_medico: parseInt(selectMedico.value),
            fecha: inputFecha.value,
            hora: horaSeleccionadaFinal,
            id_paciente: userAuth.id
        }));
    }
});

async function consultarDisponibilidad(fechaValue, idHorario) {
    if(!fechaValue || !horarioSeleccionadoCache) return;
    
    // 1. Mostrar loader la primera vez
    cardDisponibilidad.style.display = 'block';
    slotsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center;"><p class="loader"></p> Buscando turnos disponibles...</div>';

    // 2. Ejecutar primera carga inmediata
    await refrescarSlots(fechaValue, idHorario);

    // 3. Configurar polling (cada 3 segundos) para ver lo que otros pacientes bloquean
    if (disponibilidadInterval) clearInterval(disponibilidadInterval);
    disponibilidadInterval = setInterval(() => {
        refrescarSlots(fechaValue, idHorario, true); // true = modo silencioso (sin loader)
    }, 3000);
}

async function refrescarSlots(fechaValue, idHorario, silencioso = false) {
    try {
        const res = await fetch(`${API_URL}/fichas/disponibles?id_horario=${idHorario}&fecha=${fechaValue}`);
        const payload = await res.json();

        if(res.ok) {
            if (payload.motivo_ausencia) {
               slotsGrid.innerHTML = `<p style="color:#991b1b; grid-column: 1/-1; text-align:center; background:#fee2e2; padding:10px; border-radius:8px;">🛑 El médico no atiende este día: <b>${payload.motivo_ausencia}</b></p>`;
               btnSubmit.disabled = true;
               if (disponibilidadInterval) clearInterval(disponibilidadInterval);
               return;
            }
            
            let todosLosBloques = generarIntervalos(horarioSeleccionadoCache.hora_inicio, horarioSeleccionadoCache.hora_fin);
            if (horarioSeleccionadoCache.limite_fichas) {
                todosLosBloques = todosLosBloques.slice(0, horarioSeleccionadoCache.limite_fichas);
            }

            // Guardamos el foco/estado si no es la primera carga
            const fragment = document.createDocumentFragment();
            let hayDisponibles = false;

            todosLosBloques.forEach(hora => {
                const btn = document.createElement('button');
                btn.type = 'button';
                const estaOcupado = payload.horas_ocupadas.includes(hora);
                const estaEnProceso = payload.horas_en_proceso && payload.horas_en_proceso.includes(hora);
                const esMiSeleccion = (hora === horaSeleccionadaFinal);
                
                const claseEstado = estaOcupado ? 'occupied' : (esMiSeleccion ? 'selected' : (estaEnProceso ? 'in-process' : 'available'));
                
                btn.className = `slot-btn ${claseEstado}`;
                btn.disabled = estaOcupado || (estaEnProceso && !esMiSeleccion);
                
                if (esMiSeleccion) {
                    btn.textContent = hora;
                } else if (estaEnProceso) {
                    btn.innerHTML = `${hora}<br><small style="font-size:0.6rem;">En Proceso...</small>`;
                } else {
                    btn.textContent = hora;
                }

                if(!estaOcupado && (!estaEnProceso || esMiSeleccion)) {
                    hayDisponibles = true;
                    btn.onclick = () => intentarBloquearSlot(hora, btn);
                } else if (estaEnProceso && !esMiSeleccion) {
                    btn.onclick = () => {
                        msg.textContent = '⚠️ Alguien más está procesando este horario. Por favor espera o elige otro.';
                        msg.className = 'message error';
                    };
                    btn.disabled = false;
                }
                fragment.appendChild(btn);
            });

            // Solo actualizamos el DOM si el contenido ha cambiado o es la primera carga
            // Para simplificar, comparamos el innerHTML o simplemente reemplazamos
            // Usamos innerHTML solo si no estamos "escribiendo" algo (silencioso)
            slotsGrid.innerHTML = '';
            slotsGrid.appendChild(fragment);

            document.getElementById('cupos-number').textContent = payload.disponibles > 0 ? `${payload.disponibles} espacios libres` : 'Sin espacios disponibles';
            if(!hayDisponibles) slotsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#991b1b;">Lo sentimos, este horario está lleno.</p>';
        }
    } catch(error) { 
        console.error("Polling Error", error); 
        if (slotsGrid.innerHTML.includes('loader')) {
            slotsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#991b1b;">⚠️ Error cargando disponibilidad. Por favor intenta de nuevo.</p>';
        }
    }
}

function lanzarModalConfirmacion() {
    if (!horaSeleccionadaFinal) return;
    
    document.getElementById('pre-especialidad').textContent = document.querySelector('.especialidad-btn.active').textContent;
    document.getElementById('pre-medico').textContent = selectMedico.options[selectMedico.selectedIndex].text;
    document.getElementById('pre-fecha').textContent = formatearFecha(inputFecha.value);
    document.getElementById('pre-hora').textContent = horaSeleccionadaFinal + " hrs";
    
    modalPreConfirm.style.display = 'flex';
}

btnCancelModal.onclick = async () => {
    await liberarBloqueo(); // Liberamos el horario si cancela
    modalPreConfirm.style.display = 'none';
    
    // Deseleccionar UI
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    horaSeleccionadaFinal = null;
    msg.textContent = 'Selección cancelada.';
    msg.className = 'message';
};

btnConfirmarFinal.onclick = async () => {
  msg.className = 'message';
  btnConfirmarFinal.disabled = true;
  btnConfirmarFinal.textContent = 'Procesando...';

  const data = {
    id_paciente: userAuth.id,
    id_medico: parseInt(selectMedico.value),
    id_horario: parseInt(inputHorarioId.value),
    fecha: inputFecha.value,
    hora: horaSeleccionadaFinal,
    estado: 'Vigente'
  };

  try {
    const response = await fetch(API_URL + '/fichas/crear', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(data) 
    });
    
    if (response.ok) {
      modalPreConfirm.style.display = 'none';
      if (bloqueoInterval) clearInterval(bloqueoInterval);
      document.getElementById('res-paciente').textContent = `${userAuth.nombre} ${userAuth.apellido}`;
      document.getElementById('res-especialidad').textContent = document.getElementById('pre-especialidad').textContent;
      document.getElementById('res-medico').textContent = document.getElementById('pre-medico').textContent;
      document.getElementById('res-fecha').textContent = document.getElementById('pre-fecha').textContent;
      document.getElementById('res-hora').textContent = data.hora + " hrs";
      modalOverlay.style.display = 'flex';
    } else {
      const errorData = await response.json();
      msg.textContent = '⚠️ ' + (errorData.message || 'Error al agendar la cita'); 
      msg.className = 'message error';
      modalPreConfirm.style.display = 'none';
    }
  } catch (error) {
      console.error("Error al confirmar:", error);
  } finally { 
      btnConfirmarFinal.disabled = false;
      btnConfirmarFinal.textContent = 'Confirmar Ficha';
  }
};

btnCerrarModal.onclick = () => {
    modalOverlay.style.display = 'none';
    formFicha.reset();
    resetValidation();
    stepHorario.style.display = 'none';
    document.querySelectorAll('.especialidad-btn').forEach(b => b.classList.remove('active'));
    selectMedico.innerHTML = '<option value="">Primero elige una especialidad</option>'; selectMedico.disabled = true;
};

// Evento para compartir la ficha única
btnCompartirFicha.onclick = () => {
    window.compartirFichaUnica();
};
