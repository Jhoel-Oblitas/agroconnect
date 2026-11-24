const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { requireModule } = require('../middleware/moduleGuard');

const router = express.Router();

router.use(authenticate, requireModule('M6'));

router.get('/', async (req, res, next) => {
  try {
    const lotesVivero = await prisma.loteVivero.findMany({
      where: { fincaId: req.user.fincaId },
      orderBy: { fechaSiembra: 'desc' }
    });
    res.json(lotesVivero);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      especie: z.string().min(2),
      variedad: z.string().min(2),
      fechaSiembra: z.string(),
      cantidadSembrada: z.coerce.number().int().positive(),
      cantidadGerminada: z.coerce.number().int().min(0).default(0),
      precioUnitario: z.coerce.number().positive().default(1.5),
      observaciones: z.string().optional().nullable()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const count = await prisma.loteVivero.count({ where: { fincaId: req.user.fincaId } });
    const codigo = `VIV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const pct = Number(((parsed.data.cantidadGerminada / parsed.data.cantidadSembrada) * 100).toFixed(1));
    const estado = parsed.data.cantidadGerminada > 0 ? 'LISTO_VENTA' : 'GERMINANDO';

    const created = await prisma.loteVivero.create({
      data: {
        fincaId: req.user.fincaId,
        codigo,
        especie: parsed.data.especie,
        variedad: parsed.data.variedad,
        fechaSiembra: new Date(parsed.data.fechaSiembra),
        cantidadSembrada: parsed.data.cantidadSembrada,
        cantidadGerminada: parsed.data.cantidadGerminada,
        porcentajeGerminacion: pct,
        stockDisponible: parsed.data.cantidadGerminada,
        precioUnitario: parsed.data.precioUnitario,
        estado,
        observaciones: parsed.data.observaciones || null
      }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/germinacion', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const cantidadGerminada = Number(req.body.cantidadGerminada);
    const estado = req.body.estado;

    const lote = await prisma.loteVivero.findUnique({ where: { id } });
    if (!lote || lote.fincaId !== req.user.fincaId) {
      return res.status(404).json({ error: 'Lote de vivero no encontrado.' });
    }

    const pct = Number(Math.min(100, (cantidadGerminada / lote.cantidadSembrada) * 100).toFixed(1));
    const delta = cantidadGerminada - lote.cantidadGerminada;
    const nuevoStock = Math.max(0, lote.stockDisponible + delta);

    const updated = await prisma.loteVivero.update({
      where: { id },
      data: {
        cantidadGerminada,
        porcentajeGerminacion: pct,
        stockDisponible: nuevoStock,
        ...(estado ? { estado } : {})
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
