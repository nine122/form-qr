import React, { createContext, useState, useContext } from "react";
import { en } from "../translations/en";
import { th } from "../translations/th";

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState("th"); // Default to Thai

  const translations = {
    en,
    th,
  };

  const t = (key) => {
    const keys = key.split(".");
    let translation = translations[language];

    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        return key; // Fallback to key if translation not found
      }
    }

    return translation;
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "th" : "en"));
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
