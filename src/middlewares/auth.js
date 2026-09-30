const env = require("../config/env");
const {
  safeEqual,
  sha256,
  deriveKey,
  issueToken,
  verifySignedRequest,
  createReplayGuard,
} = require("../utils/signing");

const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const CLIENT_SESSION_TTL_MS = 15 * 60 * 1000;

const adminKey = deriveKey(env.adminSecret, "dq-admin-session");
const clientKey = deriveKey(env.adminSecret, "dq-client-session");
const isFreshAdmin = createReplayGuard();
const isFreshClient = createReplayGuard();

const fingerprint = (req) => sha256(req.get("User-Agent") || "unknown");

const isValidAdminCredentials = (username, password) => {
  if (typeof username !== "string" || typeof password !== "string") return false;
  const userOk = safeEqual(username.trim().toLowerCase(), env.adminUser.toLowerCase());
  const passwordOk = safeEqual(password, env.adminSecret);
  return userOk && passwordOk;
};

const createAdminSession = () => issueToken(adminKey, ADMIN_SESSION_TTL_MS, { role: "admin" });

const createClientSession = (req) => issueToken(clientKey, CLIENT_SESSION_TTL_MS, { role: "client", fp: fingerprint(req) });

const requireAdmin = (req, res, next) => {
  const claims = verifySignedRequest(req, adminKey, isFreshAdmin);
  if (!claims || claims.role !== "admin") {
    return res.status(401).json({ error: "No autorizado", code: "INVALID_SIGNATURE" });
  }
  next();
};

const requireClient = (req, res, next) => {
  const claims = verifySignedRequest(req, clientKey, isFreshClient);
  if (!claims || claims.role !== "client" || !safeEqual(claims.fp, fingerprint(req))) {
    return res.status(401).json({ error: "Solicitud no válida, recarga la página", code: "INVALID_SIGNATURE" });
  }
  next();
};

module.exports = {
  requireAdmin,
  requireClient,
  isValidAdminCredentials,
  createAdminSession,
  createClientSession,
};
