# LessLimit DApp 🌟

Una aplicación descentralizada (DApp) que clona la plataforma [Limitless.exchange](https://limitless.exchange), un mercado de predicciones y apuestas para trading de eventos futuros. Esta DApp ofrece una experiencia moderna y responsive con autenticación wallet, datos en tiempo real y operaciones de trading a través de APIs off-chain.

## 🚀 URL Desplegada

**V1 Funcional:** https://lesslimit.pittersedwin.workers.dev

## ✨ Características Principales

- **🌐 Autenticación Completa:** Sign-In with Ethereum (SIWE) usando wallets MetaMask, Rainbow, etc.
- **📊 Mercados en Tiempo Real:** WebSocket para actualizaciones live de mercados y precios
- **💼 Portfolio Personal:** Dashboard con posiciones, trades y historial de operaciones
- **⚡ Trading Interactivo:** Formulario para colocar órdenes con precios dinámicos
- **🎨 UI/UX Moderna:** Tema oscuro, responsive (desktop/mobile), animaciones suaves
- **🔒 Seguridad:** Sesiones persistentes, JSON Web Tokens, protección CSRF

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Blockchain:** Viem + RainbowKit, red Base (chain ID 8453)
- **API:** Cloudflare Workers proxy a `https://api.limitless.exchange`
- **Real-time:** WebSocket para mercados, polling para portfolio
- **Despliegue:** Cloudflare Pages + Workers con protección de assets
- **Auth:** SIWE (Sign-In with Ethereum) con sesiones persistentes

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerrequisitos

- **Node.js 18+**
- **Git**
- **Wallet MetaMask o similar**

### Instalación Local

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/edwinosky/lesslimit.git
   cd lesslimit
   ```

2. **Instala dependencias:**
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abre tu navegador en:** [http://localhost:3000](http://localhost:3000)

5. **Conecta tu wallet** desde la navbar para acceder a funcionalidades premium

### Comandos Disponibles

```bash
# Development
npm run dev                    # Servidor local con hot reload
npm run cf:preview            # Previsualizar deploy en Cloudflare Workers

# Build & Deploy
npm run build                 # Construir para producción
npm run deploy                # Deploy completo a Cloudflare

# Testing
npm run lint                  # Revisar código con ESLint
```

## 🚀 Despliegue en Producción

Esta DApp está optimizada para deploy en **Cloudflare Workers/Pages**. Aquí está el procedimiento completo:

### Configuración Inicial

1. **Instala Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Configura Cloudflare:**
   ```bash
   npx wrangler auth login
   ```

3. **Actualiza configuración** (si es necesario):
   ```toml
   # wrangler.toml
   name = "lesslimit"
   compatibility_date = "2024-09-27"
   account_id = "TU_ACCOUNT_ID"
   
   [assets]
   directory = "out"
   ```

### Flujo de Despliegue

```bash
# 1. Construir aplicación (incluye copiado de .assetsignore)
npm run build

# 2. Previsualizar localmente en Cloudflare
npm run cf:preview

# 3. Deploy a producción
npm run deploy
```

### Pruebas Post-Deploy

1. **Visita la URL desplegada:** https://lesslimit.pittersedwin.workers.dev
2. **Conecta una wallet** (MetaMask recomendado)
3. **Navega:** Mercados → Trading → Portfolio
4. **Verifica:** Datos reales en tiempo real, operaciones autenticadas

## 📁 Estructura del Proyecto

```
lesslimit/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Layout principal con Providers
│   │   ├── page.tsx           # Homepage con mercados + portfolio
│   │   ├── trade/             # Página de trading
│   │   ├── portfolio/         # Dashboard del portfolio
│   │   ├── providers.tsx      # Wagmi/RainbowKit setup
│   │   └── globals.css
│   └── components/             # Componentes reutilizables
│       ├── AuthManager.tsx    # Gestor de autenticación SIWE
│       ├── Navbar.tsx         # Navigation con wallet connect
│       ├── MarketCard.tsx     # Card para mercados
│       └── MarketFilters.tsx  # Filtros de mercados
├── workers/                   # Cloudflare Workers
│   ├── src/
│   │   └── index.ts          # Worker proxy para APIs
│   └── tsconfig.json
├── public/                    # Assets estáticos
├── wrangler.toml              # Configuración Cloudflare
├── .assetsignore             # Protección de código privado
└── package.json              # Scripts y dependencias
```

## 🔐 Autenticación

El flow de autenticación sigue el estándar **Sign-In with Ethereum (SIWE)**:

1. **Conectar Wallet:** Usuario conecta desde navbar
2. **Mensaje de Firma:** Frontend obtiene nonce desde `/api/proxy/auth/signing-message`
3. **Firma:** Wallet firma el mensaje completo
4. **Login:** Se envía firma + nonce hex a `/api/proxy/auth/login`
5. **Sesión:** API responde con cookie de sesión, almacenada automáticamente

## 🚀 API Endpoints Usados

### Públicas
- `GET /api/proxy/markets/active` - Mercados activos en tiempo real

### Autenticadas (requiere wallet)
- `GET /api/proxy/auth/signing-message` - Obtener nonce para firma
- `POST /api/proxy/auth/login` - Autenticación con firma SIWE
- `GET /api/proxy/auth/verify-auth` - Verificar sesión existente
- `GET /api/proxy/portfolio/*` - Portfolio del usuario (positions, trades)
- `POST /api/proxy/orders` - Crear nuevas órdenes

## 🎯 Próximas Features (V2 Roadmap)

- **🌍 Multi-idioma:** Sistema de internacionalización con `next-intl`
- **🤖 Trading con IA:** Análisis técnico automático usando Cloudflare Workers AI (@cf/meta/llama-3.1-70b-instruct)
- **🛡️ Anti-MEV:** Estrategias avanzadas contra frontrunning y sandwich attacks
- **📈 Analytics Avanzado:** Gráficos interactivos, indicadores técnicos
- **🔗 Multi-chain:** Soporte para Ethereum, Polygon, Arbitrum
- **📱 PWA:** Funcionalidad offline y notificaciones push

## 🔧 Troubleshooting

### Problema: Error 404 en endpoints de portfolio
**Solución:** Conecta tu wallet primero - estas APIs requieren autenticación SIWE

### Problema: Error 500 en despliegue
**Solución:** Verifica que `.assetsignore` se haya copiado correctamente al directorio `out/`

### Problema: Wallet no se conecta
**Solución:** Usa una red compatible (Base) y MetaMask actualizado

## 📄 Licencias y Créditos

- **Motivado por:** [Limitless.exchange](https://limitless.exchange)
- **Documentación API:** [docs.limitless.exchange](https://docs.limitless.exchange)
- **Red Blockchain:** [Base Network](https://docs.base.org)

---

**✅ V1 Completa:** DApp funcional con autenticación, trading y portfolio
**🚧 Próximamente:** Multi-idioma, IA para trading, protección MEV
