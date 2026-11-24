<template>
  <div class="module-stack">
    <div class="module-header">
      <div>
        <h2>M7 · Reportes y Finanzas por Lote</h2>
        <p class="subtitle">Análisis consolidado de costos operativos (jornales + insumos), ingresos por ventas y margen neto.</p>
      </div>
    </div>

    <!-- KPIs Financieros -->
    <div class="kpi-strip">
      <div class="card">
        <small class="muted">Ingresos Totales</small>
        <div class="big-num" style="color: var(--green-deep)">Bs {{ resumen.totales.ingresos.toFixed(2) }}</div>
      </div>
      <div class="card">
        <small class="muted">Costos Totales (Jornales + Insumos)</small>
        <div class="big-num" style="color: var(--amber-warn)">Bs {{ resumen.totales.costosTotales.toFixed(2) }}</div>
      </div>
      <div class="card">
        <small class="muted">Margen Neto</small>
        <div class="big-num" :style="{ color: resumen.totales.margenNeto >= 0 ? 'var(--green-deep)' : 'var(--red-danger)' }">
          Bs {{ resumen.totales.margenNeto.toFixed(2) }} ({{ resumen.totales.margenPct }}%)
        </div>
      </div>
      <div class="card">
        <small class="muted">Por Cobrar</small>
        <div class="big-num">Bs {{ resumen.totales.porCobrar.toFixed(2) }}</div>
      </div>
    </div>

    <!-- Gráfico Chart.js: Ingresos vs Costos por Lote -->
    <div class="card-white">
      <h3 style="margin-top: 0">Comparativo Financiero por Lote (Bs)</h3>
      <div style="height: 300px; position: relative">
        <canvas ref="barCanvas"></canvas>
      </div>
    </div>

    <!-- Tabla desglose por lote -->
    <div class="table-wrap">
      <table class="agro-table">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Costo Jornales</th>
            <th>Costo Insumos</th>
            <th>Costo Total</th>
            <th>Ingresos</th>
            <th>Margen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in resumen.porLote" :key="l.loteId">
            <td><strong>{{ l.codigo }} — {{ l.nombre }}</strong></td>
            <td>Bs {{ l.costoJornales.toFixed(2) }}</td>
            <td>Bs {{ l.costoInsumos.toFixed(2) }}</td>
            <td><strong>Bs {{ l.costoTotal.toFixed(2) }}</strong></td>
            <td style="color: var(--green-deep); font-weight: 700">Bs {{ l.ingresos.toFixed(2) }}</td>
            <td>
              <span class="pill" :class="l.margen >= 0 ? 'pill-green' : 'pill-red'">
                Bs {{ l.margen.toFixed(2) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import api from '../services/api';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const barCanvas = ref(null);
let barChart = null;

const resumen = reactive({
  totales: { ingresos: 0, cobrado: 0, porCobrar: 0, costosJornales: 0, costosInsumos: 0, costosTotales: 0, margenNeto: 0, margenPct: 0 },
  porLote: []
});

function renderChart() {
  if (!barCanvas.value) return;
  if (barChart) barChart.destroy();
  barChart = new Chart(barCanvas.value, {
    type: 'bar',
    data: {
      labels: resumen.porLote.map((l) => l.codigo),
      datasets: [
        {
          label: 'Ingresos (Bs)',
          data: resumen.porLote.map((l) => l.ingresos),
          backgroundColor: '#52823e',
          borderRadius: 10
        },
        {
          label: 'Costos (Bs)',
          data: resumen.porLote.map((l) => l.costoTotal),
          backgroundColor: '#f59e0b',
          borderRadius: 10
        },
        {
          label: 'Margen (Bs)',
          data: resumen.porLote.map((l) => l.margen),
          backgroundColor: '#141915',
          borderRadius: 10
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

onMounted(async () => {
  const { data } = await api.get('/finanzas/resumen');
  Object.assign(resumen, data);
  await nextTick();
  renderChart();
});

onUnmounted(() => {
  if (barChart) barChart.destroy();
});
</script>

<style scoped>
.module-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.module-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
}
.subtitle,
.muted {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.big-num {
  font-size: 24px;
  font-weight: 800;
  margin-top: 6px;
}
</style>
