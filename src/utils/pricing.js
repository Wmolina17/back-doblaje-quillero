const round = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const calculateAmount = ({ ticketPrice, quantity, currency, usdRate }) => {
  const totalCop = ticketPrice * quantity;
  if (currency === "USD") return round(totalCop / usdRate, 2);
  return Math.round(totalCop);
};

module.exports = { calculateAmount };
