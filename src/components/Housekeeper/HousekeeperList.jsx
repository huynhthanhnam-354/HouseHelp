import React, { useEffect, useState } from "react";
import HousekeeperCard from "./HousekeeperCard";

export default function HousekeeperList() {
  const [housekeepers, setHousekeepers] = useState([]);
  useEffect(() => {
    fetch("http://localhost:5000/api/housekeepers")
      .then(res => res.json())
      .then(data => setHousekeepers(data));
  }, []);

  // Tạo mảng đủ 3 phần tử, thêm placeholder nếu thiếu
  const displayList = [
    ...housekeepers,
    ...Array(Math.max(0, 3 - housekeepers.length)).fill({ placeholder: true })
  ];

  return (
    <div className="housekeeper-list">
      {displayList.map((hk, idx) =>
        hk.placeholder ? (
          <div className="housekeeper-card placeholder" key={"placeholder-" + idx}></div>
        ) : (
          <HousekeeperCard key={hk.id} hk={hk} />
        )
      )}
    </div>
  );
} 