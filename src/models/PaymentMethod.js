const mongoose = require("mongoose");

const FieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const PaymentMethodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    provider: { type: String, default: "custom", trim: true },
    logoUrl: { type: String, trim: true },
    currency: { type: String, enum: ["COP", "USD"], default: "COP" },
    holder: { type: String, trim: true },
    fields: [FieldSchema],
    instructions: { type: String, trim: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PaymentMethod", PaymentMethodSchema);
