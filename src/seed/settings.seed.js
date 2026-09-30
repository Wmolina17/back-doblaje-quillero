const Settings = require("../models/Settings");

const SEED = {
  siteName: "Doblaje Quillero",
  tagline: "Eventos oficiales de Doblaje Quillero Inc. by Jason David",
  aboutText:
    "Somos Doblaje Quillero Inc., el proyecto de humor creado por Jason David desde Barranquilla. Doblajes chistosos, personajes como el Drilococo y la serie animada \"La Corte\". Ahora también realizamos eventos con premios para toda la comunidad que nos ha acompañado.",
  supportWhatsapp: "+57 3122161182",
  advertisingPhone: "+57 3122161182",
  socials: {
    facebook: "https://www.facebook.com/p/Doblaje-Quillero-Oficial-100090788063621/",
    facebookAlt: "https://www.facebook.com/Soyelvillaa/",
    instagram: "https://www.instagram.com/doblaje.quilleroinc/",
    tiktok: "https://www.tiktok.com/@doblaje.quillero",
    youtube: "https://www.youtube.com/@DoblajeQuillero",
  },
};

const seedSettings = async () => {
  const settings = await Settings.getSingleton();
  const filled = [];

  for (const [key, value] of Object.entries(SEED)) {
    if (key === "socials") continue;
    if (!settings[key] || settings[key] === Settings.schema.path(key).defaultValue) {
      if (settings[key] !== value) filled.push(key);
      settings[key] = value;
    }
  }
  for (const [key, value] of Object.entries(SEED.socials)) {
    if (!settings.socials[key]) {
      settings.socials[key] = value;
      filled.push(`socials.${key}`);
    }
  }

  if (filled.length) {
    await settings.save();
    console.log(`Seed de configuración aplicado: ${filled.join(", ")}`);
  }
};

module.exports = { seedSettings };
