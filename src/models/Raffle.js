const mongoose = require("mongoose");

const PrizeSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    amount: { type: String, trim: true },
  },
  { _id: false },
);

const RaffleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ticketPrice: { type: Number, required: true, min: 0 },
    minTickets: { type: Number, default: 1, min: 1 },
    maxTicketsPerPurchase: { type: Number, default: 200, min: 1 },
    totalTickets: { type: Number, default: 10000, min: 10 },
    drawDate: { type: Date },
    images: [String],
    prizes: [PrizeSchema],
    visible: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "finished"], default: "active", index: true },
    finishedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Raffle", RaffleSchema);
