const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// === FINCA ===
router.get('/finca', async (req, res, next) => {
  try {
    const finca = await prisma.finca.findUnique({
      where: { id: req.user.fincaId },
      include: { modulos: { orderBy: { codigo: 'asc' } } }
    });
    res.json(finca);
  } catch (err) {
    next(err);
  }
});

router.put('/finca', authorizeRoles('PROPIETARIO'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().min(2),
      ubicacion: z.string().min(2),
      hectareasTotales: z.coerce.number().positive(),
      telefonoWhatsApp: z.string().optional().nullable(),
      descripcion: z.string().optional().nullable()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const finca = await prisma.finca.update({
      where: { id: req.user.fincaId },
      data: parsed.data
    });
    res.json(finca);
  } catch (err) {
    next(err);
  }
});

// === MÓDULOS ACTIVABLES POR FINCA ===
router.get('/modulos', async (req, res, next) => {
  try {
    const modulos = await prisma.moduloActivo.findMany({
      where: { fincaId: req.user.fincaId },
      orderBy: { codigo: 'asc' }
    });
    res.json(modulos);
  } catch (err) {
    next(err);
  }
});

router.patch('/modulos/:codigo', authorizeRoles('PROPIETARIO'), async (req, res, next) => {
  try {
    const codigo = req.params.codigo.toUpperCase();
    if (codigo === 'M0') {
      return res.status(400).json({ error: 'El módulo núcleo (M0) no puede desactivarse.' });
    }
    const { activo } = req.body;
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'El campo "activo" debe ser booleano.' });
    }

    const updated = await prisma.moduloActivo.update({
      where: {
        fincaId_codigo: { fincaId: req.user.fincaId, codigo }
      },
      data: { activo }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// === USUARIOS Y ROLES ===
router.get('/usuarios', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { fincaId: req.user.fincaId },
      select: { id: true, nombre: true, email: true, rol: true, telefono: true, activo: true, createdAt: true },
      orderBy: { id: 'asc' }
    });
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

router.post('/usuarios', authorizeRoles('PROPIETARIO'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      rol: z.enum(['PROPIETARIO', 'ENCARGADO', 'TRABAJADOR']),
      telefono: z.string().optional().nullable()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const exists = await prisma.usuario.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const created = await prisma.usuario.create({
      data: {
        fincaId: req.user.fincaId,
        nombre: parsed.data.nombre,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        rol: parsed.data.rol,
        telefono: parsed.data.telefono || null
      },
      select: { id: true, nombre: true, email: true, rol: true, telefono: true, activo: true, createdAt: true }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// === LOTES ===
router.get('/lotes', async (req, res, next) => {
  try {
    const lotes = await prisma.lote.findMany({
      where: { fincaId: req.user.fincaId, activo: true },
      include: {
        campanas: { where: { estado: 'ACTIVA' }, include: { cultivo: true } },
        _count: { select: { labores: true, cosechas: true, aplicaciones: true } }
      },
      orderBy: { codigo: 'asc' }
    });
    res.json(lotes);
  } catch (err) {
    next(err);
  }
});

router.post('/lotes', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      codigo: z.string().min(2),
      nombre: z.string().min(2),
      sector: z.string().default('Campos Norte'),
      areaHectareas: z.coerce.number().positive(),
      tipoSuelo: z.string().default('Franco-arcilloso'),
      humedadPct: z.coerce.number().int().min(0).max(100).default(65),
      nivelN: z.coerce.number().int().min(0).max(100).default(22),
      nivelP: z.coerce.number().int().min(0).max(100).default(11),
      nivelK: z.coerce.number().int().min(0).max(100).default(18),
      saludPct: z.coerce.number().int().min(0).max(100).default(88),
      estado: z.enum(['SALUDABLE', 'ATENCION', 'CRITICO']).default('SALUDABLE'),
      latitud: z.coerce.number().default(-16.645),
      longitud: z.coerce.number().default(-68.122)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const { latitud, longitud } = parsed.data;
    const poligonoJson = JSON.stringify([
      [latitud + 0.0008, longitud - 0.0012],
      [latitud + 0.0008, longitud + 0.0012],
      [latitud - 0.0008, longitud + 0.0012],
      [latitud - 0.0008, longitud - 0.0012]
    ]);

    const created = await prisma.lote.create({
      data: {
        ...parsed.data,
        fincaId: req.user.fincaId,
        poligonoJson
      }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/lotes/:id', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nombre, sector, areaHectareas, tipoSuelo, humedadPct, nivelN, nivelP, nivelK, saludPct, estado } = req.body;
    const updated = await prisma.lote.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(sector !== undefined && { sector }),
        ...(areaHectareas !== undefined && { areaHectareas: Number(areaHectareas) }),
        ...(tipoSuelo !== undefined && { tipoSuelo }),
        ...(humedadPct !== undefined && { humedadPct: Number(humedadPct) }),
        ...(nivelN !== undefined && { nivelN: Number(nivelN) }),
        ...(nivelP !== undefined && { nivelP: Number(nivelP) }),
        ...(nivelK !== undefined && { nivelK: Number(nivelK) }),
        ...(saludPct !== undefined && { saludPct: Number(saludPct) }),
        ...(estado !== undefined && { estado })
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// === CULTIVOS ===
router.get('/cultivos', async (req, res, next) => {
  try {
    const cultivos = await prisma.cultivo.findMany({
      where: { fincaId: req.user.fincaId, activo: true },
      orderBy: { nombre: 'asc' }
    });
    res.json(cultivos);
  } catch (err) {
    next(err);
  }
});

router.post('/cultivos', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().min(2),
      variedad: z.string().min(2),
      categoria: z.string().default('Hortaliza'),
      cicloDias: z.coerce.number().int().positive().default(90),
      precioRefKg: z.coerce.number().positive().default(10)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const created = await prisma.cultivo.create({
      data: { ...parsed.data, fincaId: req.user.fincaId }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// === CAMPAÑAS ===
router.get('/campanas', async (req, res, next) => {
  try {
    const campanas = await prisma.campana.findMany({
      where: { fincaId: req.user.fincaId },
      include: { lote: true, cultivo: true },
      orderBy: { fechaInicio: 'desc' }
    });
    res.json(campanas);
  } catch (err) {
    next(err);
  }
});

router.post('/campanas', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      loteId: z.coerce.number().int().positive(),
      cultivoId: z.coerce.number().int().positive(),
      nombre: z.string().min(2),
      fechaInicio: z.string(),
      fechaFinEstimada: z.string().optional().nullable(),
      plantasEstimadas: z.coerce.number().int().positive().default(1000)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const created = await prisma.campana.create({
      data: {
        fincaId: req.user.fincaId,
        loteId: parsed.data.loteId,
        cultivoId: parsed.data.cultivoId,
        nombre: parsed.data.nombre,
        fechaInicio: new Date(parsed.data.fechaInicio),
        fechaFinEstimada: parsed.data.fechaFinEstimada ? new Date(parsed.data.fechaFinEstimada) : null,
        plantasEstimadas: parsed.data.plantasEstimadas
      },
      include: { lote: true, cultivo: true }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
