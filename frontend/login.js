import { authService } from './authService.js';

// Elementos de la UI
const btnSwitch = document.getElementById('btn-switch-staff');
const viewPaciente = document.getElementById('view-paciente');
const viewStaff = document.getElementById('view-staff');

const formPaciente = document.getElementById('form-paciente');
const formStaff = document.getElementById('form-staff');

const msgPaciente = document.getElementById('msg-paciente');
const msgStaff = document.getElementById('msg-staff');

let isPatientView = true;

/**
 * Cambia entre la vista de Paciente y Personal
 */
function toggleView() {
    isPatientView = !isPatientView;
    
    if (isPatientView) {
        btnSwitch.innerHTML = '🔒 Personal (Admin / Secretaría)';
        viewPaciente.style.display = 'block';
        viewStaff.style.display = 'none';
    } else {
        btnSwitch.innerHTML = '👤 Soy Paciente';
        viewPaciente.style.display = 'none';
        viewStaff.style.display = 'block';
    }
}

/**
 * Maneja el login del Paciente
 */
formPaciente.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgPaciente.className = 'message';
    msgPaciente.textContent = 'Verificando...';
    
    const ci = document.getElementById('ci_paciente').value;
    const fechaNac = document.getElementById('fecha_nac_paciente').value;

    try {
        const result = await authService.loginPaciente(ci, fechaNac);
        
        if (result.ok) {
            authService.saveSession(result.data.usuario);
            window.location.href = '/paciente.html';
        } else {
            msgPaciente.textContent = '❌ ' + (result.data.message || 'Error de credenciales');
            msgPaciente.className = 'message error';
        }
    } catch (err) {
        msgPaciente.textContent = '❌ Error de conexión al servidor.';
        msgPaciente.className = 'message error';
    }
});

/**
 * Maneja el login del Personal
 */
formStaff.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgStaff.className = 'message';
    msgStaff.textContent = 'Verificando...';
    
    const usuario = document.getElementById('username_staff').value;
    const contraseña = document.getElementById('password_staff').value;

    try {
        const result = await authService.loginStaff(usuario, contraseña);
        
        if (result.ok) {
            // Mapeo id_rol a nombre de rol (Rol 1 = Admin, 2 = Secretaría)
            let rolStr = (result.data.usuario.id_rol === 1) ? 'administrador' : 'secretaria';
            result.data.usuario.rol = rolStr;
            
            authService.saveSession(result.data.usuario);
            window.location.href = '/index.html';
        } else {
            msgStaff.textContent = '❌ ' + (result.data.message || 'Usuario o contraseña incorrectos');
            msgStaff.className = 'message error';
        }
    } catch (err) {
        msgStaff.textContent = '❌ Error de conexión al servidor.';
        msgStaff.className = 'message error';
    }
});

// Evento para cambiar de vista
btnSwitch.addEventListener('click', toggleView);

// Lógica de inicialización
const authData = authService.getSession();
if (authData) {
    if (authData.rol === 'paciente') window.location.href = '/paciente.html';
    else window.location.href = '/index.html';
}
