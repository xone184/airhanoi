import React, { useState, useEffect, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Register from './components/Register';
import { DistrictData, ForecastData, User, PollutionReport, UserSettings } from './types';
import { MOCK_DATA } from './constants';
import { db } from './services/db';

// Lazy load heavy components for better initial load time
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const SpatialMap = React.lazy(() => import('./components/SpatialMap'));
const Forecast = React.lazy(() => import('./components/Forecast'));
const ChatBot = React.lazy(() => import('./components/ChatBot'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const Settings = React.lazy(() => import('./components/Settings'));
const HealthAdvice = React.lazy(() => import('./components/HealthAdvice'));
const HealthDiary = React.lazy(() => import('./components/HealthDiary'));
const CleanRoute = React.lazy(() => import('./components/CleanRoute'));
const Education = React.lazy(() => import('./components/Education'));
const ReportPollution = React.lazy(() => import('./components/ReportPollution'));
const Comparison = React.lazy(() => import('./components/Comparison'));
const NewsFeed = React.lazy(() => import('./components/NewsFeed'));

// Loading fallback component
const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-400 text-sm">Đang tải...</span>
        </div>
    </div>
);

const App: React.FC = () => {
    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);

    // App State
    const [activeTab, setActiveTab] = useState('dashboard');
    const [appData, setAppData] = useState<DistrictData[]>(MOCK_DATA);
    const [forecastData, setForecastData] = useState<ForecastData[]>([]);
    const [userSettings, setUserSettings] = useState<UserSettings>({
        email: '',
        phone: '',
        alertDistrict: 'Ba Đình',
        alertThreshold: 150,
        enableEmailAlerts: true,
        enableSmsAlerts: false,
        language: 'vi',
        temperatureUnit: 'c',
        themeMode: 'dark'
    });
    const [systemSettings, setSystemSettings] = useState<{ maintenanceMode: boolean; refreshInterval: string }>({
        maintenanceMode: false,
        refreshInterval: '15m'
    });

    // Sidebar State: Default open on large screens (desktop), closed on mobile
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    // Load initial reports from DB
    const [reports, setReports] = useState<PollutionReport[]>([]);

    // --- AUTH PERSISTENCE ---
    // Khôi phục thông tin người dùng từ localStorage khi reload trang
    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored) as User;
                if (parsed && parsed.isLoggedIn) {
                    setCurrentUser(parsed);
                }
            }
        } catch (error) {
            console.warn('Failed to restore user from localStorage:', error);
        }
    }, []);

    // --- THEME SWITCHING BASED ON SETTINGS ---
    useEffect(() => {
        if (userSettings.themeMode === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }, [userSettings.themeMode]);

    // --- INITIALIZATION ---
    useEffect(() => {
        // Load data from API backend
        const loadData = async () => {
            try {
                // Load user settings
                try {
                    const settings = await db.getSettings();
                    setUserSettings(settings);
                } catch (error) {
                    console.warn('Failed to load user settings:', error);
                }

                // Load system settings (maintenance, refresh interval)
                try {
                    const sys = await db.getSystemSettings();
                    setSystemSettings(sys);
                } catch (error) {
                    console.warn('Failed to load system settings:', error);
                }

                // 1. Load reports from API
                try {
                    const reportsData = await db.getReports();
                    setReports(reportsData);
                } catch (error) {
                    console.warn('Failed to load reports:', error);
                }

                // 2. Load realtime data from API
                try {
                    const realtimeData = await db.getRealtimeData();
                    if (realtimeData && realtimeData.length > 0) {
                        setAppData(realtimeData);
                    } else {
                        // If API returns no data, MOCK_DATA which is already set will be used.
                        console.warn('API returned no realtime data. Using initial mock data.');
                    }
                } catch (error) {
                    console.warn('Failed to load realtime data, using initial mock data:', error);
                }

                // 3. Load forecast data from API
                try {
                    const forecastApiData = await db.getForecastData();
                    if (forecastApiData && forecastApiData.length > 0) {
                        setForecastData(forecastApiData);
                    } else {
                        console.warn('API returned no forecast data. Forecast charts will be empty.');
                    }
                } catch (error) {
                    console.warn('Failed to load forecast data:', error);
                }
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        };

        if (currentUser) {
            loadData();
        }
    }, [currentUser]);

    // Derived data for temperature unit
    const displayData = React.useMemo(() => {
        if (!appData) return [];
        if (userSettings.temperatureUnit === 'f') {
            return appData.map(d => ({
                ...d,
                temperature: Math.round(d.temperature * 9 / 5 + 32)
            }));
        }
        return appData;
    }, [appData, userSettings.temperatureUnit]);

    const temperatureUnitLabel = userSettings.temperatureUnit === 'f' ? '°F' : '°C';

    // Login Handler
    const handleLogin = (user: User) => {
        const normalizedUser: User = {
            ...user,
            isLoggedIn: true,
        };
        // Lưu vào localStorage để không bị đăng xuất khi F5
        try {
            localStorage.setItem('user', JSON.stringify(normalizedUser));
        } catch (error) {
            console.warn('Failed to persist user to localStorage:', error);
        }
        setCurrentUser(normalizedUser);
        setActiveTab('dashboard');
    };

    // Logout Handler
    const handleLogout = () => {
        try {
            localStorage.removeItem('user');
        } catch (error) {
            console.warn('Failed to clear user from localStorage:', error);
        }
        setCurrentUser(null);
        setIsRegistering(false);
    };

    // Data Handlers - Refresh from API after upload
    const handleRealtimeDataLoaded = async (data: DistrictData[]) => {
        setAppData(data);
        // Data đã được lưu vào DB qua API upload, chỉ cần refresh từ API
        try {
            const freshData = await db.getRealtimeData();
            if (freshData && freshData.length > 0) {
                setAppData(freshData);
            }
        } catch (error) {
            console.error('Failed to refresh realtime data:', error);
        }
    };

    const handleForecastDataLoaded = async (data: ForecastData[]) => {
        setForecastData(data);
        // Refresh from API
        try {
            const freshData = await db.getForecastData();
            if (freshData && freshData.length > 0) {
                setForecastData(freshData);
            }
        } catch (error) {
            console.error('Failed to refresh forecast data:', error);
        }
    };

    // Report Handlers using DB Service
    const handleSubmitReport = async (newReport: Omit<PollutionReport, 'report_id' | 'created_at' | 'status'>) => {
        try {
            const savedReport = await db.addReport(newReport);
            setReports(prev => [savedReport, ...prev]);
        } catch (error) {
            console.error('Failed to submit report:', error);
            alert('Không thể gửi báo cáo. Vui lòng thử lại.');
        }
    };

    const handleUpdateReportStatus = async (ids: number[], newStatus: 'verified' | 'rejected') => {
        try {
            await db.updateReportStatus(ids, newStatus);
            // Refresh reports from API
            const updatedReports = await db.getReports();
            setReports(updatedReports);
        } catch (error) {
            console.error('Failed to update report status:', error);
            alert('Không thể cập nhật trạng thái báo cáo. Vui lòng thử lại.');
        }
    };

    // Determine what to render
    if (!currentUser) {
        if (isRegistering) {
            return <Register onRegister={handleLogin} onBackToLogin={() => setIsRegistering(false)} />;
        }
        return <Login onLogin={handleLogin} onSwitchToRegister={() => setIsRegistering(true)} />;
    }

    // Maintenance guard for non-admin
    const MaintenanceScreen = () => (
        <div className="flex flex-col items-center justify-center min-h-screen text-white bg-slate-900 p-6 text-center">
            <h1 className="text-3xl font-bold mb-4">Hệ thống đang bảo trì</h1>
            <p className="text-slate-300 max-w-xl">Vui lòng quay lại sau. Nếu bạn là Admin, hãy đăng nhập để tắt chế độ bảo trì.</p>
        </div>
    );

    // Authenticated Content
    const renderContent = () => {
        if (systemSettings.maintenanceMode && currentUser.role !== 'admin') {
            return <MaintenanceScreen />;
        }
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard data={displayData} forecastData={forecastData} temperatureUnit={temperatureUnitLabel} />;
            case 'map':
                return <SpatialMap data={displayData} />;
            case 'analytics':
                return <Forecast realtimeData={displayData} forecastData={forecastData} />;
            case 'comparison':
                return <Comparison data={displayData} />;
            case 'health':
                return <HealthAdvice data={displayData} />;
            case 'health-diary':
                return <HealthDiary data={displayData} />;
            case 'clean-route': // NEW MODULE
                return <CleanRoute data={displayData} />;
            case 'news':
                return <NewsFeed />;
            case 'education':
                return <Education />;
            case 'report':
                return <ReportPollution onSubmitReport={handleSubmitReport} />;
            case 'chat':
                return <ChatBot data={displayData} />;
            case 'admin':
                return currentUser.role === 'admin'
                    ? <AdminPanel
                        onRealtimeDataLoaded={handleRealtimeDataLoaded}
                        onForecastDataLoaded={handleForecastDataLoaded}
                        reports={reports}
                        onUpdateReportStatus={handleUpdateReportStatus}
                        systemSettings={systemSettings}
                        onSystemSettingsChange={setSystemSettings}
                    />
                    : <Dashboard data={displayData} forecastData={forecastData} temperatureUnit={temperatureUnitLabel} />;
            case 'settings':
                return <Settings onSettingsUpdated={setUserSettings} />;
            default:
                return <Dashboard data={displayData} forecastData={forecastData} temperatureUnit={temperatureUnitLabel} />;
        }
    };

    return (
        <div className="flex min-h-screen font-sans selection:bg-cyan-500 selection:text-white bg-transparent">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userRole={currentUser.role}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                language={userSettings.language}
            />

            {/* Main Content Area - Dynamic Margin based on Sidebar State */}
            {/* On Desktop (lg): marginLeft is 64 (16rem) if open, 0 if closed */}
            {/* On Mobile: marginLeft is always 0 because sidebar is an overlay */}
            <main
                className={`flex-1 transition-all duration-300 relative z-10 
                    ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}
            >
                <div className="pt-12 lg:pt-0 h-full">
                    <Suspense fallback={<LoadingFallback />}>
                        {renderContent()}
                    </Suspense>
                </div>
            </main>
        </div>
    );
};

export default App;