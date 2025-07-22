import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../Common/Input";
import Button from "../Common/Button";
import Checkbox from "../Common/Checkbox";
import GoogleAuthButton from "../Common/GoogleAuthButton";
import UploadBox from "../Common/UploadBox";
import { register as registerApi } from "../../api/userApi";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePhone(phone) {
  return /^\d{8,15}$/.test(phone.replace(/\D/g, ""));
}

export default function RegisterForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    idFront: null,
    idBack: null,
    agree: false,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
    setSubmitError("");
  };

  const validate = () => {
    const err = {};
    if (!form.fullName.trim()) err.fullName = "Full name is required.";
    if (!form.email.trim()) err.email = "Email is required.";
    else if (!validateEmail(form.email)) err.email = "Invalid email format.";
    if (!form.phone.trim()) err.phone = "Phone number is required.";
    else if (!validatePhone(form.phone)) err.phone = "Invalid phone number.";
    if (!form.password) err.password = "Password is required.";
    else if (form.password.length < 6) err.password = "Password must be at least 6 characters.";
    if (!form.confirmPassword) err.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword) err.confirmPassword = "Passwords do not match.";
    if (!form.role) err.role = "Please select a role.";
    if (form.role === "housekeeper") {
      if (!form.idFront) err.idFront = "ID Card (Front) is required.";
      if (!form.idBack) err.idBack = "ID Card (Back) is required.";
    }
    if (!form.agree) err.agree = "You must agree to the terms.";
    return err;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    setSubmitError("");
    if (Object.keys(err).length > 0) return;
    try {
      const res = await registerApi({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: form.role,
        idCardFront: form.role === "housekeeper" ? (form.idFront ? form.idFront.name : "") : "",
        idCardBack: form.role === "housekeeper" ? (form.idBack ? form.idBack.name : "") : "",
      });
      if (res.error) {
        setSubmitError(res.error);
      } else {
        setSuccess(true);
        setForm({
          fullName: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          role: "customer",
          idFront: null,
          idBack: null,
          agree: false,
        });
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (e) {
      setSubmitError("Registration failed. Please try again.");
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit} noValidate>
      <h2>Create Account</h2>
      <p>Join our community of trusted service providers</p>
      {submitError && <div className="form-error">{submitError}</div>}
      {success && <div className="form-success">Registration successful! Redirecting to login...</div>}
      <Input label="Full Name" value={form.fullName} onChange={v => handleChange("fullName", v)} placeholder="Enter your full name" required />
      {errors.fullName && <div className="form-error">{errors.fullName}</div>}
      <Input label="Email Address" value={form.email} onChange={v => handleChange("email", v)} placeholder="Enter your email" required />
      {errors.email && <div className="form-error">{errors.email}</div>}
      <Input label="Phone Number" value={form.phone} onChange={v => handleChange("phone", v)} placeholder="Enter your phone number" required />
      {errors.phone && <div className="form-error">{errors.phone}</div>}
      <Input label="Password" type="password" value={form.password} onChange={v => handleChange("password", v)} placeholder="Create a password" required />
      {errors.password && <div className="form-error">{errors.password}</div>}
      <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={v => handleChange("confirmPassword", v)} placeholder="Confirm your password" required />
      {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
      <div className="role-select-box">
        <button
          type="button"
          className={form.role === "customer" ? "role-btn active" : "role-btn"}
          onClick={() => handleChange("role", "customer")}
        >
          Customer
        </button>
        <button
          type="button"
          className={form.role === "housekeeper" ? "role-btn active" : "role-btn"}
          onClick={() => handleChange("role", "housekeeper")}
        >
          Housekeeper
        </button>
      </div>
      {errors.role && <div className="form-error">{errors.role}</div>}
      {form.role === "housekeeper" && (
        <>
          <UploadBox label="ID Card (Front)" file={form.idFront} onChange={f => handleChange("idFront", f)} />
          {errors.idFront && <div className="form-error">{errors.idFront}</div>}
          <UploadBox label="ID Card (Back)" file={form.idBack} onChange={f => handleChange("idBack", f)} />
          {errors.idBack && <div className="form-error">{errors.idBack}</div>}
        </>
      )}
      <Checkbox label={<span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>} checked={form.agree} onChange={v => handleChange("agree", v)} required />
      {errors.agree && <div className="form-error">{errors.agree}</div>}
      <Button type="submit" fullWidth>Create Account</Button>
      <div className="divider">Or continue with</div>
      <GoogleAuthButton />
      <div className="form-footer">
        Already have an account? <a href="/login">Sign in</a>
      </div>
    </form>
  );
} 