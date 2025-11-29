import React, { useState } from "react";
import FilterSidebar from "../components/Housekeeper/FilterSidebar";
import HousekeeperList from "../components/Housekeeper/HousekeeperList";
import QuickInfo from "../views/Housekeeper/QuickInfo";
import SpecialOffer from "../views/Housekeeper/SpecialOffer";

function Header() {
  // ... giữ nguyên ...
}
function Footer() {
  // ... giữ nguyên ...
}

export default function HomePage() {
  const [filter, setFilter] = useState({});
  return (
    <div className="home-root">
      <Header />
      <div className="home-layout">
        <aside className="sidebar">
          <FilterSidebar onFilterChange={setFilter} />
        </aside>
        <main className="main-content">
          <HousekeeperList filter={filter} />
        </main>
        <aside className="rightbar">
          <QuickInfo onFilterChange={setFilter} currentFilter={filter} />
          <SpecialOffer />
        </aside>
      </div>
      <Footer />
    </div>
  );
} 