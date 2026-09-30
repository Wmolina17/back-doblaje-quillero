const env = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");
const { seedSettings } = require("./seed/settings.seed");
const { migrateRaffleHistory } = require("./seed/migrations");

const start = async () => {
  await connectDB();
  await migrateRaffleHistory();
  await seedSettings();
  app.listen(env.port, () => {
    console.log(`Servidor en http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error);
  process.exit(1);
});
