const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../db');

const router = Router();

// POST /api/auth/registro - Registrar usuario
router.post('/registro', async (req, res, next) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
        }

        // Verificar si el email ya existe
        const [existente] = await sql`
            SELECT id FROM usuarios WHERE LOWER(email) = LOWER(${email.trim()})
        `;

        if (existente) {
            return res.status(409).json({ error: 'Ese email ya está registrado' });
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Crear usuario
        const [usuario] = await sql`
            INSERT INTO usuarios (nombre, email, password)
            VALUES (${nombre.trim()}, ${email.trim().toLowerCase()}, ${passwordHash})
            RETURNING id, nombre, email, created_at
        `;

        // Generar token
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
            token
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario
        const [usuario] = await sql`
            SELECT id, nombre, email, password FROM usuarios WHERE LOWER(email) = LOWER(${email.trim()})
        `;

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Verificar contraseña
        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Generar token
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
            token
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/auth/me - Obtener usuario actual
router.get('/me', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token requerido' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [usuario] = await sql`
            SELECT id, nombre, email, created_at FROM usuarios WHERE id = ${decoded.id}
        `;

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(usuario);
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        next(err);
    }
});

module.exports = router;
