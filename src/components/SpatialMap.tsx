import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { DistrictData } from '../types';
import { Filter, Layers, MapPin, XCircle } from 'lucide-react';

interface SpatialMapProps {
    data: DistrictData[];
}

const SpatialMap: React.FC<SpatialMapProps> = ({ data }) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);
    const userLocationLayerRef = useRef<L.LayerGroup | null>(null); // Layer for user's real-time location
    const tileLayerRef = useRef<L.TileLayer | null>(null);

    // Tracking State
    const [isTracking, setIsTracking] = useState(true); // Start tracking by default
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // Map Style State
    const [mapStyle, setMapStyle] = useState<'voyager' | 'dark' | 'satellite'>('voyager');

    // Filter State
    const [filterLevel, setFilterLevel] = useState<string>('all');

    // Map Styles Configuration
    const mapStyles = {
        voyager: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            label: 'Tiêu chuẩn',
            color: '#3b82f6'
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            label: 'Đêm',
            color: '#1e293b'
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            label: 'Vệ tinh',
            color: '#15803d'
        }
    };

    // Filter Options
    const filters = [
        { id: 'all', label: 'Tất cả', color: '#3b82f6' },
        { id: 'Tốt', label: 'Tốt (0-50)', color: '#00e400' },
        { id: 'Trung bình', label: 'Trung bình (51-100)', color: '#eab308' }, // Darker yellow for visibility on white map
        { id: 'Kém', label: 'Kém (101-150)', color: '#ff7e00' },
        { id: 'Xấu', label: 'Xấu (151-200)', color: '#ff0000' },
        { id: 'Rất xấu', label: 'Rất xấu (201-300)', color: '#8f3f97' },
        { id: 'Nguy hại', label: 'Nguy hại (300+)', color: '#7e0023' },
    ];

    // Filter Logic
    const filteredData = useMemo(() => {
        if (filterLevel === 'all') return data;
        return data.filter(d => d.pollution_level === filterLevel);
    }, [data, filterLevel]);

    // Handle Map Style Change
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove existing tile layer
        if (tileLayerRef.current) {
            tileLayerRef.current.remove();
        }

        // Add new tile layer
        const style = mapStyles[mapStyle];
        tileLayerRef.current = L.tileLayer(style.url, {
            attribution: '&copy; OpenStreetMap &copy; CARTO / Esri',
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(mapRef.current);

    }, [mapStyle]);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize map if not already initialized
        if (!mapRef.current) {
            // Default center of Hanoi với smooth animations
            mapRef.current = L.map(mapContainerRef.current, {
                center: [21.0285, 105.8542],
                zoom: 12,
                zoomControl: false, // We'll add custom position
                zoomAnimation: true,
                fadeAnimation: true,
                markerZoomAnimation: true,
                scrollWheelZoom: true,
                preferCanvas: true, // Better performance for many markers
            });

            // Add zoom control to bottom-right
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

            // Initialize LayerGroup for markers to manage them easily
            markersRef.current = L.layerGroup().addTo(mapRef.current);
            // Initialize LayerGroup for user location
            userLocationLayerRef.current = L.layerGroup().addTo(mapRef.current);

            // Set Initial Tile Layer
            const style = mapStyles[mapStyle];
            tileLayerRef.current = L.tileLayer(style.url, {
                attribution: '&copy; OpenStreetMap &copy; CARTO / Esri',
                maxZoom: 19,
                subdomains: 'abcd'
            }).addTo(mapRef.current);
        }
    }, []); // Empty dependency array ensures this runs only once

    // Automatically start tracking when the component mounts
    useEffect(() => {
        startTracking();

        // Cleanup function to stop tracking when the component unmounts
        return () => {
            stopTracking();
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    // Function to start tracking user's location
    const startTracking = () => {
        if (!navigator.geolocation) {
            setTrackingError('Trình duyệt của bạn không hỗ trợ định vị.');
            return;
        }

        setIsTracking(true);
        setTrackingError(null);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const latLng = L.latLng(latitude, longitude);

                if (userLocationLayerRef.current && mapRef.current) {
                    userLocationLayerRef.current.clearLayers();

                    const userIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: `<div class="pulsating-dot"></div>`,
                        iconSize: [20, 20],
                    });

                    L.marker(latLng, { icon: userIcon }).addTo(userLocationLayerRef.current);

                    // --- IMPROVEMENT: Only center map if user is within Hanoi's bounds ---
                    const hanoiBounds = {
                        minLat: 20.8,
                        maxLat: 21.3,
                        minLng: 105.5,
                        maxLng: 106.0
                    };

                    if (
                        latitude >= hanoiBounds.minLat &&
                        latitude <= hanoiBounds.maxLat &&
                        longitude >= hanoiBounds.minLng &&
                        longitude <= hanoiBounds.maxLng
                    ) {
                        mapRef.current.setView(latLng, 15); // Center map on user if they are in Hanoi
                    }
                    // If user is outside Hanoi, we still show their marker, but don't move the map away from Hanoi.
                }
            },
            (error) => {
                let message = 'Đã xảy ra lỗi khi lấy vị trí.';
                if (error.code === error.PERMISSION_DENIED) {
                    message = 'Bạn đã từ chối quyền truy cập vị trí trong trình duyệt.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    message = 'Không thể xác định vị trí hiện tại (thiếu GPS hoặc dịch vụ vị trí của hệ điều hành bị tắt).';
                } else if (error.code === error.TIMEOUT) {
                    message = 'Trình duyệt mất quá nhiều thời gian để lấy vị trí. Hãy thử lại, bật Wi‑Fi / Location Service rồi bấm lại.';
                }
                console.error("Geolocation Error:", error);
                setTrackingError(message + (error.message ? ` (Chi tiết: ${error.message})` : ''));
                setIsTracking(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    // Function to stop tracking
    const stopTracking = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
        userLocationLayerRef.current?.clearLayers(); // Remove marker from map
    };

    // Cleanup effect to stop tracking when component unmounts
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current || !markersRef.current) return;

        // Clear existing markers
        markersRef.current.clearLayers();

        // Add markers for filtered data
        filteredData.forEach(d => {
            if (mapRef.current && markersRef.current) {

                // Dynamic Size Calculation based on AQI
                // Base size 30px, grows with AQI. Max cap at 50px to prevent overcrowding with labels.
                const size = Math.min(30 + (d.aqi / 10), 50);

                // Text Color Logic: Yellow background needs dark text
                const isYellow = d.aqi > 50 && d.aqi <= 100;
                const textColor = isYellow ? '#333' : '#fff';

                const customIcon = L.divIcon({
                    className: 'custom-aqi-marker-container',
                    html: `
                        <div style="display: flex; flex-direction: column; align-items: center; width: 100px; transform: translateX(-50%);">
                            <!-- Circle -->
                            <div style="
                                background-color: ${d.aqi_color};
                                width: ${size}px;
                                height: ${size}px;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: ${textColor};
                                font-weight: 900;
                                font-size: ${Math.max(10, size / 2.5)}px;
                                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                                border: 2px solid white;
                                margin-bottom: 4px;
                            ">
                                ${d.aqi}
                            </div>
                            <!-- Label -->
                            <div style="
                                background: rgba(255, 255, 255, 0.9);
                                color: #334155;
                                padding: 2px 6px;
                                border-radius: 4px;
                                font-size: 10px;
                                font-weight: 700;
                                text-align: center;
                                white-space: nowrap;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                border: 1px solid rgba(0,0,0,0.1);
                            ">
                                ${d.district}
                            </div>
                        </div>
                    `,
                    iconSize: [0, 0], // CSS handles size
                    iconAnchor: [0, size / 2 + 10] // Anchor adjustment
                });

                const marker = L.marker([d.latitude, d.longitude], { icon: customIcon });

                // Create popup content
                const popupContent = `
                    <div style="font-family: 'Inter', sans-serif; color: #1e293b; min-width: 180px;">
                        <div style="background: ${d.aqi_color}; padding: 8px; border-radius: 6px 6px 0 0; color: ${textColor};">
                            <h3 style="margin: 0; font-weight: bold; font-size: 16px;">${d.district}</h3>
                            <span style="font-size: 12px; opacity: 0.9;">${new Date(d.datetime).toLocaleTimeString()}</span>
                        </div>
                        <div style="padding: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: bold; font-size: 24px; color: ${d.aqi_color}">${d.aqi}</span>
                                <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${d.pollution_level}</span>
                            </div>
                            <div style="font-size: 13px; color: #475569; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                                <div>PM2.5: <b>${d.pm25}</b></div>
                                <div>PM10: <b>${d.pm10}</b></div>
                                <div>Nhiệt độ: <b>${d.temperature}°C</b></div>
                                <div>Độ ẩm: <b>${d.humidity}%</b></div>
                            </div>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);
                marker.addTo(markersRef.current);
            }
        });

    }, [filteredData]); // Re-run when filteredData changes

    return (
        <div className="p-0 h-full flex flex-col relative animate-fade-in">
            {/* Title Overlay */}
            <div className="absolute top-4 left-4 lg:left-14 z-[400] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200 max-w-xs pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Layers size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 leading-tight">Bản Đồ Giao Thông</h1>
                        <p className="text-xs text-slate-500 font-medium">Hiển thị AQI theo quy mô & vị trí</p>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE CONTROL PANEL */}
            <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2">

                {/* 1. Map Style Selector Pattern */}
                <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Layers size={16} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 uppercase">Loại bản đồ</span>
                    </div>
                    <div className="flex gap-2">
                        {(Object.keys(mapStyles) as Array<keyof typeof mapStyles>).map((style) => (
                            <button
                                key={style}
                                onClick={() => setMapStyle(style)}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all w-16
                                    ${mapStyle === style
                                        ? 'bg-slate-100 border-blue-500 shadow-inner'
                                        : 'border-transparent hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full border-2 ${mapStyle === style ? 'border-blue-500' : 'border-slate-300'}`} style={{ background: mapStyles[style].color }}></div>
                                <span className={`text-[9px] font-bold ${mapStyle === style ? 'text-blue-600' : 'text-slate-500'}`}>{mapStyles[style].label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Filter Control */}
                <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Filter size={16} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 uppercase">Bộ lọc AQI</span>
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                        {filters.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterLevel(f.id)}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border
                                    ${filterLevel === f.id
                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105'
                                        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                                    }`}
                            >
                                <span>{f.label}</span>
                                {f.id !== 'all' && (
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }}></span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Real-time Location Tracking */}
                <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 w-full max-w-[250px] pointer-events-auto">
                    <button
                        onClick={isTracking ? stopTracking : startTracking}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border
                            ${isTracking
                                ? 'bg-red-500 text-white border-red-500 shadow-md'
                                : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                            }`}
                    >
                        <MapPin size={14} />
                        {isTracking ? 'Dừng Theo Dõi' : 'Vị Trí Của Tôi'}
                    </button>
                    {trackingError && (
                        <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded-lg flex items-start gap-2 text-left">
                            <XCircle size={14} className="mt-0.5 shrink-0" /> <span className="break-words w-full">{trackingError}</span>
                        </div>
                    )}
                </div>

                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-600">
                    {filteredData.length} điểm quan trắc
                </div>
            </div>

            {/* Map Container */}
            <div ref={mapContainerRef} className="w-full h-full z-0 relative" style={{ minHeight: '80vh' }}></div>

            {/* Inject styles */}
            <style>
                {`
                    /* User Location Pulsating Marker */
                    .user-location-marker .pulsating-dot {
                        width: 20px;
                        height: 20px;
                        background-color: #007bff;
                        border-radius: 50%;
                        border: 3px solid #fff;
                        box-shadow: 0 0 0 rgba(0, 123, 255, 0.4);
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
                        70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
                    }

                    /* AQI Marker Hover Effects */
                    .custom-aqi-marker-container {
                        transition: z-index 0.2s;
                    }
                    .custom-aqi-marker-container:hover {
                         z-index: 1000 !important;
                    }
                    .custom-aqi-marker-container:hover > div > div:first-child {
                        transform: scale(1.15);
                        box-shadow: 0 8px 25px rgba(0,0,0,0.4);
                    }
                `}
            </style>
        </div>
    );
};

export default SpatialMap;