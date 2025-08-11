import React from "react";
import "./SettingLanguage.css";
import { useLanguage } from "../../contexts/LanguageContext";
import translations from "../../locales/translations";

const SettingLanguage = () => {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  const handleChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleSave = () => {
    alert(language === "en" ? "Language changed to English!" : "Đã chuyển sang Tiếng Việt!");
  };

  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        <div className="settings-menu active">
          <span role="img" aria-label="language">🌐</span> {t.language}
        </div>
        <div className="settings-menu">
          <span role="img" aria-label="notifications">🔔</span> {t.notifications}
        </div>
        <div className="settings-menu">
          <span role="img" aria-label="security">🛡️</span> {t.security}
        </div>
      </div>
      <div className="settings-content">
        <div className="settings-card">
          <h2>{t.languageSettings}</h2>
          <div className="form-group">
            <label htmlFor="language-select">{t.selectLanguage}</label>
            <select
              id="language-select"
              value={language}
              onChange={handleChange}
              className="language-select"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
          <button className="save-btn" onClick={handleSave}>
            {t.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingLanguage;