// GitHub OAuth proxy for Sveltia/Decap CMS (git-gateway-less "github" backend).
//
// Routes:
//   GET /auth      -> redirects the CMS login popup to GitHub's authorize page
//   GET /callback  -> exchanges the GitHub `code` for an access token and
//                      posts it back to the CMS popup opener via postMessage

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

function randomState() {
  return crypto.randomUUID();
}

function htmlResponse(body) {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "") {
      return new Response("Simorchip CMS auth worker is running.", { status: 200 });
    }

    if (url.pathname === "/auth") {
      const referer = request.headers.get("referer") || "";
      const allowed = (env.ALLOWED_DOMAINS || "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      if (referer && allowed.length && !allowed.some((domain) => referer.includes(domain))) {
        return new Response("Forbidden: origin not allowed", { status: 403 });
      }

      const state = randomState();
      const redirectUri = `${url.origin}/callback`;
      const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
      authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("scope", env.OAUTH_SCOPE || "repo,user");
      authorizeUrl.searchParams.set("state", state);

      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        return htmlResponse(renderResult("error", JSON.stringify({ message: "Missing code from GitHub" })));
      }

      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${url.origin}/callback`,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || tokenData.error) {
        return htmlResponse(
          renderResult("error", JSON.stringify({ message: tokenData.error_description || "Token exchange failed" }))
        );
      }

      return htmlResponse(
        renderResult("success", JSON.stringify({ token: tokenData.access_token, provider: "github" }))
      );
    }

    return new Response("Not found", { status: 404 });
  },
};

// Implements the Decap/Sveltia CMS popup postMessage handshake:
// https://decapcms.org/docs/external-oauth-clients/
function renderResult(status, contentJson) {
  const message = `authorization:github:${status}:${contentJson}`;
  return `<!DOCTYPE html>
<html><body>
<script>
(function() {
  var message = ${JSON.stringify(message)};
  function receiveMessage(e) {
    window.opener.postMessage(message, e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;
}
