const { isValidAdminCredentials, createAdminSession, createClientSession } = require("../middlewares/auth");

const login = (req, res) => {
  if (!isValidAdminCredentials(req.body.username, req.body.password)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  }
  const { token, expiresAt } = createAdminSession();
  res.json({ token, expiresAt, serverTime: Date.now() });
};

const clientToken = (req, res) => {
  const { token, expiresAt } = createClientSession(req);
  res.json({ token, expiresAt, serverTime: Date.now() });
};

const serverTime = (req, res) => {
  res.json({ serverTime: Date.now() });
};

module.exports = { login, clientToken, serverTime };
