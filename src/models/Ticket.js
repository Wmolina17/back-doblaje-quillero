const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    raffleId: { type: mongoose.Schema.Types.ObjectId, ref: "Raffle", index: true },
    numberTickets: { type: Number, required: true, min: 1 },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    reference: { type: String, required: true, trim: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod" },
    paymentMethod: { type: String, required: true },
    currency: { type: String, enum: ["COP", "USD"], required: true },
    amountPaid: { type: Number, required: true },
    voucher: { type: String, required: true },
    approved: { type: Boolean, default: false, index: true },
    approvalCodes: { type: [String], index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ticket", TicketSchema);
