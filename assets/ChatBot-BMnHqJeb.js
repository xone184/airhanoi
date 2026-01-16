import{c as I,r as p,j as t,U as $}from"./index-_T7_exxy.js";import{L as T,E as A}from"./loader-2-CizgEj3Z.js";import{Z as k}from"./zap-CxZd7VHO.js";import{S}from"./send-B0XEmnkp.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=I("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]),M="https://airhanoi.onrender.com/api/chat.php",C="llama-3.3-70b-versatile",H=async(g,n,o)=>{var x,e,a,v;const i=await fetch(M,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:C,messages:[{role:"system",content:g},{role:"user",content:n}],stream:!0,temperature:.7,max_tokens:1024})});if(!i.ok){const f=await i.text();throw console.error("Groq API error:",i.status,f),new Error(`Groq API lỗi (${i.status}): ${f}`)}const u=(x=i.body)==null?void 0:x.getReader();if(!u)throw new Error("Không thể đọc streaming response từ Groq.");const w=new TextDecoder;let h="";for(;;){const{done:f,value:s}=await u.read();if(f)break;const m=w.decode(s,{stream:!0}).split(`
`).filter(r=>r.trim()&&r.startsWith("data: "));for(const r of m){const b=r.replace("data: ","").trim();if(b!=="[DONE]")try{const c=JSON.parse(b),y=((v=(a=(e=c==null?void 0:c.choices)==null?void 0:e[0])==null?void 0:a.delta)==null?void 0:v.content)||"";y&&(h+=y,o&&o(h))}catch{}}}if(!h)throw new Error("Groq trả về phản hồi rỗng.");return h},P=async(g,n,o)=>{console.log("🚀 generateAIResponse (Groq) called with question:",g);const l=n.length>0?Math.round(n.reduce((e,a)=>e+a.aqi,0)/n.length):0,i=[...n].sort((e,a)=>a.aqi-e.aqi).slice(0,5),u=[...n].sort((e,a)=>e.aqi-a.aqi).slice(0,5),h=`Bạn là trợ lý AI chuyên gia về chất lượng không khí tại Hà Nội tên là "AirHanoi AI".

🎯 NHIỆM VỤ:
- Phân tích và trả lời câu hỏi dựa trên DỮ LIỆU THỜI GIAN THỰC bên dưới
- Đưa ra lời khuyên sức khỏe cụ thể, hữu ích
- Trả lời bằng ngôn ngữ người dùng sử dụng (Tiếng Việt hoặc Tiếng Anh)

📝 QUY TẮC:
- Trả lời ngắn gọn, súc tích (tối đa 200 từ)
- Sử dụng emoji phù hợp để dễ đọc
- Ưu tiên dữ liệu được cung cấp, không bịa số liệu
- Nếu được hỏi về khu vực cụ thể, tìm trong dữ liệu và trả lời chính xác
- Đưa ra cảnh báo sức khỏe khi AQI > 100

${`
📊 THỐNG KÊ TỔNG QUAN (${n.length} khu vực):
- AQI trung bình: ${l}
- Mức độ: ${l<=50?"Tốt":l<=100?"Trung bình":l<=150?"Kém":l<=200?"Xấu":"Rất xấu"}

🔴 TOP 5 Ô NHIỄM NHẤT:
${i.map((e,a)=>`${a+1}. ${e.district}: AQI ${e.aqi} (${e.pollution_level}), PM2.5: ${e.pm25}µg/m³`).join(`
`)}

🟢 TOP 5 SẠCH NHẤT:
${u.map((e,a)=>`${a+1}. ${e.district}: AQI ${e.aqi} (${e.pollution_level}), PM2.5: ${e.pm25}µg/m³`).join(`
`)}

📋 CHI TIẾT TẤT CẢ KHU VỰC:
${n.map(e=>`${e.district}: AQI ${e.aqi}, PM2.5: ${e.pm25}, Nhiệt độ: ${e.temperature}°C, Độ ẩm: ${e.humidity}%`).join(`
`)}
`}`,x=g;try{return{text:await H(h,x,o),sources:[]}}catch(e){return console.error("Groq Chat Error:",e),{text:`❌ Đã xảy ra lỗi khi kết nối với AI: ${(e==null?void 0:e.message)||"Unknown error"}. Vui lòng thử lại.`}}},R=({data:g})=>{const[n,o]=p.useState([{id:"1",role:"model",text:`⚡ Xin chào! Tôi là **AirHanoi AI** - trợ lý phân tích chất lượng không khí siêu nhanh.

🔍 Tôi có thể:
• Phân tích AQI theo quận/huyện
• So sánh mức độ ô nhiễm
• Đưa ra lời khuyên sức khỏe
• Giải thích các chỉ số môi trường

Hãy hỏi tôi bất cứ điều gì!`,timestamp:new Date}]),[l,i]=p.useState(""),[u,w]=p.useState(!1),[h,x]=p.useState(!1),e=p.useRef(null),a=()=>{var s;(s=e.current)==null||s.scrollIntoView({behavior:"smooth"})};p.useEffect(()=>{a()},[n]),p.useEffect(()=>{console.log("⚡ ChatBot sử dụng Groq API - Llama 3.3 70B (Ultra Fast)")},[]);const v=async()=>{if(!l.trim())return;const s={id:Date.now().toString(),role:"user",text:l,timestamp:new Date},d=(Date.now()+1).toString(),m={id:d,role:"model",text:"",timestamp:new Date};o(r=>[...r,s,m]),i(""),w(!0),x(!0);try{const r=y=>{o(j=>j.map(N=>N.id===d?{...N,text:y}:N))},{text:b,sources:c}=await P(l,g,r);o(y=>y.map(j=>j.id===d?{...j,text:b,sources:c,timestamp:new Date}:j))}catch(r){console.error("ChatBot error:",r),o(b=>b.map(c=>c.id===d?{...c,text:`Đã xảy ra lỗi: ${(r==null?void 0:r.message)||"Unknown error"}. Vui lòng kiểm tra console để biết thêm chi tiết.`}:c))}finally{w(!1),x(!1)}},f=s=>{s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),v())};return t.jsxs("div",{className:"p-4 lg:p-8 h-screen flex flex-col animate-fade-in",children:[t.jsxs("header",{className:"mb-4 flex-shrink-0",children:[t.jsx("h1",{className:"text-3xl font-bold text-white",children:"Trợ Lý AI Thông Minh"}),t.jsx("p",{className:"text-slate-400",children:"Hỏi đáp với dữ liệu Realtime"})]}),t.jsxs("div",{className:"flex-1 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col",children:[t.jsxs("div",{className:"flex-1 overflow-y-auto p-4 space-y-6",children:[n.map(s=>{var d;return t.jsx("div",{className:`flex ${s.role==="user"?"justify-end":"justify-start"}`,children:t.jsxs("div",{className:`max-w-[85%] lg:max-w-[75%] flex gap-3 ${s.role==="user"?"flex-row-reverse":"flex-row"}`,children:[t.jsx("div",{className:`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${s.role==="user"?"bg-blue-600":"bg-emerald-600"}`,children:s.role==="user"?t.jsx($,{size:20}):t.jsx(q,{size:20})}),t.jsxs("div",{className:"flex flex-col gap-2",children:[t.jsxs("div",{className:`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-md
                                        ${s.role==="user"?"bg-blue-600 text-white rounded-tr-none":"bg-slate-700 text-slate-100 rounded-tl-none"}`,children:[s.text||t.jsxs("span",{className:"flex items-center gap-2",children:[t.jsx(T,{className:"animate-spin",size:16}),t.jsx("span",{className:"text-slate-400",children:"Đang suy nghĩ..."})]}),s.role==="model"&&h&&s.id===((d=n[n.length-1])==null?void 0:d.id)&&s.text&&t.jsx("span",{className:"inline-block w-2 h-4 bg-emerald-400 ml-1 animate-pulse"})]}),s.role==="model"&&s.sources&&s.sources.length>0&&t.jsxs("div",{className:"flex flex-wrap gap-2 mt-1",children:[t.jsxs("div",{className:"w-full text-xs text-slate-400 flex items-center gap-1 mb-1",children:[t.jsx(k,{size:12})," Nguồn tham khảo:"]}),s.sources.map((m,r)=>t.jsxs("a",{href:m.url,target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-600 hover:border-blue-400 rounded-lg text-xs text-blue-300 hover:text-blue-200 transition-all max-w-[200px] truncate",title:m.title,children:[t.jsx(A,{size:10,className:"flex-shrink-0"}),t.jsx("span",{className:"truncate",children:m.title})]},r))]}),s.text&&t.jsx("div",{className:`text-[10px] opacity-50 ${s.role==="user"?"text-right":"text-left text-slate-400"}`,children:s.timestamp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})})]})]})},s.id)}),t.jsx("div",{ref:e})]}),t.jsxs("div",{className:"p-4 bg-slate-900/50 border-t border-slate-700",children:[t.jsxs("div",{className:"relative",children:[t.jsx("input",{type:"text",className:"w-full bg-slate-800 text-white pl-4 pr-12 py-4 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500",placeholder:"Hỏi về tin tức môi trường, so sánh với Tokyo, hoặc dự báo...",value:l,onChange:s=>i(s.target.value),onKeyDown:f,disabled:u}),t.jsx("button",{onClick:v,disabled:u||!l.trim(),className:"absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",children:t.jsx(S,{size:20})})]}),t.jsx("div",{className:"mt-2 text-center",children:t.jsxs("p",{className:"text-xs text-slate-500 flex items-center justify-center gap-1",children:[t.jsx(k,{size:10,className:"text-yellow-500"})," Powered by Groq (Llama 3.3 70B) • Ultra Fast AI"]})})]})]})]})};export{R as default};
