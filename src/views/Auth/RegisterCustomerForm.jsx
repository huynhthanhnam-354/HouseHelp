import React, { useState } from "react";
import Input from "../Common/Input";
import Button from "../Common/Button";
import Checkbox from "../Common/Checkbox";
import GoogleAuthButton from "../Common/GoogleAuthButton";

export default function RegisterCustomerForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  function validateFullName(name) {
    // Loại bỏ khoảng trắng đầu/cuối
    const trimmed = name.trim();

    // Không chứa số hoặc ký tự đặc biệt
    if (!/^[A-Za-zÀ-ỹ\s]+$/.test(trimmed)) return false;

    // Có ít nhất 2 từ
    if (trimmed.split(/\s+/).length < 2) return false;

    // Bắt đầu bằng chữ cái
    if (!/^[A-Za-zÀ-ỹ]/.test(trimmed)) return false;

    return true;
  }

  const handleSubmit = e => {
    e.preventDefault();
    if (!validateFullName(form.fullName)) {
      alert("Họ tên chỉ được nhập chữ cái và khoảng trắng, không chứa số hoặc ký tự đặc biệt.");
      return;
    }
    // TODO: Xử lý đăng ký
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <h2>Create Account</h2>
      <p>Join our community of trusted service providers</p>
      <Input label="Full Name" value={form.fullName} onChange={v => handleChange("fullName", v)} placeholder="Enter your full name" required />
      <Input label="Email Address" value={form.email} onChange={v => handleChange("email", v)} placeholder="Enter your email" required />
      <Input label="Phone Number" value={form.phone} onChange={v => handleChange("phone", v)} placeholder="Enter your phone number" required />
      <Input label="Password" type="password" value={form.password} onChange={v => handleChange("password", v)} placeholder="Create a password" required />
      <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={v => handleChange("confirmPassword", v)} placeholder="Confirm your password" required />
      <Input label="Role" value="Customer" disabled />
      <Checkbox label={<span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>} checked={form.agree} onChange={v => handleChange("agree", v)} required />
      <Button type="submit" fullWidth>Create Account</Button>
      <div className="divider">Or continue with</div>
      <GoogleAuthButton />
      <div className="form-footer">
        Already have an account? <a href="/login">Sign in</a>
      </div>
    </form>
  );
}