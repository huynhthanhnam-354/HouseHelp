import React, { useEffect, useState } from "react";
import HousekeeperCard from "./HousekeeperCard";

function buildQuery(filter) {
  const params = [];
  if (filter.services && filter.services.length > 0) params.push(`services=${filter.services.join(",")}`);
  if (filter.minRating) params.push(`minRating=${filter.minRating}`);
  if (filter.maxPrice) params.push(`maxPrice=${filter.maxPrice}`);
  if (filter.available) params.push(`available=${filter.available}`);
  return params.length ? `?${params.join("&")}` : "";
}

export default function HousekeeperList({ filter }) {
  const [housekeepers, setHousekeepers] = useState([]);
  // useEffect(() => {
  //   const query = buildQuery(filter || {});
  //   fetch(`http://localhost:5000/api/housekeepers${query}`)
  //     .then(res => res.json())
  //     .then(data => setHousekeepers(data));
  // }, [filter]);
  useEffect(() => {
  const query = buildQuery(filter || {});
  fetch(`http://localhost:5000/api/housekeepers${query}`)
    .then(res => res.json())
    .then(data => {
      console.log("Dữ liệu trả về từ API:", data); // Dòng này giúp bạn kiểm tra dữ liệu
      setHousekeepers(data);
      console.log("Chi tiết từng housekeeper:", data);
    });
}, [filter]);

  // Lọc theo từ khóa nếu có
  let filteredHousekeepers = housekeepers;
  if (filter && filter.keyword && filter.keyword.trim() !== "") {
    const keyword = filter.keyword.trim().toLowerCase();
    filteredHousekeepers = housekeepers.filter(hk => {
      const services = hk.services ? hk.services.toLowerCase() : "";
      const fullName = hk.fullName ? hk.fullName.toLowerCase() : "";
      return services.includes(keyword) || fullName.includes(keyword);
    });
  }

  // Hiển thị tất cả housekeepers (không giới hạn 3 cards)
  const displayList = filteredHousekeepers;

  // ...existing code...
  
  return (
    <div className="housekeeper-list">
      {filteredHousekeepers.length === 0 ? (
        <div style={{textAlign: "center", color: "#999", marginTop: "32px"}}>
          Không tìm thấy kết quả phù hợp.
        </div>
      ) : (
        displayList.map((hk) => (
          <HousekeeperCard key={hk.id} hk={hk} />
        ))
      )}
    </div>
  );
  
  // ...existing code...
}