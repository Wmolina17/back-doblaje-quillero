const mongoose = require("mongoose");

const notFound = (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: "Datos inválidos" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "El archivo es demasiado grande" });
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
};

module.exports = { notFound, errorHandler };
