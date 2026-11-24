const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');
const { processIncomingMessage, sendOutboundWhatsApp } = require('../services/aiAgent');

const router = express.Router();

// === ESTADO DE INTEGRACIÓN (muestra qué proveedor real o simulador está activo) ===
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const mensajes = await prisma.mensajeWhatsApp.findMany({
      where: { fincaId: req.user.fincaId },
      orderBy: { createdAt: 'asc' },
      take: 60
    });
    const pendientes = await prisma.confirmacionPendiente.findMany({
      where: { fincaId: req.user.fincaId, estado: 'PENDIENTE', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      configuracion: {
        llmActivo: process.env.GROQ_API_KEY
          ? 'Groq API'
          : process.env.ANTHROPIC_API_KEY
            ? 'Anthropic Claude'
            : 'Motor NLP Local (sin API key requerida)',
        whatsappActivo:
          process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
            ? 'Meta WhatsApp Business Cloud API'
            : process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
              ? 'Twilio WhatsApp Sandbox'
              : 'Simulador WhatsApp Integrado'
      },
      confirmacionesPendientes: pendientes,
      mensajes
    });
  } catch (err) {
    next(err);
  }
});

// === SIMULADOR INTEGRADO EN LA WEB (usa el mismo motor real del Agente IA) ===
router.post('/simulate', authenticate, async (req, res, next) => {
  try {
    const { texto, telefono } = req.body;
    if (!texto || !String(texto).trim()) {
      return res.status(400).json({ error: 'Escribe un mensaje para el agente.' });
    }

    const phone = telefono || req.user.telefono || '+59170001002';
    const result = await processIncomingMessage({
      fincaId: req.user.fincaId,
      telefono: phone,
      texto: String(texto),
      canal: 'SIMULADOR'
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// === DISPARADOR DE ALERTAS PROACTIVAS POR WHATSAPP (riego, stock mínimo, carencia) ===
router.post('/alertas/enviar', authenticate, async (req, res, next) => {
  try {
    const fincaId = req.user.fincaId;
    const finca = await prisma.finca.findUnique({ where: { id: fincaId } });
    const telefonoDestino = req.body.telefono || finca.telefonoWhatsApp || '+59170001002';

    const [insumos, labores, carencias] = await Promise.all([
      prisma.insumo.findMany({ where: { fincaId } }),
      prisma.labor.findMany({ where: { fincaId, estado: 'PENDIENTE', tipo: 'RIEGO' }, include: { lote: true } }),
      prisma.aplicacionFitosanitaria.findMany({
        where: { fincaId, fechaFinCarencia: { gt: new Date() } },
        include: { lote: true }
      })
    ]);

    const stockBajo = insumos.filter((i) => i.stockActual <= i.stockMinimo);
    const lineas = ['🚨 *Reporte Automático de Alertas — AgroConnect*'];

    if (labores.length) {
      lineas.push(`\n💧 *Riegos pendientes (${labores.length}):*`);
      labores.forEach((l) => lineas.push(`• ${l.titulo} (${l.lote.nombre})`));
    }
    if (carencias.length) {
      lineas.push(`\n🛡️ *Períodos de carencia activos (${carencias.length}):*`);
      carencias.forEach((c) =>
        lineas.push(`• ${c.lote.nombre}: ${c.producto} hasta ${new Date(c.fechaFinCarencia).toLocaleDateString('es-BO')}`)
      );
    }
    if (stockBajo.length) {
      lineas.push(`\n📦 *Stock mínimo (${stockBajo.length}):*`);
      stockBajo.forEach((i) => lineas.push(`• ${i.nombre}: ${i.stockActual} ${i.unidad} (mín ${i.stockMinimo})`));
    }

    if (lineas.length === 1) {
      lineas.push('\n✅ Todo normal en la finca. No hay alertas críticas.');
    }

    const msg = await sendOutboundWhatsApp(fincaId, telefonoDestino, lineas.join('\n'), 'ALERTA_PROACTIVA');
    res.json({ ok: true, mensaje: msg });
  } catch (err) {
    next(err);
  }
});

// === WEBHOOK REAL: META WHATSAPP BUSINESS CLOUD API ===
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'agroconnect_verify_token_2026')) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (message?.type === 'text' && message?.text?.body) {
      const finca = await prisma.finca.findFirst();
      if (finca) {
        await processIncomingMessage({
          fincaId: finca.id,
          telefono: `+${message.from}`,
          texto: message.text.body,
          canal: 'META_CLOUD'
        });
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('[Meta Webhook Error]', err);
    res.sendStatus(200);
  }
});

// === WEBHOOK REAL: TWILIO WHATSAPP SANDBOX ===
router.post('/twilio', async (req, res) => {
  try {
    const from = req.body?.From || '+59170001002';
    const body = req.body?.Body || '';
    const finca = await prisma.finca.findFirst();

    let replyText = 'Finca no configurada.';
    if (finca && body) {
      const result = await processIncomingMessage({
        fincaId: finca.id,
        telefono: from.replace('whatsapp:', ''),
        texto: body,
        canal: 'TWILIO'
      });
      replyText = result.reply;
    }

    const escaped = replyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`);
  } catch (err) {
    console.error('[Twilio Webhook Error]', err);
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error procesando tu mensaje.</Message></Response>');
  }
});

module.exports = router;
