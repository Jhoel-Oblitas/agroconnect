<template>
  <div class="module-stack">
    <div class="module-header">
      <div>
        <h2>M0 · Núcleo y Arquitectura Modular</h2>
        <p class="subtitle">Activa o desactiva módulos por finca, administra lotes, cultivos y usuarios con roles.</p>
      </div>
      <div class="tabs-bar">
        <button class="tab-btn" :class="{ active: tab === 'modulos' }" @click="tab = 'modulos'">Módulos</button>
        <button class="tab-btn" :class="{ active: tab === 'lotes' }" @click="tab = 'lotes'">Lotes ({{ lotes.length }})</button>
        <button class="tab-btn" :class="{ active: tab === 'cultivos' }" @click="tab = 'cultivos'">Cultivos ({{ cultivos.length }})</button>
        <button v-if="auth.isEncargadoOrAbove" class="tab-btn" :class="{ active: tab === 'usuarios' }" @click="tab = 'usuarios'">Usuarios</button>
      </div>
    </div>

    <!-- TAB MÓDULOS ACTIVABLES POR FINCA -->
    <div v-if="tab === 'modulos'" class="cards-grid">
      <div v-for="mod in auth.modulos" :key="mod.codigo" class="card-white mod-card">
        <div class="mod-top">
          <span class="pill" :class="mod.activo ? 'pill-green' : 'pill-amber'">{{ mod.codigo }}</span>
          <label class="switch">
            <input
              type="checkbox"
              :checked="mod.activo"
              :disabled="mod.codigo === 'M0' || !auth.isPropietario"
              @change="onToggleModulo(mod)"
            />
            <span class="slider"></span>
          </label>
        </div>
        <h3 style="margin: 10px 0 4px">{{ mod.nombre }}</h3>
        <p class="subtitle" style="margin: 0">{{ mod.descripcion }}</p>
        <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center">
          <span class="pill" :class="mod.obligatorio ? 'pill-dark' : 'pill-blue'">
            {{ mod.obligatorio ? 'Base' : 'Escalable' }}
          </span>
          <small style="color: var(--text-muted)">{{ mod.activo ? 'Activo en menú y API' : 'Desactivado' }}</small>
        </div>
      </div>
    </div>

    <!-- TAB LOTES -->
    <div v-if="tab === 'lotes'" class="module-stack">
      <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createLote">
        <div class="field">
          <label>Código</label>
          <input v-model="loteForm.codigo" required placeholder="L-05" />
        </div>
        <div class="field">
          <label>Nombre del lote</label>
          <input v-model="loteForm.nombre" required placeholder="Lote 5 - Espinaca" />
        </div>
        <div class="field">
          <label>Sector</label>
          <input v-model="loteForm.sector" placeholder="Campos Norte" />
        </div>
        <div class="field">
          <label>Área (Ha)</label>
          <input v-model="loteForm.areaHectareas" type="number" step="0.1" min="0.1" required />
        </div>
        <div class="field">
          <label>Tipo de suelo</label>
          <input v-model="loteForm.tipoSuelo" placeholder="Franco-arcilloso" />
        </div>
        <div class="field">
          <label>Humedad (%)</label>
          <input v-model="loteForm.humedadPct" type="number" min="0" max="100" />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-dark" style="width: 100%">+ Agregar Lote</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Sector</th>
              <th>Área (Ha)</th>
              <th>Suelo</th>
              <th>Humedad</th>
              <th>Salud / NPK</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in lotes" :key="l.id">
              <td><strong>{{ l.codigo }}</strong></td>
              <td>{{ l.nombre }}</td>
              <td>{{ l.sector }}</td>
              <td>{{ l.areaHectareas }} ha</td>
              <td>{{ l.tipoSuelo }}</td>
              <td>{{ l.humedadPct }}%</td>
              <td>{{ l.saludPct }}% · N{{ l.nivelN }}/P{{ l.nivelP }}/K{{ l.nivelK }}</td>
              <td>
                <span class="pill" :class="l.estado === 'SALUDABLE' ? 'pill-green' : 'pill-amber'">{{ l.estado }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB CULTIVOS -->
    <div v-if="tab === 'cultivos'" class="module-stack">
      <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createCultivo">
        <div class="field">
          <label>Cultivo</label>
          <input v-model="cultivoForm.nombre" required placeholder="Ej: Pimentón" />
        </div>
        <div class="field">
          <label>Variedad</label>
          <input v-model="cultivoForm.variedad" required placeholder="Ej: California Wonder" />
        </div>
        <div class="field">
          <label>Categoría</label>
          <select v-model="cultivoForm.categoria">
            <option>Hortaliza</option>
            <option>Fruta</option>
            <option>Aromática</option>
          </select>
        </div>
        <div class="field">
          <label>Ciclo (días)</label>
          <input v-model="cultivoForm.cicloDias" type="number" min="15" />
        </div>
        <div class="field">
          <label>Precio Ref. (Bs/kg)</label>
          <input v-model="cultivoForm.precioRefKg" type="number" step="0.5" />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-dark" style="width: 100%">+ Agregar Cultivo</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Cultivo</th>
              <th>Variedad</th>
              <th>Categoría</th>
              <th>Ciclo</th>
              <th>Precio Ref.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cultivos" :key="c.id">
              <td><strong>{{ c.nombre }}</strong></td>
              <td>{{ c.variedad }}</td>
              <td><span class="pill pill-green">{{ c.categoria }}</span></td>
              <td>{{ c.cicloDias }} días</td>
              <td>Bs {{ Number(c.precioRefKg).toFixed(2) }}/kg</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB USUARIOS -->
    <div v-if="tab === 'usuarios'" class="module-stack">
      <form v-if="auth.isPropietario" class="card form-grid" @submit.prevent="createUsuario">
        <div class="field">
          <label>Nombre completo</label>
          <input v-model="userForm.nombre" required placeholder="Rosa Quispe" />
        </div>
        <div class="field">
          <label>Correo</label>
          <input v-model="userForm.email" type="email" required placeholder="rosa@agroconnect.demo" />
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input v-model="userForm.password" type="password" required minlength="6" />
        </div>
        <div class="field">
          <label>Rol</label>
          <select v-model="userForm.rol">
            <option value="PROPIETARIO">PROPIETARIO</option>
            <option value="ENCARGADO">ENCARGADO</option>
            <option value="TRABAJADOR">TRABAJADOR</option>
          </select>
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-dark" style="width: 100%">+ Crear Usuario</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Teléfono</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.id">
              <td><strong>{{ u.nombre }}</strong></td>
              <td>{{ u.email }}</td>
              <td><span class="pill pill-dark">{{ u.rol }}</span></td>
              <td>{{ u.telefono || '-' }}</td>
              <td><span class="pill pill-green">{{ u.activo ? 'Activo' : 'Inactivo' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="feedback" class="pill pill-green" style="align-self: flex-start; padding: 8px 16px">{{ feedback }}</div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const tab = ref('modulos');
const lotes = ref([]);
const cultivos = ref([]);
const usuarios = ref([]);
const feedback = ref('');

const loteForm = reactive({ codigo: '', nombre: '', sector: 'Campos Norte', areaHectareas: 0.8, tipoSuelo: 'Franco-arcilloso', humedadPct: 68 });
const cultivoForm = reactive({ nombre: '', variedad: '', categoria: 'Hortaliza', cicloDias: 85, precioRefKg: 10 });
const userForm = reactive({ nombre: '', email: '', password: '', rol: 'TRABAJADOR' });

function notify(msg) {
  feedback.value = msg;
  setTimeout(() => (feedback.value = ''), 3500);
}

async function loadAll() {
  const [l, c] = await Promise.all([api.get('/nucleo/lotes'), api.get('/nucleo/cultivos')]);
  lotes.value = l.data;
  cultivos.value = c.data;
  if (auth.isEncargadoOrAbove) {
    const u = await api.get('/nucleo/usuarios');
    usuarios.value = u.data;
  }
}

async function onToggleModulo(mod) {
  try {
    await auth.toggleModulo(mod.codigo, !mod.activo);
    notify(`Módulo ${mod.codigo} (${mod.nombre}) ${!mod.activo ? 'activado' : 'desactivado'}.`);
  } catch (err) {
    notify(err.response?.data?.error || 'Error cambiando estado del módulo');
  }
}

async function createLote() {
  await api.post('/nucleo/lotes', loteForm);
  loteForm.codigo = '';
  loteForm.nombre = '';
  await loadAll();
  notify('Lote registrado correctamente.');
}

async function createCultivo() {
  await api.post('/nucleo/cultivos', cultivoForm);
  cultivoForm.nombre = '';
  cultivoForm.variedad = '';
  await loadAll();
  notify('Cultivo registrado correctamente.');
}

async function createUsuario() {
  await api.post('/nucleo/usuarios', userForm);
  userForm.nombre = '';
  userForm.email = '';
  userForm.password = '';
  await loadAll();
  notify('Usuario creado correctamente.');
}

onMounted(loadAll);
</script>

<style scoped>
.module-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
}
.module-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
}
.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.mod-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #d1d5db;
  transition: 0.2s;
  border-radius: 999px;
}
.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}
input:checked + .slider {
  background-color: #52823e;
}
input:checked + .slider:before {
  transform: translateX(20px);
}
input:disabled + .slider {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
