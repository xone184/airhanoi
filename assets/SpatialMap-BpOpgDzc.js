import{c as E,r,j as t}from"./index-BfG21aHV.js";import{L as o}from"./leaflet-src-C7RQRDvA.js";import{L as T}from"./layers-10YnhFzc.js";import{F as R}from"./filter-B90YEon7.js";import{M as q}from"./map-pin-BobRzQ3j.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=E("XCircle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]),D=({data:f})=>{const s=r.useRef(null),h=r.useRef(null),n=r.useRef(null),c=r.useRef(null),x=r.useRef(null),[g,v]=r.useState(!0),[N,y]=r.useState(null),m=r.useRef(null),[i,z]=r.useState("voyager"),[p,$]=r.useState("all"),d={voyager:{url:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",label:"Tiêu chuẩn",color:"#3b82f6"},dark:{url:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",label:"Đêm",color:"#1e293b"},satellite:{url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",label:"Vệ tinh",color:"#15803d"}},I=[{id:"all",label:"Tất cả",color:"#3b82f6"},{id:"Tốt",label:"Tốt (0-50)",color:"#00e400"},{id:"Trung bình",label:"Trung bình (51-100)",color:"#eab308"},{id:"Kém",label:"Kém (101-150)",color:"#ff7e00"},{id:"Xấu",label:"Xấu (151-200)",color:"#ff0000"},{id:"Rất xấu",label:"Rất xấu (201-300)",color:"#8f3f97"},{id:"Nguy hại",label:"Nguy hại (300+)",color:"#7e0023"}],w=r.useMemo(()=>p==="all"?f:f.filter(e=>e.pollution_level===p),[f,p]);r.useEffect(()=>{if(!s.current)return;x.current&&x.current.remove();const e=d[i];x.current=o.tileLayer(e.url,{attribution:"&copy; OpenStreetMap &copy; CARTO / Esri",maxZoom:19,subdomains:"abcd"}).addTo(s.current)},[i]),r.useEffect(()=>{if(h.current&&!s.current){s.current=o.map(h.current,{center:[21.0285,105.8542],zoom:12,zoomControl:!1,zoomAnimation:!0,fadeAnimation:!0,markerZoomAnimation:!0,scrollWheelZoom:!0,preferCanvas:!0}),o.control.zoom({position:"bottomright"}).addTo(s.current),n.current=o.layerGroup().addTo(s.current),c.current=o.layerGroup().addTo(s.current);const e=d[i];x.current=o.tileLayer(e.url,{attribution:"&copy; OpenStreetMap &copy; CARTO / Esri",maxZoom:19,subdomains:"abcd"}).addTo(s.current)}},[]),r.useEffect(()=>(L(),()=>{k()}),[]);const L=()=>{if(!navigator.geolocation){y("Trình duyệt của bạn không hỗ trợ định vị.");return}v(!0),y(null),m.current=navigator.geolocation.watchPosition(e=>{const{latitude:a,longitude:b}=e.coords,u=o.latLng(a,b);if(c.current&&s.current){c.current.clearLayers();const j=o.divIcon({className:"user-location-marker",html:'<div class="pulsating-dot"></div>',iconSize:[20,20]});o.marker(u,{icon:j}).addTo(c.current);const l={minLat:20.8,maxLat:21.3,minLng:105.5,maxLng:106};a>=l.minLat&&a<=l.maxLat&&b>=l.minLng&&b<=l.maxLng&&s.current.setView(u,15)}},e=>{let a="Đã xảy ra lỗi khi lấy vị trí.";e.code===e.PERMISSION_DENIED?a="Bạn đã từ chối quyền truy cập vị trí trong trình duyệt.":e.code===e.POSITION_UNAVAILABLE?a="Không thể xác định vị trí hiện tại (thiếu GPS hoặc dịch vụ vị trí của hệ điều hành bị tắt).":e.code===e.TIMEOUT&&(a="Trình duyệt mất quá nhiều thời gian để lấy vị trí. Hãy thử lại, bật Wi‑Fi / Location Service rồi bấm lại."),console.error("Geolocation Error:",e),y(a+(e.message?` (Chi tiết: ${e.message})`:"")),v(!1)},{enableHighAccuracy:!0,timeout:1e4,maximumAge:0})},k=()=>{var e;m.current!==null&&(navigator.geolocation.clearWatch(m.current),m.current=null),v(!1),(e=c.current)==null||e.clearLayers()};return r.useEffect(()=>()=>{k()},[]),r.useEffect(()=>{!s.current||!n.current||(n.current.clearLayers(),w.forEach(e=>{if(s.current&&n.current){const a=Math.min(30+e.aqi/10,50),u=e.aqi>50&&e.aqi<=100?"#333":"#fff",j=o.divIcon({className:"custom-aqi-marker-container",html:`
                        <div style="display: flex; flex-direction: column; align-items: center; width: 100px; transform: translateX(-50%);">
                            <!-- Circle -->
                            <div style="
                                background-color: ${e.aqi_color};
                                width: ${a}px;
                                height: ${a}px;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: ${u};
                                font-weight: 900;
                                font-size: ${Math.max(10,a/2.5)}px;
                                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                                border: 2px solid white;
                                margin-bottom: 4px;
                            ">
                                ${e.aqi}
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
                                ${e.district}
                            </div>
                        </div>
                    `,iconSize:[0,0],iconAnchor:[0,a/2+10]}),l=o.marker([e.latitude,e.longitude],{icon:j}),S=`
                    <div style="font-family: 'Inter', sans-serif; color: #1e293b; min-width: 180px;">
                        <div style="background: ${e.aqi_color}; padding: 8px; border-radius: 6px 6px 0 0; color: ${u};">
                            <h3 style="margin: 0; font-weight: bold; font-size: 16px;">${e.district}</h3>
                            <span style="font-size: 12px; opacity: 0.9;">${new Date(e.datetime).toLocaleTimeString()}</span>
                        </div>
                        <div style="padding: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: bold; font-size: 24px; color: ${e.aqi_color}">${e.aqi}</span>
                                <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${e.pollution_level}</span>
                            </div>
                            <div style="font-size: 13px; color: #475569; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                                <div>PM2.5: <b>${e.pm25}</b></div>
                                <div>PM10: <b>${e.pm10}</b></div>
                                <div>Nhiệt độ: <b>${e.temperature}°C</b></div>
                                <div>Độ ẩm: <b>${e.humidity}%</b></div>
                            </div>
                        </div>
                    </div>
                `;l.bindPopup(S),l.addTo(n.current)}}))},[w]),t.jsxs("div",{className:"p-0 h-full flex flex-col relative animate-fade-in",children:[t.jsx("div",{className:"absolute top-4 left-4 lg:left-14 z-[400] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200 max-w-xs pointer-events-none",children:t.jsxs("div",{className:"flex items-center gap-3",children:[t.jsx("div",{className:"p-2 bg-blue-100 text-blue-600 rounded-lg",children:t.jsx(T,{size:20})}),t.jsxs("div",{children:[t.jsx("h1",{className:"text-lg font-bold text-slate-800 leading-tight",children:"Bản Đồ Giao Thông"}),t.jsx("p",{className:"text-xs text-slate-500 font-medium",children:"Hiển thị AQI theo quy mô & vị trí"})]})]})}),t.jsxs("div",{className:"absolute top-4 right-4 z-[400] flex flex-col items-end gap-2",children:[t.jsxs("div",{className:"bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200",children:[t.jsxs("div",{className:"flex items-center gap-2 mb-3 px-1",children:[t.jsx(T,{size:16,className:"text-slate-500"}),t.jsx("span",{className:"text-xs font-bold text-slate-700 uppercase",children:"Loại bản đồ"})]}),t.jsx("div",{className:"flex gap-2",children:Object.keys(d).map(e=>t.jsxs("button",{onClick:()=>z(e),className:`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all w-16
                                    ${i===e?"bg-slate-100 border-blue-500 shadow-inner":"border-transparent hover:bg-slate-50"}`,children:[t.jsx("div",{className:`w-8 h-8 rounded-full border-2 ${i===e?"border-blue-500":"border-slate-300"}`,style:{background:d[e].color}}),t.jsx("span",{className:`text-[9px] font-bold ${i===e?"text-blue-600":"text-slate-500"}`,children:d[e].label})]},e))})]}),t.jsxs("div",{className:"bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200",children:[t.jsxs("div",{className:"flex items-center gap-2 mb-3 px-1",children:[t.jsx(R,{size:16,className:"text-slate-500"}),t.jsx("span",{className:"text-xs font-bold text-slate-700 uppercase",children:"Bộ lọc AQI"})]}),t.jsx("div",{className:"flex flex-col gap-1.5 min-w-[140px]",children:I.map(e=>t.jsxs("button",{onClick:()=>$(e.id),className:`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border
                                    ${p===e.id?"bg-slate-800 text-white border-slate-800 shadow-md transform scale-105":"bg-white text-slate-600 border-slate-100 hover:bg-slate-50"}`,children:[t.jsx("span",{children:e.label}),e.id!=="all"&&t.jsx("span",{className:"w-2.5 h-2.5 rounded-full",style:{backgroundColor:e.color}})]},e.id))})]}),t.jsxs("div",{className:"bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 w-full max-w-[250px] pointer-events-auto",children:[t.jsxs("button",{onClick:g?k:L,className:`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border
                            ${g?"bg-red-500 text-white border-red-500 shadow-md":"bg-blue-500 text-white border-blue-500 hover:bg-blue-600"}`,children:[t.jsx(q,{size:14}),g?"Dừng Theo Dõi":"Vị Trí Của Tôi"]}),N&&t.jsxs("div",{className:"mt-2 text-xs text-red-600 bg-red-100 p-2 rounded-lg flex items-start gap-2 text-left",children:[t.jsx(C,{size:14,className:"mt-0.5 shrink-0"})," ",t.jsx("span",{className:"break-words w-full",children:N})]})]}),t.jsxs("div",{className:"bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-600",children:[w.length," điểm quan trắc"]})]}),t.jsx("div",{ref:h,className:"w-full h-full z-0 relative",style:{minHeight:"80vh"}}),t.jsx("style",{children:`
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
                `})]})};export{D as default};
