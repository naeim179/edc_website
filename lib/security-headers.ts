export function securityHeaders(development = false) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://*.supabase.co wss://*.supabase.co https://*.mux.com https://*.muxed.dev https://*.litix.io https://storage.googleapis.com https://*.mediadelivery.net https://*.b-cdn.net https://video.bunnycdn.com https://challenges.cloudflare.com${development ? " ws: http://localhost:* http://127.0.0.1:*" : ""}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob: https://*.mux.com https://*.b-cdn.net https://*.mediadelivery.net https://*.googlevideo.com",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://iframe.mediadelivery.net https://player.mediadelivery.net https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self' https://secure-jordan.paytabs.com https://secure.paytabs.com",
    ...(!development ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    ...(!development
      ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
      : []),
  ];
}
