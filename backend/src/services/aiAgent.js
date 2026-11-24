const prisma = require('../utils/prisma');

const AFFIRMATIVE_REGEX = /^(si|sí|confirmar|confirmo|ok|dale|aceptar|apruebo|correcto|guardar)[\s!.]*$/i;
const NEGATIVE_REGEX = /^(no|cancelar|cancelo|anular|descartar)[\s!.]*$/i;

const AGROCHEMICAL_DOSE_REGEX =
  /(dosis|cu[aá]nto\s+(aplicar|echar|poner|usar)|rec[eé]tame|recomienda.*(agroqu[ií]mico|fungicida|insecticida|herbicida|pesticida|veneno|plaguicida|cobre|neem)|qu[eé]\s+(fungicida|insecticida|herbicida|agroqu[ií]mico)\s+(uso|aplico|recomiendas))/i;

function normalizeText(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Envío saliente opcional a Meta WhatsApp Cloud API o Twilio Sandbox.
 * Si no hay credenciales configuradas, se registra en modo SIMULADOR sin fallar.
 */
async function sendOutboundWhatsApp(fincaId, telefono, contenido, intencion = 'RESPUESTA') {
  let proveedor = 'SIMULADOR';

  try {
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      proveedor = 'META_CLOUD';
      const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefono.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: contenido }
        })
      });
    } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      proveedor = 'TWILIO';
      const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams({
        From: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
        To: telefono.startsWith('whatsapp:') ? telefono : `whatsapp:${telefono}`,
        Body: contenido
      });
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
    }
  } catch (err) {
    console.error('[WhatsApp Outbound Warning]', err.message);
    proveedor = 'SIMULADOR';
  }

  return prisma.mensajeWhatsApp.create({
    data: {
      fincaId,
      telefono,
      direccion: 'SALIENTE',
      contenido,
      proveedor,
      intencion
    }
  });
}

/**
 * Clasificador opcional con Groq o Anthropic Claude cuando hay API Key configurada.
 * Devuelve JSON estructurado: { intent, loteNumero, cultivoNombre, cantidadKg, tipoLabor, tituloLabor, clienteNombre }
 */
async function callExternalLLM(texto, lotes, cultivos) {
  const systemPrompt = `Eres un extractor estructurado para un CRM agrícola (AgroConnect).
REGLAS ÉTICAS ESTRICTAS:
1. NUNCA recomiendes ni inventes dosis de agroquímicos. Si preguntan por dosis o recetas, responde con intent "CONSULTA_DOSIS".
2. Responde SOLO con un objeto JSON válido sin markdown ni explicaciones.

Lotes disponibles: ${lotes.map((l) => `${l.codigo} (${l.nombre})`).join(', ')}
Cultivos disponibles: ${cultivos.map((c) => c.nombre).join(', ')}

Esquema JSON:
{
  "intent": "REGISTRAR_COSECHA" | "REGISTRAR_LABOR" | "CREAR_PEDIDO" | "CONSULTA_DOSIS" | "CONSULTA_INVENTARIO" | "CONSULTA_LABORES" | "CONSULTA_VENTAS" | "CONSULTA_ALERTAS" | "AYUDA",
  "loteNumero": number | null,
  "cultivoNombre": string | null,
  "cantidadKg": number | null,
  "tipoLabor": "RIEGO" | "SIEMBRA" | "PODA" | "FERTILIZACION" | "DESHIERBE" | "MANTENIMIENTO" | "OTRO" | null,
  "tituloLabor": string | null,
  "clienteNombre": string | null
}`;

  try {
    if (process.env.GROQ_API_KEY) {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: texto }
          ]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (raw) return { provider: 'GROQ', parsed: JSON.parse(raw) };
      }
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: texto }]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const raw = data?.content?.[0]?.text;
        const match = raw && raw.match(/\{[\s\S]*\}/);
        if (match) return { provider: 'ANTHROPIC', parsed: JSON.parse(match[0]) };
      }
    }
  } catch (err) {
    console.warn('[LLM Fallback] Usando motor NLP local:', err.message);
  }
  return null;
}

