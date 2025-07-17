export async function createBooking(booking) {
  const res = await fetch("http://localhost:5000/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking)
  });
  return res.json();
}

export async function getBookingsByUserId(userId) {
  const res = await fetch(`http://localhost:5000/api/bookings/user/${userId}`);
  return res.json();
} 