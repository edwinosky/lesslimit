# LessLimit DApp Deployment Guide

## 🚀 Despliegue en Cloudflare Workers

Esta aplicación Next.js está configurada para desplegarse como un **Cloudflare Worker service**, lo que proporciona mejor rendimiento y más flexibilidad que Cloudflare Pages.

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
   > **IMPORTANTE:** Usa `wrangler auth login` (OAuth) para máxima compatibilidad con Workers. Los tokens API requieren configuración especial para operaciones completas.

### ⚙️ Configuración Inicial

#### 1. Actualizar `wrangler.toml`

Reemplaza `"your-account-id-here"` con tu Account ID real de Cloudflare:

```toml
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

# 3. Desplegar como Cloudflare Worker
npm run build:deploy

# 4. Ver el resultado
wrangler tail  # Para ver logs en tiempo real
# URL: https://lesslimit.your-subdomain.workers.dev
```

#### Método 2: Despliegue Manual desde Cloudflare Dashboard

1. **Ve al Cloudflare Dashboard**
   - Entra a [dash.cloudflare.com](https://dash.cloudflare.com)
   - Ve a la sección "Workers & Pages" → "Workers"

2. **Crear Worker**
   - Click "Create application" → "Create Worker"
   - Choose "Deploy with Wrangler" (aunque conectes manualmente)

3. **Conectar con Wrangler CLI**
   ```bash
   # Ya tienes la configuración en wrangler.toml
   npm run build:deploy
   ```

4. **Configurar dominio personalizado (opcional)**
   - En la pestaña "Triggers" de tu worker
   - Agrega routes personalizadas

#### 🔄 Configuración de Dominio Personalizado (Opcional)

Si quieres usar tu propio dominio en lugar del `.workers.dev`:

1. **Configurar routes en wrangler.toml:**
   ```toml
   routes = [
     { pattern = "your-domain.com", zone_name = "your-domain.com" },
     { pattern = "www.your-domain.com", zone_name = "your-domain.com" },
   ]
   ```

2. **Desplegar actualización:**
   ```bash
   npm run build:deploy
   ```

3. **Ejemplo:** `https://tradepredictions.com` o `https://lesslimit.app`

⚡ **Resultado:** Acceso directo desde tu dominio personalizado

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
- `https://lesslimit.your-subdomain.workers.dev` (Cloudflare asignado automáticamente)
- `https://tudominio.com` (Si configuras un dominio personalizado)

> **Nota:** Tu worker estará disponible inmediatamente después del despliegue sin necesidad de configuración adicional.

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

#### Error: "Authentication error [code: 10000]"
- **Problema**: Problemas con la autenticación de Wrangler
- **Solución**: Usa `wrangler auth login` para hacer login nuevamente

#### Error: "El worker no se despliega"
- **Problema**: Posibles errores en la configuración de `wrangler.toml`
- **Solución**:
   1. Verifica que `account_id` esté configurado correctamente
   2. Asegúrate de que `npm run build` funciona sin errores
   3. Check que tienes Node.js 18+ instalado

#### Error: "El dominio personalizado no funciona"
- **Solución**:
   1. Verifica que el dominio está añadido al DNS de Cloudflare
   2. Asegúrate de que los routes están configurados correctamente
   3. Espera unos minutos para propagación de DNS

**Recomendación:** Usa `wrangler auth login` en lugar de tokens API para máxima compatibilidad.

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
1. Check los logs de Wrangler con `wrangler tail`
2. Verifica configuración de `wrangler.toml`
3. Asegúrate de que todas las dependencias se instalen correctamente
4. Verifica que tienes Node.js 18+ instalado

¡Tu dApp LessLimit está lista para el mundo! 🎉
