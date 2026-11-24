<template>
  <div class="wa-layout">
    <!-- Panel izquierdo: Chat estilo WhatsApp en vivo -->
    <div class="wa-phone-card">
      <div class="wa-header">
        <div class="wa-avatar">🌿</div>
        <div style="flex: 1">
          <strong>AgroBot · Finca Valle Verde</strong>
          <div class="wa-sub">{{ config.llmActivo }} · {{ config.whatsappActivo }}</div>
        </div>
        <button class="btn btn-soft btn-sm" @click="sendProactiveAlert" :disabled="sending">
          Enviar Alerta
        </button>
      </div>

      <div ref="chatScroll" class="wa-messages">
        <div
          v-for="m in mensajes"
          :key="m.id"
          class="wa-bubble"
          :class="m.direccion === 'ENTRANTE' ? 'outgoing' : 'incoming'"
        >
          <div class="wa-text">{{ m.contenido }}</div>
          <div class="wa-meta">
            <span>{{ m.intencion || m.proveedor }}</span>
            <span>{{ fmtTime(m.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Botones rápidos de confirmación si hay pendiente -->
      <div v-if="pendientes.length > 0" class="wa-confirm-bar">
        <span>Confirmación requerida:</span>
        <button class="btn btn-green btn-sm" @click="sendQuick('SÍ')">✅ SÍ, Guardar</button>
        <button class="btn btn-danger-soft btn-sm" @click="sendQuick('NO')">❌ NO, Cancelar</button>
      </div>

      <form class="wa-input-bar" @submit.prevent="sendMessage">
        <input
          v-model="draft"
          type="text"
          placeholder='Escribe ej: "hoy cosechamos 40 kg de tomate del lote 2"...'
          :disabled="sending"
        />
        <button type="submit" class="btn btn-green" :disabled="sending || !draft.trim()">
          {{ sending ? '...' : 'Enviar' }}
        </button>
      </form>
    </div>

    <!-- Panel derecho: Pruebas rápidas + Reglas éticas + Estado de Webhooks -->
    <div class="wa-side">
      <div class="card-white">
        <h3 style="margin-top: 0">Pruebas Rápidas (Demo en Vivo)</h3>
        <p class="subtitle">Haz clic en cualquier mensaje para probar el Agente de IA con confirmación previa:</p>
        <div class="prompts-list">
          <button class="prompt-btn" @click="sendQuick('Hoy cosechamos 40 kg de tomate del lote 2')">
            🍅 "Hoy cosechamos 40 kg de tomate del lote 2"
          </button>
          <button class="prompt-btn" @click="sendQuick('Registra riego en lote 1 hoy por la mañana')">
            💧 "Registra riego en lote 1 hoy por la mañana"
          </button>
          <button class="prompt-btn" @click="sendQuick('Pedido de 25 kg de lechuga para Mercado Orgánico')">
            🛒 "Pedido de 25 kg de lechuga para Mercado Orgánico"
          </button>
          <button class="prompt-btn" @click="sendQuick('¿Qué insumos tienen stock bajo?')">
            📦 "¿Qué insumos tienen stock bajo?"
          </button>
          <button class="prompt-btn" @click="sendQuick('¿Qué labores están pendientes?')">
            📋 "¿Qué labores están pendientes?"
          </button>
          <button class="prompt-btn warn" @click="sendQuick('¿Qué dosis de fungicida desconocido me recomiendas aplicar?')">
            🛡️ Probar límite ético: pedir dosis de agroquímico no registrado
          </button>
          <button class="prompt-btn" @click="sendQuick('¿Cuál es la dosis de Oxicloruro de Cobre?')">
            🏷️ Consultar dosis oficial de etiqueta registrada en inventario
          </button>
        </div>
      </div>

      <div class="card">
        <h4 style="margin-top: 0">🛡️ Límites Obligatorios del Agente IA</h4>
        <ul class="rules-list">
          <li><strong>Confirmación obligatoria:</strong> Nunca guarda cosechas, labores ni pedidos sin un <code>SÍ</code> explícito.</li>
          <li><strong>Cero dosis inventadas:</strong> Jamás prescribe agroquímicos ni reemplaza al ingeniero agrónomo; solo cita la etiqueta registrada en inventario.</li>
          <li><strong>Respeto a carencias:</strong> Bloquea cosechas si el lote tiene un período de carencia fitosanitario activo.</li>
        </ul>
      </div>

      <div class="card-white">
        <h4 style="margin-top: 0">⚙️ Endpoints Reales de Webhook</h4>
        <div class="webhook-box">
          <div><strong>Meta WhatsApp Cloud API:</strong> <code>POST /api/whatsapp/webhook</code></div>
          <div><strong>Twilio WhatsApp Sandbox:</strong> <code>POST /api/whatsapp/twilio</code></div>
          <div><strong>Motor LLM actual:</strong> <span class="pill pill-green">{{ config.llmActivo }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue';
import api from '../services/api';

const mensajes = ref([]);
const pendientes = ref([]);
const draft = ref('');
const sending = ref(false);
const chatScroll = ref(null);
const config = reactive({
  llmActivo: 'Motor NLP Local',
  whatsappActivo: 'Simulador Integrado'
});

function fmtTime(d) {
  return d ? new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '';
}

async function scrollToBottom() {
  await nextTick();
  if (chatScroll.value) {
    chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
  }
}

async function loadStatus() {
  const { data } = await api.get('/whatsapp/status');
  Object.assign(config, data.configuracion);
  mensajes.value = data.mensajes;
  pendientes.value = data.confirmacionesPendientes;
  await scrollToBottom();
}

async function sendQuick(texto) {
  draft.value = texto;
  await sendMessage();
}

async function sendMessage() {
  if (!draft.value.trim() || sending.value) return;
  sending.value = true;
  const texto = draft.value.trim();
  draft.value = '';
  try {
    await api.post('/whatsapp/simulate', { texto });
    await loadStatus();
  } finally {
    sending.value = false;
  }
}

async function sendProactiveAlert() {
  sending.value = true;
  try {
    await api.post('/whatsapp/alertas/enviar');
    await loadStatus();
  } finally {
    sending.value = false;
  }
}

onMounted(loadStatus);
</script>

<style scoped>
.wa-layout {
  display: grid;
  grid-template-columns: 1.25fr 0.9fr;
  gap: 18px;
  align-items: start;
}

.wa-phone-card {
  background: #efeae2;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  height: 620px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
}

.wa-header {
  background: #14532d;
  color: #fff;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.wa-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  display: grid;
  place-items: center;
  font-size: 18px;
}

.wa-sub {
  font-size: 11px;
  opacity: 0.85;
}

.wa-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wa-bubble {
  max-width: 84%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.06);
}

.wa-bubble.incoming {
  align-self: flex-start;
  background: #ffffff;
  border-top-left-radius: 4px;
}

.wa-bubble.outgoing {
  align-self: flex-end;
  background: #d9fdd3;
  border-top-right-radius: 4px;
}

.wa-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
  font-size: 10px;
  color: #6b7280;
}

.wa-confirm-bar {
  background: #fffbeb;
  border-top: 1px solid #fde68a;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  flex-wrap: wrap;
}

.wa-input-bar {
  background: #f0f2f5;
  padding: 12px;
  display: flex;
  gap: 10px;
}

.wa-input-bar input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  padding: 10px 16px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.wa-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 12px;
}

.prompts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-btn {
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-card);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s;
}
.prompt-btn:hover {
  background: var(--green-soft);
  border-color: var(--green-mid);
}
.prompt-btn.warn:hover {
  background: var(--amber-soft);
  border-color: var(--amber-warn);
}

.rules-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.webhook-box {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (max-width: 960px) {
  .wa-layout {
    grid-template-columns: 1fr;
  }
  .wa-phone-card {
    height: 520px;
  }
}
</style>
