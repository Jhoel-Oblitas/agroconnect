<template>
  <div class="module-stack">
    <div class="module-header">
      <div>
        <h2>M3 · Gestión de Trabajadores</h2>
        <p class="subtitle">Registro de personal, control de asistencia diaria, tareas asignadas, jornales y pagos.</p>
      </div>
      <div class="tabs-bar">
        <button class="tab-btn" :class="{ active: tab === 'personal' }" @click="tab = 'personal'">Personal ({{ trabajadores.length }})</button>
        <button class="tab-btn" :class="{ active: tab === 'jornales' }" @click="tab = 'jornales'">Jornales y Pagos ({{ jornales.length }})</button>
        <button class="tab-btn" :class="{ active: tab === 'asistencia' }" @click="tab = 'asistencia'">Asistencia</button>
      </div>
    </div>

    <!-- PERSONAL -->
    <div v-if="tab === 'personal'" class="module-stack">
      <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createTrabajador">
        <div class="field">
          <label>Nombre completo</label>
          <input v-model="trabForm.nombre" required placeholder="Ej: Pedro Mamani" />
        </div>
        <div class="field">
          <label>CI</label>
          <input v-model="trabForm.ci" required placeholder="8123456-LP" />
        </div>
        <div class="field">
          <label>Teléfono WhatsApp</label>
          <input v-model="trabForm.telefono" placeholder="+59170001009" />
        </div>
        <div class="field">
          <label>Cargo</label>
          <input v-model="trabForm.cargo" placeholder="Operario de Campo" />
        </div>
        <div class="field">
          <label>Tarifa Jornal (Bs)</label>
          <input v-model="trabForm.tarifaJornal" type="number" min="1" required />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-dark" style="width: 100%">+ Registrar Trabajador</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>CI</th>
              <th>Cargo</th>
              <th>Tarifa/Jornal</th>
              <th>Tareas Activas</th>
              <th>WhatsApp</th>
              <th>Asistencia Hoy</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in trabajadores" :key="t.id">
              <td><strong>{{ t.nombre }}</strong></td>
              <td>{{ t.ci }}</td>
              <td>{{ t.cargo }}</td>
              <td>Bs {{ t.tarifaJornal }}</td>
              <td>{{ t.labores?.length || 0 }} pendientes</td>
              <td><span class="pill pill-green">{{ t.consentimientoWhatsApp ? 'Autorizado' : 'No' }}</span></td>
              <td>
                <button class="btn btn-soft btn-sm" @click="markAsistencia(t.id)">✓ Marcar Presente</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- JORNALES Y PAGOS -->
    <div v-if="tab === 'jornales'" class="module-stack">
      <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createJornal">
        <div class="field">
          <label>Trabajador</label>
          <select v-model="jornalForm.trabajadorId" required>
            <option v-for="t in trabajadores" :key="t.id" :value="t.id">{{ t.nombre }} (Bs {{ t.tarifaJornal }})</option>
          </select>
        </div>
        <div class="field">
          <label>Lote</label>
          <select v-model="jornalForm.loteId">
            <option v-for="l in lotes" :key="l.id" :value="l.id">{{ l.codigo }} — {{ l.nombre }}</option>
          </select>
        </div>
        <div class="field">
          <label>Cantidad Jornales</label>
          <input v-model="jornalForm.cantidadJornales" type="number" step="0.5" min="0.5" required />
        </div>
        <div class="field">
          <label>Descripción</label>
          <input v-model="jornalForm.descripcion" placeholder="Cosecha y selección" />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-dark" style="width: 100%">+ Registrar Jornal</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Trabajador</th>
              <th>Lote</th>
              <th>Jornales</th>
              <th>Monto Total</th>
              <th>Estado Pago</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in jornales" :key="j.id">
              <td>{{ fmtDate(j.fecha) }}</td>
              <td><strong>{{ j.trabajador?.nombre }}</strong></td>
              <td>{{ j.lote?.codigo || 'General' }}</td>
              <td>{{ j.cantidadJornales }}</td>
              <td><strong>Bs {{ Number(j.montoTotal).toFixed(2) }}</strong></td>
              <td>
                <span class="pill" :class="j.pagado ? 'pill-green' : 'pill-amber'">
                  {{ j.pagado ? 'PAGADO' : 'PENDIENTE' }}
                </span>
              </td>
              <td>
                <button v-if="!j.pagado && auth.isEncargadoOrAbove" class="btn btn-green btn-sm" @click="pagarJornal(j.id)">
                  Registrar Pago
                </button>
                <span v-else style="font-size: 12px; color: var(--text-muted)">{{ fmtDate(j.fechaPago) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ASISTENCIA -->
    <div v-if="tab === 'asistencia'" class="table-wrap">
      <table class="agro-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Trabajador</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in asistencias" :key="a.id">
            <td>{{ fmtDate(a.fecha) }}</td>
            <td><strong>{{ a.trabajador?.nombre }}</strong></td>
            <td>{{ a.horaEntrada }}</td>
            <td>{{ a.horaSalida }}</td>
            <td><span class="pill" :class="a.presente ? 'pill-green' : 'pill-red'">{{ a.presente ? 'Presente' : 'Ausente' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const tab = ref('personal');
const trabajadores = ref([]);
const jornales = ref([]);
const asistencias = ref([]);
const lotes = ref([]);

const trabForm = reactive({ nombre: '', ci: '', telefono: '', cargo: 'Operario de Campo', tarifaJornal: 130 });
const jornalForm = reactive({ trabajadorId: '', loteId: '', cantidadJornales: 1, descripcion: '' });

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('es-BO') : '-';
}

async function loadAll() {
  const [tr, jr, as, lt] = await Promise.all([
    api.get('/trabajadores'),
    api.get('/trabajadores/jornales'),
    api.get('/trabajadores/asistencias'),
    api.get('/nucleo/lotes')
  ]);
  trabajadores.value = tr.data;
  jornales.value = jr.data;
  asistencias.value = as.data;
  lotes.value = lt.data;
  if (trabajadores.value.length && !jornalForm.trabajadorId) jornalForm.trabajadorId = trabajadores.value[0].id;
  if (lotes.value.length && !jornalForm.loteId) jornalForm.loteId = lotes.value[0].id;
}

async function createTrabajador() {
  await api.post('/trabajadores', trabForm);
  trabForm.nombre = '';
  trabForm.ci = '';
  await loadAll();
}

async function markAsistencia(trabajadorId) {
  await api.post('/trabajadores/asistencias', { trabajadorId, presente: true });
  await loadAll();
}

async function createJornal() {
  await api.post('/trabajadores/jornales', jornalForm);
  jornalForm.descripcion = '';
  await loadAll();
}

async function pagarJornal(id) {
  await api.patch(`/trabajadores/jornales/${id}/pagar`);
  await loadAll();
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
</style>
