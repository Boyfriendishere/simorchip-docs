const WORKER = 'https://simorchip-cms-media.nake-design.workers.dev';
const PUB = 'https://pub-03642ec28edd4da6bcaf414c061b4ad6.r2.dev';
const REPO = 'Boyfriendishere/simorchip-docs';
const MEDIA = 'src/_uploads';
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${MEDIA}`;

let secret = '';

self.addEventListener('message', e => {
  if (e.data?.type === 'secret') secret = e.data.value;
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

function fakesha(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(40, '0');
}

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (!url.startsWith(API_BASE)) return;
  e.respondWith(handle(e.request));
});

async function handle(req) {
  const url = new URL(req.url);

  // ── LIST ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const r = await fetch(`${WORKER}/list?prefix=`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    if (!r.ok) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    const { files } = await r.json();

    const items = (files || [])
      .filter(f => !f.key.endsWith('.keep'))
      .map(f => {
        const name = f.key.split('/').pop();
        const sha = fakesha(f.key);
        return {
          type: 'file', name,
          path: `${MEDIA}/${f.key}`,
          sha, size: f.size || 0,
          download_url: f.url,
          url: `${API_BASE}/${f.key}`,
          html_url: f.url,
          git_url: '',
          _links: { self: `${API_BASE}/${f.key}`, git: '', html: f.url }
        };
      });

    return new Response(JSON.stringify(items), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ── UPLOAD ────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const body = await req.json().catch(() => null);
    if (!body?.content) return Response.error();

    const b64 = body.content.replace(/\s/g, '');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const fileName = decodeURIComponent(url.pathname.split('/').pop());
    const fd = new FormData();
    fd.append('file', new File([bytes], fileName));
    fd.append('folder', 'products');

    const r = await fetch(`${WORKER}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      body: fd
    });
    const { url: r2url, key } = await r.json();
    const sha = fakesha(key);

    return new Response(JSON.stringify({
      content: {
        name: fileName, path: `${MEDIA}/${key}`,
        sha, size: bytes.length, download_url: r2url, type: 'file'
      },
      commit: { sha: fakesha('c' + key), message: body.message || 'upload' }
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // ── DELETE ────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const key = decodeURIComponent(
      url.pathname.replace(`/repos/${REPO}/contents/${MEDIA}/`, '')
    );
    await fetch(`${WORKER}/delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    return new Response(JSON.stringify({
      commit: { sha: fakesha('d' + key) }
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  return fetch(req);
}
