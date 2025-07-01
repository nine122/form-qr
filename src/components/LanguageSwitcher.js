import React from "react";
import { useLanguage } from "../contexts/LanguageContext";

const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="language-switcher"
      aria-label="Switch Language"
    >
      {language === "en" ? "ไทย" : "ENG"}
    </button>
  );
};

export default LanguageSwitcher;
