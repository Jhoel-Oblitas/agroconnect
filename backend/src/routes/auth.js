const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { signToken, authenticate } = require('../middleware/auth');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(4, 'Contraseña requerida')
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, password } = parsed.data;
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        finca: {
          include: {
            modulos: { orderBy: { codigo: 'asc' } }
          }
        }
      }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales incorrectas o usuario inactivo.' });
    }

    const valid = await bcrypt.compare(password, usuario.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const token = signToken(usuario);
    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
        fincaId: usuario.fincaId
      },
      finca: {
        id: usuario.finca.id,
        nombre: usuario.finca.nombre,
        ubicacion: usuario.finca.ubicacion,
        hectareasTotales: usuario.finca.hectareasTotales,
        latitud: usuario.finca.latitud,
        longitud: usuario.finca.longitud
      },
      modulos: usuario.finca.modulos
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const finca = await prisma.finca.findUnique({
      where: { id: req.user.fincaId },
      include: { modulos: { orderBy: { codigo: 'asc' } } }
    });
    res.json({
      usuario: req.user,
      finca: {
        id: finca.id,
        nombre: finca.nombre,
        ubicacion: finca.ubicacion,
        hectareasTotales: finca.hectareasTotales,
        latitud: finca.latitud,
        longitud: finca.longitud,
        telefonoWhatsApp: finca.telefonoWhatsApp,
        descripcion: finca.descripcion
      },
      modulos: finca.modulos
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
