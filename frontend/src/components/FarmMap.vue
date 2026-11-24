<template>
  <div class="farm-map-wrapper" :class="{ fullscreen: isFullscreen }">
    <!-- Selector de capa estilo plantilla ("Map v") -->
    <div class="map-top-left">
      <button class="map-pill-btn" @click="toggleLayer">
        <Layers :size="14" />
        <span>{{ mapMode === 'satellite' ? 'Satélite' : 'Mapa' }}</span>
      </button>
    </div>

    <!-- Botón expandir -->
    <div class="map-top-right">
      <button class="map-circle-btn" :title="isFullscreen ? 'Salir pantalla completa' : 'Ampliar mapa'" @click="toggleFullscreen">
        <Maximize2 v-if="!isFullscreen" :size="15" />
        <Minimize2 v-else :size="15" />
      </button>
    </div>

    <!-- Etiqueta flotante superior de alertas (estilo "2 plots need attention") -->
    <div v-if="atencionCount > 0" class="map-floating-alert">
      <span class="pulse-dot amber"></span>
      <span>{{ atencionCount }} {{ atencionCount === 1 ? 'lote requiere' : 'lotes requieren' }} atención</span>
    </div>

    <!-- Contenedor Leaflet -->
    <div ref="mapContainer" class="leaflet-canvas"></div>

    <!-- Controles de zoom + / - abajo derecha (como la plantilla) -->
    <div class="map-bottom-right">
      <button class="map-circle-btn" title="Centrar finca" @click="fitBounds">
        <Crosshair :size="15" />
      </button>
      <div class="zoom-stack">
        <button @click="zoomIn"><Plus :size="16" /></button>
        <button @click="zoomOut"><Minus :size="16" /></button>
      </div>
    </div>

    <!-- Tarjeta rápida del lote seleccionado -->
    <div v-if="selectedLote" class="lote-mini-card">
      <div class="mini-header">
        <strong>{{ selectedLote.nombre }}</strong>
        <button class="close-mini" @click="selectedLote = null">×</button>
      </div>
      <div class="mini-stats">
        <span>💧 Humedad: <b>{{ selectedLote.humedadPct }}%</b></span>
        <span>🌿 Salud: <b>{{ selectedLote.saludPct }}%</b></span>
        <span>📐 Área: <b>{{ selectedLote.areaHectareas }} ha</b></span>
      </div>
      <div v-if="selectedLote.enCarencia" class="pill pill-red" style="margin-top: 6px">
        ⚠️ Período de carencia activo
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import L from 'leaflet';
import { Layers, Maximize2, Minimize2, Crosshair, Plus, Minus } from 'lucide-vue-next';

const props = defineProps({
  lotes: { type: Array, default: () => [] },
  center: { type: Array, default: () => [-16.645, -68.122] }
});

const mapContainer = ref(null);
const mapMode = ref('satellite');
const isFullscreen = ref(false);
const selectedLote = ref(null);

let mapInstance = null;
let tileLayer = null;
let overlayGroup = null;

const atencionCount = computed(() => props.lotes.filter((l) => l.estado !== 'SALUDABLE' || l.enCarencia).length);

const TILE_URLS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  }
};

function initMap() {
  if (!mapContainer.value) return;
  mapInstance = L.map(mapContainer.value, {
    center: props.center,
    zoom: 16,
    zoomControl: false,
    attributionControl: false
  });

  tileLayer = L.tileLayer(TILE_URLS.satellite.url, { maxZoom: 19 }).addTo(mapInstance);
  overlayGroup = L.layerGroup().addTo(mapInstance);
  renderLotes();
}

