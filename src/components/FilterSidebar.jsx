import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import translations from "../locales/translations";

const FilterSidebar = () => {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div>
      <div className="filter-title">{t.minimumRating}</div>
      <label>
        <input type="radio" />
        <span>★★★★★</span> {t.anyRating}
      </label>
      <label>
        <input type="radio" />
        <span>★★★★★</span> 5+ {t.stars}
      </label>
      <label>
        <input type="radio" />
        <span>★★★★☆</span> 4+ {t.stars}
      </label>
      <label>
        <input type="radio" />
        <span>★★★☆☆</span> 3+ {t.stars}
      </label>
      <label>
        <input type="radio" />
        <span>★★☆☆☆</span> 2+ {t.stars}
      </label>
      <label>
        <input type="radio" />
        <span>★☆☆☆☆</span> 1+ {t.stars}
      </label>
      <div className="filter-title">{t.priceRange}</div>
      {/* ...slider code... */}
      <div className="filter-title">{t.availability}</div>
      <label>
        <input type="checkbox" />
        {t.availableToday}
      </label>
      <button className="btn clear-filters">{t.clearAllFilters}</button>
    </div>
  );
};

export default FilterSidebar;