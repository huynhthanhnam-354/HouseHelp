import React from "react";

function HousekeeperInfo({ housekeeperData }) {
  // Parse JSON fields safely
  const parseJSON = (jsonString) => {
    try {
      return JSON.parse(jsonString) || [];
    } catch {
      return [];
    }
  };

  const skills = parseJSON(housekeeperData?.skills);
  const certifications = parseJSON(housekeeperData?.certifications);
  const workingDays = parseJSON(housekeeperData?.workingDays);

  // Format price
  const formatPrice = (price, priceType) => {
    if (!price) return "Chưa cập nhật";
    const formatted = new Intl.NumberFormat('vi-VN').format(price);
    const typeText = {
      'hourly': '/giờ',
      'daily': '/ngày',
      'per_service': '/dịch vụ'
    };
    return `${formatted}đ${typeText[priceType] || ''}`;
  };

  // Format working days
  const formatWorkingDays = (days) => {
    if (!days || days.length === 0) return "Chưa cập nhật";
    const dayMap = {
      'Monday': 'T2',
      'Tuesday': 'T3', 
      'Wednesday': 'T4',
      'Thursday': 'T5',
      'Friday': 'T6',
      'Saturday': 'T7',
      'Sunday': 'CN'
    };
    return days.map(day => dayMap[day] || day).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Professional Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Stats</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Rating</span>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">⭐</span>
              <span className="font-medium">
                {housekeeperData?.rating || '0'} ({housekeeperData?.totalReviews || 0} reviews)
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Completed Jobs</span>
            <span className="font-medium">{housekeeperData?.completedJobs || 0}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Response Time</span>
            <span className="font-medium">{housekeeperData?.responseTime || 0} minutes</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Experience</span>
            <span className="font-medium">{housekeeperData?.experience || 0} years</span>
          </div>

          {housekeeperData?.isTopRated && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">🏆</span>
                <span className="text-yellow-800 font-medium">Top Rated</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing & Availability */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Availability</h3>
        <div className="space-y-4">
          <div>
            <span className="text-gray-600 block mb-1">Price</span>
            <span className="text-xl font-bold text-green-600">
              {formatPrice(housekeeperData?.price, housekeeperData?.priceType)}
            </span>
          </div>
          
          <div>
            <span className="text-gray-600 block mb-1">Working Days</span>
            <span className="font-medium">{formatWorkingDays(workingDays)}</span>
          </div>
          
          <div>
            <span className="text-gray-600 block mb-1">Working Hours</span>
            <span className="font-medium">{housekeeperData?.workingHours || "Chưa cập nhật"}</span>
          </div>
          
          <div>
            <span className="text-gray-600 block mb-1">Service Radius</span>
            <span className="font-medium">{housekeeperData?.serviceRadius || 0} km</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              housekeeperData?.available ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="font-medium">
              {housekeeperData?.available ? 'Available' : 'Not Available'}
            </span>
          </div>
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
          <div className="space-y-2">
            {certifications.map((cert, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm">{cert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insurance */}
      {housekeeperData?.hasInsurance && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance</h3>
          <div className="flex items-center gap-2 text-green-600">
            <span>🛡️</span>
            <span className="font-medium">Insured Professional</span>
          </div>
          {housekeeperData?.insuranceInfo && (
            <p className="text-sm text-gray-600 mt-2">{housekeeperData.insuranceInfo}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default HousekeeperInfo; 