function renderLotes() {
  if (!mapInstance || !overlayGroup) return;
  overlayGroup.clearLayers();

  const bounds = [];

  props.lotes.forEach((lote) => {
    const color = lote.enCarencia ? '#ef4444' : lote.estado === 'SALUDABLE' ? '#4ade80' : '#facc15';
    const dotClass = lote.enCarencia ? 'red' : lote.estado === 'SALUDABLE' ? 'green' : 'amber';

    if (Array.isArray(lote.poligono) && lote.poligono.length >= 3) {
      const poly = L.polygon(lote.poligono, {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.22
      }).addTo(overlayGroup);

      poly.on('click', () => {
        selectedLote.value = lote;
      });
      lote.poligono.forEach((pt) => bounds.push(pt));
    }

    const labelText = lote.enCarencia
      ? `Carencia · ${lote.codigo}`
      : lote.estado === 'SALUDABLE'
        ? `Saludable: ${lote.saludPct}%`
        : `Humedad: ${lote.humedadPct}%`;

    const icon = L.divIcon({
      className: 'agro-map-pin-wrapper',
      html: `
        <div class="agro-pin-stack">
          <div class="agro-pin-dot ${dotClass}"><span></span></div>
          <div class="agro-pin-pill">${labelText}</div>
        </div>
      `,
      iconSize: [140, 44],
      iconAnchor: [70, 22]
    });

    const marker = L.marker([lote.latitud, lote.longitud], { icon }).addTo(overlayGroup);
    marker.on('click', () => {
      selectedLote.value = lote;
    });
    bounds.push([lote.latitud, lote.longitud]);
  });

  if (bounds.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
  }
}

function toggleLayer() {
  mapMode.value = mapMode.value === 'satellite' ? 'osm' : 'satellite';
  if (mapInstance && tileLayer) {
    mapInstance.removeLayer(tileLayer);
    tileLayer = L.tileLayer(TILE_URLS[mapMode.value].url, { maxZoom: 19 }).addTo(mapInstance);
    tileLayer.bringToBack();
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  setTimeout(() => {
    mapInstance?.invalidateSize();
  }, 180);
}

function fitBounds() {
  renderLotes();
}

function zoomIn() {
  mapInstance?.zoomIn();
}

function zoomOut() {
  mapInstance?.zoomOut();
}

watch(
  () => props.lotes,
  () => renderLotes(),
  { deep: true }
);

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<style scoped>
.farm-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 540px;
  border-radius: 26px;
  overflow: hidden;
  background-image: url('/images/farm-bg.jpg');
  background-size: cover;
  box-shadow: 0 12px 30px rgba(20, 45, 22, 0.14);
}

.farm-map-wrapper.fullscreen {
  position: fixed;
  inset: 16px;
  z-index: 950;
  height: calc(100vh - 32px);
}

.leaflet-canvas {
  width: 100%;
  height: 100%;
  min-height: 540px;
  z-index: 1;
}

.map-top-left {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 400;
}

.map-top-right {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 400;
}

.map-floating-alert {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 400;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #141915;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}

.pulse-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.pulse-dot.amber {
  background: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.28);
}

.map-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.94);
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: #141915;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
}

.map-circle-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.94);
  color: #141915;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.map-bottom-right {
  position: absolute;
  bottom: 16px;
  right: 14px;
  z-index: 400;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.zoom-stack {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 999px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}
.zoom-stack button {
  width: 36px;
  height: 34px;
  border: none;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #141915;
}
.zoom-stack button:first-child {
  border-bottom: 1px solid #ebedf0;
}

.lote-mini-card {
  position: absolute;
  left: 14px;
  bottom: 16px;
  z-index: 400;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
  border-radius: 18px;
  padding: 12px 14px;
  max-width: 245px;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.18);
  font-size: 12px;
}

.mini-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.close-mini {
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}
.mini-stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: #4b5563;
}

@media (max-width: 1024px) {
  .farm-map-wrapper,
  .leaflet-canvas {
    min-height: 360px;
  }
}
</style>

<style>
/* Estilos globales para pins de Leaflet */
.agro-map-pin-wrapper {
  background: transparent !important;
  border: none !important;
}
.agro-pin-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.agro-pin-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
}
.agro-pin-dot span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.agro-pin-dot.green span {
  background: #22c55e;
}
.agro-pin-dot.amber span {
  background: #f59e0b;
}
.agro-pin-dot.red span {
  background: #ef4444;
}
.agro-pin-pill {
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(8px);
  color: #141915;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}
</style>
