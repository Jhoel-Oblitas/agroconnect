const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'AgroConnect CRM-Agro API',
    version: '1.0.0',
    description:
      'API REST modular (M0–M7) para gestión de finca pequeña, trazabilidad QR, control de campo, inventarios, ventas, vivero, finanzas y agente de IA vía WhatsApp.'
  },
  servers: [
    { url: '/api', description: 'API Base' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Verifica estado del servidor y base de datos',
        security: [],
        responses: { 200: { description: 'Servidor operativo' } }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión y obtener token JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'propietario@agroconnect.demo' },
                  password: { type: 'string', example: 'Agro2026!' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Autenticación exitosa con token JWT' } }
      }
    },
    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Resumen KPI, labores, salud del suelo, alertas y mapa de lotes',
        responses: { 200: { description: 'Métricas consolidadas de la finca' } }
      }
    },
    '/nucleo/modulos': {
      get: {
        tags: ['M0 - Núcleo'],
        summary: 'Lista los módulos (M0-M7) y su estado activo por finca',
        responses: { 200: { description: 'Listado de módulos' } }
      }
    },
    '/nucleo/modulos/{codigo}': {
      patch: {
        tags: ['M0 - Núcleo'],
        summary: 'Activar o desactivar un módulo para la finca (solo PROPIETARIO)',
        parameters: [{ name: 'codigo', in: 'path', required: true, schema: { type: 'string', example: 'M6' } }],
        responses: { 200: { description: 'Estado del módulo actualizado' } }
      }
    },
    '/nucleo/lotes': {
      get: { tags: ['M0 - Núcleo'], summary: 'Listar lotes con métricas de suelo y polígonos', responses: { 200: { description: 'OK' } } },
      post: { tags: ['M0 - Núcleo'], summary: 'Crear un nuevo lote', responses: { 201: { description: 'Creado' } } }
    },
    '/campo/labores': {
      get: { tags: ['M1 - Campo'], summary: 'Listar labores agrícolas y riego', responses: { 200: { description: 'OK' } } },
      post: { tags: ['M1 - Campo'], summary: 'Registrar nueva labor', responses: { 201: { description: 'Creado' } } }
    },
    '/campo/aplicaciones': {
      get: { tags: ['M1 - Campo'], summary: 'Listar aplicaciones fitosanitarias y períodos de carencia', responses: { 200: { description: 'OK' } } },
      post: { tags: ['M1 - Campo'], summary: 'Registrar aplicación fitosanitaria con cálculo automático de carencia', responses: { 201: { description: 'Creado' } } }
    },
    '/campo/cosechas': {
      get: { tags: ['M1 - Campo'], summary: 'Listar cosechas con código de trazabilidad', responses: { 200: { description: 'OK' } } },
      post: { tags: ['M1 - Campo'], summary: 'Registrar cosecha (valida período de carencia y genera código QR)', responses: { 201: { description: 'Creado' } } }
    },
    '/trazabilidad/{codigo}': {
      get: {
        tags: ['M2 - Trazabilidad'],
        summary: 'Consulta pública de trazabilidad completa desde el QR (sin login)',
        security: [],
        parameters: [{ name: 'codigo', in: 'path', required: true, schema: { type: 'string', example: 'AGRO-2026-L02-001' } }],
        responses: { 200: { description: 'Historial lote → labores → aplicaciones → cosecha → venta + QR' } }
      }
    },
    '/trabajadores': {
      get: { tags: ['M3 - Trabajadores'], summary: 'Listar trabajadores, asistencias y jornales', responses: { 200: { description: 'OK' } } }
    },
    '/inventarios/insumos': {
      get: { tags: ['M4 - Inventarios'], summary: 'Listar insumos y alertas de stock mínimo', responses: { 200: { description: 'OK' } } }
    },
    '/ventas': {
      get: { tags: ['M5 - Ventas'], summary: 'Listar ventas, clientes y cuentas por cobrar', responses: { 200: { description: 'OK' } } }
    },
    '/vivero': {
      get: { tags: ['M6 - Vivero'], summary: 'Listar lotes de plantines y germinación', responses: { 200: { description: 'OK' } } }
    },
    '/finanzas/resumen': {
      get: { tags: ['M7 - Finanzas'], summary: 'Costos por lote, ingresos, margen y datos para Chart.js', responses: { 200: { description: 'OK' } } }
    },
    '/whatsapp/simulate': {
      post: {
        tags: ['WhatsApp + Agente IA'],
        summary: 'Enviar mensaje al Agente de IA agrícola (con confirmación obligatoria y límites éticos)',
        responses: { 200: { description: 'Respuesta del agente IA' } }
      }
    },
    '/whatsapp/webhook': {
      get: { tags: ['WhatsApp + Agente IA'], summary: 'Verificación de webhook Meta WhatsApp Cloud API', security: [], responses: { 200: { description: 'Challenge' } } },
      post: { tags: ['WhatsApp + Agente IA'], summary: 'Recepción de mensajes desde Meta WhatsApp Cloud API', security: [], responses: { 200: { description: 'Recibido' } } }
    },
    '/whatsapp/twilio': {
      post: { tags: ['WhatsApp + Agente IA'], summary: 'Recepción de mensajes desde Twilio WhatsApp Sandbox', security: [], responses: { 200: { description: 'TwiML XML' } } }
    }
  }
};

module.exports = swaggerDocument;
