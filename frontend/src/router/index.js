import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import MainLayout from '../layouts/MainLayout.vue';
import LoginView from '../views/LoginView.vue';
import PublicTraceView from '../views/PublicTraceView.vue';
import DashboardView from '../views/DashboardView.vue';
import NucleoView from '../views/NucleoView.vue';
import CampoView from '../views/CampoView.vue';
import TrazabilidadView from '../views/TrazabilidadView.vue';
import TrabajadoresView from '../views/TrabajadoresView.vue';
import InventariosView from '../views/InventariosView.vue';
import VentasView from '../views/VentasView.vue';
import ViveroView from '../views/ViveroView.vue';
import FinanzasView from '../views/FinanzasView.vue';
import WhatsAppIAView from '../views/WhatsAppIAView.vue';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/trazabilidad/:codigo',
    name: 'trazabilidad-publica',
    component: PublicTraceView,
    meta: { public: true }
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: DashboardView, meta: { title: 'Mi Finca', modulo: 'M0' } },
      { path: 'nucleo', name: 'nucleo', component: NucleoView, meta: { title: 'Núcleo y Módulos', modulo: 'M0' } },
      { path: 'campo', name: 'campo', component: CampoView, meta: { title: 'Control de Campo', modulo: 'M1' } },
      { path: 'trazabilidad', name: 'trazabilidad', component: TrazabilidadView, meta: { title: 'Trazabilidad QR', modulo: 'M2' } },
      { path: 'trabajadores', name: 'trabajadores', component: TrabajadoresView, meta: { title: 'Trabajadores', modulo: 'M3' } },
      { path: 'inventarios', name: 'inventarios', component: InventariosView, meta: { title: 'Inventarios', modulo: 'M4' } },
      { path: 'ventas', name: 'ventas', component: VentasView, meta: { title: 'Ventas y Clientes', modulo: 'M5' } },
      { path: 'vivero', name: 'vivero', component: ViveroView, meta: { title: 'Vivero de Plantines', modulo: 'M6' } },
      { path: 'finanzas', name: 'finanzas', component: FinanzasView, meta: { title: 'Reportes y Finanzas', modulo: 'M7' } },
      { path: 'whatsapp-ia', name: 'whatsapp-ia', component: WhatsAppIAView, meta: { title: 'Agente IA · WhatsApp', modulo: 'M0' } }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.public) return true;
  if (!auth.isAuthenticated) return { name: 'login' };
  if (to.meta.modulo && !auth.isModuleActive(to.meta.modulo)) {
    return { name: 'nucleo' };
  }
  return true;
});

export default router;
