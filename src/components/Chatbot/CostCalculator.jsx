import React, { useState, useEffect } from 'react';
import './CostCalculator.css';

const CostCalculator = ({ onCostCalculated, userContext }) => {
  const [calculatorData, setCalculatorData] = useState({
    service: '',
    duration: '',
    frequency: 'once',
    location: userContext?.location || 'TP.HCM',
    urgency: 'normal',
    additionalServices: [],
    specialRequirements: ''
  });

  const [calculation, setCalculation] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Dữ liệu dịch vụ với giá chi tiết
  const serviceData = {
    'Vệ sinh nhà cửa': {
      icon: '🏠',
      basePrice: { min: 60000, max: 100000 },
      unit: 'giờ',
      description: 'Dọn dẹp, lau chùi, hút bụi toàn bộ ngôi nhà',
      factors: {
        area: { small: 1.0, medium: 1.3, large: 1.6 },
        difficulty: { easy: 1.0, normal: 1.2, hard: 1.5 }
      }
    },
    'Nấu ăn': {
      icon: '👨‍🍳',
      basePrice: { min: 80000, max: 120000 },
      unit: 'giờ',
      description: 'Nấu các bữa ăn theo yêu cầu, mua sắm nguyên liệu',
      factors: {
        complexity: { simple: 1.0, normal: 1.3, complex: 1.8 },
        people: { '1-2': 1.0, '3-4': 1.2, '5+': 1.5 }
      }
    },
    'Trông trẻ': {
      icon: '👶',
      basePrice: { min: 50000, max: 80000 },
      unit: 'giờ',
      description: 'Chăm sóc, vui chơi, giáo dục trẻ em',
      factors: {
        age: { '0-2': 1.5, '3-6': 1.2, '7+': 1.0 },
        children: { '1': 1.0, '2': 1.6, '3+': 2.2 }
      }
    },
    'Giặt ủi': {
      icon: '👔',
      basePrice: { min: 40000, max: 60000 },
      unit: 'giờ',
      description: 'Giặt, phơi, ủi quần áo và đồ vải',
      factors: {
        volume: { light: 1.0, normal: 1.2, heavy: 1.5 },
        fabric: { normal: 1.0, delicate: 1.3, special: 1.6 }
      }
    },
    'Vệ sinh công nghiệp': {
      icon: '🏢',
      basePrice: { min: 70000, max: 150000 },
      unit: 'giờ',
      description: 'Vệ sinh văn phòng, nhà xưởng, công trình',
      factors: {
        type: { office: 1.0, warehouse: 1.3, factory: 1.8 },
        equipment: { basic: 1.0, advanced: 1.4, specialized: 2.0 }
      }
    },
    'Chăm sóc người già': {
      icon: '👴',
      basePrice: { min: 60000, max: 100000 },
      unit: 'giờ',
      description: 'Chăm sóc, đồng hành, hỗ trợ sinh hoạt',
      factors: {
        care_level: { basic: 1.0, intermediate: 1.4, intensive: 2.0 },
        medical: { none: 1.0, basic: 1.3, advanced: 1.8 }
      }
    }
  };

  // Hệ số theo khu vực
  const locationMultipliers = {
    'Quận 1': 1.4,
    'Quận 2': 1.2,
    'Quận 3': 1.3,
    'Quận 4': 1.1,
    'Quận 5': 1.1,
    'Quận 6': 1.0,
    'Quận 7': 1.2,
    'Quận 8': 1.0,
    'Quận 9': 1.0,
    'Quận 10': 1.1,
    'Quận 11': 1.0,
    'Quận 12': 0.9,
    'Quận Bình Thạnh': 1.1,
    'Quận Tân Bình': 1.2,
    'Quận Tân Phú': 1.0,
    'Quận Phú Nhuận': 1.2,
    'Quận Gò Vấp': 1.0,
    'TP.HCM': 1.0,
    'Hà Nội': 1.1,
    'Đà Nẵng': 0.9,
    'Cần Thơ': 0.8,
    'Hải Phòng': 0.9,
    'Nha Trang': 0.8,
    'Vũng Tàu': 0.9
  };

  // Hệ số theo tần suất
  const frequencyDiscounts = {
    'once': { multiplier: 1.0, label: 'Một lần', discount: 0 },
    'weekly': { multiplier: 0.85, label: 'Hàng tuần', discount: 15 },
    'biweekly': { multiplier: 0.90, label: '2 tuần/lần', discount: 10 },
    'monthly': { multiplier: 0.95, label: 'Hàng tháng', discount: 5 },
    'daily': { multiplier: 0.75, label: 'Hàng ngày', discount: 25 }
  };

  // Hệ số theo độ khẩn cấp
  const urgencyMultipliers = {
    'normal': { multiplier: 1.0, label: 'Bình thường', extra: 0 },
    'urgent': { multiplier: 1.3, label: 'Khẩn cấp (trong 24h)', extra: 30 },
    'emergency': { multiplier: 1.6, label: 'Khẩn cấp (trong 6h)', extra: 60 }
  };

  // Dịch vụ bổ sung
  const additionalServicesOptions = {
    'deep_cleaning': { price: 50000, label: 'Vệ sinh sâu', unit: 'lần' },
    'window_cleaning': { price: 30000, label: 'Lau kính cửa sổ', unit: 'lần' },
    'carpet_cleaning': { price: 80000, label: 'Giặt thảm', unit: 'm²' },
    'appliance_cleaning': { price: 40000, label: 'Vệ sinh thiết bị', unit: 'thiết bị' },
    'garden_care': { price: 60000, label: 'Chăm sóc vườn', unit: 'giờ' },
    'pet_care': { price: 35000, label: 'Chăm sóc thú cưng', unit: 'giờ' },
    'shopping': { price: 25000, label: 'Mua sắm hộ', unit: 'lần' },
    'laundry_pickup': { price: 20000, label: 'Đón/trả đồ giặt', unit: 'lần' }
  };

  const handleInputChange = (field, value) => {
    setCalculatorData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAdditionalServiceToggle = (service) => {
    setCalculatorData(prev => ({
      ...prev,
      additionalServices: prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service]
    }));
  };

  const getLocationMultiplier = (location) => {
    for (const [area, multiplier] of Object.entries(locationMultipliers)) {
      if (location.includes(area)) {
        return multiplier;
      }
    }
    return 1.0; // Default
  };

  const calculateCost = async () => {
    if (!calculatorData.service || !calculatorData.duration) {
      alert('Vui lòng chọn dịch vụ và nhập thời gian');
      return;
    }

    setIsCalculating(true);

    try {
      // Gọi API backend để tính toán
      const response = await fetch('http://localhost:5000/api/chatbot/calculate-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: calculatorData.service,
          duration: parseFloat(calculatorData.duration),
          location: calculatorData.location
        })
      });

      const apiResult = await response.json();

      if (apiResult.success) {
        // Tính toán chi tiết với các yếu tố bổ sung
        const serviceInfo = serviceData[calculatorData.service];
        const baseCost = apiResult.estimate.estimatedCost;
        
        // Áp dụng các hệ số
        const frequencyInfo = frequencyDiscounts[calculatorData.frequency];
        const urgencyInfo = urgencyMultipliers[calculatorData.urgency];
        
        const frequencyAdjustedCost = baseCost * frequencyInfo.multiplier;
        const urgencyAdjustedCost = frequencyAdjustedCost * urgencyInfo.multiplier;
        
        // Tính dịch vụ bổ sung
        const additionalCost = calculatorData.additionalServices.reduce((total, service) => {
          return total + (additionalServicesOptions[service]?.price || 0);
        }, 0);
        
        const totalCost = urgencyAdjustedCost + additionalCost;
        
        // Tính chi phí theo tần suất
        const monthlyCost = calculatorData.frequency === 'weekly' ? totalCost * 4 :
                           calculatorData.frequency === 'biweekly' ? totalCost * 2 :
                           calculatorData.frequency === 'daily' ? totalCost * 30 :
                           calculatorData.frequency === 'monthly' ? totalCost : null;

        const result = {
          service: calculatorData.service,
          duration: calculatorData.duration,
          baseCost: baseCost,
          adjustments: {
            frequency: {
              discount: frequencyInfo.discount,
              multiplier: frequencyInfo.multiplier,
              savings: baseCost - frequencyAdjustedCost
            },
            urgency: {
              extra: urgencyInfo.extra,
              multiplier: urgencyInfo.multiplier,
              cost: urgencyAdjustedCost - frequencyAdjustedCost
            },
            location: {
              multiplier: getLocationMultiplier(calculatorData.location),
              area: calculatorData.location
            }
          },
          additionalServices: {
            services: calculatorData.additionalServices,
            cost: additionalCost,
            breakdown: calculatorData.additionalServices.map(service => ({
              name: additionalServicesOptions[service].label,
              price: additionalServicesOptions[service].price
            }))
          },
          totalCost: totalCost,
          monthlyCost: monthlyCost,
          formattedTotal: new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
          }).format(totalCost),
          formattedMonthly: monthlyCost ? new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
          }).format(monthlyCost) : null
        };

        setCalculation(result);
        
        // Gọi callback để thông báo cho parent component
        if (onCostCalculated) {
          onCostCalculated(result);
        }
      } else {
        throw new Error('API calculation failed');
      }

    } catch (error) {
      console.error('Cost calculation error:', error);
      alert('Có lỗi xảy ra khi tính toán chi phí. Vui lòng thử lại.');
    } finally {
      setIsCalculating(false);
    }
  };

  const resetCalculator = () => {
    setCalculatorData({
      service: '',
      duration: '',
      frequency: 'once',
      location: userContext?.location || 'TP.HCM',
      urgency: 'normal',
      additionalServices: [],
      specialRequirements: ''
    });
    setCalculation(null);
    setShowBreakdown(false);
  };

  return (
    <div className="cost-calculator">
      <div className="calculator-header">
        <h3>💰 Dự toán chi phí tự động</h3>
        <p>Tính toán chi phí chính xác cho dịch vụ của bạn</p>
      </div>

      {!calculation ? (
        <div className="calculator-form">
          {/* Service Selection */}
          <div className="form-section">
            <h4>Chọn dịch vụ:</h4>
            <div className="service-options">
              {Object.entries(serviceData).map(([service, info]) => (
                <div 
                  key={service}
                  className={`service-option ${calculatorData.service === service ? 'selected' : ''}`}
                  onClick={() => handleInputChange('service', service)}
                >
                  <div className="service-icon">{info.icon}</div>
                  <div className="service-details">
                    <h5>{service}</h5>
                    <p>{info.description}</p>
                    <div className="price-range">
                      {new Intl.NumberFormat('vi-VN').format(info.basePrice.min)} - {' '}
                      {new Intl.NumberFormat('vi-VN').format(info.basePrice.max)} VNĐ/{info.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {calculatorData.service && (
            <>
              {/* Duration and Basic Info */}
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>Thời gian dự kiến (giờ): *</label>
                    <input 
                      type="number" 
                      min="0.5" 
                      max="24" 
                      step="0.5"
                      value={calculatorData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      placeholder="VD: 3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Khu vực:</label>
                    <input 
                      type="text" 
                      value={calculatorData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="VD: Quận 1, TP.HCM"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tần suất sử dụng:</label>
                    <select 
                      value={calculatorData.frequency}
                      onChange={(e) => handleInputChange('frequency', e.target.value)}
                    >
                      {Object.entries(frequencyDiscounts).map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.label} {info.discount > 0 && `(Giảm ${info.discount}%)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Độ khẩn cấp:</label>
                    <select 
                      value={calculatorData.urgency}
                      onChange={(e) => handleInputChange('urgency', e.target.value)}
                    >
                      {Object.entries(urgencyMultipliers).map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.label} {info.extra > 0 && `(+${info.extra}%)`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Services */}
              <div className="form-section">
                <h4>Dịch vụ bổ sung (tùy chọn):</h4>
                <div className="additional-services">
                  {Object.entries(additionalServicesOptions).map(([key, service]) => (
                    <label key={key} className="additional-service">
                      <input 
                        type="checkbox" 
                        checked={calculatorData.additionalServices.includes(key)}
                        onChange={() => handleAdditionalServiceToggle(key)}
                      />
                      <span className="service-name">{service.label}</span>
                      <span className="service-price">
                        +{new Intl.NumberFormat('vi-VN').format(service.price)} VNĐ/{service.unit}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Special Requirements */}
              <div className="form-section">
                <div className="form-group">
                  <label>Yêu cầu đặc biệt (tùy chọn):</label>
                  <textarea 
                    value={calculatorData.specialRequirements}
                    onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                    placeholder="VD: Cần sử dụng sản phẩm thân thiện môi trường, có thú cưng trong nhà..."
                    rows="3"
                  />
                </div>
              </div>

              {/* Calculate Button */}
              <button 
                className="calculate-btn"
                onClick={calculateCost}
                disabled={isCalculating || !calculatorData.duration}
              >
                {isCalculating ? '⏳ Đang tính toán...' : '🧮 Tính chi phí'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="calculation-result">
          <div className="result-header">
            <h4>📊 Kết quả dự toán</h4>
            <button className="toggle-breakdown" onClick={() => setShowBreakdown(!showBreakdown)}>
              {showBreakdown ? 'Ẩn chi tiết' : 'Xem chi tiết'}
            </button>
          </div>

          <div className="result-summary">
            <div className="service-info">
              <div className="service-name">
                {serviceData[calculation.service].icon} {calculation.service}
              </div>
              <div className="service-duration">
                ⏱️ {calculation.duration} giờ • 📍 {calculatorData.location}
              </div>
            </div>

            <div className="cost-display">
              <div className="total-cost">
                <span className="cost-label">Tổng chi phí:</span>
                <span className="cost-amount">{calculation.formattedTotal}</span>
              </div>
              
              {calculation.monthlyCost && (
                <div className="monthly-cost">
                  <span className="cost-label">Chi phí hàng tháng:</span>
                  <span className="cost-amount monthly">{calculation.formattedMonthly}</span>
                </div>
              )}
            </div>
          </div>

          {showBreakdown && (
            <div className="cost-breakdown">
              <h5>Chi tiết tính toán:</h5>
              
              <div className="breakdown-item">
                <span>Chi phí cơ bản ({calculation.duration} giờ):</span>
                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculation.baseCost)}</span>
              </div>

              {calculation.adjustments.frequency.discount > 0 && (
                <div className="breakdown-item discount">
                  <span>Giảm giá tần suất ({calculation.adjustments.frequency.discount}%):</span>
                  <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculation.adjustments.frequency.savings)}</span>
                </div>
              )}

              {calculation.adjustments.urgency.cost > 0 && (
                <div className="breakdown-item extra">
                  <span>Phí khẩn cấp ({calculation.adjustments.urgency.extra}%):</span>
                  <span>+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculation.adjustments.urgency.cost)}</span>
                </div>
              )}

              {calculation.additionalServices.cost > 0 && (
                <div className="breakdown-section">
                  <div className="breakdown-item">
                    <span>Dịch vụ bổ sung:</span>
                    <span>+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculation.additionalServices.cost)}</span>
                  </div>
                  {calculation.additionalServices.breakdown.map((service, index) => (
                    <div key={index} className="breakdown-subitem">
                      <span>• {service.name}</span>
                      <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(service.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="breakdown-total">
                <span>Tổng cộng:</span>
                <span>{calculation.formattedTotal}</span>
              </div>
            </div>
          )}

          <div className="result-actions">
            <button className="book-now-btn">
              📅 Đặt lịch ngay
            </button>
            <button className="recalculate-btn" onClick={resetCalculator}>
              🔄 Tính lại
            </button>
          </div>

          <div className="cost-notes">
            <h5>💡 Lưu ý:</h5>
            <ul>
              <li>Giá trên chỉ mang tính chất tham khảo</li>
              <li>Chi phí thực tế có thể thay đổi tùy theo yêu cầu cụ thể</li>
              <li>Giá đã bao gồm phí dịch vụ và bảo hiểm</li>
              <li>Thanh toán sau khi hoàn thành công việc</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCalculator;





