const dns = require("dns");
const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async () => {
  if (env.dnsServers.length) dns.setServers(env.dnsServers);
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB conectado");
};

module.exports = connectDB;
