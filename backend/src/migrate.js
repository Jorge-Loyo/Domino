/**
 * Script de migración - Crea las tablas en Neon PostgreSQL
 * Ejecutar: npm run db:migrate
 */
const { sql } = require('./db');

async function migrate() {
    console.log('🏗️  Ejecutando migraciones...\n');

    // Tabla de usuarios
    await sql`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('✓ Tabla usuarios creada');

    // Tabla de jugadores
    await sql`
        CREATE TABLE IF NOT EXISTS jugadores (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('✓ Tabla jugadores creada');

    // Tabla de partidas
    await sql`
        CREATE TABLE IF NOT EXISTS partidas (
            id SERIAL PRIMARY KEY,
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('individual', 'parejas')),
            puntos1 INTEGER NOT NULL DEFAULT 0,
            puntos2 INTEGER NOT NULL DEFAULT 0,
            ganador VARCHAR(20) NOT NULL,
            meta INTEGER DEFAULT 100,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('✓ Tabla partidas creada');

    // Tabla de jugadores por partida (relación muchos a muchos)
    await sql`
        CREATE TABLE IF NOT EXISTS partida_jugadores (
            id SERIAL PRIMARY KEY,
            partida_id INTEGER NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
            jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
            equipo VARCHAR(10) NOT NULL CHECK (equipo IN ('equipo1', 'equipo2'))
        )
    `;
    console.log('✓ Tabla partida_jugadores creada');

    // Tabla de rondas (para partidas en vivo)
    await sql`
        CREATE TABLE IF NOT EXISTS rondas (
            id SERIAL PRIMARY KEY,
            partida_id INTEGER NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
            numero INTEGER NOT NULL,
            puntos1 INTEGER NOT NULL DEFAULT 0,
            puntos2 INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('✓ Tabla rondas creada');

    // Tabla de partidas en vivo (estado temporal)
    await sql`
        CREATE TABLE IF NOT EXISTS partidas_vivo (
            id SERIAL PRIMARY KEY,
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('individual', 'parejas')),
            meta INTEGER NOT NULL DEFAULT 100,
            puntos1 INTEGER NOT NULL DEFAULT 0,
            puntos2 INTEGER NOT NULL DEFAULT 0,
            equipo1_nombre VARCHAR(200) NOT NULL,
            equipo2_nombre VARCHAR(200) NOT NULL,
            equipo1_jugadores JSONB NOT NULL,
            equipo2_jugadores JSONB NOT NULL,
            rondas JSONB DEFAULT '[]',
            activa BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;
    console.log('✓ Tabla partidas_vivo creada');

    // Índices
    await sql`CREATE INDEX IF NOT EXISTS idx_partida_jugadores_partida ON partida_jugadores(partida_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_partida_jugadores_jugador ON partida_jugadores(jugador_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rondas_partida ON rondas(partida_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_partidas_tipo ON partidas(tipo)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_partidas_vivo_activa ON partidas_vivo(activa)`;
    console.log('✓ Índices creados');

    console.log('\n🎉 Migraciones completadas exitosamente!');
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
});
