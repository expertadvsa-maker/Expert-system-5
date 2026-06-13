import React from 'react';

interface PrintableReportProps {
  id: string;
  title: string;
  subtitle?: string;
  headers: string[];
  data: any[][];
  summary?: { label: string; value: string }[];
}

export default function PrintableReport({ id, title, subtitle, headers, data, summary }: PrintableReportProps) {
  // Saudi Standard executive color theme
  const colors = {
    primaryDeep: '#0f172a',      // Primary deep charcoal-slate for headings
    accentGold: '#b45309',       // Rich luxury gold-bronze for borders/accents
    borderLight: '#e2e8f0',      // Balanced light grid line
    accentTeal: '#0f766e',       // Verification teal
    bgLight: '#f8fafc',          // Clean zebra striping
    bgHeader: '#0B132B',         // Deep luxury blue-grey for title banners
    textMuted: '#64748b'         // Neutral text color
  };

  return (
    <div 
      id={id} 
      className="bg-white" 
      style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        padding: '22mm 20mm',
        position: 'absolute', 
        left: '-10000px', 
        top: 0,
        direction: 'rtl',
        boxSizing: 'border-box',
        overflow: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
        letterSpacing: 'normal'
      }}
    >
      {/* EXPLICIT GOOGLE FONT SETUP FOR HTML2CANVAS FORCE-LOAD */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        #${id} {
          font-family: 'Cairo', 'Inter', 'Segoe UI', sans-serif !important;
        }
        #${id} * {
          font-family: 'Cairo', 'Inter', 'Segoe UI', sans-serif !important;
        }
      `}} />

      {/* 🏛️ OFFICIAL ENTERPRISE HEADER BLOCK */}
      <table style={{ width: '100%', marginBottom: '25px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {/* Right Column: Foundation Info & Standard Business Registration */}
            <td style={{ width: '58%', verticalAlign: 'top', textAlign: 'right', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                {/* Custom Vector High-Resolution Modern Logo Emblem */}
                <div style={{ shrink: 0 }}>
                  <svg width="52" height="52" viewBox="0 0 100 100" style={{ display: 'block' }}>
                    <rect x="0" y="0" width="100" height="100" rx="18" fill="#0f172a" />
                    <path d="M 32 72 L 68 36 C 72 32, 76 36, 72 40 L 40 72 Z" fill="none" stroke="#d97706" strokeWidth="7" strokeLinecap="round" />
                    <path d="M 42 76 L 78 40 C 82 36, 86 40, 82 44 L 48 76 Z" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                    <path d="M 22 75 C 19 75, 16 72, 16 68 C 16 50, 42 22, 52 16 C 54 14, 56 16, 54 18 C 48 28, 22 71, 22 75 Z" fill="url(#brandGradient)" />
                    <circle cx="22" cy="71" r="5" fill="#d97706" />
                    <defs>
                      <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0f766e" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                {/* Names */}
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 900, color: colors.primaryDeep, margin: '0 0 2px 0', lineHeight: '1.2' }}>مؤسسة خبراء الرسم للمقاولات والديكور</h1>
                  <p style={{ fontSize: '9px', fontWeight: 800, color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.9 }}>EXPERTS OF PAINTING CONTRACTING FOUNDATION</p>
                </div>
              </div>

              {/* Saudi Regional & CR Metadata Block */}
              <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.7', fontWeight: 600, paddingRight: '2px' }}>
                <div>• ست: <span style={{ fontWeight: 800, color: colors.primaryDeep }}>1010629487</span> | الرقم الضريبي (VAT): <span style={{ fontWeight: 850 }}>311428594000003</span></div>
                <div>• المركز الرئيسي: الرياض، المملكة العربية السعودية</div>
                <div style={{ marginTop: '5px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '5px', fontWeight: 'bold', color: '#1e293b', border: '1px solid #cbd5e1', marginLeft: '6px' }}>الإدارة المالية</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: '#f0fdf4', borderRadius: '5px', fontWeight: 'bold', color: colors.accentTeal, border: '1px solid #bbf7d0' }}>تقرير موثق ومعتمد</span>
                </div>
              </div>
            </td>

            {/* Left Column: Digital Verification & QR Code Block */}
            <td style={{ width: '42%', verticalAlign: 'top', textAlign: 'left', padding: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'start', gap: '14px', justifyContent: 'flex-start' }}>
                {/* Dynamic SVG Verification QR Code */}
                <div style={{ padding: '4px', border: `1px solid ${colors.borderLight}`, borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <svg width="60" height="60" viewBox="0 0 100 100" style={{ display: 'block' }}>
                    <rect x="0" y="0" width="100" height="100" fill="none" />
                    {/* Corners */}
                    <rect x="10" y="10" width="22" height="22" fill="#0f172a" />
                    <rect x="14" y="14" width="14" height="14" fill="#ffffff" />
                    <rect x="17" y="17" width="8" height="8" fill="#d97706" />

                    <rect x="68" y="10" width="22" height="22" fill="#0f172a" />
                    <rect x="72" y="14" width="14" height="14" fill="#ffffff" />
                    <rect x="75" y="17" width="8" height="8" fill="#d97706" />

                    <rect x="10" y="68" width="22" height="22" fill="#0f172a" />
                    <rect x="14" y="72" width="14" height="14" fill="#ffffff" />
                    <rect x="17" y="75" width="8" height="8" fill="#d97706" />

                    {/* Data Noise */}
                    <rect x="40" y="10" width="6" height="6" fill="#0f172a" />
                    <rect x="50" y="10" width="12" height="6" fill="#0f172a" />
                    <rect x="40" y="20" width="12" height="6" fill="#0f172a" />
                    <rect x="58" y="20" width="6" height="6" fill="#0f172a" />
                    
                    <rect x="10" y="40" width="6" height="12" fill="#0f172a" />
                    <rect x="20" y="46" width="12" height="6" fill="#d97706" />
                    <rect x="26" y="40" width="6" height="6" fill="#0f172a" />

                    <rect x="40" y="40" width="20" height="20" fill="#0f172a" />
                    <rect x="45" y="45" width="10" height="10" fill="#ffffff" />
                    <rect x="48" y="48" width="4" height="4" fill="#d97706" />

                    <rect x="68" y="40" width="12" height="6" fill="#0f172a" />
                    <rect x="68" y="50" width="6" height="12" fill="#0f172a" />
                    <rect x="80" y="46" width="10" height="10" fill="#d97706" />

                    <rect x="40" y="68" width="12" height="6" fill="#0f172a" />
                    <rect x="58" y="68" width="6" height="12" fill="#0f172a" />
                    <rect x="46" y="80" width="6" height="10" fill="#0f172a" />
                    <rect x="68" y="80" width="22" height="10" fill="#0f172a" />
                    <rect x="80" y="68" width="10" height="6" fill="#d97706" />
                  </svg>
                </div>
                {/* Metadata details */}
                <div style={{ textAlign: 'left', fontSize: '11px', color: '#475569', lineHeight: '1.6', fontWeight: 'bold' }}>
                  <div style={{ color: colors.primaryDeep, fontWeight: 800 }}>تاريخ التدقيق: <span style={{ direction: 'ltr', display: 'inline-block' }}>{new Date().toLocaleDateString('ar-SA')}</span></div>
                  <div>المصدر الالكتروني: <span style={{ fontFamily: 'monospace', color: '#1e293b' }}>XP-ERP Cloud</span></div>
                  <div>رقم التسلسل: <span style={{ fontFamily: 'monospace', fontWeight: 800, color: colors.accentGold }}>#XP-{Date.now().toString().slice(-6)}</span></div>
                  <div style={{ fontSize: '9px', color: colors.textMuted, marginTop: '2px' }}>نظام فحص الضمان ومطابقة الحسابات العامة</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 🏷️ DOCUMENT TITLE BANNER - Elegant Slate & Gold Double-Accent */}
      <div 
        style={{ 
          backgroundColor: colors.bgHeader, 
          background: 'linear-gradient(135deg, #0B132B 0%, #1c2541 100%)',
          color: '#ffffff', 
          padding: '16px 24px', 
          borderRadius: '12px', 
          marginBottom: '25px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 4px 10px rgba(11, 19, 43, 0.15)',
          borderRight: `5px solid ${colors.accentGold}`
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{title}</h2>
          {subtitle && <p style={{ margin: '4px 0 0 0', fontSize: '11px', fontWeight: 600, color: '#cbd5e1' }}>{subtitle}</p>}
        </div>
        <div style={{ textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>
          <p style={{ margin: 0 }}>مستوى السرية: <span style={{ color: '#fda4af' }}>حساس وسري للغاية</span></p>
          <p style={{ margin: '2px 0 0 0', opacity: 0.8 }}>رمز الترخيص: <span style={{ fontFamily: 'monospace' }}>GCC-XP-2026</span></p>
        </div>
      </div>

      {/* 📊 SUMMARY CARDS STATEMENTS - Precision Metric Grid */}
      {summary && summary.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '12px 0', marginBottom: '25px', marginRight: '-12px' }}>
          <tbody>
            <tr>
              {summary.map((item, idx) => (
                <td key={idx} style={{ width: `${100 / summary.length}%`, padding: 0 }}>
                  <div 
                    style={{ 
                      backgroundColor: '#fff', 
                      border: `1px solid ${colors.borderLight}`, 
                      borderTop: `4px solid ${idx % 3 === 0 ? colors.accentGold : idx % 3 === 1 ? '#0284c7' : colors.accentTeal}`,
                      borderRadius: '10px', 
                      padding: '12px 14px', 
                      textAlign: 'right',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 800, color: colors.textMuted }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: colors.primaryDeep }}>{item.value}</p>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {/* 📋 CHIEF DATA LEDGER GRID */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${colors.borderLight}`, marginBottom: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
              {headers.map((header, idx) => (
                <th 
                  key={idx} 
                  style={{ 
                    padding: '14px 16px', 
                    fontSize: '11.5px', 
                    fontWeight: 900, 
                    color: '#ffffff', 
                    borderBottom: `2px solid ${colors.accentGold}`,
                    letterSpacing: '0.3px'
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                style={{ 
                  backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : colors.bgLight,
                  transition: 'background-color 0.15s ease'
                }}
              >
                {row.map((cell, cellIdx) => (
                  <td 
                    key={cellIdx} 
                    style={{ 
                      padding: '12px 16px', 
                      fontSize: '11px', 
                      fontWeight: 650, 
                      color: '#334155', 
                      borderBottom: `1px solid ${colors.borderLight}`, 
                      verticalAlign: 'middle', 
                      whiteSpace: 'normal', 
                      wordBreak: 'break-word',
                      lineHeight: '1.5'
                    }}
                  >
                    {/* Detect status items or monetary fields for premium formatting */}
                    {typeof cell === 'string' && (cell.includes('بانتظار') || cell.includes('معتمد')) ? (
                      <span 
                        style={{ 
                          display: 'inline-block', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800,
                          backgroundColor: cell.includes('معتمد') ? '#f0fdf4' : '#fffbeb',
                          color: cell.includes('معتمد') ? colors.accentTeal : colors.accentGold,
                          border: `1px solid ${cell.includes('معتمد') ? '#bbf7d0' : '#fde68a'}`
                        }}
                      >
                        {cell}
                      </span>
                    ) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ⚖️ REGULATORY DISCLOSURE & AUDIT TERMS */}
      <div 
        style={{ 
          padding: '16px 20px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '12px', 
          borderRight: `4px solid ${colors.accentGold}`, 
          borderLeft: `1px solid ${colors.borderLight}`, 
          borderTop: `1px solid ${colors.borderLight}`, 
          borderBottom: `1px solid ${colors.borderLight}`, 
          marginBottom: '40px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '4px', height: '16px', backgroundColor: colors.accentGold, borderRadius: '2px' }} />
          <h3 style={{ margin: 0, fontSize: '12.5px', fontWeight: 900, color: colors.primaryDeep }}>البيان التنظيمي وبنود التدقيق</h3>
        </div>
        <p style={{ margin: 0, fontSize: '10px', lineHeight: '1.8', color: '#475569', fontWeight: 600 }}>
          • يعتبر هذا الكشف مستنداً رسمياً مشفّراً صادراً آلياً عن الإدارة التنفيذية لـ (X-Painter Group)، ويخضع للحماية القانونية لمصداقية البيانات المالية.<br/>
          • لا تكتسب هذه الوحدة صفتها النهائية الملزمة إلا بتوفر الباركود الرقمي المعرّف للخدمة، مقروناً بالتواقيع المعتمدة والإمضاء الإداري أدناه.<br/>
          • في حال ثبوت وجود فروقات أو للرغبة في المراجعة الحسابية، يُلزم مقدم الطلب برفع طلب رسمي للمدير المالي للفرع خلال ٧ أيام من تاريخ تحريره.
        </p>
      </div>

      {/* ✍️ SIGNATURE STATION & CORPORATE SEALS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'auto' }}>
        <tbody>
          <tr>
            {/* General Manager Signature */}
            <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top' }}>
              <p style={{ margin: '0 autoc 35px auto', fontSize: '12px', fontWeight: 900, borderBottom: `2.5px solid ${colors.primaryDeep}`, paddingBottom: '6px', display: 'inline-block', width: '75%', color: colors.primaryDeep }}>المدير العام للمؤسسة</p>
              <div style={{ position: 'relative', height: '40px', margin: '5px 0' }}>
                {/* Simulated Handwritten Signature SVG */}
                <svg width="100" height="35" viewBox="0 0 100 35" style={{ opacity: 0.7, margin: '0 auto', display: 'block' }}>
                  <path d="M10,25 Q30,-5 50,22 T90,10" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" />
                  <path d="M20,15 Q45,28 65,5" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>توقيع مخوّل بالاعتماد الإداري</div>
            </td>

            {/* Official Blue-Ink Stamp Chamber Space */}
            <td style={{ width: '34%', textAlign: 'center', verticalAlign: 'middle' }}>
              {/* Perfect Blue Security Ink Stamp */}
              <div style={{ transform: 'scale(0.85)' }}>
                <svg width="125" height="125" viewBox="0 0 160 160" style={{ display: 'block', margin: '0 auto', opacity: 0.9, transform: 'rotate(-5deg)' }}>
                  <circle cx="80" cy="80" r="76" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="5 3" />
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#2563eb" strokeWidth="2.5" />
                  <circle cx="80" cy="80" r="48" fill="none" stroke="#2563eb" strokeWidth="1" />
                  
                  <path id="stamp-curve-ar" d="M 18 80 A 62 62 0 1 1 142 80" fill="none" stroke="none" />
                  <text fill="#2563eb" fontSize="7.8" fontWeight="900" letterSpacing="0.8">
                    <textPath href="#stamp-curve-ar" startOffset="50%" textAnchor="middle">
                      • مؤسسة خبراء الرسم للمقاولات •
                    </textPath>
                  </text>
                  
                  <path id="stamp-curve-en" d="M 142 80 A 62 62 0 1 1 18 80" fill="none" stroke="none" />
                  <text fill="#2563eb" fontSize="6.2" fontWeight="900" letterSpacing="0.6">
                    <textPath href="#stamp-curve-en" startOffset="50%" textAnchor="middle">
                      • EXPERTS OF PAINTING FOUNDATION •
                    </textPath>
                  </text>

                  <polygon points="80,48 83,56 91,56 85,61 87,69 80,64 73,69 75,61 69,56 77,56" fill="#d97706" />
                  
                  <text x="80" y="80" fill="#2563eb" fontSize="9" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                    الختم المعتمد
                  </text>
                  <text x="80" y="93" fill="#2563eb" fontSize="7.5" fontWeight="900" textAnchor="middle">
                    إدارة الشؤون المالية والادارية
                  </text>
                  <text x="80" y="105" fill="#d97706" fontSize="6.5" fontWeight="900" textAnchor="middle">
                    كود: ١٠١٠٦٢٩٤٨٧
                  </text>
                </svg>
              </div>
            </td>

            {/* Financial Accountant Signature */}
            <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top' }}>
              <p style={{ margin: '0 auto 35px auto', fontSize: '12px', fontWeight: 900, borderBottom: `2.5px solid ${colors.primaryDeep}`, paddingBottom: '6px', display: 'inline-block', width: '75%', color: colors.primaryDeep }}>المحاسب المالي المسؤول</p>
              <div style={{ position: 'relative', height: '40px', margin: '5px 0' }}>
                <svg width="100" height="35" viewBox="0 0 100 35" style={{ opacity: 0.7, margin: '0 auto', display: 'block' }}>
                  <path d="M15,10 Q45,35 60,12 T85,25" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="65" cy="15" r="2" fill="#1e3a8a" />
                </svg>
              </div>
              <div style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>ختم وإمضاء الإدارة الحسابية</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 🗺️ SECURE FOOTER BANNER */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '15mm', 
          left: '20mm', 
          right: '20mm', 
          paddingTop: '12px', 
          borderTop: `1px solid ${colors.borderLight}`, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: '8.5px', 
          fontWeight: 'bold', 
          color: '#94a3b8', 
          textTransform: 'uppercase' 
        }}
      >
        <span>السجل الموحد للمؤسسات • ص.ب: 11451 الرياض</span>
        <span style={{ color: colors.accentGold }}>مؤسسة خبراء الرسم - فرع الرياض الرئيسي</span>
        <span>X-Painter POS Engine v3.0</span>
      </div>

      {/* Luxury Security Watermark */}
      <div style={{ position: 'absolute', top: '45%', left: '15%', opacity: 0.02, transform: 'rotate(-25deg)', pointerEvents: 'none' }}>
        <h1 style={{ fontSize: '130px', fontWeight: 950, color: '#0f172a', margin: 0, letterSpacing: '8.5px' }}>EXPERTS</h1>
      </div>
    </div>
  );
}
