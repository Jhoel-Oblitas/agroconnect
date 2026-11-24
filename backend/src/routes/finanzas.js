const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');
const { requireModule } = require('../middleware/moduleGuard');

const router = express.Router();

router.use(authenticate, requireModule('M7'));

router.get('/resumen', async (req, res, next) => {
  try {
    const fincaId = req.user.fincaId;

    const [lotes, jornales, movimientos, labores, ventas] = await Promise.all([
      prisma.lote.findMany({ where: { fincaId, activo: true }, orderBy: { codigo: 'asc' } }),
      prisma.jornal.findMany({ where: { fincaId } }),
      prisma.movimientoInventario.findMany({ where: { fincaId, tipo: 'SALIDA' } }),
      prisma.labor.findMany({ where: { fincaId } }),
      prisma.venta.findMany({
        where: { fincaId },
        include: { detalles: { include: { cosecha: true } } }
      })
    ]);

    const costoPorLote = lotes.map((lote) => {
      const costoJornales = jornales
        .filter((j) => j.loteId === lote.id)
        .reduce((acc, j) => acc + j.montoTotal, 0);
      const costoInsumos = movimientos
        .filter((m) => m.loteId === lote.id)
        .reduce((acc, m) => acc + m.costoTotal, 0);
      const costoLabores = labores
        .filter((lb) => lb.loteId === lote.id && lb.estado === 'COMPLETADA')
        .reduce((acc, lb) => acc + lb.costoEstimado, 0);

      const ingresosLote = ventas.reduce((acc, v) => {
        const sub = v.detalles
          .filter((d) => d.cosecha && d.cosecha.loteId === lote.id)
          .reduce((s, d) => s + d.subtotal, 0);
        return acc + sub;
      }, 0);

      const costoTotal = Number((costoJornales + costoInsumos + costoLabores * 0.35).toFixed(2));
      const margen = Number((ingresosLote - costoTotal).toFixed(2));

      return {
        loteId: lote.id,
        codigo: lote.codigo,
        nombre: lote.nombre,
        costoJornales: Number(costoJornales.toFixed(2)),
        costoInsumos: Number(costoInsumos.toFixed(2)),
        costoTotal,
        ingresos: Number(ingresosLote.toFixed(2)),
        margen
      };
    });

    const totalIngresos = Number(ventas.reduce((a, v) => a + v.total, 0).toFixed(2));
    const totalCobrado = Number(ventas.reduce((a, v) => a + v.montoPagado, 0).toFixed(2));
    const totalPorCobrar = Number(ventas.reduce((a, v) => a + v.saldoPendiente, 0).toFixed(2));
    const totalCostosJornales = Number(jornales.reduce((a, j) => a + j.montoTotal, 0).toFixed(2));
    const totalCostosInsumos = Number(movimientos.reduce((a, m) => a + m.costoTotal, 0).toFixed(2));
    const totalCostos = Number((totalCostosJornales + totalCostosInsumos).toFixed(2));
    const margenNeto = Number((totalIngresos - totalCostos).toFixed(2));
    const margenPct = totalIngresos > 0 ? Number(((margenNeto / totalIngresos) * 100).toFixed(1)) : 0;

    res.json({
      totales: {
        ingresos: totalIngresos,
        cobrado: totalCobrado,
        porCobrar: totalPorCobrar,
        costosJornales: totalCostosJornales,
        costosInsumos: totalCostosInsumos,
        costosTotales: totalCostos,
        margenNeto,
        margenPct
      },
      porLote: costoPorLote
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
