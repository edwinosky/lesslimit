addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle root path - serve index.html
    if (path === '/' || path === '/index.html') {
      return fetch(`${request.url.replace(url.pathname, '/index.html')}`);
    }

    // Serve static assets
    try {
      return await fetch(request);
    } catch {
      // Fallback to index.html for SPA routes
      return fetch(`${url.origin}/index.html`);
    }
  } catch (error) {
    console.error('Worker error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
