const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { requireModule } = require('../middleware/moduleGuard');

const router = express.Router();

router.use(authenticate, requireModule('M3'));

router.get('/', async (req, res, next) => {
  try {
    const trabajadores = await prisma.trabajador.findMany({
      where: { fincaId: req.user.fincaId, activo: true },
      include: {
        labores: { where: { estado: { not: 'COMPLETADA' } }, include: { lote: true } },
        asistencias: { orderBy: { fecha: 'desc' }, take: 5 },
        jornales: { orderBy: { fecha: 'desc' }, take: 10 }
      },
      orderBy: { nombre: 'asc' }
    });
    res.json(trabajadores);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().min(2),
      ci: z.string().min(4),
      telefono: z.string().optional().nullable(),
      cargo: z.string().default('Operario de Campo'),
      tarifaJornal: z.coerce.number().positive().default(120),
      consentimientoWhatsApp: z.boolean().default(true)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const created = await prisma.trabajador.create({
      data: { ...parsed.data, fincaId: req.user.fincaId }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// === ASISTENCIAS ===
router.get('/asistencias', async (req, res, next) => {
  try {
    const asistencias = await prisma.asistencia.findMany({
      where: { trabajador: { fincaId: req.user.fincaId } },
      include: { trabajador: true },
      orderBy: { fecha: 'desc' },
      take: 60
    });
    res.json(asistencias);
  } catch (err) {
    next(err);
  }
});

router.post('/asistencias', async (req, res, next) => {
  try {
    const schema = z.object({
      trabajadorId: z.coerce.number().int().positive(),
      fecha: z.string().optional(),
      presente: z.boolean().default(true),
      horaEntrada: z.string().default('07:00'),
      horaSalida: z.string().default('15:30'),
      observaciones: z.string().optional().nullable()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const created = await prisma.asistencia.create({
      data: {
        trabajadorId: parsed.data.trabajadorId,
        fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : new Date(),
        presente: parsed.data.presente,
        horaEntrada: parsed.data.horaEntrada,
        horaSalida: parsed.data.horaSalida,
        observaciones: parsed.data.observaciones || null
      },
      include: { trabajador: true }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// === JORNALES Y PAGOS ===
router.get('/jornales', async (req, res, next) => {
  try {
    const jornales = await prisma.jornal.findMany({
      where: { fincaId: req.user.fincaId },
      include: { trabajador: true, lote: true },
      orderBy: { fecha: 'desc' }
    });
    res.json(jornales);
  } catch (err) {
    next(err);
  }
});

router.post('/jornales', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      trabajadorId: z.coerce.number().int().positive(),
      loteId: z.coerce.number().int().positive().optional().nullable(),
      fecha: z.string().optional(),
      cantidadJornales: z.coerce.number().positive().default(1),
      tarifaUnitaria: z.coerce.number().positive().optional(),
      descripcion: z.string().optional().nullable(),
      pagado: z.boolean().default(false)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const trab = await prisma.trabajador.findUnique({ where: { id: parsed.data.trabajadorId } });
    if (!trab) return res.status(404).json({ error: 'Trabajador no encontrado.' });

    const tarifa = parsed.data.tarifaUnitaria || trab.tarifaJornal;
    const montoTotal = Number((parsed.data.cantidadJornales * tarifa).toFixed(2));

    const created = await prisma.jornal.create({
      data: {
        fincaId: req.user.fincaId,
        trabajadorId: parsed.data.trabajadorId,
        loteId: parsed.data.loteId || null,
        fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : new Date(),
        cantidadJornales: parsed.data.cantidadJornales,
        tarifaUnitaria: tarifa,
        montoTotal,
        pagado: parsed.data.pagado,
        fechaPago: parsed.data.pagado ? new Date() : null,
        descripcion: parsed.data.descripcion || null
      },
      include: { trabajador: true, lote: true }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch('/jornales/:id/pagar', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.jornal.update({
      where: { id },
      data: { pagado: true, fechaPago: new Date() },
      include: { trabajador: true, lote: true }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
