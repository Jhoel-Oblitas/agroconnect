<template>
  <div class="module-stack">
    <div class="module-header">
      <div>
        <h2>M2 · Trazabilidad con Código QR</h2>
        <p class="subtitle">Seguimiento del lote de origen → labores → cosecha → venta con ficha pública consultable por el cliente.</p>
      </div>
      <router-link to="/campo" class="btn btn-dark">+ Nueva Cosecha</router-link>
    </div>

    <div class="qr-grid">
      <div v-for="item in lotesTrazables" :key="item.id" class="card-white qr-card">
        <div class="qr-top">
          <div>
            <span class="pill pill-green">{{ item.codigoTrazabilidad }}</span>
            <h3 style="margin: 8px 0 4px">{{ item.cultivo?.nombre }} {{ item.cultivo?.variedad }}</h3>
            <p class="subtitle">{{ item.lote?.nombre }} · {{ item.cantidadKg }} kg ({{ item.calidad }})</p>
            <p class="subtitle">Cosecha: {{ fmtDate(item.fecha) }} · Origen: {{ item.origen }}</p>
          </div>
          <img :src="item.qrDataUrl" :alt="item.codigoTrazabilidad" class="qr-img" />
        </div>

        <div class="ventas-strip">
          <strong>Ventas vinculadas ({{ item.ventasVinculadas.length }}):</strong>
          <div v-if="item.ventasVinculadas.length === 0" class="subtitle">Aún en stock listo para vender.</div>
          <div v-for="(v, i) in item.ventasVinculadas" :key="i" class="venta-tag">
            {{ v.numeroFactura }} → {{ v.cliente }} ({{ v.cantidad }} {{ v.unidad }})
          </div>
        </div>

        <div class="qr-actions">
          <router-link :to="`/trazabilidad/${item.codigoTrazabilidad}`" class="btn btn-green btn-sm">
            Abrir Ficha Cliente
          </router-link>
          <a :href="item.qrDataUrl" :download="`QR-${item.codigoTrazabilidad}.png`" class="btn btn-soft btn-sm">
            Descargar QR PNG
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import api from '../services/api';

const lotesTrazables = ref([]);

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('es-BO') : '-';
}

onMounted(async () => {
  const { data } = await api.get('/trazabilidad');
  lotesTrazables.value = data;
});
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
  margin: 2px 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.qr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}
.qr-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.qr-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.qr-img {
  width: 112px;
  height: 112px;
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.ventas-strip {
  background: var(--surface-card);
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 12px;
}
.venta-tag {
  margin-top: 4px;
  color: var(--green-deep);
  font-weight: 600;
}
.qr-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
