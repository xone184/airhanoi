import{c as q,r,j as t,S as A}from"./index-9xpylmDS.js";import{L as o}from"./leaflet-src-BouzZ27H.js";import{L as S}from"./layers-C0LIt-Fp.js";import{F as O}from"./filter-D8PLBoJV.js";import{M as P}from"./map-pin-quPBaUPG.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=q("XCircle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]),W=({data:h})=>{const l=r.useRef(null),f=r.useRef(null),n=r.useRef(null),c=r.useRef(null),p=r.useRef(null),[m,v]=r.useState(!1),[y,w]=r.useState(!0),[L,k]=r.useState(null),x=r.useRef(null),[i,E]=r.useState("voyager"),[b,C]=r.useState("all"),I=e=>{e.preventDefault(),e.stopPropagation(),l.current&&(e.deltaY<0?l.current.zoomIn(1):l.current.zoomOut(1))},d={voyager:{url:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",label:"Tiêu chuẩn",color:"#3b82f6"},dark:{url:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",label:"Đêm",color:"#1e293b"},satellite:{url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",label:"Vệ tinh",color:"#15803d"}},M=[{id:"all",label:"Tất cả",color:"#3b82f6"},{id:"Tốt",label:"Tốt (0-50)",color:"#00e400"},{id:"Trung bình",label:"Trung bình (51-100)",color:"#eab308"},{id:"Kém",label:"Kém (101-150)",color:"#ff7e00"},{id:"Xấu",label:"Xấu (151-200)",color:"#ff0000"},{id:"Rất xấu",label:"Rất xấu (201-300)",color:"#8f3f97"},{id:"Nguy hại",label:"Nguy hại (300+)",color:"#7e0023"}],j=r.useMemo(()=>b==="all"?h:h.filter(e=>e.pollution_level===b),[h,b]);r.useEffect(()=>{if(!l.current)return;p.current&&p.current.remove();const e=d[i];p.current=o.tileLayer(e.url,{attribution:"&copy; OpenStreetMap &copy; CARTO / Esri",maxZoom:19,subdomains:"abcd"}).addTo(l.current)},[i]),r.useEffect(()=>{if(f.current&&!l.current){l.current=o.map(f.current,{center:[21.0285,105.8542],zoom:12,zoomControl:!1,zoomAnimation:!0,fadeAnimation:!0,markerZoomAnimation:!0,scrollWheelZoom:!0,preferCanvas:!0}),o.control.zoom({position:"bottomright"}).addTo(l.current),n.current=o.layerGroup().addTo(l.current),c.current=o.layerGroup().addTo(l.current);const e=d[i];p.current=o.tileLayer(e.url,{attribution:"&copy; OpenStreetMap &copy; CARTO / Esri",maxZoom:19,subdomains:"abcd"}).addTo(l.current)}},[]),r.useEffect(()=>(T(),()=>{N()}),[]);const T=()=>{if(!navigator.geolocation){k("Trình duyệt của bạn không hỗ trợ định vị.");return}w(!0),k(null),x.current=navigator.geolocation.watchPosition(e=>{const{latitude:a,longitude:g}=e.coords,u=o.latLng(a,g);if(c.current&&l.current){c.current.clearLayers();const z=o.divIcon({className:"user-location-marker",html:'<div class="pulsating-dot"></div>',iconSize:[20,20]});o.marker(u,{icon:z}).addTo(c.current);const s={minLat:20.8,maxLat:21.3,minLng:105.5,maxLng:106};a>=s.minLat&&a<=s.maxLat&&g>=s.minLng&&g<=s.maxLng&&l.current.setView(u,15)}},e=>{let a="Đã xảy ra lỗi khi lấy vị trí.";e.code===e.PERMISSION_DENIED?a="Bạn đã từ chối quyền truy cập vị trí trong trình duyệt.":e.code===e.POSITION_UNAVAILABLE?a="Không thể xác định vị trí hiện tại (thiếu GPS hoặc dịch vụ vị trí của hệ điều hành bị tắt).":e.code===e.TIMEOUT&&(a="Trình duyệt mất quá nhiều thời gian để lấy vị trí. Hãy thử lại, bật Wi‑Fi / Location Service rồi bấm lại."),console.error("Geolocation Error:",e),k(a+(e.message?` (Chi tiết: ${e.message})`:"")),w(!1)},{enableHighAccuracy:!0,timeout:1e4,maximumAge:0})},N=()=>{var e;x.current!==null&&(navigator.geolocation.clearWatch(x.current),x.current=null),w(!1),(e=c.current)==null||e.clearLayers()};return r.useEffect(()=>()=>{N()},[]),r.useEffect(()=>{!l.current||!n.current||(n.current.clearLayers(),j.forEach(e=>{if(l.current&&n.current){const a=Math.min(30+e.aqi/10,50),u=e.aqi>50&&e.aqi<=100?"#333":"#fff",z=o.divIcon({className:"custom-aqi-marker-container",html:`
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
                    `,iconSize:[0,0],iconAnchor:[0,a/2+10]}),s=o.marker([e.latitude,e.longitude],{icon:z}),R=`
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
                `;s.bindPopup(R),s.addTo(n.current)}}))},[j]),t.jsxs("div",{className:"p-0 h-full flex flex-col relative animate-fade-in",children:[t.jsx("div",{className:"hidden lg:flex absolute top-4 left-14 z-[400] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200 max-w-xs pointer-events-none transition-all",children:t.jsxs("div",{className:"flex items-center gap-3",children:[t.jsx("div",{className:"p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0",children:t.jsx(S,{size:20})}),t.jsxs("div",{className:"overflow-hidden",children:[t.jsx("h1",{className:"text-lg font-bold text-slate-800 leading-tight truncate",children:"Bản Đồ Giao Thông"}),t.jsx("p",{className:"text-xs text-slate-500 font-medium truncate",children:"AQI theo quy mô & vị trí"})]})]})}),t.jsx("button",{onClick:()=>v(!m),className:"lg:hidden absolute top-4 right-4 z-[401] bg-white p-3 rounded-full shadow-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors","aria-label":"Toggle Controls",children:m?t.jsx($,{size:24}):t.jsx(A,{size:24})}),m&&t.jsx("div",{className:"fixed inset-0 bg-black/40 z-[399] lg:hidden backdrop-blur-sm transition-opacity",onClick:()=>v(!1)}),t.jsxs("div",{onWheel:I,className:`
                z-[400] flex flex-col gap-1.5 transition-all duration-300 ease-in-out
                
                /* DESKTOP STYLES */
                lg:absolute lg:top-28 lg:right-3 lg:items-end lg:w-auto lg:h-auto lg:visible lg:opacity-100 lg:translate-y-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:rounded-none lg:max-w-[160px]

                /* MOBILE STYLES (Bottom Sheet) */
                fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 shadow-[0_-5px_30px_rgba(0,0,0,0.15)]
                max-h-[60vh] overflow-y-auto
                ${m?"translate-y-0 visible opacity-100":"translate-y-full invisible opacity-0 lg:translate-y-0 lg:visible lg:opacity-100"}
            `,children:[t.jsx("div",{className:"lg:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1"}),t.jsxs("div",{className:"bg-slate-50 lg:bg-white/95 lg:backdrop-blur-md p-2 rounded-xl lg:shadow-xl border border-slate-200/60 lg:border-slate-200",children:[t.jsxs("div",{className:"flex items-center gap-1.5 mb-1.5 px-1",children:[t.jsx(S,{size:12,className:"text-slate-500"}),t.jsx("span",{className:"text-[9px] font-bold text-slate-600 uppercase",children:"Loại bản đồ"})]}),t.jsx("div",{className:"flex gap-1 justify-between lg:justify-end",children:Object.keys(d).map(e=>t.jsxs("button",{onClick:()=>E(e),className:`flex flex-col items-center gap-0.5 p-1 rounded-lg border transition-all flex-1 lg:flex-none lg:w-11
                                    ${i===e?"bg-white border-blue-500 shadow-sm lg:bg-slate-100 lg:shadow-inner":"border-transparent hover:bg-white/50"}`,children:[t.jsx("div",{className:`w-5 h-5 rounded-full border-2 ${i===e?"border-blue-500":"border-slate-300"}`,style:{background:d[e].color}}),t.jsx("span",{className:`text-[8px] font-bold ${i===e?"text-blue-600":"text-slate-500"}`,children:d[e].label})]},e))})]}),t.jsxs("div",{className:"bg-slate-50 lg:bg-white/95 lg:backdrop-blur-md p-2 rounded-xl lg:shadow-xl border border-slate-200/60 lg:border-slate-200",children:[t.jsxs("div",{className:"flex items-center gap-1.5 mb-1.5 px-1",children:[t.jsx(O,{size:12,className:"text-slate-500"}),t.jsx("span",{className:"text-[9px] font-bold text-slate-600 uppercase",children:"Lọc AQI"})]}),t.jsx("div",{className:"flex gap-1 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible hide-scrollbar",children:M.map(e=>t.jsxs("button",{onClick:()=>{C(e.id),v(!1)},className:`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all border whitespace-nowrap shrink-0
                                    ${b===e.id?"bg-slate-800 text-white border-slate-800":"bg-white text-slate-600 border-slate-100 hover:bg-slate-50"}`,children:[e.id!=="all"&&t.jsx("span",{className:"w-1.5 h-1.5 rounded-full shrink-0",style:{backgroundColor:e.color}}),t.jsx("span",{children:e.label.split("(")[0].trim()})]},e.id))})]}),t.jsxs("div",{className:"bg-slate-50 lg:bg-white/95 lg:backdrop-blur-md p-2 rounded-xl lg:shadow-xl border border-slate-200/60 lg:border-slate-200 w-full pointer-events-auto",children:[t.jsxs("button",{onClick:y?N:T,className:`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all border shadow-sm
                            ${y?"bg-red-500 text-white border-red-500":"bg-blue-500 text-white border-blue-500 hover:bg-blue-600"}`,children:[t.jsx(P,{size:12}),y?"Dừng Theo Dõi":"Vị Trí Của Tôi"]}),L&&t.jsxs("div",{className:"mt-1.5 text-[9px] text-red-600 bg-red-100 p-1.5 rounded-lg flex items-start gap-1 text-left animate-fade-in",children:[t.jsx($,{size:10,className:"mt-0.5 shrink-0"})," ",t.jsx("span",{className:"break-words w-full leading-tight",children:L})]})]}),t.jsxs("div",{className:"lg:bg-white/90 lg:backdrop-blur-md px-2 py-1 rounded-full lg:shadow-lg lg:border border-slate-200 text-[9px] font-bold text-slate-400 lg:text-slate-600 text-center self-center lg:self-end",children:[j.length," điểm"]})]}),t.jsx("div",{ref:f,className:"w-full h-full z-0 relative",style:{minHeight:"80vh"}}),t.jsx("style",{children:`
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

                    @keyframes slide-in {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-slide-in {
                        animation: slide-in 0.3s ease-out forwards;
                    }
                `})]})};export{W as default};
