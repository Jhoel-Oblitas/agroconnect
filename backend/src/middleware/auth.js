const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'agroconnect_dev_jwt_secret_2026_unifranz_el_alto';

function signToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      fincaId: usuario.fincaId,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, fincaId: true, nombre: true, email: true, rol: true, activo: true, telefono: true }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario inválido o inactivo.' });
    }

    req.user = usuario;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

function authorizeRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}.`,
        tuRol: req.user.rol
      });
    }
    next();
  };
}

module.exports = {
  signToken,
  authenticate,
  authorizeRoles
};
