const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { requireModule } = require('../middleware/moduleGuard');

const router = express.Router();

router.use(authenticate, requireModule('M5'));

// === CLIENTES ===
router.get('/clientes', async (req, res, next) => {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { fincaId: req.user.fincaId },
      include: {
        ventas: { select: { id: true, total: true, saldoPendiente: true, estadoPago: true } }
      },
      orderBy: { nombre: 'asc' }
    });
    res.json(clientes);
  } catch (err) {
    next(err);
  }
});

router.post('/clientes', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().min(2),
      tipo: z.enum(['MAYORISTA', 'MINORISTA', 'RESTAURANTE', 'MERCADO']).default('MAYORISTA'),
      telefono: z.string().min(6),
      email: z.string().email().optional().or(z.literal('')).nullable(),
      direccion: z.string().optional().nullable(),
      consentimientoWhatsApp: z.boolean().default(true)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const created = await prisma.cliente.create({
      data: {
        fincaId: req.user.fincaId,
        nombre: parsed.data.nombre,
        tipo: parsed.data.tipo,
        telefono: parsed.data.telefono,
        email: parsed.data.email || null,
        direccion: parsed.data.direccion || null,
        consentimientoWhatsApp: parsed.data.consentimientoWhatsApp
      }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// === VENTAS Y CUENTAS POR COBRAR ===
router.get('/', async (req, res, next) => {
  try {
    const ventas = await prisma.venta.findMany({
      where: { fincaId: req.user.fincaId },
      include: {
        cliente: true,
        detalles: { include: { cosecha: { include: { lote: true, cultivo: true } }, loteVivero: true } }
      },
      orderBy: { fecha: 'desc' }
    });
    res.json(ventas);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const detalleSchema = z.object({
      cosechaId: z.coerce.number().int().positive().optional().nullable(),
      loteViveroId: z.coerce.number().int().positive().optional().nullable(),
      descripcionProducto: z.string().min(2),
      cantidad: z.coerce.number().positive(),
      unidad: z.string().default('kg'),
      precioUnitario: z.coerce.number().positive()
    });

    const schema = z.object({
      clienteId: z.coerce.number().int().positive(),
      montoPagado: z.coerce.number().min(0).default(0),
      observaciones: z.string().optional().nullable(),
      detalles: z.array(detalleSchema).min(1, 'Agrega al menos un producto a la venta')
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    // Resolver códigos de trazabilidad y subtotales
    const detallesPreparados = [];
    let total = 0;

    for (const d of parsed.data.detalles) {
      let codigoTrazabilidad = null;
      if (d.cosechaId) {
        const cos = await prisma.cosecha.findUnique({ where: { id: d.cosechaId } });
        if (cos) codigoTrazabilidad = cos.codigoTrazabilidad;
      } else if (d.loteViveroId) {
        const viv = await prisma.loteVivero.findUnique({ where: { id: d.loteViveroId } });
        if (viv) {
          codigoTrazabilidad = viv.codigo;
          if (viv.stockDisponible < d.cantidad) {
            return res.status(400).json({
              error: `Stock insuficiente en vivero ${viv.codigo}. Disponible: ${viv.stockDisponible} plantines.`
            });
          }
          await prisma.loteVivero.update({
            where: { id: viv.id },
            data: {
              stockDisponible: { decrement: Math.round(d.cantidad) },
              estado: viv.stockDisponible - Math.round(d.cantidad) <= 0 ? 'AGOTADO' : viv.estado
            }
          });
        }
      }

      const subtotal = Number((d.cantidad * d.precioUnitario).toFixed(2));
      total += subtotal;
      detallesPreparados.push({
        cosechaId: d.cosechaId || null,
        loteViveroId: d.loteViveroId || null,
        descripcionProducto: d.descripcionProducto,
        cantidad: d.cantidad,
        unidad: d.unidad,
        precioUnitario: d.precioUnitario,
        subtotal,
        codigoTrazabilidad
      });
    }

    total = Number(total.toFixed(2));
    const montoPagado = Math.min(total, Number(parsed.data.montoPagado));
    const saldoPendiente = Number((total - montoPagado).toFixed(2));
    const estadoPago = saldoPendiente <= 0 ? 'PAGADO' : montoPagado > 0 ? 'PARCIAL' : 'PENDIENTE';

    const countVentas = await prisma.venta.count({ where: { fincaId: req.user.fincaId } });
    const numeroFactura = `VTA-${new Date().getFullYear()}-${String(countVentas + 1).padStart(4, '0')}`;

    const venta = await prisma.venta.create({
      data: {
        fincaId: req.user.fincaId,
        clienteId: parsed.data.clienteId,
        numeroFactura,
        total,
        montoPagado,
        saldoPendiente,
        estadoPago,
        observaciones: parsed.data.observaciones || null,
        detalles: { create: detallesPreparados }
      },
      include: { cliente: true, detalles: true }
    });

    res.status(201).json(venta);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/abono', authorizeRoles('PROPIETARIO', 'ENCARGADO'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const montoAbono = Number(req.body.monto);
    if (!montoAbono || montoAbono <= 0) {
      return res.status(400).json({ error: 'El monto del abono debe ser mayor a 0.' });
    }

    const venta = await prisma.venta.findUnique({ where: { id } });
    if (!venta || venta.fincaId !== req.user.fincaId) {
      return res.status(404).json({ error: 'Venta no encontrada.' });
    }

    const nuevoPagado = Math.min(venta.total, Number((venta.montoPagado + montoAbono).toFixed(2)));
    const nuevoSaldo = Number((venta.total - nuevoPagado).toFixed(2));
    const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADO' : 'PARCIAL';

    const updated = await prisma.venta.update({
      where: { id },
      data: {
        montoPagado: nuevoPagado,
        saldoPendiente: nuevoSaldo,
        estadoPago: nuevoEstado
      },
      include: { cliente: true, detalles: true }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
