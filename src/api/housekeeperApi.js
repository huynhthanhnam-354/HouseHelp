export async function getAllHousekeepers() {
  const res = await fetch("http://localhost:5000/api/housekeepers");
  return res.json();
}

export async function getHousekeeperById(id) {
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function getHousekeeperProfile(id) {
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}/profile`);
  return res.json();
}

export async function updateHousekeeperProfile(id, profileData) {
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData)
  });
  return res.json();
}

export async function uploadPortfolioImages(id, images) {
  const formData = new FormData();
  images.forEach((image, index) => {
    formData.append(`portfolioImage${index}`, image);
  });
  
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}/portfolio`, {
    method: "POST",
    body: formData
  });
  return res.json();
}

export async function updateAvailability(id, isAvailable) {
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}/availability`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ available: isAvailable })
  });
  return res.json();
}

export async function updatePricing(id, price, priceType) {
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}/pricing`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price, priceType })
  });
  return res.json();
}

export async function updateWorkingSchedule(id, workingDays, workingHours) {
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}/schedule`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workingDays, workingHours })
  });
  return res.json();
}

export async function getHousekeeperStats(id) {
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}/stats`);
  return res.json();
} 