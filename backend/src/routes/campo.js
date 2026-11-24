const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { requireModule } = require('../middleware/moduleGuard');

const router = express.Router();

router.use(authenticate, requireModule('M1'));

// === LABORES Y RIEGO ===
router.get('/labores', async (req, res, next) => {
  try {
    const { estado, loteId } = req.query;
    const where = {
      fincaId: req.user.fincaId,
      ...(estado ? { estado } : {}),
      ...(loteId ? { loteId: Number(loteId) } : {})
    };
    const labores = await prisma.labor.findMany({
      where,
      include: { lote: true, trabajador: true, campana: { include: { cultivo: true } } },
      orderBy: { fechaProgramada: 'desc' }
    });
    res.json(labores);
  } catch (err) {
    next(err);
  }
});

router.post('/labores', async (req, res, next) => {
  try {
    const schema = z.object({
      loteId: z.coerce.number().int().positive(),
      campanaId: z.coerce.number().int().positive().optional().nullable(),
      trabajadorId: z.coerce.number().int().positive().optional().nullable(),
      tipo: z.enum(['RIEGO', 'SIEMBRA', 'PODA', 'FERTILIZACION', 'DESHIERBE', 'MANTENIMIENTO', 'COSECHA', 'OTRO']),
      titulo: z.string().min(2),
      descripcion: z.string().optional().nullable(),
      fechaProgramada: z.string(),
      estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'COMPLETADA']).default('PENDIENTE'),
      costoEstimado: z.coerce.number().min(0).default(0)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const created = await prisma.labor.create({
      data: {
        fincaId: req.user.fincaId,
        loteId: parsed.data.loteId,
        campanaId: parsed.data.campanaId || null,
        trabajadorId: parsed.data.trabajadorId || null,
        tipo: parsed.data.tipo,
        titulo: parsed.data.titulo,
        descripcion: parsed.data.descripcion || null,
        fechaProgramada: new Date(parsed.data.fechaProgramada),
        fechaEjecucion: parsed.data.estado === 'COMPLETADA' ? new Date() : null,
        estado: parsed.data.estado,
        costoEstimado: parsed.data.costoEstimado,
        origen: 'WEB'
      },
      include: { lote: true, trabajador: true }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch('/labores/:id/estado', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;
    if (!['PENDIENTE', 'EN_PROCESO', 'COMPLETADA'].includes(estado)) {
      return res.status(400).json({ error: 'Estado de labor inválido.' });
    }
    const updated = await prisma.labor.update({
      where: { id },
      data: {
        estado,
        fechaEjecucion: estado === 'COMPLETADA' ? new Date() : null
      },
      include: { lote: true, trabajador: true }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// === APLICACIONES FITOSANITARIAS (con cálculo de período de carencia) ===
router.get('/aplicaciones', async (req, res, next) => {
  try {
    const now = new Date();
    const aplicaciones = await prisma.aplicacionFitosanitaria.findMany({
      where: { fincaId: req.user.fincaId },
      include: { lote: true, insumo: true },
      orderBy: { fechaAplicacion: 'desc' }
    });
    const enriched = aplicaciones.map((a) => ({
      ...a,
      carenciaActiva: new Date(a.fechaFinCarencia) > now,
      diasRestantesCarencia: Math.max(0, Math.ceil((new Date(a.fechaFinCarencia) - now) / 86400000))
    }));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

router.post('/aplicaciones', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      loteId: z.coerce.number().int().positive(),
      insumoId: z.coerce.number().int().positive().optional().nullable(),
      producto: z.string().min(2),
      ingredienteActivo: z.string().optional().nullable(),
      dosisAplicada: z.string().min(1),
      dosisEtiqueta: z.string().min(1),
      motivo: z.string().min(2),
      fechaAplicacion: z.string(),
      periodoCarenciaDias: z.coerce.number().int().min(0),
      aplicador: z.string().min(2),
      observaciones: z.string().optional().nullable()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const fechaApl = new Date(parsed.data.fechaAplicacion);
    const fechaFinCarencia = new Date(fechaApl.getTime() + parsed.data.periodoCarenciaDias * 86400000);

    const created = await prisma.aplicacionFitosanitaria.create({
      data: {
        fincaId: req.user.fincaId,
        loteId: parsed.data.loteId,
        insumoId: parsed.data.insumoId || null,
        producto: parsed.data.producto,
        ingredienteActivo: parsed.data.ingredienteActivo || null,
        dosisAplicada: parsed.data.dosisAplicada,
        dosisEtiqueta: parsed.data.dosisEtiqueta,
        motivo: parsed.data.motivo,
        fechaAplicacion: fechaApl,
        periodoCarenciaDias: parsed.data.periodoCarenciaDias,
        fechaFinCarencia,
        aplicador: parsed.data.aplicador,
        observaciones: parsed.data.observaciones || null
      },
      include: { lote: true }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// === COSECHAS (valida período de carencia + genera código trazabilidad + ingresa a inventario) ===
router.get('/cosechas', async (req, res, next) => {
  try {
    const cosechas = await prisma.cosecha.findMany({
      where: { fincaId: req.user.fincaId },
      include: { lote: true, cultivo: true, campana: true },
      orderBy: { fecha: 'desc' }
    });
    res.json(cosechas);
  } catch (err) {
    next(err);
  }
});

router.post('/cosechas', async (req, res, next) => {
  try {
    const schema = z.object({
      loteId: z.coerce.number().int().positive(),
      cultivoId: z.coerce.number().int().positive(),
      campanaId: z.coerce.number().int().positive().optional().nullable(),
      fecha: z.string().optional(),
      cantidadKg: z.coerce.number().positive(),
      calidad: z.enum(['PRIMERA', 'SEGUNDA', 'EXPORTACION']).default('PRIMERA'),
      observaciones: z.string().optional().nullable()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const fechaCosecha = parsed.data.fecha ? new Date(parsed.data.fecha) : new Date();

    // Validación ética y sanitaria obligatoria: respetar período de carencia
    const carenciaActiva = await prisma.aplicacionFitosanitaria.findFirst({
      where: {
        fincaId: req.user.fincaId,
        loteId: parsed.data.loteId,
        fechaFinCarencia: { gt: fechaCosecha }
      },
      orderBy: { fechaFinCarencia: 'desc' }
    });

    if (carenciaActiva) {
      return res.status(422).json({
        error: `Bloqueo sanitario: este lote se encuentra en período de carencia por "${carenciaActiva.producto}" hasta el ${new Date(carenciaActiva.fechaFinCarencia).toLocaleDateString('es-BO')}. No se permite cosechar antes de esa fecha.`,
        carenciaActiva: true,
        fechaFinCarencia: carenciaActiva.fechaFinCarencia
      });
    }

    const [lote, cultivo, totalPrevias] = await Promise.all([
      prisma.lote.findUnique({ where: { id: parsed.data.loteId } }),
      prisma.cultivo.findUnique({ where: { id: parsed.data.cultivoId } }),
      prisma.cosecha.count({ where: { fincaId: req.user.fincaId } })
    ]);

    if (!lote || !cultivo) {
      return res.status(404).json({ error: 'Lote o cultivo no encontrado.' });
    }

    const anio = fechaCosecha.getFullYear();
    const loteSlug = lote.codigo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const seq = String(totalPrevias + 1).padStart(3, '0');
    const codigoTrazabilidad = `AGRO-${anio}-${loteSlug}-${seq}`;

    const created = await prisma.cosecha.create({
      data: {
        fincaId: req.user.fincaId,
        loteId: parsed.data.loteId,
        cultivoId: parsed.data.cultivoId,
        campanaId: parsed.data.campanaId || null,
        fecha: fechaCosecha,
        cantidadKg: parsed.data.cantidadKg,
        calidad: parsed.data.calidad,
        codigoTrazabilidad,
        carenciaVerificada: true,
        observaciones: parsed.data.observaciones || null,
        origen: 'WEB'
      },
      include: { lote: true, cultivo: true }
    });

    // Sincronizar automáticamente como producto cosechado en Inventario (M4)
    const nombreProducto = `${cultivo.nombre} ${cultivo.variedad} (Cosechado)`;
    let insumoCosechado = await prisma.insumo.findFirst({
      where: { fincaId: req.user.fincaId, nombre: nombreProducto, categoria: 'COSECHADO' }
    });
    if (!insumoCosechado) {
      insumoCosechado = await prisma.insumo.create({
        data: {
          fincaId: req.user.fincaId,
          nombre: nombreProducto,
          categoria: 'COSECHADO',
          unidad: 'kg',
          stockActual: parsed.data.cantidadKg,
          stockMinimo: 20,
          costoUnitario: cultivo.precioRefKg * 0.55,
          loteOrigenCodigo: codigoTrazabilidad
        }
      });
    } else {
      await prisma.insumo.update({
        where: { id: insumoCosechado.id },
        data: {
          stockActual: { increment: parsed.data.cantidadKg },
          loteOrigenCodigo: codigoTrazabilidad
        }
      });
    }

    await prisma.movimientoInventario.create({
      data: {
        fincaId: req.user.fincaId,
        insumoId: insumoCosechado.id,
        loteId: lote.id,
        usuarioId: req.user.id,
        tipo: 'ENTRADA',
        cantidad: parsed.data.cantidadKg,
        costoTotal: parsed.data.cantidadKg * (cultivo.precioRefKg * 0.55),
        motivo: `Ingreso automático por cosecha ${codigoTrazabilidad}`
      }
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
