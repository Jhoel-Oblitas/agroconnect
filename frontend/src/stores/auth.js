import { defineStore } from 'pinia';
import api from '../services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('agroconnect_token') || null,
    usuario: JSON.parse(localStorage.getItem('agroconnect_user') || 'null'),
    finca: JSON.parse(localStorage.getItem('agroconnect_finca') || 'null'),
    modulos: JSON.parse(localStorage.getItem('agroconnect_modulos') || '[]'),
    alertas: []
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    rol: (state) => state.usuario?.rol || 'TRABAJADOR',
    isPropietario: (state) => state.usuario?.rol === 'PROPIETARIO',
    isEncargadoOrAbove: (state) => ['PROPIETARIO', 'ENCARGADO'].includes(state.usuario?.rol),
    isModuleActive: (state) => (codigo) => {
      if (codigo === 'M0') return true;
      const mod = state.modulos.find((m) => m.codigo === codigo);
      return mod ? mod.activo : true;
    }
  },

  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password });
      this.token = data.token;
      this.usuario = data.usuario;
      this.finca = data.finca;
      this.modulos = data.modulos;

      localStorage.setItem('agroconnect_token', data.token);
      localStorage.setItem('agroconnect_user', JSON.stringify(data.usuario));
      localStorage.setItem('agroconnect_finca', JSON.stringify(data.finca));
      localStorage.setItem('agroconnect_modulos', JSON.stringify(data.modulos));
      return data;
    },

    async fetchMe() {
      if (!this.token) return;
      const { data } = await api.get('/auth/me');
      this.usuario = data.usuario;
      this.finca = data.finca;
      this.modulos = data.modulos;
      localStorage.setItem('agroconnect_user', JSON.stringify(data.usuario));
      localStorage.setItem('agroconnect_finca', JSON.stringify(data.finca));
      localStorage.setItem('agroconnect_modulos', JSON.stringify(data.modulos));
    },

    async toggleModulo(codigo, activo) {
      const { data } = await api.patch(`/nucleo/modulos/${codigo}`, { activo });
      const idx = this.modulos.findIndex((m) => m.codigo === codigo);
      if (idx !== -1) this.modulos[idx] = data;
      localStorage.setItem('agroconnect_modulos', JSON.stringify(this.modulos));
      return data;
    },

    setAlertas(alertas) {
      this.alertas = alertas || [];
    },

    logout() {
      this.token = null;
      this.usuario = null;
      this.finca = null;
      this.modulos = [];
      this.alertas = [];
      localStorage.removeItem('agroconnect_token');
      localStorage.removeItem('agroconnect_user');
      localStorage.removeItem('agroconnect_finca');
      localStorage.removeItem('agroconnect_modulos');
    }
  }
});
