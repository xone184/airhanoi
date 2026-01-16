import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapPin, Navigation, Shield, Thermometer, Route as RouteIcon, Clock,
  Search, ArrowRight, BrainCircuit, Sparkles, Wind, Layers
} from "lucide-react";
import { DistrictData } from "../types";

type Mode = "bike" | "bus" | "car";
type StartMode = "district" | "current";
type DestMode = "district" | "custom";

interface CleanRouteProps {
  data: DistrictData[];
}

const defaultCenter = { lat: 21.0285, lng: 105.8542 }; // Hà Nội center

const modeLabels: Record<Mode, string> = {
  bike: "Xe máy",
  bus: "Bus",
  car: "Taxi/Ô tô",
};

const CleanRoute: React.FC<CleanRouteProps> = ({ data }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null); // Changed from polylineRef
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [startMode, setStartMode] = useState<StartMode>("district");
  const [destMode, setDestMode] = useState<DestMode>("district");
  const [startDistrict, setStartDistrict] = useState<string>("");
  const [destDistrict, setDestDistrict] = useState<string>("");
  const [destCustom, setDestCustom] = useState<string>("");
  const [activeMode, setActiveMode] = useState<Mode>("bike");

  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [startAQI, setStartAQI] = useState<number | null>(null);
  const [destAQI, setDestAQI] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number; steps: string[] } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Prefill defaults
  useEffect(() => {
    if (data && data.length > 0) {
      setStartDistrict(data[0].district);
      setDestDistrict(data[1]?.district || data[0].district);
      const first = data[0];
      setStartCoords({ lat: first.latitude, lng: first.longitude });
      setStartAQI(first.aqi);
      if (data[1]) {
        setDestCoords({ lat: data[1].latitude, lng: data[1].longitude });
        setDestAQI(data[1].aqi);
      }
    }
  }, [data]);

  const districtsOptions = useMemo(
    () =>
      data.map((d) => ({
        value: d.district,
        label: d.district,
        lat: d.latitude,
        lng: d.longitude,
        aqi: d.aqi,
        aqiColor: d.aqi_color
      })),
    [data]
  );

  const findDistrict = (name: string) => districtsOptions.find((d) => d.value === name);

  const findNearestDistrict = (lat: number, lng: number) => {
    let nearest = districtsOptions[0];
    let min = Number.MAX_VALUE;
    districtsOptions.forEach((d) => {
      const dist = Math.sqrt(Math.pow(lat - d.lat, 2) + Math.pow(lng - d.lng, 2));
      if (dist < min) {
        min = dist;
        nearest = d;
      }
    });
    return nearest;
  };

  // Initialize Leaflet map with Premium Layers
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: 12,
      zoomControl: false,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    // Custom Zoom Control
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    // --- PREMIUM TILE LAYERS ---
    const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
      subdomains: 'abcd'
    });

    const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
      subdomains: 'abcd'
    });

    const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    });

    // Default layer
    cartoVoyager.addTo(mapRef.current);

    // Layer Control
    const baseMaps = {
      "🗺️ Voyager": cartoVoyager,
      "🌙 Dark": cartoDark,
      "🛰️ Vệ tinh": esriSatellite
    };
    L.control.layers(baseMaps, {}, { position: 'topright' }).addTo(mapRef.current);

    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
    routeLayerRef.current = L.layerGroup().addTo(mapRef.current);
  }, []);

  // Handle Map Resizing with Observer (Fix for Cốc Cốc / Layout shifts)
  useEffect(() => {
    if (!mapRef.current || !mapContainerRef.current) return;
    const map = mapRef.current;

    // ResizeObserver is more robust than window 'resize'
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure layout is final
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    });

    resizeObserver.observe(mapContainerRef.current);

    // Initial force invalidate
    setTimeout(() => {
      map.invalidateSize();
    }, 500);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();

    const points: L.LatLngExpression[] = [];

    const createIcon = (color: string, iconHtml: string) => L.divIcon({
      className: 'custom-route-marker',
      html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); color: white;">${iconHtml}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    if (startCoords && startCoords.lat !== 0 && startCoords.lng !== 0) {
      const startIcon = createIcon('#3b82f6', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>');
      L.marker([startCoords.lat, startCoords.lng], { icon: startIcon })
        .bindPopup(`<b>Điểm xuất phát</b><br/>AQI: ${startAQI}`)
        .addTo(markerLayerRef.current);
      points.push([startCoords.lat, startCoords.lng]);
    }

    if (destCoords && destCoords.lat !== 0 && destCoords.lng !== 0) {
      const destIcon = createIcon('#ef4444', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>');
      L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
        .bindPopup(`<b>Điểm đến</b><br/>AQI: ${destAQI}`)
        .addTo(markerLayerRef.current);
      points.push([destCoords.lat, destCoords.lng]);
    }

    if (points.length > 0 && !routeInfo) {
      const bounds = L.latLngBounds(points);
      // Fix: Add maxZoom to prevent zooming too close (e.g., into the wall) when points are near
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
    }
  }, [startCoords, destCoords, startAQI, destAQI]);

  const fetchRoute = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    try {
      setIsAnalyzing(true);
      setStatusMsg("Đang tìm lộ trình tối ưu...");
      const startParam = `${start.lng},${start.lat}`;
      const endParam = `${end.lng},${end.lat}`;
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';

      const url = `${apiBase}/route.php?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Không thể kết nối dịch vụ bản đồ");

      const json = await res.json();
      const feature = json.features?.[0];

      if (!feature?.geometry?.coordinates?.length) throw new Error("Không tìm thấy đường đi phù hợp.");

      const coords = feature.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]) as [number, number][];
      const distanceKm = (feature.properties?.summary?.distance || 0) / 1000;
      const durationMin = (feature.properties?.summary?.duration || 0) / 60;
      const steps: string[] = feature.properties?.segments?.[0]?.steps?.slice(0, 5).map((s: any) => s.instruction) || [];

      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();

        // Vẽ đường viền (outline)
        L.polyline(coords, { color: "#1e40af", weight: 8, opacity: 0.4 }).addTo(routeLayerRef.current);
        // Vẽ đường chính
        L.polyline(coords, { color: "#3b82f6", weight: 5, opacity: 1 }).addTo(routeLayerRef.current);

        // Add layer group to map if not already added (though it should be in useEffect)
        if (mapRef.current && !mapRef.current.hasLayer(routeLayerRef.current)) {
          routeLayerRef.current.addTo(mapRef.current);
        }

        if (mapRef.current) {
          mapRef.current.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 14, animate: true });
        }
      }

      // Simulate AI thinking time
      setTimeout(() => {
        setRouteInfo({ distanceKm, durationMin, steps });
        setIsAnalyzing(false);
        setStatusMsg("");
      }, 1500);

    } catch (err: any) {
      setStatusMsg(err.message || "Lỗi khi tìm lộ trình");
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    setRouteInfo(null);
    let startC = startCoords;
    let destC = destCoords;

    // Handle "Current Location"
    if (startMode === "current") {
      try {
        setStatusMsg("Đang lấy vị trí của bạn...");
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        startC = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setStartCoords(startC);

        const near = findNearestDistrict(pos.coords.latitude, pos.coords.longitude);
        setStartAQI(near.aqi);
      } catch (e) {
        setStatusMsg("Không thể lấy vị trí hiện tại.");
        return;
      }
    }

    if (!startC || !destC) {
      setStatusMsg("Vui lòng chọn đủ điểm đi và điểm đến.");
      return;
    }

    await fetchRoute(startC, destC);
  };

  const worstAQI = useMemo(() => {
    const list = [startAQI, destAQI].filter((n): n is number => typeof n === "number");
    if (list.length === 0) return null;
    return Math.max(...list);
  }, [startAQI, destAQI]);

  const getAiAdvice = (aqi: number | null, mode: Mode) => {
    const level = aqi ?? 100;
    const advices = [];

    // General AQI context
    if (level <= 50) advices.push("Chất lượng không khí tốt, rất thuận lợi để di chuyển.");
    else if (level <= 100) advices.push("Chất lượng không khí trung bình, chấp nhận được.");
    else if (level <= 150) advices.push("Cảnh báo: Không khí kém, có thể ảnh hưởng hô hấp.");
    else advices.push("CẢNH BÁO: Ô nhiễm nặng! Hạn chế ra đường nếu không cần thiết.");

    // Mode specific
    if (mode === 'bike') {
      if (level > 100) advices.push("Di chuyển bằng xe máy sẽ tiếp xúc trực tiếp bụi mịn. Hãy đeo khẩu trang chuyên dụng (N95).");
      else advices.push("Sử dụng khẩu trang thường để tránh bụi đường.");
      advices.push("Nên đeo kính chắn gió/bụi.");
    } else if (mode === 'car') {
      advices.push("Hãy đóng kín cửa kính và bật chế độ lấy gió trong.");
      if (level > 150) advices.push("Kiểm tra bộ lọc không khí cabin xe.");
    } else {
      advices.push("Chờ xe bus tại nơi có mái che hoặc tránh gần lòng đường.");
      if (level > 100) advices.push("Đeo khẩu trang trong suốt thời gian chờ và trên xe.");
    }

    return advices;
  };

  return (
    <div className="h-full flex flex-col lg:flex-row w-full bg-slate-900 text-slate-100 overflow-hidden relative">

      {/* LEFT SIDEBAR - CONTROL PANEL */}
      <div className="w-full lg:w-[400px] h-auto lg:h-full bg-slate-800/95 backdrop-blur-xl border-r border-slate-700 p-4 flex flex-col z-20 shadow-2xl overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
            <Navigation size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Lộ Trình Sạch</h2>
            <p className="text-[10px] text-slate-400">Điều hướng thông minh tránh ô nhiễm</p>
          </div>
        </div>

        {/* GOOGLE MAPS STYLE INPUTS */}
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-2 mb-4 shadow-inner">
          <div className="relative flex flex-col gap-2">

            {/* Connecting Line */}
            <div className="absolute left-[22px] top-[24px] bottom-[24px] w-[2px] bg-gradient-to-b from-blue-500 to-red-500 opacity-50"></div>

            {/* Start Input Group */}
            <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-xl border border-slate-700 group focus-within:border-blue-500 transition-colors">
              <div className="w-6 h-6 rounded-full border-[3px] border-blue-500 bg-transparent shrink-0 z-10 bg-slate-800"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Điểm đi</span>
                  {startMode === 'district' && <span className={`text-[10px] px-1.5 rounded ${startAQI && startAQI > 100 ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>AQI: {startAQI || '--'}</span>}
                </div>
                <div className="flex gap-2">
                  <select
                    value={startMode}
                    onChange={(e) => setStartMode(e.target.value as StartMode)}
                    className="bg-transparent text-xs text-cyan-400 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="district" className="bg-slate-900 text-slate-100">Quận</option>
                    <option value="current" className="bg-slate-900 text-slate-100">GPS</option>
                  </select>
                  {startMode === 'district' ? (
                    <select
                      value={startDistrict}
                      onChange={(e) => {
                        setStartDistrict(e.target.value);
                        const d = findDistrict(e.target.value);
                        if (d) { setStartCoords({ lat: d.lat, lng: d.lng }); setStartAQI(d.aqi); }
                      }}
                      className="bg-transparent w-full text-sm focus:outline-none text-white font-medium truncate"
                    >
                      {districtsOptions.map(d => <option key={d.value} value={d.value} className="bg-slate-900 text-slate-100">{d.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Vị trí hiện tại của bạn</span>
                  )}
                </div>
              </div>
            </div>

            {/* Dest Input Group */}
            <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-xl border border-slate-700 group focus-within:border-red-500 transition-colors">
              <MapPin size={24} className="text-red-500 shrink-0 z-10 bg-slate-800 p-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Điểm đến</span>
                  {destMode === 'district' && <span className={`text-[10px] px-1.5 rounded ${destAQI && destAQI > 100 ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>AQI: {destAQI || '--'}</span>}
                </div>
                <div className="flex gap-2">
                  <select
                    value={destMode}
                    onChange={(e) => setDestMode(e.target.value as DestMode)}
                    className="bg-transparent text-xs text-cyan-400 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="district" className="bg-slate-900 text-slate-100">Quận</option>
                    <option value="custom" className="bg-slate-900 text-slate-100">Nhập</option>
                  </select>
                  {destMode === 'district' ? (
                    <select
                      value={destDistrict}
                      onChange={(e) => {
                        setDestDistrict(e.target.value);
                        const d = findDistrict(e.target.value);
                        if (d) { setDestCoords({ lat: d.lat, lng: d.lng }); setDestAQI(d.aqi); }
                      }}
                      className="bg-transparent w-full text-sm focus:outline-none text-white font-medium truncate"
                    >
                      {districtsOptions.map(d => <option key={d.value} value={d.value} className="bg-slate-900 text-slate-100">{d.label}</option>)}
                    </select>
                  ) : (
                    <input
                      value={destCustom}
                      onChange={(e) => setDestCustom(e.target.value)}
                      className="bg-transparent w-full text-sm focus:outline-none text-white font-medium placeholder:text-slate-600"
                      placeholder="Nhập địa điểm..."
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Transport Mode Selection */}
        <div className="flex gap-2 mb-4">
          {(Object.keys(modeLabels) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1
                ${activeMode === m
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'}`}
            >
              {m === 'bike' && <Navigation size={16} />}
              {m === 'car' && <CarIcon />}
              {m === 'bus' && <BusIcon />}
              {modeLabels[m]}
            </button>
          ))}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all mb-4
            ${isAnalyzing
              ? 'bg-slate-700 cursor-not-allowed opacity-80'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-900/20 active:scale-[0.98]'}`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Đang phân tích AI...</span>
            </>
          ) : (
            <>
              <Search size={20} />
              <span>Tìm Lộ Trình & Phân Tích</span>
            </>
          )}
        </button>

        {/* AI ANALYSIS PANEL */}
        {routeInfo && !isAnalyzing ? (
          <div className="flex-1 overflow-y-auto animate-fade-in-up">

            {/* Summary Card */}
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 mb-3">
              <div className="flex justify-between items-end mb-3">
                <span className="text-slate-400 text-xs font-bold uppercase">Tổng quan</span>
                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <Shield size={12} /> Lộ trình tối ưu
                </span>
              </div>
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-700 rounded-lg"><Clock size={20} className="text-blue-400" /></div>
                  <div>
                    <div className="text-2xl font-bold">{routeInfo.durationMin.toFixed(0)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Phút</div>
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-700 rounded-lg"><RouteIcon size={20} className="text-purple-400" /></div>
                  <div>
                    <div className="text-2xl font-bold">{routeInfo.distanceKm.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Km</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Advice Card */}
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-4 border border-indigo-500/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BrainCircuit size={80} />
              </div>

              <h3 className="flex items-center gap-2 text-indigo-300 font-bold mb-3">
                <Sparkles size={16} /> AI Trợ Lý Khuyên Bạn
              </h3>

              <div className="space-y-3 relative z-10">
                {getAiAdvice(worstAQI, activeMode).map((advice, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-slate-900/60 rounded-lg border border-indigo-500/20">
                    <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-indigo-400"></div>
                    <p className="text-sm text-slate-200 leading-relaxed">{advice}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-500/20 text-xs text-indigo-300/60 flex items-center justify-between">
                <span>Dựa trên dữ liệu AQI thời gian thực</span>
                <span>AirHanoi Intelligence™</span>
              </div>
            </div>

          </div>
        ) : (
          !isAnalyzing && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Navigation size={32} className="text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm">Chọn điểm đi, điểm đến và phương tiện để nhận phân tích lộ trình.</p>
            </div>
          )
        )}

      </div>

      {/* RIGHT - MAP */}
      <div className="flex-1 relative bg-slate-900 h-[60vh] lg:h-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map Overlay Info */}
        <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50 shadow-xl text-xs text-white font-bold pointer-events-none flex items-center gap-2">
          {activeMode === 'bike' ? '🏍️ Chế độ xe máy' : activeMode === 'car' ? '🚗 Chế độ ô tô' : '🚌 Bus'}
        </div>
      </div>

    </div>
  );
};

// Icons helper
const CarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
);
const BusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" /><path d="M18 18h3s.5-1.7.5-2.8O7 9 7 2" /><path d="M6 12v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2" /><circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="18" cy="18" r="2" /></svg>
);

export default CleanRoute;