/**
 * Motor NLP local determinista en español (funciona siempre, sin costo y 100% predecible en tests/demo).
 */
function parseLocalIntent(texto, lotes, cultivos) {
  const norm = normalizeText(texto);

  // 1. Guardrail estricto: consulta de dosis / agroquímicos
  if (AGROCHEMICAL_DOSE_REGEX.test(texto)) {
    return { intent: 'CONSULTA_DOSIS' };
  }

  // Extraer número de lote (ej. "lote 2", "l-02", "lote 1")
  const loteMatch = norm.match(/lote\s*#?\s*0?(\d+)|l-0?(\d+)/);
  const loteNumero = loteMatch ? Number(loteMatch[1] || loteMatch[2]) : null;

  // Extraer cantidad en kg
  const kgMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilogramos?)/);
  const cantidadKg = kgMatch ? Number(kgMatch[1].replace(',', '.')) : null;

  // Buscar cultivo mencionado
  const cultivoMatch = cultivos.find((c) => norm.includes(normalizeText(c.nombre)));
  const cultivoNombre = cultivoMatch ? cultivoMatch.nombre : null;

  // 2. Registrar cosecha
  if (/(cosech|recolect)/.test(norm) && (cantidadKg || loteNumero || cultivoNombre)) {
    return {
      intent: 'REGISTRAR_COSECHA',
      loteNumero,
      cultivoNombre,
      cantidadKg: cantidadKg || 20
    };
  }

  // 3. Crear pedido / venta de cliente
  if (/(pedido|encarg|comprar|solicito|quiero\s+\d+)/.test(norm)) {
    return {
      intent: 'CREAR_PEDIDO',
      cultivoNombre,
      cantidadKg: cantidadKg || 15
    };
  }

  // 4. Registrar labor
  if (/(registr|anota|agreg|program|hicimos|terminamos|realizamos|riego|regamos|poda|podamos|deshierb|fertiliz|siembr)/.test(norm)) {
    let tipoLabor = 'OTRO';
    if (/(riego|regamos|regar)/.test(norm)) tipoLabor = 'RIEGO';
    else if (/(poda|podar)/.test(norm)) tipoLabor = 'PODA';
    else if (/(fertiliz|abono|abonar|compost)/.test(norm)) tipoLabor = 'FERTILIZACION';
    else if (/(deshierb|maleza|limpieza)/.test(norm)) tipoLabor = 'DESHIERBE';
    else if (/(siembr|sembrar|trasplant)/.test(norm)) tipoLabor = 'SIEMBRA';
    else if (/(mantenim|repar)/.test(norm)) tipoLabor = 'MANTENIMIENTO';

    if (tipoLabor !== 'OTRO' || loteNumero) {
      return {
        intent: 'REGISTRAR_LABOR',
        loteNumero: loteNumero || 1,
        tipoLabor,
        tituloLabor: texto.trim().slice(0, 90)
      };
    }
  }

  // 5. Consultas de estado
  if (/(inventario|stock|insumo|falta|minimo)/.test(norm)) return { intent: 'CONSULTA_INVENTARIO' };
  if (/(labor|tarea|pendiente|campo|que hay para hoy)/.test(norm)) return { intent: 'CONSULTA_LABORES' };
  if (/(venta|ingreso|cobrar|cliente|factur)/.test(norm)) return { intent: 'CONSULTA_VENTAS' };
  if (/(alerta|carencia|fitosanit|riesgo|atencion)/.test(norm)) return { intent: 'CONSULTA_ALERTAS' };

  return { intent: 'AYUDA' };
}

/**
 * Ejecuta una confirmación pendiente aprobada con "SÍ".
 */
