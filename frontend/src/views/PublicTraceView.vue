<template>
  <div class="trace-page">
    <div class="trace-container">
      <div class="trace-hero">
        <div class="trace-hero-overlay">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px">
            <span class="pill" style="background: rgba(255,255,255,0.22); color: #fff">
              🌿 AgroConnect · Trazabilidad Verificada
            </span>
            <router-link to="/login" class="btn btn-soft btn-sm">Acceso Finca</router-link>
          </div>
          <h1 v-if="trace">{{ trace.cultivo.nombre }} {{ trace.cultivo.variedad }}</h1>
          <h1 v-else>Pasaporte de Trazabilidad</h1>
          <p v-if="trace">
            Código de lote: <strong>{{ trace.codigoTrazabilidad }}</strong> · Producido en {{ trace.finca.nombre }}
          </p>
        </div>
      </div>

      <div v-if="loading" class="card-white" style="text-align: center; padding: 40px">
        Consultando historial desde el campo...
      </div>

      <div v-else-if="errorMsg" class="card-white" style="text-align: center; padding: 40px; color: var(--red-danger)">
        {{ errorMsg }}
      </div>

      <div v-else-if="trace" class="trace-body">
        <!-- Resumen de seguridad y QR -->
        <div class="trace-summary-grid">
          <div class="card">
            <span class="pill pill-green">✅ Período de Carencia Respetado</span>
            <h3 style="margin: 10px 0 6px">Origen Certificado</h3>
            <p class="muted"><strong>Finca:</strong> {{ trace.finca.nombre }} ({{ trace.finca.ubicacion }})</p>
            <p class="muted"><strong>Lote:</strong> {{ trace.lote.nombre }} · Suelo {{ trace.lote.tipoSuelo }}</p>
            <p class="muted"><strong>Cosecha:</strong> {{ formatDate(trace.cosecha.fecha) }} · {{ trace.cosecha.cantidadKg }} kg · Calidad {{ trace.cosecha.calidad }}</p>
            <p v-if="trace.cosecha.observaciones" class="muted"><strong>Nota:</strong> {{ trace.cosecha.observaciones }}</p>
          </div>

          <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center">
            <img :src="trace.qrDataUrl" alt="QR Trazabilidad" style="width: 156px; height: 156px; border-radius: 14px" />
            <strong style="font-size: 13px; margin-top: 8px">{{ trace.codigoTrazabilidad }}</strong>
            <small style="color: var(--text-muted)">Escanea para compartir esta ficha</small>
          </div>
        </div>

        <!-- Línea de tiempo: Lote -> Labores -> Fitosanitario -> Cosecha -> Venta -->
        <div class="card-white">
          <h3 style="margin-top: 0">Historial Completo: Lote → Labores → Cosecha → Venta</h3>

          <div class="timeline">
            <div class="tl-step">
              <div class="tl-dot green">1</div>
              <div>
                <strong>Cultivo en {{ trace.lote.nombre }} ({{ trace.lote.codigo }})</strong>
                <div class="muted">Sector {{ trace.lote.sector }} · Área {{ trace.lote.areaHectareas }} ha</div>
              </div>
            </div>

            <div class="tl-step">
              <div class="tl-dot green">2</div>
              <div>
                <strong>Labores Agrícolas Registradas ({{ trace.historialLabores.length }})</strong>
                <ul class="tl-list">
                  <li v-for="l in trace.historialLabores" :key="l.id">
                    <b>{{ l.tipo }}</b>: {{ l.titulo }} ({{ formatDate(l.fechaProgramada) }}) — {{ l.estado }}
                  </li>
                  <li v-if="trace.historialLabores.length === 0">Sin labores previas registradas para este período.</li>
                </ul>
              </div>
            </div>

            <div class="tl-step">
              <div class="tl-dot amber">3</div>
              <div>
                <strong>Control Fitosanitario y Carencia ({{ trace.aplicacionesFitosanitarias.length }})</strong>
                <ul class="tl-list">
                  <li v-for="a in trace.aplicacionesFitosanitarias" :key="a.id">
                    <b>{{ a.producto }}</b> ({{ a.motivo }}) — Aplicado {{ formatDate(a.fechaAplicacion) }}, carencia {{ a.periodoCarenciaDias }} días
                    <span class="pill pill-green" style="margin-left: 6px">Cumplida</span>
                  </li>
                  <li v-if="trace.aplicacionesFitosanitarias.length === 0">Libre de aplicaciones fitosanitarias previas a la cosecha.</li>
                </ul>
              </div>
            </div>

            <div class="tl-step">
              <div class="tl-dot green">4</div>
              <div>
                <strong>Cosecha Registrada ({{ trace.cosecha.cantidadKg }} kg · {{ trace.cosecha.calidad }})</strong>
                <div class="muted">Fecha: {{ formatDate(trace.cosecha.fecha) }} · Origen de registro: {{ trace.cosecha.origen }}</div>
              </div>
            </div>

            <div class="tl-step">
              <div class="tl-dot dark">5</div>
              <div>
                <strong>Destino Comercial ({{ trace.destinoVentas.length }} ventas vinculadas)</strong>
                <ul class="tl-list">
                  <li v-for="(v, idx) in trace.destinoVentas" :key="idx">
                    Factura <b>{{ v.numeroFactura }}</b> → {{ v.cliente }} ({{ v.cantidad }} {{ v.unidad }}) · {{ formatDate(v.fechaVenta) }}
                  </li>
                  <li v-if="trace.destinoVentas.length === 0">Lote disponible en inventario para comercialización.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';

const route = useRoute();
const trace = ref(null);
const loading = ref(true);
const errorMsg = ref('');

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('es-BO') : '-';
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/trazabilidad/${encodeURIComponent(route.params.codigo)}`);
    trace.value = data;
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'No se encontró este código de trazabilidad.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.trace-page {
  min-height: 100vh;
  background-image:
    linear-gradient(145deg, rgba(40, 82, 32, 0.72), rgba(90, 145, 70, 0.62)),
    url('/images/farm-bg.jpg');
  background-size: cover;
  background-attachment: fixed;
  padding: 24px 16px;
}

.trace-container {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.trace-hero {
  border-radius: 26px;
  overflow: hidden;
  background-image: url('/images/farm-bg.jpg');
  background-size: cover;
  background-position: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}

.trace-hero-overlay {
  padding: 28px;
  background: linear-gradient(135deg, rgba(16, 40, 18, 0.82), rgba(45, 92, 38, 0.68));
  color: #fff;
}
.trace-hero-overlay h1 {
  margin: 14px 0 6px;
  font-size: 28px;
}
.trace-hero-overlay p {
  margin: 0;
  opacity: 0.92;
}

.trace-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trace-summary-grid {
  display: grid;
  grid-template-columns: 1.5fr 0.8fr;
  gap: 16px;
}

.muted {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tl-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.tl-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 13px;
}
.tl-dot.green {
  background: #52823e;
}
.tl-dot.amber {
  background: #d98218;
}
.tl-dot.dark {
  background: #141915;
}

.tl-list {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-secondary);
}
.tl-list li {
  margin-bottom: 4px;
}

@media (max-width: 720px) {
  .trace-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
