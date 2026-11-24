<template>
  <div class="module-stack">
    <div class="module-header">
      <div>
        <h2>M1 · Control Técnico de Campo</h2>
        <p class="subtitle">Labores, riego, aplicaciones fitosanitarias con período de carencia y registro de cosechas.</p>
      </div>
      <div class="tabs-bar">
        <button class="tab-btn" :class="{ active: tab === 'labores' }" @click="tab = 'labores'">Labores y Riego ({{ labores.length }})</button>
        <button class="tab-btn" :class="{ active: tab === 'fitosanitario' }" @click="tab = 'fitosanitario'">Fitosanitario ({{ aplicaciones.length }})</button>
        <button class="tab-btn" :class="{ active: tab === 'cosechas' }" @click="tab = 'cosechas'">Cosechas ({{ cosechas.length }})</button>
      </div>
    </div>

    <div v-if="alertMsg" class="alert-banner" :class="alertType">{{ alertMsg }}</div>

    <!-- LABORES -->
    <div v-if="tab === 'labores'" class="module-stack">
      <form class="card form-grid" @submit.prevent="createLabor">
        <div class="field">
          <label>Lote</label>
          <select v-model="laborForm.loteId" required>
            <option v-for="l in lotes" :key="l.id" :value="l.id">{{ l.codigo }} — {{ l.nombre }}</option>
          </select>
        </div>
        <div class="field">
          <label>Tipo de labor</label>
          <select v-model="laborForm.tipo">
            <option value="RIEGO">Riego</option>
            <option value="SIEMBRA">Siembra</option>
            <option value="PODA">Poda</option>
            <option value="FERTILIZACION">Fertilización</option>
            <option value="DESHIERBE">Deshierbe</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="COSECHA">Cosecha</option>
          </select>
        </div>
        <div class="field">
          <label>Título</label>
          <input v-model="laborForm.titulo" required placeholder="Ej: Riego por goteo mañana" />
        </div>
        <div class="field">
          <label>Fecha programada</label>
          <input v-model="laborForm.fechaProgramada" type="date" required />
        </div>
        <div class="field">
          <label>Costo est. (Bs)</label>
          <input v-model="laborForm.costoEstimado" type="number" min="0" />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-dark" style="width: 100%">+ Registrar Labor</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Labor</th>
              <th>Lote</th>
              <th>Origen</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lb in labores" :key="lb.id">
              <td>{{ fmtDate(lb.fechaProgramada) }}</td>
              <td><span class="pill pill-blue">{{ lb.tipo }}</span></td>
              <td>
                <strong>{{ lb.titulo }}</strong>
                <div style="font-size: 11px; color: var(--text-muted)">{{ lb.descripcion }}</div>
              </td>
              <td>{{ lb.lote?.codigo }}</td>
              <td><span class="pill" :class="lb.origen === 'WHATSAPP_IA' ? 'pill-green' : 'pill-dark'">{{ lb.origen }}</span></td>
              <td>
                <span class="pill" :class="lb.estado === 'COMPLETADA' ? 'pill-green' : lb.estado === 'EN_PROCESO' ? 'pill-amber' : 'pill-red'">
                  {{ lb.estado }}
                </span>
              </td>
              <td>
                <button v-if="lb.estado !== 'COMPLETADA'" class="btn btn-soft btn-sm" @click="advanceLabor(lb)">
                  {{ lb.estado === 'PENDIENTE' ? 'Iniciar' : 'Completar' }}
                </button>
                <span v-else style="font-size: 12px; color: var(--green-deep)">✓ Lista</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- APLICACIONES FITOSANITARIAS -->
    <div v-if="tab === 'fitosanitario'" class="module-stack">
      <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createAplicacion">
        <div class="field">
          <label>Lote</label>
          <select v-model="aplForm.loteId" required>
            <option v-for="l in lotes" :key="l.id" :value="l.id">{{ l.codigo }} — {{ l.nombre }}</option>
          </select>
        </div>
        <div class="field">
          <label>Producto aplicado</label>
          <input v-model="aplForm.producto" required placeholder="Ej: Oxicloruro de Cobre 50%" />
        </div>
        <div class="field">
          <label>Motivo técnico</label>
          <input v-model="aplForm.motivo" required placeholder="Prevención mildiu" />
        </div>
        <div class="field">
          <label>Dosis aplicada</label>
          <input v-model="aplForm.dosisAplicada" required placeholder="2.5 g/L" />
        </div>
        <div class="field">
          <label>Dosis de etiqueta oficial</label>
          <input v-model="aplForm.dosisEtiqueta" required placeholder="2.5 g/L según etiqueta" />
        </div>
        <div class="field">
          <label>Fecha aplicación</label>
          <input v-model="aplForm.fechaAplicacion" type="date" required />
        </div>
        <div class="field">
          <label>Período de carencia (días)</label>
          <input v-model="aplForm.periodoCarenciaDias" type="number" min="0" required />
        </div>
        <div class="field">
          <label>Aplicador</label>
          <input v-model="aplForm.aplicador" required placeholder="Jorge Bautista" />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-dark" style="width: 100%">+ Registrar Aplicación</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Producto</th>
              <th>Dosis</th>
              <th>Motivo</th>
              <th>Aplicado</th>
              <th>Fin Carencia</th>
              <th>Estado Sanitario</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in aplicaciones" :key="a.id">
              <td><strong>{{ a.lote?.nombre }}</strong></td>
              <td>{{ a.producto }}</td>
              <td>{{ a.dosisAplicada }}</td>
              <td>{{ a.motivo }}</td>
              <td>{{ fmtDate(a.fechaAplicacion) }}</td>
              <td>{{ fmtDate(a.fechaFinCarencia) }} ({{ a.periodoCarenciaDias }} d)</td>
              <td>
                <span v-if="a.carenciaActiva" class="pill pill-red">
                  ⛔ EN CARENCIA ({{ a.diasRestantesCarencia }} días)
                </span>
                <span v-else class="pill pill-green">✅ Carencia cumplida</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- COSECHAS -->
    <div v-if="tab === 'cosechas'" class="module-stack">
      <form class="card form-grid" @submit.prevent="createCosecha">
        <div class="field">
          <label>Lote</label>
          <select v-model="cosForm.loteId" required>
            <option v-for="l in lotes" :key="l.id" :value="l.id">{{ l.codigo }} — {{ l.nombre }}</option>
          </select>
        </div>
        <div class="field">
          <label>Cultivo</label>
          <select v-model="cosForm.cultivoId" required>
            <option v-for="c in cultivos" :key="c.id" :value="c.id">{{ c.nombre }} ({{ c.variedad }})</option>
          </select>
        </div>
        <div class="field">
          <label>Cantidad (kg)</label>
          <input v-model="cosForm.cantidadKg" type="number" step="0.5" min="1" required />
        </div>
        <div class="field">
          <label>Calidad</label>
          <select v-model="cosForm.calidad">
            <option value="PRIMERA">PRIMERA</option>
            <option value="EXPORTACION">EXPORTACION</option>
            <option value="SEGUNDA">SEGUNDA</option>
          </select>
        </div>
        <div class="field">
          <label>Observaciones</label>
          <input v-model="cosForm.observaciones" placeholder="Cosecha matutina..." />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-green" style="width: 100%">+ Registrar Cosecha & QR</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Código Trazabilidad</th>
              <th>Fecha</th>
              <th>Lote</th>
              <th>Cultivo</th>
              <th>Cantidad</th>
              <th>Calidad</th>
              <th>Origen</th>
              <th>Ficha QR</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cs in cosechas" :key="cs.id">
              <td><strong>{{ cs.codigoTrazabilidad }}</strong></td>
              <td>{{ fmtDate(cs.fecha) }}</td>
              <td>{{ cs.lote?.nombre }}</td>
              <td>{{ cs.cultivo?.nombre }}</td>
              <td><strong>{{ cs.cantidadKg }} kg</strong></td>
              <td><span class="pill pill-green">{{ cs.calidad }}</span></td>
              <td><span class="pill pill-dark">{{ cs.origen }}</span></td>
              <td>
                <router-link :to="`/trazabilidad/${cs.codigoTrazabilidad}`" class="btn btn-soft btn-sm">
                  Ver Ficha
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const tab = ref('labores');
const lotes = ref([]);
const cultivos = ref([]);
const labores = ref([]);
const aplicaciones = ref([]);
const cosechas = ref([]);
const alertMsg = ref('');
const alertType = ref('ok');

