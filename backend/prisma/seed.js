const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos ficticios para AgroConnect (Finca Valle Verde)...');

  // Limpiar datos existentes en orden seguro
  await prisma.mensajeWhatsApp.deleteMany();
  await prisma.confirmacionPendiente.deleteMany();
  await prisma.detalleVenta.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.loteVivero.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.movimientoInventario.deleteMany();
  await prisma.aplicacionFitosanitaria.deleteMany();
  await prisma.cosecha.deleteMany();
  await prisma.labor.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.jornal.deleteMany();
  await prisma.trabajador.deleteMany();
  await prisma.insumo.deleteMany();
  await prisma.campana.deleteMany();
  await prisma.cultivo.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.moduloActivo.deleteMany();
  await prisma.finca.deleteMany();

  // 1. Finca ficticia
  const finca = await prisma.finca.create({
    data: {
      nombre: 'Finca Valle Verde',
      ubicacion: 'Valle Bajo - Zona Agrícola Sur (Datos Ficticios)',
      hectareasTotales: 4.8,
      latitud: -16.645,
      longitud: -68.122,
      telefonoWhatsApp: '+59170001001',
      descripcion: 'Finca pequeña modelo dedicada a hortalizas frescas, frutas de temporada y vivero de plantines con trazabilidad QR.'
    }
  });

  // 2. Módulos activables por finca (M0 a M7)
  const modulosData = [
    { codigo: 'M0', nombre: 'Núcleo', descripcion: 'Finca, usuarios, roles, lotes, cultivos y configuración modular', obligatorio: true, activo: true },
    { codigo: 'M1', nombre: 'Control técnico de campo', descripcion: 'Calendario de labores, riego, aplicaciones fitosanitarias y cosechas', obligatorio: true, activo: true },
    { codigo: 'M2', nombre: 'Trazabilidad QR', descripcion: 'Código de lote de cosecha con QR e historial del campo al cliente', obligatorio: true, activo: true },
    { codigo: 'M3', nombre: 'Trabajadores', descripcion: 'Registro, asistencia, tareas asignadas, jornales y pagos', obligatorio: true, activo: true },
    { codigo: 'M4', nombre: 'Inventarios', descripcion: 'Insumos agrícolas, productos cosechados, movimientos y stock mínimo', obligatorio: true, activo: true },
    { codigo: 'M5', nombre: 'Ventas y clientes', descripcion: 'Clientes, pedidos, ventas con trazabilidad y cuentas por cobrar', obligatorio: true, activo: true },
    { codigo: 'M6', nombre: 'Vivero', descripcion: 'Producción de plantines: siembra, germinación, stock y venta', obligatorio: false, activo: true },
    { codigo: 'M7', nombre: 'Reportes y finanzas', descripcion: 'Costos por lote, ingresos, margen operativo y gráficos', obligatorio: false, activo: true }
  ];

  for (const mod of modulosData) {
    await prisma.moduloActivo.create({
      data: { ...mod, fincaId: finca.id }
    });
  }

  // 3. Usuarios ficticios con roles
  const hashAdmin = await bcrypt.hash('Agro2026!', 10);
  const hashEncargado = await bcrypt.hash('Campo2026!', 10);
  const hashTrabajador = await bcrypt.hash('Labor2026!', 10);

  const propietario = await prisma.usuario.create({
    data: {
      fincaId: finca.id,
      nombre: 'Elena Morales',
      email: 'propietario@agroconnect.demo',
      passwordHash: hashAdmin,
      rol: 'PROPIETARIO',
      telefono: '+59170001001'
    }
  });

  await prisma.usuario.create({
    data: {
      fincaId: finca.id,
      nombre: 'Carlos Quispe',
      email: 'encargado@agroconnect.demo',
      passwordHash: hashEncargado,
      rol: 'ENCARGADO',
      telefono: '+59170001002'
    }
  });

  await prisma.usuario.create({
    data: {
      fincaId: finca.id,
      nombre: 'Mateo Condori',
      email: 'trabajador@agroconnect.demo',
      passwordHash: hashTrabajador,
      rol: 'TRABAJADOR',
      telefono: '+59170001003'
    }
  });

  // 4. Lotes con polígonos y métricas de suelo (para Mapa Leaflet + Tarjeta Salud del Suelo)
  const lote1 = await prisma.lote.create({
    data: {
      fincaId: finca.id,
      codigo: 'L-01',
      nombre: 'Lote 1 - Lechuga Hidropónica',
      sector: 'Campos Norte',
      areaHectareas: 1.2,
      tipoSuelo: 'Franco-arenoso',
      humedadPct: 74,
      nivelN: 26,
      nivelP: 14,
      nivelK: 21,
      saludPct: 92,
      estado: 'SALUDABLE',
      latitud: -16.6435,
      longitud: -68.1242,
      poligonoJson: JSON.stringify([
        [-16.6425, -68.1255],
        [-16.6425, -68.1230],
        [-16.6444, -68.1230],
        [-16.6444, -68.1255]
      ])
    }
  });

  const lote2 = await prisma.lote.create({
    data: {
      fincaId: finca.id,
      codigo: 'L-02',
      nombre: 'Lote 2 - Tomate Invernadero',
      sector: 'Campos Norte',
      areaHectareas: 1.1,
      tipoSuelo: 'Franco-arcilloso',
      humedadPct: 68,
      nivelN: 23,
      nivelP: 9,
      nivelK: 19,
      saludPct: 86,
      estado: 'SALUDABLE',
      latitud: -16.6435,
      longitud: -68.1208,
      poligonoJson: JSON.stringify([
        [-16.6425, -68.1225],
        [-16.6425, -68.1194],
        [-16.6444, -68.1194],
        [-16.6444, -68.1225]
      ])
    }
  });

  const lote3 = await prisma.lote.create({
    data: {
      fincaId: finca.id,
      codigo: 'L-03',
      nombre: 'Lote 3 - Frutilla Altura',
      sector: 'Campos Sur',
      areaHectareas: 0.9,
      tipoSuelo: 'Franco-limoso',
      humedadPct: 54,
      nivelN: 18,
      nivelP: 8,
      nivelK: 15,
      saludPct: 72,
      estado: 'ATENCION',
      latitud: -16.6462,
      longitud: -68.1240,
      poligonoJson: JSON.stringify([
        [-16.6448, -68.1255],
        [-16.6448, -68.1226],
        [-16.6472, -68.1226],
        [-16.6472, -68.1255]
      ])
    }
  });

  const lote4 = await prisma.lote.create({
    data: {
      fincaId: finca.id,
      codigo: 'L-04',
      nombre: 'Lote 4 - Durazno y Manzano',
      sector: 'Campos Sur',
      areaHectareas: 1.6,
      tipoSuelo: 'Franco-arcilloso',
      humedadPct: 61,
      nivelN: 21,
      nivelP: 11,
      nivelK: 18,
      saludPct: 78,
      estado: 'ATENCION',
      latitud: -16.6462,
      longitud: -68.1205,
      poligonoJson: JSON.stringify([
        [-16.6448, -68.1222],
        [-16.6448, -68.1190],
        [-16.6472, -68.1190],
        [-16.6472, -68.1222]
      ])
    }
  });

  // 5. Cultivos
  const cultLechuga = await prisma.cultivo.create({
    data: { fincaId: finca.id, nombre: 'Lechuga', variedad: 'Crespa Verde', categoria: 'Hortaliza', cicloDias: 55, precioRefKg: 9.5 }
  });
  const cultTomate = await prisma.cultivo.create({
    data: { fincaId: finca.id, nombre: 'Tomate', variedad: 'Perita Río Grande', categoria: 'Hortaliza', cicloDias: 95, precioRefKg: 8.0 }
  });
  const cultFrutilla = await prisma.cultivo.create({
    data: { fincaId: finca.id, nombre: 'Frutilla', variedad: 'Albión', categoria: 'Fruta', cicloDias: 120, precioRefKg: 24.0 }
  });
  const cultDurazno = await prisma.cultivo.create({
    data: { fincaId: finca.id, nombre: 'Durazno', variedad: 'Ulincate', categoria: 'Fruta', cicloDias: 180, precioRefKg: 16.0 }
  });

  // 6. Campañas
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000);
  const daysFromNow = (n) => new Date(now.getTime() + n * 86400000);

  const camp1 = await prisma.campana.create({
    data: { fincaId: finca.id, loteId: lote1.id, cultivoId: cultLechuga.id, nombre: 'Campaña Lechuga 2026-II', fechaInicio: daysAgo(45), fechaFinEstimada: daysFromNow(15), plantasEstimadas: 2400, estado: 'ACTIVA' }
  });
  const camp2 = await prisma.campana.create({
    data: { fincaId: finca.id, loteId: lote2.id, cultivoId: cultTomate.id, nombre: 'Campaña Tomate 2026-II', fechaInicio: daysAgo(70), fechaFinEstimada: daysFromNow(25), plantasEstimadas: 1200, estado: 'ACTIVA' }
  });
  const camp3 = await prisma.campana.create({
    data: { fincaId: finca.id, loteId: lote3.id, cultivoId: cultFrutilla.id, nombre: 'Campaña Frutilla 2026-II', fechaInicio: daysAgo(60), fechaFinEstimada: daysFromNow(60), plantasEstimadas: 1800, estado: 'ACTIVA' }
  });
  const camp4 = await prisma.campana.create({
    data: { fincaId: finca.id, loteId: lote4.id, cultivoId: cultDurazno.id, nombre: 'Campaña Durazno 2026', fechaInicio: daysAgo(120), fechaFinEstimada: daysFromNow(50), plantasEstimadas: 320, estado: 'ACTIVA' }
  });

  // 7. Trabajadores ficticios
  const trab1 = await prisma.trabajador.create({
    data: { fincaId: finca.id, nombre: 'Mateo Condori', ci: '8421901-LP', telefono: '+59170001003', cargo: 'Regador y Riego Tecnificado', tarifaJornal: 130, consentimientoWhatsApp: true }
  });
  const trab2 = await prisma.trabajador.create({
    data: { fincaId: finca.id, nombre: 'Lucía Mamani', ci: '9120445-LP', telefono: '+59170001004', cargo: 'Encargada de Cosecha y Vivero', tarifaJornal: 140, consentimientoWhatsApp: true }
  });
  const trab3 = await prisma.trabajador.create({
    data: { fincaId: finca.id, nombre: 'Jorge Bautista', ci: '7765112-LP', telefono: '+59170001005', cargo: 'Operario Fitosanitario', tarifaJornal: 150, consentimientoWhatsApp: true }
  });

  // Asistencias
  await prisma.asistencia.createMany({
    data: [
      { trabajadorId: trab1.id, fecha: daysAgo(1), presente: true, horaEntrada: '06:55', horaSalida: '15:30', observaciones: 'Turno completo riego norte' },
      { trabajadorId: trab2.id, fecha: daysAgo(1), presente: true, horaEntrada: '07:00', horaSalida: '15:45', observaciones: 'Cosecha y embalaje' },
      { trabajadorId: trab3.id, fecha: daysAgo(1), presente: true, horaEntrada: '07:10', horaSalida: '15:30', observaciones: 'Revisión de trampas' },
      { trabajadorId: trab1.id, fecha: now, presente: true, horaEntrada: '07:00', horaSalida: '15:30', observaciones: 'En campo' },
      { trabajadorId: trab2.id, fecha: now, presente: true, horaEntrada: '07:00', horaSalida: '15:30', observaciones: 'En vivero' }
    ]
  });

  // Jornales
  await prisma.jornal.createMany({
    data: [
      { fincaId: finca.id, trabajadorId: trab1.id, loteId: lote1.id, fecha: daysAgo(4), cantidadJornales: 1, tarifaUnitaria: 130, montoTotal: 130, pagado: true, fechaPago: daysAgo(2), descripcion: 'Mantenimiento de goteo Lote 1' },
      { fincaId: finca.id, trabajadorId: trab2.id, loteId: lote2.id, fecha: daysAgo(3), cantidadJornales: 1.5, tarifaUnitaria: 140, montoTotal: 210, pagado: true, fechaPago: daysAgo(1), descripcion: 'Tutorado y cosecha de tomate' },
      { fincaId: finca.id, trabajadorId: trab3.id, loteId: lote3.id, fecha: daysAgo(2), cantidadJornales: 1, tarifaUnitaria: 150, montoTotal: 150, pagado: false, descripcion: 'Aplicación orgánica en frutilla' },
      { fincaId: finca.id, trabajadorId: trab1.id, loteId: lote2.id, fecha: daysAgo(1), cantidadJornales: 1, tarifaUnitaria: 130, montoTotal: 130, pagado: false, descripcion: 'Riego programado Lote 2' },
      { fincaId: finca.id, trabajadorId: trab2.id, loteId: lote1.id, fecha: now, cantidadJornales: 1, tarifaUnitaria: 140, montoTotal: 140, pagado: false, descripcion: 'Selección y empaque lechuga' }
    ]
  });

  // 8. Labores
  await prisma.labor.createMany({
    data: [
      { fincaId: finca.id, loteId: lote1.id, campanaId: camp1.id, trabajadorId: trab1.id, tipo: 'RIEGO', titulo: 'Mantenimiento de Riego por Goteo', descripcion: 'Limpieza de filtros y revisión de presión en surcos 1 al 12.', fechaProgramada: daysAgo(2), fechaEjecucion: daysAgo(2), estado: 'COMPLETADA', costoEstimado: 130 },
      { fincaId: finca.id, loteId: lote2.id, campanaId: camp2.id, trabajadorId: trab3.id, tipo: 'FERTILIZACION', titulo: 'Análisis y Nutrición de Suelo NPK', descripcion: 'Aplicación de compost líquido y lectura de pH y NPK.', fechaProgramada: now, estado: 'EN_PROCESO', costoEstimado: 190 },
      { fincaId: finca.id, loteId: lote2.id, campanaId: camp2.id, trabajadorId: trab2.id, tipo: 'COSECHA', titulo: 'Cosecha de Tomate Perita', descripcion: 'Recolección manual en cajas plásticas sanitizadas.', fechaProgramada: daysFromNow(1), estado: 'PENDIENTE', costoEstimado: 140 },
      { fincaId: finca.id, loteId: lote3.id, campanaId: camp3.id, trabajadorId: trab1.id, tipo: 'RIEGO', titulo: 'Riego Emergencia Lote Frutilla', descripcion: 'Humedad bajó a 54%, requiere pulso de riego de 45 min.', fechaProgramada: now, estado: 'PENDIENTE', costoEstimado: 80 },
      { fincaId: finca.id, loteId: lote4.id, campanaId: camp4.id, trabajadorId: trab3.id, tipo: 'PODA', titulo: 'Poda de Ventilación Durazneros', descripcion: 'Retiro de chupones para mejorar entrada de luz.', fechaProgramada: daysAgo(5), fechaEjecucion: daysAgo(4), estado: 'COMPLETADA', costoEstimado: 220 },
      { fincaId: finca.id, loteId: lote1.id, campanaId: camp1.id, trabajadorId: trab2.id, tipo: 'DESHIERBE', titulo: 'Deshierbe Manual Surcos Norte', descripcion: 'Control mecánico sin herbicidas.', fechaProgramada: daysAgo(6), fechaEjecucion: daysAgo(6), estado: 'COMPLETADA', costoEstimado: 110 }
    ]
  });

  // 9. Insumos (incluyendo dosis oficial de etiqueta y stock mínimo)
  const insFert = await prisma.insumo.create({
    data: {
      fincaId: finca.id,
      nombre: 'Humus de Lombriz Premium',
      categoria: 'FERTILIZANTE',
      unidad: 'kg',
      stockActual: 180,
      stockMinimo: 50,
      costoUnitario: 3.5,
      dosisEtiqueta: '2 kg por m2 en preparación de cama o 250 g/planta según etiqueta',
      periodoCarenciaRef: 0
    }
  });

  const insFungicida = await prisma.insumo.create({
    data: {
      fincaId: finca.id,
      nombre: 'Oxicloruro de Cobre 50% WP',
      categoria: 'AGROQUIMICO',
      unidad: 'kg',
      stockActual: 4,
      stockMinimo: 8, // ¡Alerta de stock mínimo!
      costoUnitario: 48.0,
      dosisEtiqueta: '2.5 g por litro de agua (según etiqueta del fabricante, máximo 3 aplicaciones por ciclo)',
      periodoCarenciaRef: 7
    }
  });

  const insBio = await prisma.insumo.create({
    data: {
      fincaId: finca.id,
      nombre: 'Aceite de Neem Orgánico',
      categoria: 'AGROQUIMICO',
      unidad: 'L',
      stockActual: 3.5,
      stockMinimo: 5, // ¡Alerta de stock mínimo!
      costoUnitario: 65.0,
      dosisEtiqueta: '3 ml por litro de agua en aspersión foliar al atardecer (etiqueta del envase)',
      periodoCarenciaRef: 3
    }
  });

  const insSemilla = await prisma.insumo.create({
    data: {
      fincaId: finca.id,
      nombre: 'Semilla Tomate Río Grande Certificada',
      categoria: 'SEMILLA',
      unidad: 'sobre',
      stockActual: 24,
      stockMinimo: 10,
      costoUnitario: 18.0
    }
  });

  const insHerr = await prisma.insumo.create({
    data: {
      fincaId: finca.id,
      nombre: 'Tijera de Poda Bypass Profesional',
      categoria: 'HERRAMIENTA',
      unidad: 'unidad',
      stockActual: 8,
      stockMinimo: 4,
      costoUnitario: 85.0
    }
  });

  const insCosechaTomate = await prisma.insumo.create({
    data: {
      fincaId: finca.id,
      nombre: 'Tomate Perita Cosechado (Fresco)',
      categoria: 'COSECHADO',
      unidad: 'kg',
      stockActual: 110,
      stockMinimo: 25,
      costoUnitario: 4.2,
      loteOrigenCodigo: 'AGRO-2026-L02-001'
    }
  });

  const insCosechaLechuga = await prisma.insumo.create({
    data: {
      fincaId: finca.id,
      nombre: 'Lechuga Crespa Cosechada (Fresca)',
      categoria: 'COSECHADO',
      unidad: 'kg',
      stockActual: 65,
      stockMinimo: 20,
      costoUnitario: 4.8,
      loteOrigenCodigo: 'AGRO-2026-L01-001'
    }
  });

  // Movimientos de inventario
  await prisma.movimientoInventario.createMany({
    data: [
      { fincaId: finca.id, insumoId: insFert.id, loteId: lote1.id, usuarioId: propietario.id, tipo: 'SALIDA', cantidad: 45, costoTotal: 157.5, motivo: 'Abonado base Lote 1', fecha: daysAgo(12) },
      { fincaId: finca.id, insumoId: insFungicida.id, loteId: lote3.id, usuarioId: propietario.id, tipo: 'SALIDA', cantidad: 2, costoTotal: 96, motivo: 'Control preventivo mildiu Lote 3', fecha: daysAgo(2) },
      { fincaId: finca.id, insumoId: insBio.id, loteId: lote2.id, usuarioId: propietario.id, tipo: 'SALIDA', cantidad: 1.5, costoTotal: 97.5, motivo: 'Control preventivo mosca blanca Lote 2', fecha: daysAgo(14) },
      { fincaId: finca.id, insumoId: insSemilla.id, usuarioId: propietario.id, tipo: 'ENTRADA', cantidad: 30, costoTotal: 540, motivo: 'Compra proveedor agropecuario', fecha: daysAgo(20) },
      { fincaId: finca.id, insumoId: insCosechaTomate.id, loteId: lote2.id, usuarioId: propietario.id, tipo: 'ENTRADA', cantidad: 160, costoTotal: 672, motivo: 'Ingreso cosecha AGRO-2026-L02-001', fecha: daysAgo(3) }
    ]
  });

  // 10. Aplicaciones fitosanitarias (una vencida/segura y otra EN CARENCIA ACTIVA en Lote 3 para demostrar alertas)
  await prisma.aplicacionFitosanitaria.createMany({
    data: [
      {
        fincaId: finca.id,
        loteId: lote2.id,
        insumoId: insBio.id,
        producto: 'Aceite de Neem Orgánico',
        ingredienteActivo: 'Azadiractina 1%',
        dosisAplicada: '3 ml/L',
        dosisEtiqueta: '3 ml por litro de agua (etiqueta del envase)',
        motivo: 'Prevención de mosca blanca',
        fechaAplicacion: daysAgo(14),
        periodoCarenciaDias: 3,
        fechaFinCarencia: daysAgo(11),
        aplicador: 'Jorge Bautista',
        observaciones: 'Período de carencia cumplido sin novedad.'
      },
      {
        fincaId: finca.id,
        loteId: lote3.id,
        insumoId: insFungicida.id,
        producto: 'Oxicloruro de Cobre 50% WP',
        ingredienteActivo: 'Cobre metálico 50%',
        dosisAplicada: '2.5 g/L',
        dosisEtiqueta: '2.5 g por litro de agua (etiqueta del fabricante)',
        motivo: 'Prevención de mancha foliar por humedad',
        fechaAplicacion: daysAgo(2),
        periodoCarenciaDias: 7,
        fechaFinCarencia: daysFromNow(5), // ¡Aún en período de carencia!
        aplicador: 'Jorge Bautista',
        observaciones: 'NO COSECHAR HASTA CUMPLIR LOS 7 DÍAS DE CARENCIA.'
      }
    ]
  });

  // 11. Cosechas con código de trazabilidad único
  const cosTomate = await prisma.cosecha.create({
    data: {
      fincaId: finca.id,
      loteId: lote2.id,
      cultivoId: cultTomate.id,
      campanaId: camp2.id,
      fecha: daysAgo(3),
      cantidadKg: 160,
      calidad: 'PRIMERA',
      codigoTrazabilidad: 'AGRO-2026-L02-001',
      carenciaVerificada: true,
      observaciones: 'Fruto firme, coloración uniforme, grado Brix óptimo.',
      origen: 'WEB'
    }
  });

  const cosLechuga = await prisma.cosecha.create({
    data: {
      fincaId: finca.id,
      loteId: lote1.id,
      cultivoId: cultLechuga.id,
      campanaId: camp1.id,
      fecha: daysAgo(1),
      cantidadKg: 95,
      calidad: 'EXPORTACION',
      codigoTrazabilidad: 'AGRO-2026-L01-001',
      carenciaVerificada: true,
      observaciones: 'Cosecha matutina 06:30, lavado con agua potable y enfriado.',
      origen: 'WEB'
    }
  });

  // 12. Vivero (M6)
  const vivTomate = await prisma.loteVivero.create({
    data: {
      fincaId: finca.id,
      codigo: 'VIV-2026-001',
      especie: 'Tomate',
      variedad: 'Perita Río Grande',
      fechaSiembra: daysAgo(28),
      cantidadSembrada: 1200,
      cantidadGerminada: 1116,
      porcentajeGerminacion: 93.0,
      stockDisponible: 850,
      precioUnitario: 1.5,
      estado: 'LISTO_VENTA',
      observaciones: 'Bandejas de 128 alvéolos, sustrato turba + perlita.'
    }
  });

  await prisma.loteVivero.create({
    data: {
      fincaId: finca.id,
      codigo: 'VIV-2026-002',
      especie: 'Lechuga',
      variedad: 'Crespa Verde',
      fechaSiembra: daysAgo(12),
      cantidadSembrada: 2000,
      cantidadGerminada: 1840,
      porcentajeGerminacion: 92.0,
      stockDisponible: 1840,
      precioUnitario: 0.8,
      estado: 'GERMINANDO',
      observaciones: 'Listo para trasplante en 10 días.'
    }
  });

  // 13. Clientes ficticios (M5)
  const cli1 = await prisma.cliente.create({
    data: {
      fincaId: finca.id,
      nombre: 'Mercado Orgánico El Mirador',
      tipo: 'MERCADO',
      telefono: '+59171112201',
      email: 'compras@mirador.demo',
      direccion: 'Av. Satélite #450, El Alto (Ficticio)',
      consentimientoWhatsApp: true
    }
  });

  const cli2 = await prisma.cliente.create({
    data: {
      fincaId: finca.id,
      nombre: 'Restaurante Raíces Andinas',
      tipo: 'RESTAURANTE',
      telefono: '+59171112202',
      email: 'chef@raicesandinas.demo',
      direccion: 'Zona Sur Calle 15 #120 (Ficticio)',
      consentimientoWhatsApp: true
    }
  });

  const cli3 = await prisma.cliente.create({
    data: {
      fincaId: finca.id,
      nombre: 'Asociación Productores Valle Nuevo',
      tipo: 'MAYORISTA',
      telefono: '+59171112203',
      direccion: 'Carretera a Viacha Km 12 (Ficticio)',
      consentimientoWhatsApp: true
    }
  });

  // 14. Ventas con trazabilidad vinculada y cuentas por cobrar
  await prisma.venta.create({
    data: {
      fincaId: finca.id,
      clienteId: cli1.id,
      numeroFactura: 'VTA-2026-0001',
      fecha: daysAgo(2),
      total: 425.0,
      montoPagado: 425.0,
      saldoPendiente: 0,
      estadoPago: 'PAGADO',
      observaciones: 'Entrega con etiqueta QR verificada.',
      detalles: {
        create: [
          {
            cosechaId: cosTomate.id,
            descripcionProducto: 'Tomate Perita Primera (Lote 2)',
            cantidad: 50,
            unidad: 'kg',
            precioUnitario: 8.5,
            subtotal: 425.0,
            codigoTrazabilidad: cosTomate.codigoTrazabilidad
          }
        ]
      }
    }
  });

  await prisma.venta.create({
    data: {
      fincaId: finca.id,
      clienteId: cli2.id,
      numeroFactura: 'VTA-2026-0002',
      fecha: daysAgo(1),
      total: 495.0,
      montoPagado: 250.0,
      saldoPendiente: 245.0,
      estadoPago: 'PARCIAL',
      observaciones: 'Saldo a 7 días contra entrega siguiente pedido.',
      detalles: {
        create: [
          {
            cosechaId: cosLechuga.id,
            descripcionProducto: 'Lechuga Crespa Exportación (Lote 1)',
            cantidad: 30,
            unidad: 'kg',
            precioUnitario: 10.5,
            subtotal: 315.0,
            codigoTrazabilidad: cosLechuga.codigoTrazabilidad
          },
          {
            cosechaId: cosTomate.id,
            descripcionProducto: 'Tomate Perita Primera (Lote 2)',
            cantidad: 20,
            unidad: 'kg',
            precioUnitario: 9.0,
            subtotal: 180.0,
            codigoTrazabilidad: cosTomate.codigoTrazabilidad
          }
        ]
      }
    }
  });

  await prisma.venta.create({
    data: {
      fincaId: finca.id,
      clienteId: cli3.id,
      numeroFactura: 'VTA-2026-0003',
      fecha: now,
      total: 405.0,
      montoPagado: 0,
      saldoPendiente: 405.0,
      estadoPago: 'PENDIENTE',
      observaciones: 'Venta de plantines de vivero.',
      detalles: {
        create: [
          {
            loteViveroId: vivTomate.id,
            descripcionProducto: 'Plantines Tomate Perita (VIV-2026-001)',
            cantidad: 270,
            unidad: 'plantines',
            precioUnitario: 1.5,
            subtotal: 405.0,
            codigoTrazabilidad: vivTomate.codigo
          }
        ]
      }
    }
  });

  // 15. Historial inicial de mensajes WhatsApp
  await prisma.mensajeWhatsApp.createMany({
    data: [
      {
        fincaId: finca.id,
        telefono: '+59170001002',
        direccion: 'SALIENTE',
        contenido: '🌿 ¡Hola! Soy AgroBot de Finca Valle Verde. Puedes escribirme para:\n• Registrar cosechas (ej: "hoy cosechamos 40 kg de tomate del lote 2")\n• Registrar labores (ej: "registra riego en lote 1")\n• Consultar inventario bajo, labores pendientes o ventas.\n⚠️ Recuerda: siempre pediré tu confirmación antes de guardar datos y nunca invento dosis de agroquímicos.',
        proveedor: 'SIMULADOR',
        intencion: 'BIENVENIDA'
      }
    ]
  });

  console.log('✅ Seed completado con éxito!');
  console.log('   Propietario: propietario@agroconnect.demo / Agro2026!');
  console.log('   Encargado:   encargado@agroconnect.demo   / Campo2026!');
  console.log('   Trabajador:  trabajador@agroconnect.demo  / Labor2026!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
