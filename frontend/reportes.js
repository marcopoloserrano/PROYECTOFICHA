import { API_URL } from './config.js';

const reportBody = document.getElementById('report-body');
const reportSummary = document.getElementById('report-summary');
const btnBuscar = document.getElementById('btn-buscar');
const btnShare = document.getElementById('btn-share');
const filtroInicio = document.getElementById('filtro-inicio');
const filtroFin = document.getElementById('filtro-fin');
const filtroEspecialidad = document.getElementById('filtro-especialidad');
const filtroOrden = document.getElementById('filtro-orden');
const msg = document.getElementById('report-message');

let currentData = [];

async function inicializar() {
    // Cargar especialidades para el buscador
    try {
        const res = await fetch(`${API_URL}/especialidades`);
        const especialidades = await res.json();
        especialidades.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id_especialidad;
            opt.textContent = e.nombre;
            filtroEspecialidad.appendChild(opt);
        });
    } catch (e) {
        console.error("Error cargando especialidades", e);
    }

    // Fecha por defecto: Hoy
    const hoy = new Date().toISOString().split('T')[0];
    filtroInicio.value = hoy;
    filtroFin.value = hoy;

    cargarReporte();
}

async function cargarReporte() {
    reportBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">🔍 Buscando datos...</td></tr>';
    
    const params = new URLSearchParams({
        fecha_inicio: filtroInicio.value,
        fecha_fin: filtroFin.value,
        id_especialidad: filtroEspecialidad.value,
        orden: filtroOrden.value
    });

    try {
        const res = await fetch(`${API_URL}/fichas/reporte?${params}`);
        currentData = await res.json();
        renderTable(currentData);
    } catch (e) {
        msg.textContent = "Error al conectar con el servidor";
        msg.className = "message error";
    }
}

function renderTable(data) {
    if (data.length === 0) {
        reportBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">No se encontraron registros para los filtros seleccionados.</td></tr>';
        reportSummary.textContent = "0 registros encontrados";
        return;
    }

    reportSummary.textContent = `${data.length} registros encontrados`;
    reportBody.innerHTML = '';
    
    data.forEach(f => {
        const colorEstado = f.estado === 'Confirmado' ? '#10b981' : (f.estado === 'Vigente' ? '#3b82f6' : '#64748b');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span style="font-weight:700; color:#1e293b; display:block;">${formatearFechaSimple(f.fecha)}</span>
                <span style="font-size:0.8rem; color:#64748b;">${f.hora.substring(0,5)} hrs</span>
            </td>
            <td>
                <span style="font-weight:600; color:#0f172a;">${f.paciente_apellido}, ${f.paciente_nombre}</span>
            </td>
            <td>
                <span style="font-size:0.85rem; color:#475569;">CI: ${f.ci}</span>
            </td>
            <td>
                <span style="display:block; font-weight:700; font-size:0.85rem; color:#4338ca;">${f.especialidad_nombre}</span>
                <span style="font-size:0.75rem; color:#64748b;">Dr. ${f.medico_nombre} ${f.medico_apellido}</span>
            </td>
            <td>
                <span class="badge" style="background:${colorEstado}">${f.estado}</span>
            </td>
        `;
        reportBody.appendChild(tr);
    });
}

function formatearFechaSimple(f) {
    const d = new Date(f);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// LÓGICA DE COMPARTIR
async function compartirReporte() {
    if (currentData.length === 0) return alert("No hay datos para compartir");

    let texto = `*REPORTE DE CITAS MÉDICAS*\n`;
    texto += `Periodo: ${filtroInicio.value} al ${filtroFin.value}\n`;
    texto += `----------------------------\n`;
    
    currentData.forEach((f, index) => {
        texto += `${index + 1}. *${f.hora.substring(0,5)}* - ${f.paciente_nombre} ${f.paciente_apellido} (Dr. ${f.medico_apellido} - ${f.especialidad_nombre})\n`;
    });

    texto += `\n_Generado por Sistema de Fichaje_`;

    // Intentar Web Share API (Mobile)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Reporte de Citas',
                text: texto
            });
        } catch (e) {
            abrirWhatsApp(texto);
        }
    } else {
        abrirWhatsApp(texto);
    }
}

function abrirWhatsApp(texto) {
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
}

btnBuscar.onclick = cargarReporte;
btnShare.onclick = compartirReporte;

inicializar();
