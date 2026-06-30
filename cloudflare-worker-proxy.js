// Cloudflare Worker CORS Proxy for Aliphia ERP Integration
// This script bypasses Google Cloud Run IP blockages (403) and browser CORS restrictions.
// Deploy this for FREE on your Cloudflare account in 2 minutes.

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-KEYALI-API, Cache-Control, Pragma, Expires",
      "Access-Control-Max-Age": "86400",
    };

    // 1. Handle Preflight OPTIONS requests from Chrome/Safari
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // 2. Parse the target URL from the query string
    // Format: https://your-worker.workers.dev/?https://aliphia.com/v1/api_public/...
    const url = new URL(request.url);
    let targetUrlStr = url.search.substring(1); // Get everything after "?"
    
    if (!targetUrlStr) {
      return new Response("Missing target URL. Usage: https://your-worker-proxy.workers.dev/?https://aliphia.com/...", {
        status: 400,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Decode target URL if browser passed it encoded
    try {
      if (targetUrlStr.startsWith("http%3A") || targetUrlStr.startsWith("https%3A")) {
        targetUrlStr = decodeURIComponent(targetUrlStr);
      }
    } catch (e) {}

    // Security check: Only allow forwarding to Aliphia to protect your worker from abuse
    if (!targetUrlStr.includes("aliphia.com")) {
      return new Response("Forbidden target. This proxy only forwards requests to aliphia.com.", {
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // 3. Forward the actual request (GET, POST, PUT) to Aliphia
    try {
      const originalHeaders = new Headers(request.headers);
      
      // Build clean headers, removing Cloudflare-specific or origin-locked headers
      const headersToSend = new Headers();
      for (const [key, value] of originalHeaders.entries()) {
        const lowerKey = key.toLowerCase();
        if (
          !lowerKey.startsWith("cf-") && 
          !lowerKey.startsWith("x-forwarded-") &&
          lowerKey !== "host" &&
          lowerKey !== "origin" &&
          lowerKey !== "referer"
        ) {
          headersToSend.set(key, value);
        }
      }

      const fetchOptions = {
        method: request.method,
        headers: headersToSend,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
        redirect: "follow"
      };

      const aliphiaResponse = await fetch(targetUrlStr, fetchOptions);
      
      // 4. Return the response back to browser with full CORS support
      const responseHeaders = new Headers(aliphiaResponse.headers);
      
      // Append modern CORS headers
      for (const [key, value] of Object.entries(corsHeaders)) {
        responseHeaders.set(key, value);
      }
      
      // Remove transfer-encoding or content-encoding that could conflict with Cloudflare CDN
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("transfer-encoding");

      return new Response(aliphiaResponse.body, {
        status: aliphiaResponse.status,
        statusText: aliphiaResponse.statusText,
        headers: responseHeaders
      });
    } catch (err) {
      return new Response(`Proxy Error: ${err.message}`, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
