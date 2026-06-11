import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import translationEN from "@src/assets/locales/en/translations.json";
import translationES from "@src/assets/locales/es/translations.json";

export const defaultNS = "translations";
export const resources = {
	en: { translations: translationEN },
	es: { translations: translationES },
} as const;

const isServer = typeof window === "undefined";

const instance = i18n.use(initReactI18next);
if (!isServer) {
	instance.use(LanguageDetector);
}

void instance.init({
	defaultNS,
	ns: [defaultNS],
	resources,
	fallbackLng: "en",
	lng: isServer ? "en" : undefined,
	interpolation: {
		escapeValue: false,
	},
});
