# Home SD — Control Financiero Familiar

PWA de finanzas personales para la familia Sierra Dávila.

## Stack
- **Frontend**: React + Vite PWA
- **Backend**: Vercel Serverless Functions (Edge)
- **IA**: Claude Haiku 4.5 (lectura de tickets) + Claude Sonnet 4.6 (análisis)
- **Storage**: localStorage (fase 1) → Google Drive JSON (fase 2)
- **Deploy**: GitHub + Vercel

---

## Setup en 5 pasos

### 1. Clonar y preparar
```bash
git clone https://github.com/TU_USUARIO/homesd.git
cd homesd
npm install
```

### 2. Variables de entorno
```bash
cp .env.example .env.local
# Edita .env.local y agrega tu ANTHROPIC_API_KEY
```

### 3. Desarrollo local
```bash
npm run dev
# Abre http://localhost:5173
```

### 4. Subir a GitHub
```bash
git add .
git commit -m "init: Home SD v1.0"
git push origin main
```

### 5. Deploy en Vercel
1. Ve a vercel.com → "New Project"
2. Importa el repositorio de GitHub
3. En "Environment Variables" agrega:
   - `ANTHROPIC_API_KEY` = tu sk-ant-...
4. Click "Deploy"
5. Vercel te da una URL tipo `homesd.vercel.app`

### Instalar como PWA en el celular
1. Abre la URL en Safari (iOS) o Chrome (Android)
2. iOS: botón compartir → "Agregar a pantalla de inicio"
3. Android: menú → "Instalar aplicación"

---

## Estructura del proyecto
```
homesd/
├── api/
│   ├── analyze.js       # Claude lee tickets/movimientos
│   └── conciliate.js    # Claude concilia banco vs registros
├── public/
│   └── icons/           # Iconos PWA (192x192, 512x512)
├── src/
│   ├── data/
│   │   └── budget.js    # Presupuesto base y categorías
│   ├── hooks/
│   │   └── useStorage.js
│   ├── screens/
│   │   ├── LoginScreen.jsx
│   │   ├── DashboardScreen.jsx
│   │   ├── CaptureScreen.jsx
│   │   ├── TransactionsScreen.jsx
│   │   ├── ConciliationScreen.jsx
│   │   └── SettingsScreen.jsx
│   ├── components/
│   │   ├── BottomNav.jsx
│   │   ├── SemaphoreCard.jsx
│   │   └── TransactionCard.jsx
│   ├── styles/
│   │   └── app.css
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── vercel.json
├── vite.config.js
└── index.html
```

---

## Agregar íconos PWA

Coloca en `public/icons/`:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

Usa la imagen del Home SD que generaste en Gemini, recórtala en formato cuadrado.

---

## Emails autorizados (seguridad)

En `src/screens/LoginScreen.jsx`, línea `ALLOWED_EMAILS`, agrega:
```js
const ALLOWED_EMAILS = [
  'tu-email@gmail.com',
  'nayeli-email@gmail.com',
]
```

---

## Fase 2 — Google Drive como base de datos

Cuando estés listo, la migración de localStorage a Google Drive requiere:
1. Crear proyecto en Google Cloud Console
2. Habilitar Drive API y OAuth 2.0
3. Agregar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en Vercel
4. Actualizar `useStorage.js` para leer/escribir en Drive

Los datos actuales en localStorage se exportan automáticamente al migrar.
