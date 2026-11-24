<template>
  <div class="farm-backdrop">
    <div class="app-shell">
      <!-- Left Slim Icon Rail (Plantilla de Referencia) -->
      <aside class="icon-rail">
        <div class="rail-brand" title="AgroConnect CRM-Agro" @click="router.push('/')">
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
            <path
              d="M32 8C19 16 12 29 14 43c1 9 8 15 17 15-5-9-4-19 2-29 2 8 1 17-3 24 10-1 19-10 20-21 1-12-7-20-18-24z"
              fill="#2AD147"
            />
            <path d="M30 57c-2-12 2-25 11-33" stroke="#167A2E" stroke-width="3" stroke-linecap="round" />
          </svg>
        </div>

        <nav class="rail-nav">
          <router-link
            v-for="item in visibleNavItems"
            :key="item.to"
            :to="item.to"
            class="rail-btn"
            :class="{ active: isRouteActive(item.to) }"
          >
            <component :is="item.icon" :size="19" />
            <span class="rail-tooltip">{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="rail-footer">
          <router-link
            to="/whatsapp-ia"
            class="rail-btn"
            :class="{ active: isRouteActive('/whatsapp-ia') }"
          >
            <MessageCircle :size="19" />
            <span class="rail-tooltip">Agente IA · WhatsApp</span>
          </router-link>
          <button class="rail-btn" title="Cerrar sesión" @click="handleLogout">
            <LogOut :size="19" />
            <span class="rail-tooltip">Salir</span>
          </button>
        </div>
      </aside>

      <!-- Main Column -->
      <div class="shell-main">
        <!-- Offline PWA Banner -->
        <div v-if="!isOnline" class="offline-banner">
          <WifiOff :size="15" />
          <span>Modo sin conexión (PWA): mostrando últimos datos en caché. Los cambios se enviarán al recuperar señal.</span>
        </div>

        <!-- Topbar (Plantilla de Referencia) -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="icon-circle-btn mobile-only-btn" @click="mobileMenuOpen = true">
              <Menu :size="18" />
            </button>
            <h1 class="topbar-title">{{ currentTitle }}</h1>
            <span class="sector-pill">
              <MapPin :size="14" />
              {{ auth.finca?.nombre || 'Finca Valle Verde' }}
            </span>
          </div>

          <div class="topbar-right">
            <div class="search-pill">
              <Search :size="15" color="#8c9690" />
              <input
                v-model="quickSearch"
                type="text"
                placeholder="Ir a módulo o lote..."
                @keydown.enter="handleQuickSearch"
              />
            </div>

            <button
              class="icon-circle-btn"
              title="Agente IA por WhatsApp"
              @click="router.push('/whatsapp-ia')"
            >
              <Bot :size="18" color="#4e803c" />
            </button>

            <button
              class="icon-circle-btn"
              title="Módulos y configuración"
              @click="router.push('/nucleo')"
            >
              <Settings :size="18" />
            </button>

            <div class="notif-anchor">
              <button class="icon-circle-btn" title="Alertas de la finca" @click="showAlerts = !showAlerts">
                <Bell :size="18" />
                <span v-if="auth.alertas.length > 0" class="badge-dot"></span>
              </button>

              <div v-if="showAlerts" class="alerts-popover">
                <div class="alerts-header">
                  <strong>Alertas activas ({{ auth.alertas.length }})</strong>
                  <button class="btn-link" @click="showAlerts = false">Cerrar</button>
                </div>
                <div v-if="auth.alertas.length === 0" class="alerts-empty">
                  Todo en orden en la finca.
                </div>
                <div v-for="(al, idx) in auth.alertas" :key="idx" class="alert-item">
                  <span class="pill" :class="al.severidad === 'ALTA' ? 'pill-red' : 'pill-amber'">
                    {{ al.tipo }}
                  </span>
                  <div class="alert-title">{{ al.titulo }}</div>
                  <div class="alert-detail">{{ al.detalle }}</div>
                </div>
              </div>
            </div>

            <div class="user-chip">
              <div class="user-avatar">{{ userInitials }}</div>
              <div class="user-meta">
                <div class="user-name">{{ auth.usuario?.nombre }}</div>
                <div class="user-role">{{ auth.usuario?.rol }}</div>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Router Outlet -->
        <main class="page-content">
          <router-view />
        </main>
      </div>
    </div>

    <!-- Bottom Mobile Navigation (PWA Campo) -->
    <nav class="mobile-nav">
      <router-link to="/" class="mobile-nav-item" :class="{ active: isRouteActive('/') }">
        <LayoutGrid :size="19" />
        <span>Finca</span>
      </router-link>
      <router-link
        v-if="auth.isModuleActive('M1')"
        to="/campo"
        class="mobile-nav-item"
        :class="{ active: isRouteActive('/campo') }"
      >
        <Sprout :size="19" />
        <span>Campo</span>
      </router-link>
      <router-link
        v-if="auth.isModuleActive('M2')"
        to="/trazabilidad"
        class="mobile-nav-item"
        :class="{ active: isRouteActive('/trazabilidad') }"
      >
        <QrCode :size="19" />
        <span>QR</span>
      </router-link>
      <router-link to="/whatsapp-ia" class="mobile-nav-item" :class="{ active: isRouteActive('/whatsapp-ia') }">
        <MessageCircle :size="19" />
        <span>AgroBot</span>
      </router-link>
      <button class="mobile-nav-item" @click="mobileMenuOpen = true">
        <Menu :size="19" />
        <span>Más</span>
      </button>
    </nav>

    <!-- Slide-over Mobile Drawer -->
    <div v-if="mobileMenuOpen" class="modal-backdrop" @click.self="mobileMenuOpen = false">
      <div class="modal-card" style="max-width: 360px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px">
          <strong style="font-size: 16px">Módulos AgroConnect</strong>
          <button class="btn btn-soft btn-sm" @click="mobileMenuOpen = false">Cerrar</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <router-link
            v-for="item in visibleNavItems"
            :key="item.to"
            :to="item.to"
            class="btn"
            :class="isRouteActive(item.to) ? 'btn-dark' : 'btn-soft'"
            style="justify-content: flex-start"
            @click="mobileMenuOpen = false"
          >
            <component :is="item.icon" :size="17" />
            <span>{{ item.label }}</span>
          </router-link>
          <router-link
            to="/whatsapp-ia"
            class="btn btn-green"
            style="justify-content: flex-start"
            @click="mobileMenuOpen = false"
          >
            <MessageCircle :size="17" />
            <span>Agente IA · WhatsApp</span>
          </router-link>
          <button class="btn btn-danger-soft" style="justify-content: flex-start; margin-top: 8px" @click="handleLogout">
            <LogOut :size="17" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutGrid,
  Sprout,
  QrCode,
  Users,
  Package,
  ShoppingBag,
  Flower2,
  BarChart3,
  SlidersHorizontal,
  MessageCircle,
  LogOut,
  Search,
  Settings,
  Bell,
  Bot,
  MapPin,
  Menu,
  WifiOff
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const isOnline = ref(navigator.onLine);
const showAlerts = ref(false);
const mobileMenuOpen = ref(false);
const quickSearch = ref('');

const allNavItems = [
  { to: '/', label: 'Panel Principal', icon: LayoutGrid, modulo: 'M0' },
  { to: '/campo', label: 'M1 · Control de Campo', icon: Sprout, modulo: 'M1' },
  { to: '/trazabilidad', label: 'M2 · Trazabilidad QR', icon: QrCode, modulo: 'M2' },
  { to: '/trabajadores', label: 'M3 · Trabajadores', icon: Users, modulo: 'M3' },
  { to: '/inventarios', label: 'M4 · Inventarios', icon: Package, modulo: 'M4' },
  { to: '/ventas', label: 'M5 · Ventas y Clientes', icon: ShoppingBag, modulo: 'M5' },
  { to: '/vivero', label: 'M6 · Vivero', icon: Flower2, modulo: 'M6' },
  { to: '/finanzas', label: 'M7 · Finanzas', icon: BarChart3, modulo: 'M7' },
  { to: '/nucleo', label: 'M0 · Núcleo y Módulos', icon: SlidersHorizontal, modulo: 'M0' }
];

const visibleNavItems = computed(() =>
  allNavItems.filter((item) => auth.isModuleActive(item.modulo))
);

const currentTitle = computed(() => route.meta?.title || 'Mi Finca');

const userInitials = computed(() => {
  const n = auth.usuario?.nombre || 'AC';
  return n
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
});

function isRouteActive(path) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

function handleQuickSearch() {
  const q = quickSearch.value.trim().toLowerCase();
  if (!q) return;
  const match = visibleNavItems.value.find((i) => i.label.toLowerCase().includes(q));
  if (match) {
    router.push(match.to);
    quickSearch.value = '';
  } else if (q.includes('bot') || q.includes('whats') || q.includes('ia')) {
    router.push('/whatsapp-ia');
    quickSearch.value = '';
  }
}

function handleLogout() {
  auth.logout();
  router.push('/login');
}

const onOnline = () => (isOnline.value = true);
const onOffline = () => (isOnline.value = false);

onMounted(() => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  auth.fetchMe().catch(() => {});
});

onUnmounted(() => {
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
});
</script>

<style scoped>
.mobile-only-btn {
  display: none;
}
.user-meta {
  line-height: 1.15;
}
.user-name {
  font-size: 12px;
  font-weight: 700;
}
.user-role {
  font-size: 10px;
  font-weight: 700;
  color: var(--green-deep);
}
.notif-anchor {
  position: relative;
}
.alerts-popover {
  position: absolute;
  right: 0;
  top: 46px;
  width: 320px;
  max-height: 380px;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.16);
  padding: 14px;
  z-index: 80;
}
.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
}
.btn-link {
  background: none;
  border: none;
  color: var(--green-deep);
  font-weight: 700;
  cursor: pointer;
  font-size: 12px;
}
.alerts-empty {
  font-size: 13px;
  color: var(--text-muted);
  padding: 10px 0;
}
.alert-item {
  padding: 10px 0;
  border-top: 1px solid var(--border-subtle);
}
.alert-title {
  font-size: 13px;
  font-weight: 700;
  margin-top: 4px;
}
.alert-detail {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .mobile-only-btn {
    display: grid;
  }
  .user-meta {
    display: none;
  }
  .sector-pill {
    display: none;
  }
}
</style>
