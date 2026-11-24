<template>
  <div class="login-page">
    <div class="login-shell">
      <!-- Lado izquierdo: Hero con la imagen del campo -->
      <div class="login-hero">
        <div class="hero-overlay">
          <div class="hero-brand">
            <div class="brand-badge">
              <Sprout :size="22" color="#2AD147" />
            </div>
            <span>AgroConnect</span>
          </div>

          <div class="hero-copy">
            <span class="pill pill-green" style="background: rgba(255,255,255,0.2); color: #fff; backdrop-filter: blur(8px)">
              Del campo a la nube · PWA Modular
            </span>
            <h1>Gestión inteligente y trazabilidad QR para tu finca</h1>
            <p>
              Control técnico de campo, aplicaciones fitosanitarias con período de carencia, inventarios, ventas, vivero y
              Agente IA por WhatsApp en un solo lugar.
            </p>
          </div>

          <div class="hero-footer">
            <router-link to="/trazabilidad/AGRO-2026-L02-001" class="trace-preview-btn">
              <QrCode :size="16" />
              <span>Ver ejemplo de ficha QR pública del cliente</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Lado derecho: Formulario JWT -->
      <div class="login-form-panel">
        <div class="form-header">
          <h2>Iniciar sesión</h2>
          <p>Ingresa con tu cuenta de finca o usa un perfil de prueba.</p>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="field">
            <label>Correo electrónico</label>
            <input v-model="email" type="email" required placeholder="propietario@agroconnect.demo" />
          </div>

          <div class="field">
            <label>Contraseña</label>
            <input v-model="password" type="password" required placeholder="••••••••" />
          </div>

          <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>

          <button type="submit" class="btn btn-dark" style="width: 100%; padding: 13px" :disabled="loading">
            <LogIn :size="17" />
            <span>{{ loading ? 'Ingresando...' : 'Entrar a Mi Finca' }}</span>
          </button>
        </form>

        <div class="demo-box">
          <div class="demo-title">Accesos rápidos de demostración (datos ficticios)</div>
          <div class="demo-grid">
            <button type="button" class="demo-chip" @click="fillDemo('propietario@agroconnect.demo', 'Agro2026!')">
              <strong>Propietario</strong>
              <span>Control total y módulos</span>
            </button>
            <button type="button" class="demo-chip" @click="fillDemo('encargado@agroconnect.demo', 'Campo2026!')">
              <strong>Encargado</strong>
              <span>Campo, ventas e IA</span>
            </button>
            <button type="button" class="demo-chip" @click="fillDemo('trabajador@agroconnect.demo', 'Labor2026!')">
              <strong>Trabajador</strong>
              <span>Labores y cosechas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Sprout, QrCode, LogIn } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const email = ref('propietario@agroconnect.demo');
const password = ref('Agro2026!');
const loading = ref(false);
const errorMsg = ref('');

function fillDemo(e, p) {
  email.value = e;
  password.value = p;
  handleLogin();
}

async function handleLogin() {
  loading.value = true;
  errorMsg.value = '';
  try {
    await auth.login(email.value, password.value);
    router.push('/');
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'No se pudo conectar con el servidor.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background-image:
    linear-gradient(135deg, rgba(28, 60, 24, 0.72), rgba(78, 128, 60, 0.58)),
    url('/images/farm-bg.jpg');
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  padding: 20px;
}

.login-shell {
  width: 100%;
  max-width: 1020px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  border-radius: 30px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  box-shadow: 0 30px 80px rgba(12, 34, 14, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.65);
}

.login-hero {
  background-image: url('/images/farm-bg.jpg');
  background-size: cover;
  background-position: center;
  min-height: 540px;
  position: relative;
}

.hero-overlay {
  height: 100%;
  padding: 34px;
  background: linear-gradient(180deg, rgba(16, 36, 17, 0.62) 0%, rgba(16, 36, 17, 0.38) 45%, rgba(12, 28, 13, 0.85) 100%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 800;
}

.brand-badge {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: rgba(20, 25, 21, 0.85);
  display: grid;
  place-items: center;
}

.hero-copy h1 {
  font-size: 31px;
  line-height: 1.16;
  margin: 14px 0 10px;
  font-weight: 800;
}

.hero-copy p {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.trace-preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  text-decoration: none;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.trace-preview-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.login-form-panel {
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
}

.form-header h2 {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 800;
}

.form-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.error-box {
  background: var(--red-soft);
  color: var(--red-danger);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.demo-box {
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.demo-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.demo-chip {
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 10px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  transition: all 0.15s;
}
.demo-chip:hover {
  border-color: var(--green-mid);
  background: var(--green-soft);
}
.demo-chip strong {
  font-size: 12px;
  color: var(--text-primary);
}
.demo-chip span {
  font-size: 10px;
  color: var(--text-secondary);
}

@media (max-width: 860px) {
  .login-shell {
    grid-template-columns: 1fr;
  }
  .login-hero {
    min-height: 240px;
  }
  .hero-copy h1 {
    font-size: 23px;
  }
  .login-form-panel {
    padding: 28px 22px;
  }
}
</style>
