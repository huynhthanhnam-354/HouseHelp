import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import translations from "../locales/translations";

const ProfileInfo = () => {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div>
      <h2>{t.profile}</h2>
      <p>{t.welcome}</p>
    </div>
  );
};

export default ProfileInfo;