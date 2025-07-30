export async function login(email, password) {
  const res = await fetch("http://localhost:5000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function register(user) {
  const res = await fetch("http://localhost:5000/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function getUserById(id) {
  const res = await fetch(`http://localhost:5000/api/users/${id}`);
  return res.json();
}

export async function updateUserProfile(id, profileData) {
  console.log('🔥 API CALL: updateUserProfile');
  console.log('URL:', `http://localhost:5000/api/users/${id}/profile`);
  console.log('Data:', profileData);
  
  const res = await fetch(`http://localhost:5000/api/users/${id}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData)
  });
  
  console.log('Response status:', res.status);
  const result = await res.json();
  console.log('Response data:', result);
  
  return result;
}

export async function getUserProfile(id) {
  console.log('🌐 API CALL: getUserProfile');
  console.log('URL:', `http://localhost:5000/api/users/${id}/profile`);
  
  const res = await fetch(`http://localhost:5000/api/users/${id}/profile`);
  console.log('Response status:', res.status);
  
  const result = await res.json();
  console.log('📦 Profile data received:', result);
  
  return result;
}

export async function uploadAvatar(id, avatarFile) {
  const formData = new FormData();
  formData.append('avatar', avatarFile);
  
  const res = await fetch(`http://localhost:5000/api/users/${id}/avatar`, {
    method: "POST",
    body: formData
  });
  return res.json();
}

export async function changePassword(id, currentPassword, newPassword) {
  const res = await fetch(`http://localhost:5000/api/users/${id}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return res.json();
}

export async function deleteUserAccount(id, password) {
  const res = await fetch(`http://localhost:5000/api/users/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  return res.json();
} 