const prisma = require('../utils/prisma');

/**
 * Middleware que valida dinámicamente si un módulo (M0-M7) está activo
 * para la finca del usuario autenticado.
 */
function requireModule(codigoModulo) {
  return async (req, res, next) => {
    try {
      if (!req.user?.fincaId) {
        return res.status(401).json({ error: 'Finca no identificada en la sesión.' });
      }
      if (codigoModulo === 'M0') return next();

      const modulo = await prisma.moduloActivo.findUnique({
        where: {
          fincaId_codigo: {
            fincaId: req.user.fincaId,
            codigo: codigoModulo
          }
        }
      });

      if (!modulo || !modulo.activo) {
        return res.status(403).json({
          error: `El módulo ${codigoModulo} se encuentra desactivado para esta finca.`,
          codigoModulo,
          moduloDesactivado: true
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireModule };
