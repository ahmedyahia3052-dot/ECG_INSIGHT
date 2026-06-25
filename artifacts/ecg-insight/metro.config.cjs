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
      return upstream(req, res, next);
    };
  },
};

module.exports = config;
