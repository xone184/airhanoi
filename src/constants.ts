import { DistrictData } from "./types";

// Raw district list from the provided Python script
export const HANOI_DISTRICTS_RAW = [
    {"name": "Ba Đình", "lat": 21.0364, "lon": 105.8363},
    {"name": "Hoàn Kiếm", "lat": 21.0291, "lon": 105.8522},
    {"name": "Đống Đa", "lat": 21.0150, "lon": 105.8290},
    {"name": "Hai Bà Trưng", "lat": 21.0096, "lon": 105.8574},
    {"name": "Cầu Giấy", "lat": 21.0300, "lon": 105.7930},
    {"name": "Thanh Xuân", "lat": 20.9990, "lon": 105.8070},
    {"name": "Hoàng Mai", "lat": 20.9730, "lon": 105.8530},
    {"name": "Long Biên", "lat": 21.0560, "lon": 105.8800},
    {"name": "Nam Từ Liêm", "lat": 21.0320, "lon": 105.7570},
    {"name": "Bắc Từ Liêm", "lat": 21.0700, "lon": 105.7570},
    {"name": "Tây Hồ", "lat": 21.0720, "lon": 105.8250},
    {"name": "Hà Đông", "lat": 20.9670, "lon": 105.7570},
    {"name": "Sơn Tây", "lat": 21.1370, "lon": 105.5050},
    {"name": "Ba Vì", "lat": 21.1170, "lon": 105.3670},
    {"name": "Chương Mỹ", "lat": 20.9500, "lon": 105.6500},
    {"name": "Đan Phượng", "lat": 21.1000, "lon": 105.6830},
    {"name": "Đông Anh", "lat": 21.1400, "lon": 105.8400},
    {"name": "Gia Lâm", "lat": 21.0170, "lon": 105.9330},
    {"name": "Hoài Đức", "lat": 21.0330, "lon": 105.7000},
    {"name": "Mê Linh", "lat": 21.1830, "lon": 105.7170},
    {"name": "Mỹ Đức", "lat": 20.8670, "lon": 105.7330},
    {"name": "Phúc Thọ", "lat": 21.1000, "lon": 105.5500},
    {"name": "Phú Xuyên", "lat": 20.7330, "lon": 105.8830},
    {"name": "Quốc Oai", "lat": 20.9830, "lon": 105.6170},
    {"name": "Thạch Thất", "lat": 21.0330, "lon": 105.5500},
    {"name": "Thanh Oai", "lat": 20.8670, "lon": 105.7670},
    {"name": "Thanh Trì", "lat": 20.9330, "lon": 105.8500},
    {"name": "Thường Tín", "lat": 20.8670, "lon": 105.8830},
    {"name": "Ứng Hòa", "lat": 20.7330, "lon": 105.8000},
    {"name": "Sóc Sơn", "lat": 21.2500, "lon": 105.8330},
];

const getAqiInfo = (aqi: number): { level: string; color: string } => {
    if (aqi <= 50) return { level: 'Tốt', color: '#00e400' };
    if (aqi <= 100) return { level: 'Trung bình', color: '#ffff00' };
    if (aqi <= 150) return { level: 'Kém', color: '#ff7e00' };
    if (aqi <= 200) return { level: 'Xấu', color: '#ff0000' };
    if (aqi <= 300) return { level: 'Rất xấu', color: '#8f3f97' };
    return { level: 'Nguy hại', color: '#7e0023' };
};

export const MOCK_DATA: DistrictData[] = HANOI_DISTRICTS_RAW.map((district, index) => {
    const aqi = Math.floor(Math.random() * (250 - 30 + 1)) + 30; // Random AQI between 30 and 250
    const aqiInfo = getAqiInfo(aqi);

    return {
        id: index + 1,
        district: district.name,
        latitude: district.lat,
        longitude: district.lon,
        aqi: aqi,
        pm25: parseFloat((aqi * (Math.random() * (0.8 - 0.4) + 0.4)).toFixed(1)), // Correlate PM2.5 with AQI
        pm10: parseFloat((aqi * (Math.random() * (1.2 - 0.8) + 0.8)).toFixed(1)),
        temperature: Math.floor(Math.random() * (35 - 22 + 1)) + 22, // Random temp between 22 and 35°C
        humidity: Math.floor(Math.random() * (90 - 60 + 1)) + 60, // Random humidity between 60% and 90%
        pollution_level: aqiInfo.level,
        aqi_color: aqiInfo.color,
        datetime: new Date(Date.now() - Math.floor(Math.random() * 60) * 60000).toISOString(), // Random time within the last hour
    };
});

