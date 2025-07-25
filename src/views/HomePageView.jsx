import React, { useState, useEffect } from "react";
import FilterSidebar from "./Housekeeper/FilterSidebar";
import HousekeeperList from "./Housekeeper/HousekeeperList";
import QuickInfo from "./Housekeeper/QuickInfo";
import SpecialOffer from "./Housekeeper/SpecialOffer";
import Header from "./Header";

// ...existing code...

function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-col">
        <div className="footer-title">Services</div>
        <div>House Cleaning</div>
        <div>Cooking</div>
        <div>Babysitting</div>
        <div>Elder Care</div>
      </div>
      <div className="footer-col">
        <div className="footer-title">Support</div>
        <div>Help Center</div>
        <div>Contact Us</div>
        <div>Insurance</div>
      </div>
      <div className="footer-col">
        <div className="footer-title">Company</div>
        <div>About Us</div>
        <div>Careers</div>
        <div>News</div>
      </div>
      <div className="footer-col">
        <div className="footer-title">Legal</div>
        <div>Terms of Service</div>
        <div>Privacy Policy</div>
        <div>Cookie Policy</div>
        <div>Refund Policy</div>
      </div>
      <div className="footer-social">
        <span>Facebook</span>
        <span>Twitter</span>
        <span>Instagram</span>
        <span>LinkedIn</span>
      </div>
      <div className="footer-copy">© 2024 HouseHelp. All rights reserved.</div>
    </footer>
  );
}

export default function HomePageView() {
  const [filter, setFilter] = useState({});
  const [keyword, setKeyword] = useState("");

  // Xử lý sự kiện tìm kiếm
  const handleSearch = () => {
    setFilter({ ...filter, keyword });
  };

  // Tự động reload đề xuất khi người dùng xóa hết text trong search box
  useEffect(() => {
    if (keyword === "") {
      // Xóa keyword khỏi filter để reload lại các đề xuất ban đầu
      setFilter(prevFilter => {
        const { keyword: _, ...restFilter } = prevFilter;
        return restFilter;
      });
    }
  }, [keyword]);

  return (
    <div className="home-root">
      <Header
        keyword={keyword}
        setKeyword={setKeyword}
        onSearch={handleSearch}
      />
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