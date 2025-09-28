import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  // Usar la URL de la API real según la documentación (sin /api-v1)
  const url = `https://api.limitless.exchange/${pathStr}`;
  const query = request.nextUrl.searchParams.toString();
  const fullUrl = query ? `${url}?${query}` : url;

  // Headers para autenticación de Limitless
  const headers: Record<string, string> = {};

  const xAccount = request.headers.get('X-Account');
  const xSigningMessage = request.headers.get('X-Signing-Message');
  const xSignature = request.headers.get('X-Signature');
  const authorization = request.headers.get('Authorization');

  if (xAccount) headers['X-Account'] = xAccount;
  if (xSigningMessage) headers['X-Signing-Message'] = xSigningMessage;
  if (xSignature) headers['X-Signature'] = xSignature;
  // La API usa cookies, pero permitimos Authorization si es enviado
  if (authorization) headers['Authorization'] = authorization;

  // Incluir cookies para mantener la sesión
  const cookie = request.headers.get('Cookie');
  if (cookie) headers['Cookie'] = cookie;

  headers['Content-Type'] = 'application/json';
  headers['Accept'] = 'application/json';

  const response = await fetch(fullUrl, {
    headers,
  });

  const data = await response.text();
  
  // Modificar cookies para que funcionen en desarrollo local
  const setCookies = response.headers.get('set-cookie');
  const responseHeaders = new Headers({
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Account, X-Signing-Message, X-Signature, Cookie',
    'Access-Control-Allow-Credentials': 'true',
  });

  // Modificar cookies para desarrollo local si estamos en localhost
  if (setCookies) {
    // Parsear las cookies y modificar el domain para desarrollo
    const modifiedCookies = setCookies.split(',').map(cookie => {
      return cookie
        .replace(/Domain=\.limitless\.exchange/g, 'Domain=localhost')
        .replace(/; Secure/g, ''); // Remover Secure para desarrollo HTTP
    }).join(', ');

    console.log('🍪 COOKIES ORIGINALES:', setCookies);
    console.log('🍪 COOKIES MODIFICADAS:', modifiedCookies);

    responseHeaders.set('Set-Cookie', modifiedCookies);
  }

  return new NextResponse(data, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  // Usar la URL de la API real según la documentación (sin /api-v1)
  const url = `https://api.limitless.exchange/${pathStr}`;

  const body = await request.text();
  
  // Headers para autenticación de Limitless
  const headers: Record<string, string> = {};

  const xAccount = request.headers.get('X-Account');
  const xSigningMessage = request.headers.get('X-Signing-Message');
  const xSignature = request.headers.get('X-Signature');
  const authorization = request.headers.get('Authorization');

  if (xAccount) headers['X-Account'] = xAccount;
  if (xSigningMessage) headers['X-Signing-Message'] = xSigningMessage;
  if (xSignature) headers['X-Signature'] = xSignature;
  // La API usa cookies, pero permitimos Authorization si es enviado
  if (authorization) headers['Authorization'] = authorization;

  // Incluir cookies para mantener la sesión
  const cookie = request.headers.get('Cookie');
  if (cookie) headers['Cookie'] = cookie;
  
  headers['Content-Type'] = 'application/json';
  headers['Accept'] = 'application/json';

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: body || undefined,
  });

  const data = await response.text();

  // Modificar cookies para que funcionen en desarrollo local (igual que GET)
  const setCookies = response.headers.get('set-cookie');
  const responseHeaders = new Headers({
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Account, X-Signing-Message, X-Signature, Cookie',
    'Access-Control-Allow-Credentials': 'true',
  });

  // Modificar cookies para desarrollo local si estamos en localhost
  if (setCookies) {
    // Parsear las cookies y modificar el domain para desarrollo
    const modifiedCookies = setCookies.split(',').map(cookie => {
      return cookie
        .replace(/Domain=\.limitless\.exchange/g, 'Domain=localhost')
        .replace(/; Secure/g, ''); // Remover Secure para desarrollo HTTP
    }).join(', ');

    responseHeaders.set('Set-Cookie', modifiedCookies);
  }

  return new NextResponse(data, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Account, X-Signing-Message, X-Signature, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
