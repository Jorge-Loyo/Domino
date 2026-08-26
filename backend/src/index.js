const express = require('express');
const cors = require('cors');
require('dotenv').config();

const jugadoresRouter = require('./routes/jugadores');
const partidasRouter = require('./routes/partidas');
const rankingRouter = require('./routes/ranking');
const vivoRouter = require('./routes/vivo');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
    res.json({ message: '🦬 Búfalos Mojados API - Domino Tracker', status: 'online' });
});

app.use('/api/jugadores', jugadoresRouter);
app.use('/api/partidas', partidasRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/vivo', vivoRouter);

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`\n🦬 Búfalos Mojados API corriendo en puerto ${PORT}`);
    console.log(`   http://localhost:${PORT}\n`);
});
