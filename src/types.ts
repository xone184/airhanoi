
// Type definitions aligned with Database Schema

// 1. Master Data: Districts
export interface DistrictData {
  id?: number; // Matches dim_districts.district_id
  district: string; // Matches dim_districts.name
  latitude: number;
  longitude: number;

  // Real-time metrics (joined from fact_air_quality)
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  aqi: number;

  // Computed/Joined fields for display
  pollution_level: string; // Joined from dim_aqi_scale
  aqi_color: string;      // Joined from dim_aqi_scale
  datetime: string;
}

// 2. Forecast Data
export interface ForecastData {
  datetime: string; // matches csv: datetime
  district: string;
  latitude: number;
  longitude: number;
  pm25_forecast: number;
  aqi_forecast: number;
  pollution_level_forecast: string;
  aqi_color_forecast: string;
  data_type?: string;
}

// 3. AQI Reference (Dimensions)
export enum AQILevel {
  GOOD = "Tốt",
  MODERATE = "Trung bình",
  UNHEALTHY_SENSITIVE = "Kém",
  UNHEALTHY = "Xấu",
  VERY_UNHEALTHY = "Rất xấu",
  HAZARDOUS = "Nguy hại"
}

// 4. User & Auth
export type UserRole = 'admin' | 'user';

export interface User {
  user_id?: number;
  username: string; // Display name or Email
  email?: string;
  role: UserRole;
  isLoggedIn: boolean;
  token?: string; // JWT Token
}

export interface UserSettings {
  user_id?: number;
  email: string;
  phone: string;
  alertDistrict: string;
  alertDistrictId?: number; // Database link
  alertThreshold: number;
  enableEmailAlerts: boolean;
  enableSmsAlerts: boolean;
  language: 'vi' | 'en';
  temperatureUnit: 'c' | 'f';
  themeMode: 'light' | 'dark';
}

// 5. Pollution Reports
export type PollutionType = 'burning' | 'construction' | 'traffic' | 'industrial' | 'other';
export type ReportStatus = 'pending' | 'verified' | 'rejected';

export interface PollutionReport {
  report_id?: number;
  user_id?: number;
  district: string;
  address: string;
  type: PollutionType;
  customType?: string; // For 'other' type
  description: string;
  image_url?: string;
  status: ReportStatus;
  created_at: string;
}

// 6. Chat Interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  sources?: { title: string; url: string }[]; // Added for Search Grounding
}

// 7. News & Events
export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  category: 'news' | 'event' | 'tips';
  date: string;
  imageUrl: string;
  author: string;
  url?: string; // External link
}

// 8. Health Diary (NEW)
export interface HealthLog {
  id: number;
  date: string; // YYYY-MM-DD
  symptoms: string[]; // ['ho', 'kho_tho', 'met_moi']
  severity: number; // 1-5 scale
  note: string;
  aqi_at_time: number; // Recorded AQI
}
