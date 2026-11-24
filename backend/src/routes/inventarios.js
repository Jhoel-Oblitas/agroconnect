const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { requireModule } = require('../middleware/moduleGuard');

const router = express.Router();

router.use(authenticate, requireModule('M4'));

router.get('/insumos', async (req, res, next) => {
  try {
    const { categoria } = req.query;
    const insumos = await prisma.insumo.findMany({
      where: {
        fincaId: req.user.fincaId,
        ...(categoria ? { categoria } : {})
      },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }]
    });

    const enriched = insumos.map((i) => ({
      ...i,
      alertaStockMinimo: i.stockActual <= i.stockMinimo
    }));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

router.post('/insumos', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().min(2),
      categoria: z.enum(['SEMILLA', 'FERTILIZANTE', 'AGROQUIMICO', 'HERRAMIENTA', 'COSECHADO']),
      unidad: z.string().min(1).default('kg'),
      stockActual: z.coerce.number().min(0).default(0),
      stockMinimo: z.coerce.number().min(0).default(5),
      costoUnitario: z.coerce.number().min(0).default(0),
      dosisEtiqueta: z.string().optional().nullable(),
      periodoCarenciaRef: z.coerce.number().int().min(0).optional().nullable()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const created = await prisma.insumo.create({
      data: {
        ...parsed.data,
        fincaId: req.user.fincaId
      }
    });
    res.status(201).json({ ...created, alertaStockMinimo: created.stockActual <= created.stockMinimo });
  } catch (err) {
    next(err);
  }
});

router.get('/movimientos', async (req, res, next) => {
  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      where: { fincaId: req.user.fincaId },
      include: { insumo: true, lote: true, usuario: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' },
      take: 80
    });
    res.json(movimientos);
  } catch (err) {
    next(err);
  }
});

router.post('/movimientos', async (req, res, next) => {
  try {
    const schema = z.object({
      insumoId: z.coerce.number().int().positive(),
      loteId: z.coerce.number().int().positive().optional().nullable(),
      tipo: z.enum(['ENTRADA', 'SALIDA']),
      cantidad: z.coerce.number().positive(),
      motivo: z.string().min(2)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const insumo = await prisma.insumo.findUnique({ where: { id: parsed.data.insumoId } });
    if (!insumo || insumo.fincaId !== req.user.fincaId) {
      return res.status(404).json({ error: 'Insumo no encontrado.' });
    }

    if (parsed.data.tipo === 'SALIDA' && insumo.stockActual < parsed.data.cantidad) {
      return res.status(400).json({
        error: `Stock insuficiente. Disponible: ${insumo.stockActual} ${insumo.unidad}.`
      });
    }

    const nuevoStock =
      parsed.data.tipo === 'ENTRADA'
        ? insumo.stockActual + parsed.data.cantidad
        : insumo.stockActual - parsed.data.cantidad;

    const costoTotal = Number((parsed.data.cantidad * insumo.costoUnitario).toFixed(2));

    const [movimiento, insumoActualizado] = await prisma.$transaction([
      prisma.movimientoInventario.create({
        data: {
          fincaId: req.user.fincaId,
          insumoId: insumo.id,
          loteId: parsed.data.loteId || null,
          usuarioId: req.user.id,
          tipo: parsed.data.tipo,
          cantidad: parsed.data.cantidad,
          costoTotal,
          motivo: parsed.data.motivo
        },
        include: { insumo: true, lote: true }
      }),
      prisma.insumo.update({
        where: { id: insumo.id },
        data: { stockActual: Number(nuevoStock.toFixed(2)) }
      })
    ]);

    res.status(201).json({
      movimiento,
      insumo: {
        ...insumoActualizado,
        alertaStockMinimo: insumoActualizado.stockActual <= insumoActualizado.stockMinimo
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
