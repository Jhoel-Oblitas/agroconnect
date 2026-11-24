<template>
  <div class="dashboard-grid">
    <!-- COLUMNA IZQUIERDA (KPIs, Clima, Salud del Suelo, Rendimiento Chart.js, Tarjetas de Labores) -->
    <div class="dashboard-left">
      <!-- Barra de progreso de tareas + Botón "+ Nueva Labor" (Plantilla de Referencia) -->
      <div class="task-strip">
        <div class="task-progress-bar">
          <div class="task-done-pill" :style="{ width: doneRatio + '%' }">
            <span>Completadas</span>
            <strong>{{ data.resumenLabores.completadas }}</strong>
          </div>
          <div class="task-pending-pill striped-pending">
            <span>Pendientes</span>
            <strong>{{ data.resumenLabores.pendientes }}</strong>
          </div>
        </div>
        <button class="btn btn-dark" @click="showTaskModal = true">
          <PlusCircle :size="16" />
          <span>Nueva Labor</span>
        </button>
      </div>

      <!-- Fila 1: 4 Mini KPIs (izquierda) + Clima (derecha) -->
      <div class="middle-row">
        <div class="kpi-quad">
          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Total Lotes</span>
              <span class="kpi-dots">••</span>
            </div>
            <div class="kpi-value">
              {{ data.kpis.totalLotes }} <small>Lotes</small>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Total Cultivos</span>
              <span class="kpi-dots">••</span>
            </div>
            <div class="kpi-value">
              {{ data.kpis.totalCultivos }} <small>Tipos</small>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Área Total</span>
              <span class="kpi-dots">••</span>
            </div>
            <div class="kpi-value">
              {{ data.kpis.areaTotalHa }} <small>Hectáreas</small>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Plantas / Vivero</span>
              <span class="kpi-dots">••</span>
            </div>
            <div class="kpi-value">
              {{ formatCompact(data.kpis.totalPlantas + data.kpis.totalPlantinesVivero) }} <small>Unid.</small>
            </div>
          </div>
        </div>

        <!-- Tarjeta Clima (estilo plantilla de referencia con barra rayada verde/ámbar) -->
        <div class="card weather-card">
          <div class="weather-top">
            <div>
              <div class="card-title">Clima Campo</div>
              <div class="weather-temp">{{ data.clima.temperatura }}°</div>
            </div>
            <div class="weather-meta">
              <div><CloudSun :size="14" /> {{ data.clima.condicion }}</div>
              <div><Wind :size="14" /> {{ data.clima.vientoKmh }} km/h</div>
              <div><Droplets :size="14" /> {{ data.clima.humedadRelativa }}% Hum.</div>
            </div>
          </div>

          <div class="weather-hours">
            <span v-for="h in data.clima.pronosticoHoras" :key="h.hora">{{ h.temp }}°</span>
          </div>
          <div class="weather-bars">
            <div class="weather-bar-green" style="flex: 1"></div>
            <div class="weather-bar-warm" style="flex: 1"></div>
          </div>
        </div>
      </div>

      <!-- Fila 2: Salud del Suelo (Tarjeta Verde Gradiente) + Rendimiento de Finca (Chart.js Dona) -->
      <div class="middle-row">
        <div class="soil-card">
          <div class="soil-header">
            <span>Salud del Suelo (NPK)</span>
            <span style="opacity: 0.7">••</span>
          </div>

          <div class="soil-metric">
            <div class="soil-bar-track">
              <div class="soil-bar-fill" :style="{ width: Math.min(100, data.saludSuelo.n * 2.8) + '%' }"></div>
            </div>
            <div class="soil-labels">
              <span>Nivel N (Nitrógeno)</span>
              <strong>{{ data.saludSuelo.n }} ppm</strong>
            </div>
          </div>

          <div class="soil-metric">
            <div class="soil-bar-track">
              <div class="soil-bar-fill" :style="{ width: Math.min(100, data.saludSuelo.p * 4) + '%' }"></div>
            </div>
            <div class="soil-labels">
              <span>Nivel P (Fósforo)</span>
              <strong>{{ data.saludSuelo.p }} ppm</strong>
            </div>
          </div>

          <div class="soil-metric">
            <div class="soil-bar-track">
              <div class="soil-bar-fill" :style="{ width: Math.min(100, data.saludSuelo.k * 3) + '%' }"></div>
            </div>
            <div class="soil-labels">
              <span>Nivel K (Potasio)</span>
              <strong>{{ data.saludSuelo.k }} ppm</strong>
            </div>
          </div>
        </div>

        <div class="card perf-card">
          <div class="kpi-top" style="margin-bottom: 8px">
            <span class="card-title">Rendimiento de Finca</span>
            <span class="kpi-dots">••</span>
          </div>
          <div class="donut-box">
            <canvas ref="donutCanvas"></canvas>
            <div class="donut-center">
              <small>Puntaje Global</small>
              <strong>{{ data.rendimiento.overallScore }}%</strong>
            </div>
          </div>
          <div class="perf-legend">
            <span><i style="background: #52823e"></i> Utilización {{ data.rendimiento.utilizacion }}%</span>
            <span><i style="background: #84b968"></i> Salud {{ data.rendimiento.salud }}%</span>
            <span><i style="background: #c7e2b4"></i> En Tiempo {{ data.rendimiento.enTiempo }}%</span>
          </div>
        </div>
      </div>

      <!-- Fila 3: Tarjetas visuales de labores recientes (estilo tarjetas foto de la plantilla) -->
      <div class="tasks-gallery-card card-white">
        <div class="gallery-header">
          <strong>Labores de Campo Recientes</strong>
          <router-link to="/campo" class="see-all-link">Ver calendario completo →</router-link>
        </div>
        <div class="task-cards-grid">
          <div
            v-for="(labor, idx) in data.laboresDestacadas.slice(0, 3)"
            :key="labor.id"
            class="visual-task-card"
            :class="'theme-' + (idx % 3)"
            @click="cycleLaborStatus(labor)"
            title="Haz clic para avanzar estado de la labor"
          >
            <div class="visual-task-overlay">
              <span class="status-badge" :class="badgeClass(labor.estado)">
                <i></i> {{ labelEstado(labor.estado) }}
              </span>
              <div>
                <div class="visual-task-title">{{ labor.titulo }}</div>
                <div class="visual-task-sub">{{ labor.lote?.nombre }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- COLUMNA DERECHA: Mapa interactivo Leaflet -->
    <div class="dashboard-right">
      <FarmMap
        :lotes="data.lotesMapa"
        :center="[data.finca.latitud || -16.645, data.finca.longitud || -68.122]"
      />
    </div>

    <!-- Modal rápido: Nueva Labor -->
    <div v-if="showTaskModal" class="modal-backdrop" @click.self="showTaskModal = false">
      <div class="modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
          <h3 style="margin: 0">Registrar Nueva Labor</h3>
          <button class="btn btn-soft btn-sm" @click="showTaskModal = false">Cerrar</button>
        </div>
        <form class="form-grid" @submit.prevent="createQuickLabor">
          <div class="field" style="grid-column: 1 / -1">
            <label>Título de la labor</label>
            <input v-model="newLabor.titulo" required placeholder="Ej: Riego programado surcos norte" />
          </div>
          <div class="field">
            <label>Lote</label>
            <select v-model="newLabor.loteId" required>
              <option v-for="l in data.lotesMapa" :key="l.id" :value="l.id">{{ l.codigo }} — {{ l.nombre }}</option>
            </select>
          </div>
          <div class="field">
            <label>Tipo</label>
            <select v-model="newLabor.tipo">
              <option value="RIEGO">Riego</option>
              <option value="FERTILIZACION">Fertilización</option>
              <option value="PODA">Poda</option>
              <option value="DESHIERBE">Deshierbe</option>
              <option value="SIEMBRA">Siembra</option>
              <option value="COSECHA">Cosecha</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
            </select>
          </div>
          <div class="field">
            <label>Fecha programada</label>
            <input v-model="newLabor.fechaProgramada" type="date" required />
          </div>
          <div class="field">
            <label>Costo estimado (Bs)</label>
            <input v-model="newLabor.costoEstimado" type="number" min="0" step="1" />
          </div>
          <div class="field" style="grid-column: 1 / -1">
            <label>Descripción</label>
            <textarea v-model="newLabor.descripcion" rows="2" placeholder="Detalles técnicos..."></textarea>
          </div>
          <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px">
            <button type="button" class="btn btn-soft" @click="showTaskModal = false">Cancelar</button>
            <button type="submit" class="btn btn-dark">Guardar Labor</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
import { PlusCircle, CloudSun, Wind, Droplets } from 'lucide-vue-next';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import FarmMap from '../components/FarmMap.vue';

Chart.register(DoughnutController, ArcElement, Tooltip);

const auth = useAuthStore();
const donutCanvas = ref(null);
let donutChart = null;

const showTaskModal = ref(false);
const newLabor = reactive({
  titulo: '',
  loteId: '',
  tipo: 'RIEGO',
  fechaProgramada: new Date().toISOString().slice(0, 10),
  costoEstimado: 100,
  descripcion: ''
});

const data = reactive({
  finca: { nombre: 'Finca Valle Verde', latitud: -16.645, longitud: -68.122 },
  resumenLabores: { completadas: 0, pendientes: 0, total: 0 },
  kpis: { totalLotes: 0, totalCultivos: 0, areaTotalHa: 0, totalPlantas: 0, totalPlantinesVivero: 0 },
  clima: {
    temperatura: 22,
    condicion: 'Parcialmente nublado',
    vientoKmh: 11,
    humedadRelativa: 68,
    pronosticoHoras: [
      { hora: '08:00', temp: 16 },
      { hora: '11:00', temp: 20 },
      { hora: '14:00', temp: 23 },
      { hora: '17:00', temp: 19 }
    ]
  },
  saludSuelo: { n: 23, p: 9, k: 19, humedad: 68, saludGeneral: 85 },
  rendimiento: { overallScore: 78, utilizacion: 80, salud: 84, enTiempo: 70 },
  laboresDestacadas: [],
  lotesMapa: [],
  alertas: []
});

const doneRatio = computed(() => {
  const total = data.resumenLabores.total || 1;
  return Math.max(30, Math.min(75, Math.round((data.resumenLabores.completadas / total) * 100)));
});

function formatCompact(num) {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function labelEstado(estado) {
  if (estado === 'COMPLETADA') return 'Completada';
  if (estado === 'EN_PROCESO') return 'En Proceso';
  return 'Pendiente';
}

function badgeClass(estado) {
  if (estado === 'COMPLETADA') return 'done';
  if (estado === 'EN_PROCESO') return 'progress';
  return 'waiting';
}

function renderDonut() {
  if (!donutCanvas.value) return;
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(donutCanvas.value, {
    type: 'doughnut',
    data: {
      labels: ['Utilización', 'Salud', 'En Tiempo'],
      datasets: [
        {
          data: [data.rendimiento.utilizacion, data.rendimiento.salud, data.rendimiento.enTiempo],
          backgroundColor: ['#52823e', '#84b968', '#c7e2b4'],
          borderWidth: 0,
          hoverOffset: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false }
      }
    }
  });
}

async function fetchDashboard() {
  const res = await api.get('/dashboard');
  Object.assign(data, res.data);
  auth.setAlertas(res.data.alertas);
  if (res.data.lotesMapa?.length && !newLabor.loteId) {
    newLabor.loteId = res.data.lotesMapa[0].id;
  }
  await nextTick();
  renderDonut();
}

async function createQuickLabor() {
  await api.post('/campo/labores', newLabor);
  showTaskModal.value = false;
  newLabor.titulo = '';
  newLabor.descripcion = '';
  await fetchDashboard();
}

async function cycleLaborStatus(labor) {
  const order = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA'];
  const next = order[(order.indexOf(labor.estado) + 1) % order.length];
  await api.patch(`/campo/labores/${labor.id}/estado`, { estado: next });
  await fetchDashboard();
}

onMounted(() => {
  fetchDashboard();
});

onUnmounted(() => {
  if (donutChart) donutChart.destroy();
});
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.25fr 0.95fr;
  gap: 20px;
  align-items: stretch;
}

.dashboard-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.dashboard-right {
  min-height: 560px;
}

.task-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.task-progress-bar {
  flex: 1;
  min-width: 240px;
  display: flex;
  background: var(--surface-card);
  border-radius: 999px;
  padding: 4px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}

.task-done-pill {
  background: linear-gradient(90deg, #62984b, #4c8037);
  color: #fff;
  border-radius: 999px;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  gap: 8px;
}

.task-pending-pill {
  flex: 1;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  border-radius: 999px;
}

.middle-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.kpi-quad {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.kpi-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 102px;
}

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.kpi-dots {
  color: var(--text-secondary);
  letter-spacing: 2px;
  font-size: 12px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-top: 8px;
}
.kpi-value small {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.card-title {
  font-size: 14px;
  font-weight: 700;
}

.weather-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.weather-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.weather-temp {
  font-size: 38px;
  font-weight: 800;
  margin-top: 10px;
  letter-spacing: -0.04em;
}

.weather-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}
.weather-meta div {
  display: flex;
  align-items: center;
  gap: 6px;
}

.weather-hours {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  margin: 10px 4px 6px;
}

.weather-bars {
  display: flex;
  gap: 6px;
}

/* Tarjeta Soil Health */
.soil-header {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 18px;
}

.soil-metric {
  margin-bottom: 16px;
}
.soil-metric:last-child {
  margin-bottom: 0;
}

.soil-bar-track {
  height: 16px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  overflow: hidden;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.35);
}

.soil-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.96));
  border-right: 3px solid #141915;
  border-radius: 4px;
}

