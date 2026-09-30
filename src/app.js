const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const { sanitizeBody, securityHeaders } = require("./middlewares/security");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(securityHeaders);
app.use(
  cors({
    origin: env.corsOrigins.length ? env.corsOrigins : true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(
  express.json({
    limit: "7mb",
    verify: (req, res, buffer) => {
      req.rawBody = buffer;
    },
  }),
);
app.use(sanitizeBody);

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
