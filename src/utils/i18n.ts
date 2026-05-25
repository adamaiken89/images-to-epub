import i18n from "i18next";
import en from "@/locales/en.json";

i18n.init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

export const t = i18n.t.bind(i18n);
