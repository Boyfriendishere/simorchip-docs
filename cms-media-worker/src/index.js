function corsHeaders(origin, env) {
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function authenticate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.UPLOAD_SECRET}`;
}

function json(data, status = 200, origin = '', env = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, env) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (!authenticate(request, env)) {
      return json({ error: 'Unauthorized' }, 401, origin, env);
    }

    // POST /upload
    if (request.method === 'POST' && path === '/upload') {
      let formData;
      try { formData = await request.formData(); }
      catch { return json({ error: 'Invalid form data' }, 400, origin, env); }

      const file = formData.get('file');
      const folder = (formData.get('folder') || 'products').replace(/[^a-zA-Z0-9/_-]/g, '');

      if (!file || typeof file === 'string') {
        return json({ error: 'No file provided' }, 400, origin, env);
      }

      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
      const key = `${folder}/${Date.now()}-${safeName}`;
      const buffer = await file.arrayBuffer();

      await env.BUCKET.put(key, buffer, {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      });

      return json({ url: `${env.PUBLIC_URL}/${key}`, key }, 200, origin, env);
    }

    // GET /list?prefix=products/
    if (request.method === 'GET' && path === '/list') {
      const prefix = url.searchParams.get('prefix') || 'products/';
      const list = await env.BUCKET.list({ prefix, limit: 200 });
      const files = list.objects.map(obj => ({
        key: obj.key,
        url: `${env.PUBLIC_URL}/${obj.key}`,
        size: obj.size,
        uploaded: obj.uploaded,
      }));
      return json({ files }, 200, origin, env);
    }

    // DELETE /delete
    if (request.method === 'DELETE' && path === '/delete') {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'Invalid JSON' }, 400, origin, env); }

      const { key } = body;
      if (!key) return json({ error: 'No key provided' }, 400, origin, env);

      await env.BUCKET.delete(key);
      return json({ success: true }, 200, origin, env);
    }

    return json({ error: 'Not found' }, 404, origin, env);
  },
};
