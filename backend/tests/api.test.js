import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

let tokenPropietario = '';
let tokenTrabajador = '';

beforeAll(async () => {
  const resAdmin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'propietario@agroconnect.demo', password: 'Agro2026!' });
  tokenPropietario = resAdmin.body.token;

  const resTrab = await request(app)
    .post('/api/auth/login')
    .send({ email: 'trabajador@agroconnect.demo', password: 'Labor2026!' });
  tokenTrabajador = resTrab.body.token;
});

describe('AgroConnect CRM-Agro — Pruebas Automatizadas de API y Reglas de Negocio', () => {
  it('GET /api/health responde 200 y SQLite conectado', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('sqlite-connected');
  });

  it('Rechaza acceso sin JWT a rutas protegidas', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('Control de roles (RBAC): TRABAJADOR no puede desactivar módulos', async () => {
    const res = await request(app)
      .patch('/api/nucleo/modulos/M6')
      .set('Authorization', `Bearer ${tokenTrabajador}`)
      .send({ activo: false });
    expect(res.status).toBe(403);
  });

  it('Activación modular por finca: desactivar M6 bloquea /api/vivero y reactivarlo lo habilita', async () => {
    const off = await request(app)
      .patch('/api/nucleo/modulos/M6')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ activo: false });
    expect(off.status).toBe(200);
    expect(off.body.activo).toBe(false);

    const blocked = await request(app)
      .get('/api/vivero')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.moduloDesactivado).toBe(true);

    const on = await request(app)
      .patch('/api/nucleo/modulos/M6')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ activo: true });
    expect(on.status).toBe(200);

    const allowed = await request(app)
      .get('/api/vivero')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(allowed.status).toBe(200);
  });

  it('M1 - Bloqueo sanitario: impide cosechar en Lote 3 mientras tiene período de carencia activo', async () => {
    const lotes = await request(app)
      .get('/api/nucleo/lotes')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    const cultivos = await request(app)
      .get('/api/nucleo/cultivos')
      .set('Authorization', `Bearer ${tokenPropietario}`);

    const lote3 = lotes.body.find((l) => l.codigo === 'L-03');
    const cultivo = cultivos.body[0];

    const res = await request(app)
      .post('/api/campo/cosechas')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        loteId: lote3.id,
        cultivoId: cultivo.id,
        cantidadKg: 15,
        calidad: 'PRIMERA'
      });

    expect(res.status).toBe(422);
    expect(res.body.carenciaActiva).toBe(true);
  });

  it('M2 - Ficha pública de trazabilidad QR es consultable sin login', async () => {
    const res = await request(app).get('/api/trazabilidad/AGRO-2026-L02-001');
    expect(res.status).toBe(200);
    expect(res.body.codigoTrazabilidad).toBe('AGRO-2026-L02-001');
    expect(res.body.qrDataUrl).toContain('data:image/png;base64');
    expect(res.body.carenciaRespetada).toBe(true);
  });

  it('M4 - Detecta alertas de stock mínimo correctamente', async () => {
    const res = await request(app)
      .get('/api/inventarios/insumos')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(200);
    const bajos = res.body.filter((i) => i.alertaStockMinimo);
    expect(bajos.length).toBeGreaterThan(0);
  });

  it('M7 - Reporte financiero calcula totales y desglose por lote', async () => {
    const res = await request(app)
      .get('/api/finanzas/resumen')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(200);
    expect(res.body.totales.ingresos).toBeGreaterThan(0);
    expect(res.body.porLote.length).toBeGreaterThan(0);
  });

  it('Agente IA - Guardrail ético: nunca inventa dosis de agroquímicos desconocidos', async () => {
    const res = await request(app)
      .post('/api/whatsapp/simulate')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        telefono: '+59170009999',
        texto: '¿Qué dosis de fungicida desconocido X900 debo aplicar al tomate?'
      });

    expect(res.status).toBe(200);
    expect(res.body.intent).toBe('CONSULTA_DOSIS');
    expect(res.body.reply.toLowerCase()).toContain('ingeniero agrónomo');
    expect(res.body.reply.toLowerCase()).toContain('nunca invento dosis');
  });

  it('Agente IA - Exige confirmación explícita ("SÍ") antes de guardar una cosecha', async () => {
    const before = await request(app)
      .get('/api/campo/cosechas')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    const countBefore = before.body.length;

    // Paso 1: Mensaje inicial pide confirmación sin guardar aún
    const step1 = await request(app)
      .post('/api/whatsapp/simulate')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        telefono: '+59170008888',
        texto: 'Hoy cosechamos 35 kg de tomate del lote 2'
      });

    expect(step1.status).toBe(200);
    expect(step1.body.requiresConfirmation).toBe(true);
    expect(step1.body.reply.toLowerCase()).toContain('confirmas');

    const mid = await request(app)
      .get('/api/campo/cosechas')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(mid.body.length).toBe(countBefore); // Todavía NO guardó nada

    // Paso 2: Confirmación con "SÍ" guarda la cosecha y genera código QR
    const step2 = await request(app)
      .post('/api/whatsapp/simulate')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        telefono: '+59170008888',
        texto: 'SÍ'
      });

    expect(step2.status).toBe(200);
    expect(step2.body.intent).toBe('CONFIRMACION_OK');
    expect(step2.body.reply).toContain('AGRO-');

    const after = await request(app)
      .get('/api/campo/cosechas')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(after.body.length).toBe(countBefore + 1);
  });
});
