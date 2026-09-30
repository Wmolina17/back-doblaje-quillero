const crypto = require("crypto");

const MAX_REQUEST_AGE_MS = 30 * 1000;
const MAX_CLOCK_AHEAD_MS = 5 * 1000;

const hmac = (key, message) => crypto.createHmac("sha256", key).update(message).digest("base64url");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("base64url");

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const deriveKey = (secret, label) => crypto.createHmac("sha256", secret).update(label).digest();

const issueToken = (key, ttlMs, claims = {}) => {
  const expiresAt = Date.now() + ttlMs;
  const payload = Buffer.from(JSON.stringify({ ...claims, exp: expiresAt, jti: crypto.randomUUID() })).toString("base64url");
  return { token: `${payload}.${hmac(key, payload)}`, expiresAt };
};

const readToken = (key, token) => {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, hmac(key, payload))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isFinite(claims.exp) && claims.exp > Date.now() ? claims : null;
  } catch {
    return null;
  }
};

const createReplayGuard = () => {
  const used = new Map();
  return (signature, now) => {
    const expiry = used.get(signature);
    if (expiry && expiry > now) return false;
    if (used.size > 20000) {
      for (const [key, value] of used) if (value <= now) used.delete(key);
    }
    used.set(signature, now + MAX_REQUEST_AGE_MS + MAX_CLOCK_AHEAD_MS);
    return true;
  };
};

const verifySignedRequest = (req, key, isFresh) => {
  const header = req.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;

  const parts = header.slice(7).split(".");
  if (parts.length !== 5) return null;
  const [payload, tokenSignature, rawTimestamp, nonce, requestSignature] = parts;
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(nonce)) return null;

  const now = Date.now();
  const timestamp = Number(rawTimestamp);
  if (!Number.isSafeInteger(timestamp)) return null;
  if (now - timestamp > MAX_REQUEST_AGE_MS || timestamp - now > MAX_CLOCK_AHEAD_MS) return null;

  const token = `${payload}.${tokenSignature}`;
  const claims = readToken(key, token);
  if (!claims) return null;

  const path = req.originalUrl.split("?")[0];
  const bodyHash = req.rawBody?.length ? sha256(req.rawBody) : "";
  const expected = hmac(token, `${timestamp}.${nonce}.${req.method.toUpperCase()}.${path}.${bodyHash}`);
  if (!safeEqual(requestSignature, expected)) return null;
  if (!isFresh(requestSignature, now)) return null;
  return claims;
};

module.exports = { safeEqual, sha256, deriveKey, issueToken, verifySignedRequest, createReplayGuard };