async function executePendingConfirmation(confirmacion) {
  const payload = JSON.parse(confirmacion.payloadJson);
  const fincaId = confirmacion.fincaId;

  if (confirmacion.accion === 'REGISTRAR_COSECHA') {
    const now = new Date();
    // Revalidar período de carencia antes de guardar
    const carenciaActiva = await prisma.aplicacionFitosanitaria.findFirst({
      where: { fincaId, loteId: payload.loteId, fechaFinCarencia: { gt: now } },
      orderBy: { fechaFinCarencia: 'desc' }
    });
    if (carenciaActiva) {
      await prisma.confirmacionPendiente.update({ where: { id: confirmacion.id }, data: { estado: 'CANCELADA' } });
      return `⛔ Bloqueo sanitario: no se pudo guardar la cosecha porque el lote está en período de carencia por ${carenciaActiva.producto} hasta el ${new Date(carenciaActiva.fechaFinCarencia).toLocaleDateString('es-BO')}.`;
    }

    const [lote, cultivo, totalPrevias] = await Promise.all([
      prisma.lote.findUnique({ where: { id: payload.loteId } }),
      prisma.cultivo.findUnique({ where: { id: payload.cultivoId } }),
      prisma.cosecha.count({ where: { fincaId } })
    ]);

    const loteSlug = lote.codigo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const codigoTrazabilidad = `AGRO-${now.getFullYear()}-${loteSlug}-${String(totalPrevias + 1).padStart(3, '0')}`;

    const cosecha = await prisma.cosecha.create({
      data: {
        fincaId,
        loteId: lote.id,
        cultivoId: cultivo.id,
        fecha: now,
        cantidadKg: payload.cantidadKg,
        calidad: 'PRIMERA',
        codigoTrazabilidad,
        carenciaVerificada: true,
        observaciones: 'Registrado por Agente IA vía WhatsApp con confirmación del encargado.',
        origen: 'WHATSAPP_IA'
      }
    });

    // Sincronizar stock en inventario
    const nombreProd = `${cultivo.nombre} ${cultivo.variedad} (Cosechado)`;
    let insumo = await prisma.insumo.findFirst({
      where: { fincaId, nombre: nombreProd, categoria: 'COSECHADO' }
    });
    if (!insumo) {
      insumo = await prisma.insumo.create({
        data: {
          fincaId,
          nombre: nombreProd,
          categoria: 'COSECHADO',
          unidad: 'kg',
          stockActual: payload.cantidadKg,
          stockMinimo: 20,
          costoUnitario: cultivo.precioRefKg * 0.55,
          loteOrigenCodigo: codigoTrazabilidad
        }
      });
    } else {
      await prisma.insumo.update({
        where: { id: insumo.id },
        data: { stockActual: { increment: payload.cantidadKg }, loteOrigenCodigo: codigoTrazabilidad }
      });
    }

    await prisma.movimientoInventario.create({
      data: {
        fincaId,
        insumoId: insumo.id,
        loteId: lote.id,
        tipo: 'ENTRADA',
        cantidad: payload.cantidadKg,
        costoTotal: payload.cantidadKg * cultivo.precioRefKg * 0.55,
        motivo: `Ingreso WhatsApp IA (${codigoTrazabilidad})`
      }
    });

    await prisma.confirmacionPendiente.update({ where: { id: confirmacion.id }, data: { estado: 'CONFIRMADA' } });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    return `✅ ¡Cosecha guardada con éxito!\n• Producto: ${cultivo.nombre} (${payload.cantidadKg} kg)\n• Origen: ${lote.nombre}\n• Código QR: ${cosecha.codigoTrazabilidad}\n• Ficha trazabilidad: ${frontendUrl}/trazabilidad/${cosecha.codigoTrazabilidad}\n• Inventario actualizado automáticamente.`;
  }

  if (confirmacion.accion === 'REGISTRAR_LABOR') {
    const labor = await prisma.labor.create({
      data: {
        fincaId,
        loteId: payload.loteId,
        tipo: payload.tipoLabor,
        titulo: payload.tituloLabor,
        descripcion: 'Registrado vía Agente IA WhatsApp con confirmación previa.',
        fechaProgramada: new Date(),
        estado: 'PENDIENTE',
        origen: 'WHATSAPP_IA'
      },
      include: { lote: true }
    });

    await prisma.confirmacionPendiente.update({ where: { id: confirmacion.id }, data: { estado: 'CONFIRMADA' } });
    return `✅ ¡Labor registrada!\n• Tipo: ${labor.tipo}\n• Lote: ${labor.lote.nombre}\n• Detalle: ${labor.titulo}\n• Estado: PENDIENTE (visible ya en el CRM).`;
  }

  if (confirmacion.accion === 'CREAR_PEDIDO') {
    const countVentas = await prisma.venta.count({ where: { fincaId } });
    const numeroFactura = `VTA-${new Date().getFullYear()}-${String(countVentas + 1).padStart(4, '0')}`;
    const subtotal = Number((payload.cantidadKg * payload.precioUnitario).toFixed(2));

    const venta = await prisma.venta.create({
      data: {
        fincaId,
        clienteId: payload.clienteId,
        numeroFactura,
        total: subtotal,
        montoPagado: 0,
        saldoPendiente: subtotal,
        estadoPago: 'PENDIENTE',
        observaciones: 'Pedido recibido por WhatsApp con confirmación previa.',
        origen: 'WHATSAPP_IA',
        detalles: {
          create: [
            {
              cosechaId: payload.cosechaId || null,
              descripcionProducto: payload.descripcionProducto,
              cantidad: payload.cantidadKg,
              unidad: 'kg',
              precioUnitario: payload.precioUnitario,
              subtotal,
              codigoTrazabilidad: payload.codigoTrazabilidad || null
            }
          ]
        }
      },
      include: { cliente: true }
    });

    await prisma.confirmacionPendiente.update({ where: { id: confirmacion.id }, data: { estado: 'CONFIRMADA' } });
    return `✅ ¡Pedido registrado como venta pendiente!\n• N.º: ${venta.numeroFactura}\n• Cliente: ${venta.cliente.nombre}\n• Producto: ${payload.descripcionProducto} (${payload.cantidadKg} kg)\n• Total: Bs ${venta.total.toFixed(2)}`;
  }

  return '⚠️ No se reconoció la acción pendiente.';
}