.soil-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-top: 6px;
  opacity: 0.94;
}

/* Donut Chart */
.perf-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.donut-box {
  position: relative;
  height: 162px;
  width: 162px;
  margin: 4px auto;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.donut-center small {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 700;
}
.donut-center strong {
  font-size: 28px;
  font-weight: 800;
}

.perf-legend {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 8px;
}
.perf-legend i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

/* Tarjetas visuales inferiores */
.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.see-all-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--green-deep);
  text-decoration: none;
}

.task-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.visual-task-card {
  height: 132px;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  background-size: cover;
  background-position: center;
  transition: transform 0.16s ease;
}
.visual-task-card:hover {
  transform: translateY(-2px);
}

.visual-task-card.theme-0 {
  background-image: linear-gradient(135deg, #1b4332, #40916c), url('/images/farm-bg.jpg');
  background-blend-mode: multiply;
}
.visual-task-card.theme-1 {
  background-image: linear-gradient(135deg, #5c3d2e, #8d6e63), url('/images/farm-bg.jpg');
  background-blend-mode: multiply;
}
.visual-task-card.theme-2 {
  background-image: linear-gradient(135deg, #7f1d1d, #b45309), url('/images/farm-bg.jpg');
  background-blend-mode: multiply;
}

.visual-task-overlay {
  height: 100%;
  padding: 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.72) 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.status-badge {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.status-badge i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-badge.done {
  background: #d9f99d;
  color: #14532d;
}
.status-badge.done i {
  background: #16a34a;
}
.status-badge.progress {
  background: #fef08a;
  color: #713f12;
}
.status-badge.progress i {
  background: #ca8a04;
}
.status-badge.waiting {
  background: rgba(255, 255, 255, 0.92);
  color: #141915;
}
.status-badge.waiting i {
  background: #141915;
}

.visual-task-title {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
}
.visual-task-sub {
  font-size: 11px;
  opacity: 0.85;
  margin-top: 2px;
}

@media (max-width: 1180px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-right {
    min-height: 380px;
  }
}

@media (max-width: 720px) {
  .middle-row,
  .task-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
