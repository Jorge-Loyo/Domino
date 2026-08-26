# 🦬 Búfalos Mojados - Domino Tracker

Aplicación para registrar partidas de dominó, llevar marcador en vivo y consultar ranking.

## Stack

- **Frontend:** HTML/CSS/JS (PWA) → Vercel
- **Backend:** Node.js + Express → Render
- **Base de datos:** PostgreSQL → Neon

## Estructura

```
├── backend/          # API REST (Express)
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js
│   │   ├── migrate.js
│   │   └── routes/
│   ├── render.yaml
│   └── package.json
├── frontend/         # PWA (Vanilla JS)
│   ├── index.html
│   ├── src/js/
│   ├── src/css/
│   ├── sw.js
│   ├── manifest.json
│   └── vercel.json
```

## Setup

### 1. Base de datos (Neon)

1. Crear cuenta en [neon.tech](https://neon.tech)
2. Crear un proyecto y copiar el connection string
3. En `backend/`, crear `.env` con el `DATABASE_URL`
4. Ejecutar: `npm run db:migrate`

### 2. Backend (Render)

1. En [render.com](https://render.com), crear un "Web Service"
2. Conectar este repo, configurar Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Agregar variables de entorno: `DATABASE_URL` y `FRONTEND_URL`

### 3. Frontend (Vercel)

1. En [vercel.com](https://vercel.com), importar este repo
2. Configurar Root Directory: `frontend`
3. Framework Preset: Other
4. En `frontend/src/js/api.js`, actualizar la URL del backend

## Desarrollo local

```bash
# Backend
cd backend
cp .env.example .env  # Completar DATABASE_URL
npm install
npm run db:migrate
npm run dev

# Frontend - servir con cualquier server estático
cd frontend
npx serve .
```
