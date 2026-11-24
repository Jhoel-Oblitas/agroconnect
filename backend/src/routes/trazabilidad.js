const express = require('express');
const QRCode = require('qrcode');
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');
const { requireModule } = require('../middleware/moduleGuard');

const router = express.Router();

function buildPublicTraceUrl(codigo, req) {
  const frontendBase = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  return `${frontendBase.replace(/\/$/, '')}/trazabilidad/${encodeURIComponent(codigo)}`;
}

// === LISTADO AUTENTICADO DE LOTES TRAZABLES CON QR ===
router.get('/', authenticate, requireModule('M2'), async (req, res, next) => {
  try {
    const cosechas = await prisma.cosecha.findMany({
      where: { fincaId: req.user.fincaId },
      include: {
        lote: true,
        cultivo: true,
        detallesVenta: { include: { venta: { include: { cliente: true } } } }
      },
      orderBy: { fecha: 'desc' }
    });

    const items = await Promise.all(
      cosechas.map(async (c) => {
        const publicUrl = buildPublicTraceUrl(c.codigoTrazabilidad, req);
        const qrDataUrl = await QRCode.toDataURL(publicUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#1B4332', light: '#FFFFFF' }
        });
        return {
          ...c,
          publicUrl,
          qrDataUrl,
          ventasVinculadas: c.detallesVenta.map((d) => ({
            numeroFactura: d.venta.numeroFactura,
            fecha: d.venta.fecha,
            cliente: d.venta.cliente.nombre,
            cantidad: d.cantidad,
            unidad: d.unidad
          }))
        };
      })
    );

    res.json(items);
  } catch (err) {
    next(err);
  }
});

// === FICHA PÚBLICA CONSULTABLE POR EL CLIENTE (SIN LOGIN) ===
router.get('/:codigo', async (req, res, next) => {
  try {
    const codigo = req.params.codigo.trim();
    const cosecha = await prisma.cosecha.findUnique({
      where: { codigoTrazabilidad: codigo },
      include: {
        finca: true,
        lote: true,
        cultivo: true,
        campana: true,
        detallesVenta: {
          include: {
            venta: {
              include: { cliente: { select: { nombre: true, tipo: true } } }
            }
          }
        }
      }
    });

    if (!cosecha) {
      return res.status(404).json({ error: `No se encontró trazabilidad para el código ${codigo}.` });
    }

    const [labores, aplicaciones] = await Promise.all([
      prisma.labor.findMany({
        where: {
          loteId: cosecha.loteId,
          fechaProgramada: { lte: cosecha.fecha }
        },
        select: {
          id: true,
          tipo: true,
          titulo: true,
          descripcion: true,
          fechaProgramada: true,
          fechaEjecucion: true,
          estado: true
        },
        orderBy: { fechaProgramada: 'asc' }
      }),
      prisma.aplicacionFitosanitaria.findMany({
        where: {
          loteId: cosecha.loteId,
          fechaAplicacion: { lte: cosecha.fecha }
        },
        select: {
          id: true,
          producto: true,
          ingredienteActivo: true,
          motivo: true,
          fechaAplicacion: true,
          periodoCarenciaDias: true,
          fechaFinCarencia: true
        },
        orderBy: { fechaAplicacion: 'asc' }
      })
    ]);

    const publicUrl = buildPublicTraceUrl(cosecha.codigoTrazabilidad, req);
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#1B4332', light: '#FFFFFF' }
    });

    res.json({
      codigoTrazabilidad: cosecha.codigoTrazabilidad,
      publicUrl,
      qrDataUrl,
      verificado: true,
      carenciaRespetada: cosecha.carenciaVerificada,
      finca: {
        nombre: cosecha.finca.nombre,
        ubicacion: cosecha.finca.ubicacion,
        descripcion: cosecha.finca.descripcion
      },
      lote: {
        codigo: cosecha.lote.codigo,
        nombre: cosecha.lote.nombre,
        sector: cosecha.lote.sector,
        tipoSuelo: cosecha.lote.tipoSuelo,
        areaHectareas: cosecha.lote.areaHectareas
      },
      cultivo: {
        nombre: cosecha.cultivo.nombre,
        variedad: cosecha.cultivo.variedad,
        categoria: cosecha.cultivo.categoria
      },
      cosecha: {
        fecha: cosecha.fecha,
        cantidadKg: cosecha.cantidadKg,
        calidad: cosecha.calidad,
        observaciones: cosecha.observaciones,
        origen: cosecha.origen
      },
      historialLabores: labores,
      aplicacionesFitosanitarias: aplicaciones.map((a) => ({
        ...a,
        carenciaCumplidaAlCosechar: new Date(a.fechaFinCarencia) <= new Date(cosecha.fecha)
      })),
      destinoVentas: cosecha.detallesVenta.map((d) => ({
        numeroFactura: d.venta.numeroFactura,
        fechaVenta: d.venta.fecha,
        cliente: d.venta.cliente.nombre,
        tipoCliente: d.venta.cliente.tipo,
        cantidad: d.cantidad,
        unidad: d.unidad
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
