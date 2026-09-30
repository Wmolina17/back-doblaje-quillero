const PaymentMethod = require("../models/PaymentMethod");
const { HttpError } = require("../utils/http");
const { isHttpUrl } = require("../utils/validation");

const parseInput = (body) => {
  const name = String(body.name || "").trim();
  if (!name) throw new HttpError(400, "El nombre del método es obligatorio.");
  if (!["COP", "USD"].includes(body.currency)) throw new HttpError(400, "Moneda inválida.");

  const logoUrl = String(body.logoUrl || "").trim();
  if (logoUrl && !isHttpUrl(logoUrl)) throw new HttpError(400, "URL del logo inválida.");

  const fields = Array.isArray(body.fields)
    ? body.fields
        .map((field) => ({
          label: String(field?.label || "").trim(),
          value: String(field?.value || "").trim(),
        }))
        .filter((field) => field.label && field.value)
    : [];

  return {
    name,
    provider: String(body.provider || "custom").trim(),
    logoUrl,
    currency: body.currency,
    holder: String(body.holder || "").trim(),
    fields,
    instructions: String(body.instructions || "").trim(),
    active: body.active !== false,
    order: Number(body.order) || 0,
  };
};

const listActive = async (req, res) => {
  res.json(await PaymentMethod.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean());
};

const listAll = async (req, res) => {
  res.json(await PaymentMethod.find().sort({ order: 1, createdAt: 1 }).lean());
};

const create = async (req, res) => {
  const method = await PaymentMethod.create(parseInput(req.body));
  res.status(201).json(method);
};

const update = async (req, res) => {
  const method = await PaymentMethod.findByIdAndUpdate(req.params.id, parseInput(req.body), {
    new: true,
    runValidators: true,
  });
  if (!method) throw new HttpError(404, "Método de pago no encontrado");
  res.json(method);
};

const remove = async (req, res) => {
  const method = await PaymentMethod.findByIdAndDelete(req.params.id);
  if (!method) throw new HttpError(404, "Método de pago no encontrado");
  res.json({ message: "Método de pago eliminado" });
};

module.exports = { listActive, listAll, create, update, remove };
