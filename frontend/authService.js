const API_URL = '/api';

export const authService = {
    /**
     * Inicia sesión como paciente usando CI y Fecha de Nacimiento
     */
    async loginPaciente(ci, fechaNacimiento) {
        const res = await fetch(`${API_URL}/auth/paciente-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ci, fecha_nacimiento: fechaNacimiento })
        });
        return { ok: res.ok, status: res.status, data: await res.json() };
    },

    /**
     * Inicia sesión como personal (Admin/Secretaría)
     */
    async loginStaff(usuario, contraseña) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contraseña })
        });
        return { ok: res.ok, status: res.status, data: await res.json() };
    },

    /**
     * Guarda la sesión en el almacenamiento local
     */
    saveSession(usuario) {
        localStorage.setItem('userAuth', JSON.stringify(usuario));
    },

    /**
     * Obtiene la sesión actual
     */
    getSession() {
        return JSON.parse(localStorage.getItem('userAuth') || 'null');
    },

    /**
     * Cierra la sesión
     */
    logout() {
        localStorage.removeItem('userAuth');
        window.location.href = '/login.html';
    }
};
