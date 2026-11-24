const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const fincaId = req.user.fincaId;
    const now = new Date();

    const [
      finca,
      lotes,
      cultivos,
      campanas,
      labores,
      aplicaciones,
      cosechas,
      insumos,
      ventas,
      lotesVivero
    ] = await Promise.all([
      prisma.finca.findUnique({ where: { id: fincaId }, include: { modulos: { orderBy: { codigo: 'asc' } } } }),
      prisma.lote.findMany({ where: { fincaId, activo: true }, orderBy: { codigo: 'asc' } }),
      prisma.cultivo.findMany({ where: { fincaId, activo: true } }),
      prisma.campana.findMany({ where: { fincaId, estado: 'ACTIVA' } }),
      prisma.labor.findMany({
        where: { fincaId },
        include: { lote: true, trabajador: true },
        orderBy: { fechaProgramada: 'desc' }
      }),
      prisma.aplicacionFitosanitaria.findMany({
        where: { fincaId },
        include: { lote: true },
        orderBy: { fechaAplicacion: 'desc' }
      }),
      prisma.cosecha.findMany({ where: { fincaId }, include: { lote: true, cultivo: true } }),
      prisma.insumo.findMany({ where: { fincaId } }),
      prisma.venta.findMany({ where: { fincaId } }),
      prisma.loteVivero.findMany({ where: { fincaId } })
    ]);

    const laboresCompletadas = labores.filter((l) => l.estado === 'COMPLETADA').length;
    const laboresPendientes = labores.filter((l) => l.estado !== 'COMPLETADA').length;

    const totalArea = lotes.reduce((acc, l) => acc + l.areaHectareas, 0);
    const totalPlantas = campanas.reduce((acc, c) => acc + c.plantasEstimadas, 0);
    const totalPlantinesVivero = lotesVivero.reduce((acc, v) => acc + v.stockDisponible, 0);

    // Promedios de salud del suelo (NPK y humedad)
    const countLotes = lotes.length || 1;
    const avgN = Math.round(lotes.reduce((a, l) => a + l.nivelN, 0) / countLotes);
    const avgP = Math.round(lotes.reduce((a, l) => a + l.nivelP, 0) / countLotes);
    const avgK = Math.round(lotes.reduce((a, l) => a + l.nivelK, 0) / countLotes);
    const avgHumedad = Math.round(lotes.reduce((a, l) => a + l.humedadPct, 0) / countLotes);
    const avgSalud = Math.round(lotes.reduce((a, l) => a + l.saludPct, 0) / countLotes);

    // Indicadores para gráfico de dona "Rendimiento de Finca"
    const totalLabores = labores.length || 1;
    const enTiempoPct = Math.round((laboresCompletadas / totalLabores) * 100);
    const utilizacionPct = Math.min(100, Math.round((totalArea / (finca.hectareasTotales || 1)) * 100));
    const overallScore = Math.round((avgSalud + enTiempoPct + utilizacionPct) / 3);

    // Alertas activas (stock mínimo + carencia vigente + lotes en atención)
    const stockBajo = insumos.filter((i) => i.stockActual <= i.stockMinimo);
    const carenciasActivas = aplicaciones.filter((a) => new Date(a.fechaFinCarencia) > now);
    const lotesAtencion = lotes.filter((l) => l.estado !== 'SALUDABLE');

    const alertas = [
      ...carenciasActivas.map((a) => ({
        tipo: 'CARENCIA',
        severidad: 'ALTA',
        titulo: `Período de carencia activo en ${a.lote.nombre}`,
        detalle: `${a.producto} — no cosechar hasta ${new Date(a.fechaFinCarencia).toLocaleDateString('es-BO')}`
      })),
      ...stockBajo.map((i) => ({
        tipo: 'STOCK_MINIMO',
        severidad: 'MEDIA',
        titulo: `Stock bajo: ${i.nombre}`,
        detalle: `Disponible: ${i.stockActual} ${i.unidad} (mínimo ${i.stockMinimo} ${i.unidad})`
      })),
      ...lotesAtencion.map((l) => ({
        tipo: 'LOTE_ATENCION',
        severidad: 'MEDIA',
        titulo: `${l.nombre} requiere atención`,
        detalle: `Humedad ${l.humedadPct}% · Salud ${l.saludPct}%`
      }))
    ];

    const totalCosechadoKg = cosechas.reduce((a, c) => a + c.cantidadKg, 0);
    const totalVentasBs = ventas.reduce((a, v) => a + v.total, 0);
    const cuentasPorCobrarBs = ventas.reduce((a, v) => a + v.saldoPendiente, 0);

    res.json({
      finca: {
        id: finca.id,
        nombre: finca.nombre,
        ubicacion: finca.ubicacion,
        hectareasTotales: finca.hectareasTotales,
        latitud: finca.latitud,
        longitud: finca.longitud
      },
      modulos: finca.modulos,
      resumenLabores: {
        completadas: laboresCompletadas,
        pendientes: laboresPendientes,
        total: labores.length
      },
      kpis: {
        totalLotes: lotes.length,
        totalCultivos: cultivos.length,
        areaTotalHa: Number(totalArea.toFixed(2)),
        totalPlantas,
        totalPlantinesVivero,
        totalCosechadoKg: Number(totalCosechadoKg.toFixed(1)),
        totalVentasBs: Number(totalVentasBs.toFixed(2)),
        cuentasPorCobrarBs: Number(cuentasPorCobrarBs.toFixed(2))
      },
      clima: {
        temperatura: 22,
        condicion: 'Parcialmente nublado',
        vientoKmh: 11,
        humedadRelativa: avgHumedad,
        pronosticoHoras: [
          { hora: '08:00', temp: 16 },
          { hora: '11:00', temp: 20 },
          { hora: '14:00', temp: 23 },
          { hora: '17:00', temp: 19 }
        ]
      },
      saludSuelo: {
        n: avgN,
        p: avgP,
        k: avgK,
        humedad: avgHumedad,
        saludGeneral: avgSalud
      },
      rendimiento: {
        overallScore,
        utilizacion: utilizacionPct,
        salud: avgSalud,
        enTiempo: enTiempoPct
      },
      laboresDestacadas: labores.slice(0, 6),
      lotesMapa: lotes.map((l) => ({
        ...l,
        poligono: l.poligonoJson ? JSON.parse(l.poligonoJson) : null,
        enCarencia: carenciasActivas.some((c) => c.loteId === l.id)
      })),
      alertas
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