const today = new Date().toISOString().slice(0, 10);

const laborForm = reactive({ loteId: '', tipo: 'RIEGO', titulo: '', fechaProgramada: today, costoEstimado: 100 });
const aplForm = reactive({
  loteId: '',
  producto: '',
  motivo: '',
  dosisAplicada: '',
  dosisEtiqueta: '',
  fechaAplicacion: today,
  periodoCarenciaDias: 7,
  aplicador: 'Jorge Bautista'
});
const cosForm = reactive({ loteId: '', cultivoId: '', cantidadKg: 40, calidad: 'PRIMERA', observaciones: '' });

function showBanner(msg, type = 'ok') {
  alertMsg.value = msg;
  alertType.value = type;
  setTimeout(() => (alertMsg.value = ''), 6000);
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('es-BO') : '-';
}

async function loadData() {
  const [lt, ct, lb, ap, cs] = await Promise.all([
    api.get('/nucleo/lotes'),
    api.get('/nucleo/cultivos'),
    api.get('/campo/labores'),
    api.get('/campo/aplicaciones'),
    api.get('/campo/cosechas')
  ]);
  lotes.value = lt.data;
  cultivos.value = ct.data;
  labores.value = lb.data;
  aplicaciones.value = ap.data;
  cosechas.value = cs.data;

  if (lotes.value.length) {
    if (!laborForm.loteId) laborForm.loteId = lotes.value[0].id;
    if (!aplForm.loteId) aplForm.loteId = lotes.value[0].id;
    if (!cosForm.loteId) cosForm.loteId = lotes.value[0].id;
  }
  if (cultivos.value.length && !cosForm.cultivoId) {
    cosForm.cultivoId = cultivos.value[0].id;
  }
}

