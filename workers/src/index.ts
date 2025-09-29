interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/proxy/')) {
      return handleProxy(request);
    }

    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    return serveStaticAssets(request, env);
  },
};

async function handleProxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/proxy/', '');
  const apiUrl = `https://api.limitless.exchange/${path}`;
  const fullUrl = `${apiUrl}${url.search}`;

  // Forward headers like the original API route did
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === 'host') continue; // Skip host header
    headers.set(key, value);
  }

  // Handle body like the original API route (read as text)
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text();
    } catch (e) {
      // Body might be empty or unreadable
    }
  }

  const response = await fetch(fullUrl, {
    method: request.method,
    headers,
    body: body,
    redirect: 'follow'
  });

  // Create a mutable copy of the response to modify headers
  const newResponse = new Response(response.body, response);

  // Add CORS headers to the response
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Account, X-Signing-Message, X-Signature, Cookie');
  newResponse.headers.set('Access-Control-Allow-Credentials', 'true');

  // Modify Set-Cookie header for local development
  const setCookies = response.headers.get('set-cookie');
  if (setCookies) {
    const modifiedCookie = setCookies
      .replace(/; Domain=[^;]*/gi, '') // Remove Domain attribute
      .replace(/; Secure/gi, '');      // Remove Secure attribute for HTTP
    newResponse.headers.set('Set-Cookie', modifiedCookie);
  }

  return newResponse;
}

function handleOptions(): Response {
    // Handle CORS preflight requests.
    return new Response(null, {
        status: 204, // No Content
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Account, X-Signing-Message, X-Signature, Cookie',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400', // 24 hours
        },
    });
}

async function serveStaticAssets(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) {
    return new Response('Static assets binding not found.', { status: 500 });
  }
  
  // Try to fetch the asset directly.
  const response = await env.ASSETS.fetch(request);

  // If the asset is not found (404), it's likely a client-side route.
  // Serve the 404.html page, which Next.js uses to handle client-side routing in static exports.
  if (response.status === 404) {
    const url = new URL(request.url);
    const notFoundRequest = new Request(new URL('/404.html', url.origin).toString(), request);
    return env.ASSETS.fetch(notFoundRequest);
  }

  return response;
}
