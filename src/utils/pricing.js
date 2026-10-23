const round = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const calculateAmount = ({ ticketPrice, quantity, currency, usdRate, provider }) => {
  const totalCop = ticketPrice * quantity;
  if (currency === "USD") {
    const subtotal = round(totalCop / usdRate, 2);
    if (provider === "paypal" && subtotal > 0) return Math.ceil(((subtotal + 0.3) / 0.946) * 100 - 1e-9) / 100;
    return subtotal;
  }
  return Math.round(totalCop);
};

module.exports = { calculateAmount };
