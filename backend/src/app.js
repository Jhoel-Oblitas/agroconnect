require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./utils/swagger');
const prisma = require('./utils/prisma');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const nucleoRoutes = require('./routes/nucleo');
const campoRoutes = require('./routes/campo');
const trazabilidadRoutes = require('./routes/trazabilidad');
const trabajadoresRoutes = require('./routes/trabajadores');
const inventariosRoutes = require('./routes/inventarios');
const ventasRoutes = require('./routes/ventas');
const viveroRoutes = require('./routes/vivero');
const finanzasRoutes = require('./routes/finanzas');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()) : '*',
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Documentación Swagger OpenAPI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Healthcheck
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'AgroConnect CRM-Agro API',
      timestamp: new Date().toISOString(),
      database: 'sqlite-connected'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Rutas modulares
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/nucleo', nucleoRoutes);
app.use('/api/campo', campoRoutes);
app.use('/api/trazabilidad', trazabilidadRoutes);
app.use('/api/trabajadores', trabajadoresRoutes);
app.use('/api/inventarios', inventariosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/vivero', viveroRoutes);
app.use('/api/finanzas', finanzasRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[API Error]', err);
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con ese identificador único.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro no encontrado.' });
  }
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor.'
  });
});

module.exports = app;
