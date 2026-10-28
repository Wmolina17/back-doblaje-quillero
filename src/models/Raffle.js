const mongoose = require("mongoose");

const PrizeSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    amount: { type: String, trim: true },
  },
  { _id: false },
);

const ExpenseSchema = new mongoose.Schema(
  {
    concept: { type: String, trim: true },
    amount: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const RaffleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ticketPrice: { type: Number, required: true, min: 0 },
    minTickets: { type: Number, default: 6, min: 1 },
    maxTicketsPerPurchase: { type: Number, default: 200, min: 1 },
    totalTickets: { type: Number, default: 10000, min: 10 },
    drawDate: { type: Date },
    images: [String],
    prizes: [PrizeSchema],
    prizeNumbersCount: { type: Number, default: 0, min: 0 },
    prizeNumbers: [String],
    prizeNumberAmount: { type: String, trim: true },
    expenses: [ExpenseSchema],
    goalPercent: { type: Number, default: 85, min: 1, max: 100 },
    campaignDays: { type: Number, default: 20, min: 1 },
    visible: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "finished"], default: "active", index: true },
    finishedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Raffle", RaffleSchema);
