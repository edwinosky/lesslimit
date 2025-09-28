# LessLimit DApp Deployment Guide

## 🚀 Despliegue en Cloudflare Pages

Esta aplicación Next.js está configurada para desplegarse en Cloudflare Pages con compatibilidad completa.

### 📋 Pre-requisitos

1. **Cuenta de Cloudflare**: Crear cuenta en [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Instalar Wrangler globalmente
   ```bash
   npm install -g wrangler
   ```
3. **Cloudflare Authentication**: Login y configuración
   ```bash
   wrangler auth login
   ```

### ⚙️ Configuración Inicial

#### 1. Actualizar `wrangler.toml`

Reemplaza `"your-account-id-here"` con tu Account ID real de Cloudflare:

```toml
[pages_store]
account_id = "tu-account-id-real-aqui"
```

Para encontrar tu Account ID:
- Ve a [dash.cloudflare.com](https://dash.cloudflare.com)
- En el sidebar derecho, verás "Account ID" en la sección Overview

#### 2. Environment Variables (Opcional)

Si necesitas variables de entorno, modifícalas en `wrangler.toml`:

```toml
[vars]
NODE_ENV = "production"
VITE_SOME_API_KEY = "your-api-key-here"
```

### 🛠️ Pasos de Despliegue

#### Método 1: Wrangler CLI (Manual)

```bash
# 1. Instalar dependencias
npm install

# 2. Construir aplicación
npm run build

# 3. Desplegar a Cloudflare Pages
npm run deploy

# 4. Ver el resultado
# URL: https://lesslimit.pages.dev (o el dominio personalizado que configures)
```

#### Método 2: Despliegue Automático desde GitHub (Recomendado para producción)

**💡 PASO A PASO COMPLETO:**

##### **Paso 1: Preparar Repositorio GitHub**
```bash
# Crear repo en GitHub
git init
git add .
git commit -m "🚀 Ready for production deployment"
git branch -M main
git remote add origin https://github.com/tu-usuario/lesslimit.git
git push -u origin main
```

##### **Paso 2: Conectar GitHub a Cloudflare Pages**
1. **Ve a Cloudflare Dashboard:**
   - Entra a [dash.cloudflare.com](https://dash.cloudflare.com)
   - Ve a sección "Pages" en el menú lateral

2. **Crear Project:**
   - Click "Create a project"
   - Selecciona "Connect to Git" → "GitHub" o tu proveedor Git

3. **Configurar GitHub:**
   - **Repository name:** `tu-usuario/lesslimit`
   - **Branch to deploy:** `main` (o la rama que prefieras)
   - Click "Begin setup"

##### **Paso 3: Configurar Build Settings**
En la página de configuración de Cloudflare Pages, establece:

- **Build Settings** → `Framework preset` → `Next.js`
- **Build command:** `npm run build`
- **Build output directory:** `.output`
- **Root directory:** `/` (raíz del repositorio)

##### **Paso 4: Environment Variables**
En la sección "Environment variables", agrega:

```
# Variables de producción (opcional - configúralas según necesites)
NODE_ENV = production
```

##### **Paso 5: URL Final**
Después de completar la configuración:

- ✅ **URL automática:** `https://lesslimit.pages.dev`
- ✅ **Dominoio personalizado:** Configura DNS si tienes dominio propio

##### **Paso 6: Despliegue Automático**
**¡Cada push a GitHub ahora desplegará automáticamente!**

```bash
# Ejemplo workflow típico:
git add .
git commit -m "✨ Added new feature"
git push origin main
# → Despliegue automático en Cloudflare Pages en segundos ✨
```

#### 🔄 Configuración de Dominio Personalizado (Opcional)

Si quieres usar tu propio dominio en lugar de `lesslimit.pages.dev`:

1. **Configurar DNS:**
   - Ve a tu registrador de dominio
   - Agrega un CNAME record apuntando a `lesslimit.pages.dev`

2. **En Cloudflare:**
   - Ve a Pages → Tu proyecto
   - Custom domains → Add custom domain
   - Ingresa tu dominio y sigue las instrucciones

3. **Ejemplo:** `https://tradepredictions.com` o `https://lesslimit.app`

⚡ **Resultado:** Cada push a GitHub → despliegue automático → tu dominio personalizado

### 🔧 Configuración Avanzada

#### Headers de Seguridad
Los headers están pre-configurados en `wrangler.toml`:
- X-Frame-Options: DENY
- X-XSS-Protection
- X-Content-Type-Options
- Referrer-Policy

#### Caching
- Assets estáticos: 1 año cache
- Imágenes: 24 horas cache
- API routes: No cache (para data fresca)

#### Rate Limiting
Comentarios de ejemplo incluidos para limitar API calls si es necesario.

### 🌐 URLs de Producción

Después del despliegue, tendrás URLs como:
- `https://lesslimit.pages.dev` (Cloudflare asignado)
- `https://tudominio.com` (Si configuras custom domain)

### 📊 Monitoreo y Analytics

#### Cloudflare Analytics
Está configurado para capturar analytics. Puedes uncommentar en `wrangler.toml`:

```toml
[analytics_engine_datasets]
dataset = "lesslimit-analytics"
```

#### Métricas Web Vitals
La aplicación incluye métricas de rendimiento automáticamente.

### 🐛 Troubleshooting

#### Error: "No se puede conectar a wallet"
- Asegúrate de que tu dominio esté agregado en MetaMask
- Check que usas HTTPS en producción

#### Error: "API calls fallan"
- Verifica que las CORS headers estén correctos
- Asegúrate de que estás usando la URL de producción, no localhost

#### Error: "Build falla"
- Check que `npm run build` funciona localmente
- Verifica la compatibilidad de dependencias con Cloudflare runtime

### 🔍 Verificación Post-Despliegue

1. **Wallet Connection**: ✅ MetaMask conecta correctamente
2. **Markets Loading**: ✅ Muestra mercados reales
3. **Trading Panel**: ✅ Funciona correctamente
4. **Portfolio**: ✅ Muestra data real
5. **API Calls**: ✅ No hay errores CORS
6. **Performance**: ✅ Carga rápida

### 📞 Support

Si tienes problemas con el despliegue:
1. Check Cloudflare Pages build logs
2. Verifica configuración de `wrangler.toml`
3. Asegúrate de que todas las dependencias se instalen correctamente

¡Tu dApp LessLimit está lista para el mundo! 🎉
