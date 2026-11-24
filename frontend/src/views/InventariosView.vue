<template>
  <div class="module-stack">
    <div class="module-header">
      <div>
        <h2>M4 · Inventarios e Insumos</h2>
        <p class="subtitle">Semillas, fertilizantes, agroquímicos (con dosis de etiqueta), herramientas y cosechas con alertas de stock mínimo.</p>
      </div>
      <div class="tabs-bar">
        <button class="tab-btn" :class="{ active: tab === 'stock' }" @click="tab = 'stock'">Stock Actual ({{ insumos.length }})</button>
        <button class="tab-btn" :class="{ active: tab === 'movimientos' }" @click="tab = 'movimientos'">Movimientos ({{ movimientos.length }})</button>
      </div>
    </div>

    <!-- Alerta de stock mínimo -->
    <div v-if="lowStockItems.length > 0" class="low-stock-alert">
      <strong>⚠️ Alerta de Stock Mínimo ({{ lowStockItems.length }} ítems):</strong>
      <span>{{ lowStockItems.map((i) => `${i.nombre} (${i.stockActual} ${i.unidad})`).join(' · ') }}</span>
    </div>

    <!-- STOCK -->
    <div v-if="tab === 'stock'" class="module-stack">
      <div class="forms-two-col">
        <!-- Registrar movimiento entrada/salida -->
        <form class="card form-grid" @submit.prevent="createMovimiento">
          <strong style="grid-column: 1 / -1">Registrar Entrada / Salida</strong>
          <div class="field">
            <label>Insumo / Producto</label>
            <select v-model="movForm.insumoId" required>
              <option v-for="i in insumos" :key="i.id" :value="i.id">{{ i.nombre }} ({{ i.stockActual }} {{ i.unidad }})</option>
            </select>
          </div>
          <div class="field">
            <label>Tipo</label>
            <select v-model="movForm.tipo">
              <option value="ENTRADA">ENTRADA (+)</option>
              <option value="SALIDA">SALIDA (-)</option>
            </select>
          </div>
          <div class="field">
            <label>Cantidad</label>
            <input v-model="movForm.cantidad" type="number" step="0.5" min="0.5" required />
          </div>
          <div class="field">
            <label>Lote (opcional)</label>
            <select v-model="movForm.loteId">
              <option value="">General</option>
              <option v-for="l in lotes" :key="l.id" :value="l.id">{{ l.codigo }} — {{ l.nombre }}</option>
            </select>
          </div>
          <div class="field" style="grid-column: 1 / -1">
            <label>Motivo</label>
            <input v-model="movForm.motivo" required placeholder="Compra proveedor / Aplicación Lote 2" />
          </div>
          <div style="grid-column: 1 / -1">
            <button type="submit" class="btn btn-green">Registrar Movimiento</button>
          </div>
        </form>

        <!-- Nuevo insumo -->
        <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createInsumo">
          <strong style="grid-column: 1 / -1">Nuevo Insumo</strong>
          <div class="field">
            <label>Nombre</label>
            <input v-model="insForm.nombre" required placeholder="Ej: Urea Granulada" />
          </div>
          <div class="field">
            <label>Categoría</label>
            <select v-model="insForm.categoria">
              <option value="SEMILLA">SEMILLA</option>
              <option value="FERTILIZANTE">FERTILIZANTE</option>
              <option value="AGROQUIMICO">AGROQUIMICO</option>
              <option value="HERRAMIENTA">HERRAMIENTA</option>
              <option value="COSECHADO">COSECHADO</option>
            </select>
          </div>
          <div class="field">
            <label>Unidad</label>
            <input v-model="insForm.unidad" required placeholder="kg / L / unidad" />
          </div>
          <div class="field">
            <label>Stock inicial</label>
            <input v-model="insForm.stockActual" type="number" min="0" />
          </div>
          <div class="field">
            <label>Stock mínimo</label>
            <input v-model="insForm.stockMinimo" type="number" min="0" />
          </div>
          <div class="field">
            <label>Costo unit. (Bs)</label>
            <input v-model="insForm.costoUnitario" type="number" step="0.5" min="0" />
          </div>
          <div style="grid-column: 1 / -1">
            <button type="submit" class="btn btn-dark">+ Crear Insumo</button>
          </div>
        </form>
      </div>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Producto / Insumo</th>
              <th>Categoría</th>
              <th>Stock Actual</th>
              <th>Mínimo</th>
              <th>Costo Unit.</th>
              <th>Dosis Etiqueta / Origen</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in insumos" :key="i.id">
              <td><strong>{{ i.nombre }}</strong></td>
              <td><span class="pill pill-blue">{{ i.categoria }}</span></td>
              <td><strong>{{ i.stockActual }} {{ i.unidad }}</strong></td>
              <td>{{ i.stockMinimo }} {{ i.unidad }}</td>
              <td>Bs {{ Number(i.costoUnitario).toFixed(2) }}</td>
              <td style="max-width: 240px; font-size: 12px; color: var(--text-secondary)">
                {{ i.dosisEtiqueta || i.loteOrigenCodigo || '-' }}
              </td>
              <td>
                <span v-if="i.alertaStockMinimo" class="pill pill-red">⚠️ STOCK BAJO</span>
                <span v-else class="pill pill-green">OK</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MOVIMIENTOS -->
    <div v-if="tab === 'movimientos'" class="table-wrap">
      <table class="agro-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Insumo</th>
            <th>Cantidad</th>
            <th>Lote</th>
            <th>Costo</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in movimientos" :key="m.id">
            <td>{{ fmtDate(m.fecha) }}</td>
            <td><span class="pill" :class="m.tipo === 'ENTRADA' ? 'pill-green' : 'pill-amber'">{{ m.tipo }}</span></td>
            <td><strong>{{ m.insumo?.nombre }}</strong></td>
            <td>{{ m.cantidad }} {{ m.insumo?.unidad }}</td>
            <td>{{ m.lote?.codigo || 'General' }}</td>
            <td>Bs {{ Number(m.costoTotal).toFixed(2) }}</td>
            <td>{{ m.motivo }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const tab = ref('stock');
const insumos = ref([]);
const movimientos = ref([]);
const lotes = ref([]);

const movForm = reactive({ insumoId: '', loteId: '', tipo: 'ENTRADA', cantidad: 10, motivo: '' });
const insForm = reactive({ nombre: '', categoria: 'FERTILIZANTE', unidad: 'kg', stockActual: 20, stockMinimo: 5, costoUnitario: 15 });

const lowStockItems = computed(() => insumos.value.filter((i) => i.alertaStockMinimo));

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('es-BO') : '-';
}

async function loadAll() {
  const [ins, mov, lt] = await Promise.all([
    api.get('/inventarios/insumos'),
    api.get('/inventarios/movimientos'),
    api.get('/nucleo/lotes')
  ]);
  insumos.value = ins.data;
  movimientos.value = mov.data;
  lotes.value = lt.data;
  if (insumos.value.length && !movForm.insumoId) movForm.insumoId = insumos.value[0].id;
}

async function createMovimiento() {
  await api.post('/inventarios/movimientos', {
    ...movForm,
    loteId: movForm.loteId || null
  });
  movForm.motivo = '';
  await loadAll();
}

async function createInsumo() {
  await api.post('/inventarios/insumos', insForm);
  insForm.nombre = '';
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
.low-stock-alert {
  background: var(--red-soft);
  color: var(--red-danger);
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 13px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.forms-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 900px) {
  .forms-two-col {
    grid-template-columns: 1fr;
  }
}
</style>
