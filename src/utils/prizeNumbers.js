const crypto = require("crypto");

const generatePrizeNumbers = (count, totalTickets) => {
  const length = String(totalTickets - 1).length;
  const numbers = new Set();
  while (numbers.size < count) {
    numbers.add(String(crypto.randomInt(0, totalTickets)).padStart(length, "0"));
  }
  return Array.from(numbers).sort();
};

module.exports = { generatePrizeNumbers };
