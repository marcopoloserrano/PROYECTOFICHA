// Configuración inteligente: busca la URL de la nube, si no, usa localhost
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : window.location.origin; // Esto usará automáticamente la URL de Railway si estás en la nube

const API_URL = `${API_BASE_URL}/api`;

export { API_BASE_URL, API_URL };