async function createLabor() {
  await api.post('/campo/labores', laborForm);
  laborForm.titulo = '';
  await loadData();
  showBanner('Labor agrícola registrada.');
}

async function advanceLabor(lb) {
  const next = lb.estado === 'PENDIENTE' ? 'EN_PROCESO' : 'COMPLETADA';
  await api.patch(`/campo/labores/${lb.id}/estado`, { estado: next });
  await loadData();
}

async function createAplicacion() {
  await api.post('/campo/aplicaciones', aplForm);
  aplForm.producto = '';
  aplForm.motivo = '';
  await loadData();
  showBanner('Aplicación fitosanitaria registrada con cálculo automático de período de carencia.');
}

async function createCosecha() {
  try {
    const { data } = await api.post('/campo/cosechas', cosForm);
    cosForm.observaciones = '';
    await loadData();
    showBanner(`Cosecha guardada con código QR ${data.codigoTrazabilidad} e ingresada a inventario.`);
  } catch (err) {
    showBanner(err.response?.data?.error || 'No se pudo registrar la cosecha.', 'err');
  }
}

onMounted(loadData);
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
.alert-banner {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
}
.alert-banner.ok {
  background: var(--green-soft);
  color: var(--green-deep);
}
.alert-banner.err {
  background: var(--red-soft);
  color: var(--red-danger);
}
</style>
