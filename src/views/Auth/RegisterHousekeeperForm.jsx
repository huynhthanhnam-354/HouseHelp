import React, { useState, useEffect } from "react";
import Input from "../Common/Input";
import Button from "../Common/Button";
import Checkbox from "../Common/Checkbox";
import GoogleAuthButton from "../Common/GoogleAuthButton";
import UploadBox from "../Common/UploadBox";
import { useAuth } from "../../hooks/useAuth";

export default function RegisterHousekeeperForm() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    city: "",
    district: "",
    dateOfBirth: "",
    gender: "",
    experience: "",
    services: [],
    idFront: null,
    idBack: null,
    agree: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableServices, setAvailableServices] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState({
    idFront: false,
    idBack: false
  });

  // Fetch available services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/services');
        if (response.ok) {
          const services = await response.json();
          setAvailableServices(services);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };

    fetchServices();
  }, []);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (error) setError(""); // Clear error when user types
  };

  const handleServiceChange = (serviceId, checked) => {
    setForm(f => ({
      ...f,
      services: checked 
        ? [...f.services, serviceId]
        : f.services.filter(id => id !== serviceId)
    }));
  };

  const handleFileUpload = async (field, file) => {
    if (!file) return;

    setUploadingFiles(prev => ({ ...prev, [field]: true }));
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', field === 'idFront' ? 'id_card_front' : 'id_card_back');
      formData.append('userId', 'temp'); // Will be updated after user creation

      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForm(f => ({ ...f, [field]: data.file.path }));
      } else {
        setError(data.message || `Lỗi upload ${field === 'idFront' ? 'CMND mặt trước' : 'CMND mặt sau'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Có lỗi xảy ra khi upload ${field === 'idFront' ? 'CMND mặt trước' : 'CMND mặt sau'}`);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [field]: false }));
    }
  };

  const validateForm = () => {
    if (!form.fullName.trim()) {
      setError("Vui lòng nhập họ tên");
      return false;
    }

    if (!form.email.trim()) {
      setError("Vui lòng nhập email");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Email không hợp lệ");
      return false;
    }

    if (!form.password) {
      setError("Vui lòng nhập mật khẩu");
      return false;
    }

    if (form.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return false;
    }

    if (form.services.length === 0) {
      setError("Vui lòng chọn ít nhất một dịch vụ");
      return false;
    }

    if (!form.agree) {
      setError("Vui lòng đồng ý với điều khoản sử dụng");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get service names from IDs
      const selectedServiceNames = availableServices
        .filter(service => form.services.includes(service.id))
        .map(service => service.name);

      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim(),
          role: 'housekeeper',
          address: form.address.trim(),
          city: form.city.trim(),
          district: form.district.trim(),
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          services: selectedServiceNames,
          idCardFront: form.idFront,
          idCardBack: form.idBack
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message || "Đăng ký thành công! Tài khoản của bạn đang chờ xét duyệt.");
        
        // Auto login after successful registration
        if (data.user) {
          login(data.user);
          window.location.href = '/housekeeper/dashboard'; // Redirect to housekeeper dashboard
        }
      } else {
        setError(data.message || data.error || "Đăng ký thất bại");
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError("Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (googleUser) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleId: googleUser.sub || googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          role: 'housekeeper'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message || "Đăng nhập Google thành công!");
        
        if (data.user) {
          login(data.user);
          window.location.href = '/housekeeper/dashboard'; // Redirect to housekeeper dashboard
        }
      } else {
        setError(data.message || data.error || "Đăng nhập Google thất bại");
      }
    } catch (error) {
      console.error('Google auth error:', error);
      setError("Có lỗi xảy ra khi đăng nhập Google. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <h2>Tạo tài khoản người giúp việc</h2>
      <p>Tham gia cộng đồng HouseHelp để cung cấp dịch vụ giúp việc chuyên nghiệp</p>
      
      {error && (
        <div className="error-message" style={{
          color: '#dc3545',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '8px 12px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <Input 
        label="Họ và tên *" 
        value={form.fullName} 
        onChange={v => handleChange("fullName", v)} 
        placeholder="Nhập họ và tên đầy đủ" 
        required 
      />
      
      <Input 
        label="Email *" 
        type="email"
        value={form.email} 
        onChange={v => handleChange("email", v)} 
        placeholder="Nhập địa chỉ email" 
        required 
      />
      
      <Input 
        label="Số điện thoại *" 
        value={form.phone} 
        onChange={v => handleChange("phone", v)} 
        placeholder="Nhập số điện thoại" 
        required
      />
      
      <Input 
        label="Mật khẩu *" 
        type="password" 
        value={form.password} 
        onChange={v => handleChange("password", v)} 
        placeholder="Tạo mật khẩu (ít nhất 6 ký tự)" 
        required 
      />
      
      <Input 
        label="Xác nhận mật khẩu *" 
        type="password" 
        value={form.confirmPassword} 
        onChange={v => handleChange("confirmPassword", v)} 
        placeholder="Nhập lại mật khẩu" 
        required 
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input 
          label="Thành phố *" 
          value={form.city} 
          onChange={v => handleChange("city", v)} 
          placeholder="TP.HCM, Hà Nội..." 
          required
        />
        
        <Input 
          label="Quận/Huyện *" 
          value={form.district} 
          onChange={v => handleChange("district", v)} 
          placeholder="Quận 1, Ba Đình..." 
          required
        />
      </div>

      <Input 
        label="Địa chỉ *" 
        value={form.address} 
        onChange={v => handleChange("address", v)} 
        placeholder="Số nhà, tên đường..." 
        required
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input 
          label="Ngày sinh" 
          type="date"
          value={form.dateOfBirth} 
          onChange={v => handleChange("dateOfBirth", v)} 
        />
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Giới tính
          </label>
          <select 
            value={form.gender} 
            onChange={e => handleChange("gender", e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Chọn giới tính</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>
      </div>

      <Input 
        label="Kinh nghiệm (năm)" 
        type="number"
        value={form.experience} 
        onChange={v => handleChange("experience", v)} 
        placeholder="Số năm kinh nghiệm làm việc" 
        min="0"
      />

      {/* Services Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          Dịch vụ cung cấp * (chọn ít nhất 1)
        </label>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '8px',
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#f9f9f9'
        }}>
          {availableServices.map(service => (
            <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={form.services.includes(service.id)}
                onChange={e => handleServiceChange(service.id, e.target.checked)}
              />
              {service.name}
            </label>
          ))}
        </div>
      </div>

      {/* ID Card Upload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <UploadBox 
            label="CMND/CCCD mặt trước *" 
            file={form.idFront} 
            onChange={f => handleFileUpload("idFront", f)}
            accept=".png,.jpg,.jpeg"
          />
          {uploadingFiles.idFront && (
            <div style={{ fontSize: '12px', color: '#007bff', marginTop: '4px' }}>
              Đang upload...
            </div>
          )}
        </div>
        
        <div>
          <UploadBox 
            label="CMND/CCCD mặt sau *" 
            file={form.idBack} 
            onChange={f => handleFileUpload("idBack", f)}
            accept=".png,.jpg,.jpeg"
          />
          {uploadingFiles.idBack && (
            <div style={{ fontSize: '12px', color: '#007bff', marginTop: '4px' }}>
              Đang upload...
            </div>
          )}
        </div>
      </div>
      
      <Input label="Loại tài khoản" value="Người giúp việc" disabled />
      
      <Checkbox 
        label={
          <span>
            Tôi đồng ý với <a href="#" style={{color: '#007bff'}}>Điều khoản sử dụng</a> và{' '}
            <a href="#" style={{color: '#007bff'}}>Chính sách bảo mật</a>
          </span>
        } 
        checked={form.agree} 
        onChange={v => handleChange("agree", v)} 
        required 
      />
      
      <Button type="submit" fullWidth disabled={loading || uploadingFiles.idFront || uploadingFiles.idBack}>
        {loading ? "Đang đăng ký..." : "Tạo tài khoản"}
      </Button>
      
      <div className="divider">Hoặc đăng ký với</div>
      
      <GoogleAuthButton onClick={handleGoogleAuth} />
      
      <div className="form-footer">
        Đã có tài khoản? <a href="/login" style={{color: '#007bff'}}>Đăng nhập ngay</a>
      </div>
    </form>
  );
}