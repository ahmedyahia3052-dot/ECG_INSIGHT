const http = require("node:http");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const existingEnhanceMiddleware = config.server?.enhanceMiddleware;

const webEntryQuery = [
  "platform=web",
  "dev=true",
  "hot=false",
  "lazy=true",
  "transform.engine=hermes",
  "transform.routerRoot=app",
  "transform.reactCompiler=true",
  "unstable_transformProfile=hermes-stable",
].join("&");

const API_PROXY_TARGET = (process.env.EXPO_DEV_API_PROXY ?? "http://127.0.0.1:3002").replace(/\/+$/, "");
const PROXY_PATH_PREFIXES = ["/api", "/liveness", "/health", "/readiness", "/live", "/ready", "/metrics"];

function shouldProxyRequest(url = "") {
  const path = url.split("?")[0] ?? "";
  return PROXY_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function proxyToApi(req, res) {
  const target = new URL(req.url ?? "/", API_PROXY_TARGET);
  const headers = { ...req.headers, host: target.host };

  const proxyReq = http.request(
    {
      headers,
      hostname: target.hostname,
      method: req.method,
      path: `${target.pathname}${target.search}`,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        message: "Backend API unavailable on port 3002. Start it with npm run dev:api.",
        ok: false,
        service: "ecg-insight-api-proxy",
      }));
    }
  });

  req.pipe(proxyReq);
}

config.server = {
  ...config.server,
  enhanceMiddleware(middleware, server) {
    const upstream = existingEnhanceMiddleware
      ? existingEnhanceMiddleware(middleware, server)
      : middleware;

    return (req, res, next) => {
      if (req.url === "/node_modules/expo-router/entry.bundle") {
        req.url = `/node_modules/expo-router/entry.bundle?${webEntryQuery}`;
      }
      if (shouldProxyRequest(req.url ?? "")) {
        proxyToApi(req, res);
        return;
      }
      return upstream(req, res, next);
    };
  },
};

module.exports = config;
