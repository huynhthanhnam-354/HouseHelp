export async function getAllHousekeepers() {
  const res = await fetch("http://localhost:5000/api/housekeepers");
  return res.json();
}

export async function getHousekeeperById(id) {
  const res = await fetch(`http://localhost:5000/api/housekeepers/${id}`);
  return res.json();
} 