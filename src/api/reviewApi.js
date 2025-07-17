export async function createReview(reviewData) {
  const res = await fetch("http://localhost:5000/api/reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reviewData),
  });
  return res.json();
}

export async function getReviewsByHousekeeperId(housekeeperId) {
  const res = await fetch(`http://localhost:5000/api/reviews/housekeeper/${housekeeperId}`);
  return res.json();
} 