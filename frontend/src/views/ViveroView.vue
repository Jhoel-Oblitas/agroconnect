<template>
  <div class="module-stack">
    <div class="module-header">
      <div>
        <h2>M6 · Producción de Vivero (Plantines)</h2>
        <p class="subtitle">Control de siembra en bandejas, porcentaje de germinación, stock disponible y precio de venta.</p>
      </div>
    </div>

    <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createLoteVivero">
      <div class="field">
        <label>Especie</label>
        <input v-model="form.especie" required placeholder="Ej: Ají Amarillo" />
      </div>
      <div class="field">
        <label>Variedad</label>
        <input v-model="form.variedad" required placeholder="Criollo" />
      </div>
      <div class="field">
        <label>Fecha siembra</label>
        <input v-model="form.fechaSiembra" type="date" required />
      </div>
      <div class="field">
        <label>Cantidad sembrada</label>
        <input v-model="form.cantidadSembrada" type="number" min="10" required />
      </div>
      <div class="field">
        <label>Germinados</label>
        <input v-model="form.cantidadGerminada" type="number" min="0" />
      </div>
      <div class="field">
        <label>Precio/plantín (Bs)</label>
        <input v-model="form.precioUnitario" type="number" step="0.1" min="0.1" required />
      </div>
      <div style="display: flex; align-items: flex-end">
        <button type="submit" class="btn btn-green" style="width: 100%">+ Nuevo Lote Vivero</button>
      </div>
    </form>

    <div class="vivero-grid">
      <div v-for="v in lotesVivero" :key="v.id" class="card-white viv-card">
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span class="pill pill-dark">{{ v.codigo }}</span>
          <span class="pill" :class="v.estado === 'LISTO_VENTA' ? 'pill-green' : v.estado === 'GERMINANDO' ? 'pill-amber' : 'pill-red'">
            {{ v.estado }}
          </span>
        </div>
        <h3 style="margin: 10px 0 4px">{{ v.especie }} — {{ v.variedad }}</h3>
        <p class="subtitle">Siembra: {{ fmtDate(v.fechaSiembra) }} · Bs {{ Number(v.precioUnitario).toFixed(2) }} / plantín</p>

        <div class="germ-bar-wrap">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700">
            <span>Germinación</span>
            <span>{{ v.porcentajeGerminacion }}% ({{ v.cantidadGerminada }}/{{ v.cantidadSembrada }})</span>
          </div>
          <div class="germ-track">
            <div class="germ-fill" :style="{ width: v.porcentajeGerminacion + '%' }"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px">
          <strong>Stock disponible: {{ v.stockDisponible }} unid.</strong>
          <button
            v-if="auth.isEncargadoOrAbove && v.estado === 'GERMINANDO'"
            class="btn btn-soft btn-sm"
            @click="markReady(v)"
          >
            Marcar Listo Venta
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const lotesVivero = ref([]);

const form = reactive({
  especie: '',
  variedad: '',
  fechaSiembra: new Date().toISOString().slice(0, 10),
  cantidadSembrada: 500,
  cantidadGerminada: 460,
  precioUnitario: 1.2
});

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('es-BO') : '-';
}

async function loadAll() {
  const { data } = await api.get('/vivero');
  lotesVivero.value = data;
}

async function createLoteVivero() {
  await api.post('/vivero', form);
  form.especie = '';
  form.variedad = '';
  await loadAll();
}

async function markReady(v) {
  await api.patch(`/vivero/${v.id}/germinacion`, {
    cantidadGerminada: v.cantidadGerminada || Math.round(v.cantidadSembrada * 0.9),
    estado: 'LISTO_VENTA'
  });
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
.module-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
}
.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.vivero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
}
.germ-bar-wrap {
  margin-top: 12px;
}
.germ-track {
  height: 10px;
  background: var(--surface-card);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 6px;
}
.germ-fill {
  height: 100%;
  background: linear-gradient(90deg, #52823e, #2ad147);
  border-radius: 999px;
}
</style>