/**
 * Procesa cualquier mensaje entrante (desde Simulador Web, Meta Cloud API o Twilio).
 */
async function processIncomingMessage({ fincaId, telefono, texto, canal = 'SIMULADOR' }) {
  const cleanText = String(texto || '').trim();

  // Guardar mensaje entrante
  await prisma.mensajeWhatsApp.create({
    data: {
      fincaId,
      telefono,
      direccion: 'ENTRANTE',
      contenido: cleanText,
      proveedor: canal
    }
  });

  // 1. Verificar si existe una confirmación pendiente activa para este teléfono
  const pending = await prisma.confirmacionPendiente.findFirst({
    where: {
      fincaId,
      telefono,
      estado: 'PENDIENTE',
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (pending && AFFIRMATIVE_REGEX.test(cleanText)) {
    const reply = await executePendingConfirmation(pending);
    await sendOutboundWhatsApp(fincaId, telefono, reply, 'CONFIRMACION_OK');
    return { reply, intent: 'CONFIRMACION_OK', motor: 'SISTEMA', requiresConfirmation: false };
  }

  if (pending && NEGATIVE_REGEX.test(cleanText)) {
    await prisma.confirmacionPendiente.update({
      where: { id: pending.id },
      data: { estado: 'CANCELADA' }
    });
    const reply = '❌ Operación cancelada. No se guardó ningún dato en el sistema.';
    await sendOutboundWhatsApp(fincaId, telefono, reply, 'CONFIRMACION_CANCELADA');
    return { reply, intent: 'CONFIRMACION_CANCELADA', motor: 'SISTEMA', requiresConfirmation: false };
  }

  // 2. Cargar contexto de finca
  const [lotes, cultivos] = await Promise.all([
    prisma.lote.findMany({ where: { fincaId, activo: true }, orderBy: { codigo: 'asc' } }),
    prisma.cultivo.findMany({ where: { fincaId, activo: true } })
  ]);

  // 3. Guardrail prioritario de seguridad agronómica (incluso antes del LLM externo)
  let parsed = null;
  let motor = 'NLP_LOCAL';

  if (AGROCHEMICAL_DOSE_REGEX.test(cleanText)) {
    parsed = { intent: 'CONSULTA_DOSIS' };
    motor = 'GUARDRAIL_AGRONOMICO';
  } else {
    const llmResult = await callExternalLLM(cleanText, lotes, cultivos);
    if (llmResult) {
      parsed = llmResult.parsed;
      motor = llmResult.provider;
    } else {
      parsed = parseLocalIntent(cleanText, lotes, cultivos);
    }
  }

  let reply = '';
  let requiresConfirmation = false;

  // === MANEJO POR INTENCIÓN ===
  if (parsed.intent === 'CONSULTA_DOSIS') {
    const norm = normalizeText(cleanText);
    const insumosAgro = await prisma.insumo.findMany({
      where: { fincaId, categoria: { in: ['AGROQUIMICO', 'FERTILIZANTE'] } }
    });

    const encontrados = insumosAgro.filter((ins) => {
      const palabras = normalizeText(ins.nombre).split(/\s+/).filter((p) => p.length > 3);
      return palabras.some((p) => norm.includes(p));
    });

    if (encontrados.length > 0) {
      const detalle = encontrados
        .map(
          (i) =>
            `• *${i.nombre}*:\n  - Etiqueta registrada: ${i.dosisEtiqueta || 'No registrada'}\n  - Carencia referencial: ${i.periodoCarenciaRef ?? 'Revisar etiqueta'} días`
        )
        .join('\n');

      reply = `⚠️ *Aviso agronómico obligatorio:* No reemplazo a un ingeniero agrónomo ni prescribo ni invento dosis.\n\nSolo puedo mostrarte la información de etiqueta registrada en tu inventario:\n${detalle}\n\nConsulta siempre la etiqueta física del envase y valida con un ingeniero agrónomo antes de aplicar.`;
    } else {
      reply = `⚠️ *Límite de seguridad agronómica:* No reemplazo al ingeniero agrónomo y **nunca invento dosis de agroquímicos**.\n\nNo encontré ese producto registrado en tu inventario con ficha de etiqueta. Por favor revisa la etiqueta oficial del fabricante y consulta a un ingeniero agrónomo certificado.`;
    }
  } else if (parsed.intent === 'REGISTRAR_COSECHA') {
    const lote =
      (parsed.loteNumero &&
        lotes.find((l) => l.codigo.endsWith(String(parsed.loteNumero)) || l.nombre.includes(`Lote ${parsed.loteNumero}`))) ||
      lotes[0];
    const cultivo =
      (parsed.cultivoNombre && cultivos.find((c) => normalizeText(c.nombre).includes(normalizeText(parsed.cultivoNombre)))) ||
      cultivos[0];
    const cantidadKg = Number(parsed.cantidadKg) || 20;

    // Verificar período de carencia desde ya para alertar antes de confirmar
    const carenciaActiva = await prisma.aplicacionFitosanitaria.findFirst({
      where: { fincaId, loteId: lote.id, fechaFinCarencia: { gt: new Date() } },
      orderBy: { fechaFinCarencia: 'desc' }
    });

    if (carenciaActiva) {
      reply = `⛔ *Alerta de Período de Carencia:* No se puede registrar cosecha en *${lote.nombre}*.\nSe aplicó *${carenciaActiva.producto}* y el período de carencia vence el *${new Date(carenciaActiva.fechaFinCarencia).toLocaleDateString('es-BO')}*.\nEspera a cumplir la carencia por seguridad alimentaria.`;
    } else {
      const resumenTexto = `Cosecha de ${cantidadKg} kg de ${cultivo.nombre} (${cultivo.variedad}) en ${lote.nombre}`;
      await prisma.confirmacionPendiente.create({
        data: {
          fincaId,
          telefono,
          canal,
          accion: 'REGISTRAR_COSECHA',
          payloadJson: JSON.stringify({ loteId: lote.id, cultivoId: cultivo.id, cantidadKg }),
          resumenTexto,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });
      requiresConfirmation = true;
      reply = `📝 Entendí el siguiente registro de *COSECHA*:\n• Cultivo: ${cultivo.nombre} (${cultivo.variedad})\n• Cantidad: ${cantidadKg} kg\n• Lote: ${lote.nombre} (${lote.codigo})\n• Período de carencia: ✅ Verificado sin restricciones\n\n¿Confirmas guardar este registro y generar su código QR? Responde *SÍ* o *NO*.`;
    }
  } else if (parsed.intent === 'REGISTRAR_LABOR') {
    const lote =
      (parsed.loteNumero &&
        lotes.find((l) => l.codigo.endsWith(String(parsed.loteNumero)) || l.nombre.includes(`Lote ${parsed.loteNumero}`))) ||
      lotes[0];
    const tipoLabor = parsed.tipoLabor || 'MANTENIMIENTO';
    const tituloLabor = parsed.tituloLabor || `${tipoLabor} en ${lote.nombre}`;

    await prisma.confirmacionPendiente.create({
      data: {
        fincaId,
        telefono,
        canal,
        accion: 'REGISTRAR_LABOR',
        payloadJson: JSON.stringify({ loteId: lote.id, tipoLabor, tituloLabor }),
        resumenTexto: `Labor ${tipoLabor} en ${lote.nombre}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });
    requiresConfirmation = true;
    reply = `🛠️ Entendí esta *LABOR DE CAMPO*:\n• Tipo: ${tipoLabor}\n• Lote: ${lote.nombre}\n• Descripción: ${tituloLabor}\n\n¿Confirmas guardarla en el calendario de campo? Responde *SÍ* o *NO*.`;
  } else if (parsed.intent === 'CREAR_PEDIDO') {
    const [clientes, cosechas] = await Promise.all([
      prisma.cliente.findMany({ where: { fincaId } }),
      prisma.cosecha.findMany({ where: { fincaId }, include: { cultivo: true, lote: true }, orderBy: { fecha: 'desc' } })
    ]);
    const cliente =
      clientes.find((c) => normalizeText(cleanText).includes(normalizeText(c.nombre.split(' ')[0]))) || clientes[0];
    const cultivo =
      (parsed.cultivoNombre && cultivos.find((c) => normalizeText(c.nombre).includes(normalizeText(parsed.cultivoNombre)))) ||
      cultivos[0];
    const cosechaReciente = cosechas.find((cs) => cs.cultivoId === cultivo.id);
    const cantidadKg = Number(parsed.cantidadKg) || 15;

    if (!cliente) {
      reply = '⚠️ No hay clientes registrados en la finca todavía.';
    } else {
      await prisma.confirmacionPendiente.create({
        data: {
          fincaId,
          telefono,
          canal,
          accion: 'CREAR_PEDIDO',
          payloadJson: JSON.stringify({
            clienteId: cliente.id,
            cosechaId: cosechaReciente?.id || null,
            codigoTrazabilidad: cosechaReciente?.codigoTrazabilidad || null,
            descripcionProducto: `${cultivo.nombre} ${cultivo.variedad}`,
            cantidadKg,
            precioUnitario: cultivo.precioRefKg
          }),
          resumenTexto: `Pedido ${cantidadKg} kg ${cultivo.nombre} para ${cliente.nombre}`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });
      requiresConfirmation = true;
      reply = `🛒 Entendí este *PEDIDO DE CLIENTE*:\n• Cliente: ${cliente.nombre}\n• Producto: ${cultivo.nombre} (${cantidadKg} kg)\n• Precio ref.: Bs ${cultivo.precioRefKg}/kg (Total Bs ${(cantidadKg * cultivo.precioRefKg).toFixed(2)})\n${cosechaReciente ? `• Trazabilidad: ${cosechaReciente.codigoTrazabilidad}\n` : ''}\n¿Confirmas registrar este pedido? Responde *SÍ* o *NO*.`;
    }
  } else if (parsed.intent === 'CONSULTA_INVENTARIO') {
    const insumos = await prisma.insumo.findMany({ where: { fincaId } });
    const bajos = insumos.filter((i) => i.stockActual <= i.stockMinimo);
    if (bajos.length === 0) {
      reply = `📦 *Inventario al día:* Todos los ${insumos.length} insumos están por encima de su stock mínimo.`;
    } else {
      const lista = bajos.map((i) => `• ${i.nombre}: *${i.stockActual} ${i.unidad}* (mín. ${i.stockMinimo})`).join('\n');
      reply = `⚠️ *Alerta de stock mínimo (${bajos.length} ítems):*\n${lista}`;
    }
  } else if (parsed.intent === 'CONSULTA_LABORES') {
    const pendientes = await prisma.labor.findMany({
      where: { fincaId, estado: { not: 'COMPLETADA' } },
      include: { lote: true },
      orderBy: { fechaProgramada: 'asc' },
      take: 6
    });
    if (pendientes.length === 0) {
      reply = '✅ No hay labores pendientes en este momento.';
    } else {
      const lista = pendientes.map((l) => `• [${l.estado}] ${l.titulo} (${l.lote.codigo})`).join('\n');
      reply = `📋 *Labores pendientes (${pendientes.length}):*\n${lista}`;
    }
  } else if (parsed.intent === 'CONSULTA_VENTAS') {
    const ventas = await prisma.venta.findMany({ where: { fincaId } });
    const total = ventas.reduce((a, v) => a + v.total, 0);
    const cobrar = ventas.reduce((a, v) => a + v.saldoPendiente, 0);
    reply = `💰 *Resumen de Ventas:*\n• Ventas registradas: ${ventas.length}\n• Ingresos totales: Bs ${total.toFixed(2)}\n• Cuentas por cobrar: Bs ${cobrar.toFixed(2)}`;
  } else if (parsed.intent === 'CONSULTA_ALERTAS') {
    const now = new Date();
    const [carencias, insumos] = await Promise.all([
      prisma.aplicacionFitosanitaria.findMany({
        where: { fincaId, fechaFinCarencia: { gt: now } },
        include: { lote: true }
      }),
      prisma.insumo.findMany({ where: { fincaId } })
    ]);
    const stockBajo = insumos.filter((i) => i.stockActual <= i.stockMinimo);
    reply = `🔔 *Alertas activas de la finca:*\n• Carencias fitosanitarias vigentes: ${carencias.length}${carencias.map((c) => `\n  - ${c.lote.nombre}: ${c.producto} (hasta ${new Date(c.fechaFinCarencia).toLocaleDateString('es-BO')})`).join('')}\n• Insumos en stock mínimo: ${stockBajo.length}${stockBajo.map((i) => `\n  - ${i.nombre}: ${i.stockActual}/${i.stockMinimo} ${i.unidad}`).join('')}`;
  } else {
    reply = `🌿 *AgroBot — Asistente IA de Finca:*\nPuedes escribirme cosas como:\n1. *"Hoy cosechamos 40 kg de tomate del lote 2"*\n2. *"Registra riego en lote 1"*\n3. *"Pedido de 25 kg de lechuga para Mercado Orgánico"*\n4. *"¿Qué insumos tienen stock bajo?"*\n5. *"¿Qué labores están pendientes?"*\n6. *"¿Cómo van las ventas?"*\n\n⚠️ *Límites:* Siempre pediré confirmación antes de guardar y nunca invento dosis de agroquímicos.`;
  }

  await sendOutboundWhatsApp(fincaId, telefono, reply, parsed.intent);

  return {
    reply,
    intent: parsed.intent,
    motor,
    requiresConfirmation
  };
}

module.exports = {
  processIncomingMessage,
  sendOutboundWhatsApp
};
