<template>
  <div class="module-stack">
    <div class="module-header">
      <div>
        <h2>M5 · Ventas, Clientes y Cuentas por Cobrar</h2>
        <p class="subtitle">Registra clientes, ventas vinculadas a códigos de trazabilidad QR y cobra saldos pendientes.</p>
      </div>
      <div class="tabs-bar">
        <button class="tab-btn" :class="{ active: tab === 'ventas' }" @click="tab = 'ventas'">Ventas ({{ ventas.length }})</button>
        <button class="tab-btn" :class="{ active: tab === 'clientes' }" @click="tab = 'clientes'">Clientes ({{ clientes.length }})</button>
      </div>
    </div>

    <!-- KPIs rápidos -->
    <div class="kpi-strip">
      <div class="card">
        <small class="muted">Total Facturado</small>
        <div class="big-num">Bs {{ totalFacturado.toFixed(2) }}</div>
      </div>
      <div class="card">
        <small class="muted">Cobrado</small>
        <div class="big-num" style="color: var(--green-deep)">Bs {{ totalCobrado.toFixed(2) }}</div>
      </div>
      <div class="card">
        <small class="muted">Cuentas por Cobrar</small>
        <div class="big-num" style="color: var(--amber-warn)">Bs {{ totalPorCobrar.toFixed(2) }}</div>
      </div>
    </div>

    <!-- TAB VENTAS -->
    <div v-if="tab === 'ventas'" class="module-stack">
      <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createVenta">
        <div class="field">
          <label>Cliente</label>
          <select v-model="ventaForm.clienteId" required>
            <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }} ({{ c.tipo }})</option>
          </select>
        </div>
        <div class="field">
          <label>Lote de Cosecha (Trazabilidad QR)</label>
          <select v-model="ventaForm.cosechaId" @change="onSelectCosecha">
            <option value="">Venta libre / sin lote</option>
            <option v-for="cs in cosechas" :key="cs.id" :value="cs.id">
              {{ cs.codigoTrazabilidad }} — {{ cs.cultivo?.nombre }} ({{ cs.lote?.codigo }})
            </option>
          </select>
        </div>
        <div class="field">
          <label>Producto</label>
          <input v-model="ventaForm.descripcionProducto" required placeholder="Tomate Perita Primera" />
        </div>
        <div class="field">
          <label>Cantidad (kg)</label>
          <input v-model="ventaForm.cantidad" type="number" step="0.5" min="1" required />
        </div>
        <div class="field">
          <label>Precio Unit. (Bs)</label>
          <input v-model="ventaForm.precioUnitario" type="number" step="0.5" min="0.5" required />
        </div>
        <div class="field">
          <label>Monto pagado hoy (Bs)</label>
          <input v-model="ventaForm.montoPagado" type="number" step="0.5" min="0" />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-green" style="width: 100%">+ Registrar Venta</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Detalle / Trazabilidad</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Por Cobrar</th>
              <th>Estado</th>
              <th>Cobro</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in ventas" :key="v.id">
              <td><strong>{{ v.numeroFactura }}</strong></td>
              <td>{{ fmtDate(v.fecha) }}</td>
              <td>{{ v.cliente?.nombre }}</td>
              <td>
                <div v-for="d in v.detalles" :key="d.id" style="font-size: 12px">
                  {{ d.descripcionProducto }} ({{ d.cantidad }} {{ d.unidad }})
                  <router-link
                    v-if="d.codigoTrazabilidad && d.cosechaId"
                    :to="`/trazabilidad/${d.codigoTrazabilidad}`"
                    class="pill pill-green"
                    style="margin-left: 4px; text-decoration: none"
                  >
                    QR {{ d.codigoTrazabilidad }}
                  </router-link>
                </div>
              </td>
              <td><strong>Bs {{ Number(v.total).toFixed(2) }}</strong></td>
              <td>Bs {{ Number(v.montoPagado).toFixed(2) }}</td>
              <td>Bs {{ Number(v.saldoPendiente).toFixed(2) }}</td>
              <td>
                <span class="pill" :class="v.estadoPago === 'PAGADO' ? 'pill-green' : v.estadoPago === 'PARCIAL' ? 'pill-amber' : 'pill-red'">
                  {{ v.estadoPago }}
                </span>
              </td>
              <td>
                <button
                  v-if="v.saldoPendiente > 0 && auth.isEncargadoOrAbove"
                  class="btn btn-soft btn-sm"
                  @click="cobrarSaldo(v)"
                >
                  Saldar Bs {{ v.saldoPendiente }}
                </button>
                <span v-else style="font-size: 12px; color: var(--green-deep)">✓ Cobrado</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB CLIENTES -->
    <div v-if="tab === 'clientes'" class="module-stack">
      <form v-if="auth.isEncargadoOrAbove" class="card form-grid" @submit.prevent="createCliente">
        <div class="field">
          <label>Nombre / Comercio</label>
          <input v-model="cliForm.nombre" required placeholder="Ej: Supermercado Verde" />
        </div>
        <div class="field">
          <label>Tipo</label>
          <select v-model="cliForm.tipo">
            <option value="MAYORISTA">MAYORISTA</option>
            <option value="MINORISTA">MINORISTA</option>
            <option value="RESTAURANTE">RESTAURANTE</option>
            <option value="MERCADO">MERCADO</option>
          </select>
        </div>
        <div class="field">
          <label>Teléfono WhatsApp</label>
          <input v-model="cliForm.telefono" required placeholder="+59171112209" />
        </div>
        <div class="field">
          <label>Dirección</label>
          <input v-model="cliForm.direccion" placeholder="Zona / Avenida" />
        </div>
        <div style="display: flex; align-items: flex-end">
          <button type="submit" class="btn btn-dark" style="width: 100%">+ Agregar Cliente</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="agro-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>WhatsApp</th>
              <th>Ventas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in clientes" :key="c.id">
              <td><strong>{{ c.nombre }}</strong></td>
              <td><span class="pill pill-blue">{{ c.tipo }}</span></td>
              <td>{{ c.telefono }}</td>
              <td>{{ c.direccion || '-' }}</td>
              <td><span class="pill pill-green">{{ c.consentimientoWhatsApp ? 'Autorizado' : 'No' }}</span></td>
              <td>{{ c.ventas?.length || 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const tab = ref('ventas');
const ventas = ref([]);
const clientes = ref([]);
const cosechas = ref([]);

const ventaForm = reactive({
  clienteId: '',
  cosechaId: '',
  descripcionProducto: '',
  cantidad: 20,
  precioUnitario: 9.0,
  montoPagado: 0
});

const cliForm = reactive({ nombre: '', tipo: 'MAYORISTA', telefono: '', direccion: '', consentimientoWhatsApp: true });

const totalFacturado = computed(() => ventas.value.reduce((a, v) => a + v.total, 0));
const totalCobrado = computed(() => ventas.value.reduce((a, v) => a + v.montoPagado, 0));
const totalPorCobrar = computed(() => ventas.value.reduce((a, v) => a + v.saldoPendiente, 0));

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('es-BO') : '-';
}

function onSelectCosecha() {
  const cs = cosechas.value.find((c) => c.id === Number(ventaForm.cosechaId));
  if (cs) {
    ventaForm.descripcionProducto = `${cs.cultivo?.nombre} ${cs.cultivo?.variedad} (${cs.lote?.codigo})`;
    ventaForm.precioUnitario = cs.cultivo?.precioRefKg || 9;
  }
}

async function loadAll() {
  const [v, cl, cs] = await Promise.all([api.get('/ventas'), api.get('/ventas/clientes'), api.get('/campo/cosechas')]);
  ventas.value = v.data;
  clientes.value = cl.data;
  cosechas.value = cs.data;
  if (clientes.value.length && !ventaForm.clienteId) ventaForm.clienteId = clientes.value[0].id;
}

async function createVenta() {
  await api.post('/ventas', {
    clienteId: ventaForm.clienteId,
    montoPagado: ventaForm.montoPagado,
    detalles: [
      {
        cosechaId: ventaForm.cosechaId || null,
        descripcionProducto: ventaForm.descripcionProducto,
        cantidad: ventaForm.cantidad,
        unidad: 'kg',
        precioUnitario: ventaForm.precioUnitario
      }
    ]
  });
  ventaForm.descripcionProducto = '';
  ventaForm.cosechaId = '';
  ventaForm.montoPagado = 0;
  await loadAll();
}

async function cobrarSaldo(v) {
  await api.patch(`/ventas/${v.id}/abono`, { monto: v.saldoPendiente });
  await loadAll();
}

async function createCliente() {
  await api.post('/ventas/clientes', cliForm);
  cliForm.nombre = '';
  cliForm.telefono = '';
  cliForm.direccion = '';
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
  font-size: 26px;
  font-weight: 800;
  margin-top: 6px;
}
</style>
