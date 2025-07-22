import React, { useState } from "react";
import FilterSidebar from "../components/Housekeeper/FilterSidebar";
import HousekeeperList from "../components/Housekeeper/HousekeeperList";
import QuickInfo from "../components/Housekeeper/QuickInfo";
import SpecialOffer from "../components/Housekeeper/SpecialOffer";

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
          <QuickInfo />
          <SpecialOffer />
        </aside>
      </div>
      <Footer />
    </div>
  );
} 