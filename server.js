import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

// تحميل ملف .env.local لكي يتعرف السيرفر على مفاتيح ألف ياء
try {
  dotenv.config({ path: '.env.local', override: true });
  dotenv.config({ path: '.env', override: true });
  console.log("🔑 [Aliphia Config] Loaded environment variables:", {
    VITE_ALIPHIA_USERNAME: process.env.VITE_ALIPHIA_USERNAME || 'NOT FOUND',
    VITE_ALIPHIA_API_KEY: process.env.VITE_ALIPHIA_API_KEY ? 'FOUND (length: ' + process.env.VITE_ALIPHIA_API_KEY.length + ')' : 'NOT FOUND',
    VITE_ALIPHIA_PASSWORD: process.env.VITE_ALIPHIA_PASSWORD ? 'FOUND' : 'NOT FOUND'
  });
} catch(e) {
  console.log("ℹ️ [Aliphia Config] dotenv skipped (in production environments, variables should be set in environment directly).");
}

import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import pino from 'pino';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Parse JSON and URL-encoded request bodies with 50mb limits for image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Create uploads directory if not exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // Serve uploads folder statically
  app.use('/uploads', express.static(uploadsDir));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
  });

let waSocket = null;
let waQrCode = null;
let waStatus = 'disconnected';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
  
  // Handling ESM default export differences
  const initSocket = typeof makeWASocket === 'function' ? makeWASocket : (makeWASocket.default || makeWASocket);
  
  waSocket = initSocket({
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    logger: pino({ level: 'silent' }),
    browser: ['Aliphia ERP', 'Chrome', '1.0.0']
  });

  waSocket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('Received QR from Baileys. Generating image...');
      try {
        waQrCode = await QRCode.toDataURL(qr);
        waStatus = 'qr';
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log('WhatsApp connection closed. Status:', statusCode, ' Reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        // Keep status as 'qr' if it previously was qr, don't reset to disconnected immediately
        // Just reconnect
        setTimeout(connectToWhatsApp, 3000);
      } else {
        waStatus = 'disconnected';
        waSocket = null;
        waQrCode = null;
        // Clean up auth info
        try { fs.rmSync('baileys_auth_info', { recursive: true, force: true }); } catch (e) {}
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connection opened successfully');
      waStatus = 'connected';
      waQrCode = null;
    }
  });

  waSocket.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();

app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    status: waStatus,
    qr: waQrCode
  });
});

app.post('/api/whatsapp/logout', async (req, res) => {
  if (waSocket) {
    try { await waSocket.logout(); } catch(e) {}
    waStatus = 'disconnected';
    waQrCode = null;
    waSocket = null;
  }
  // Try to remove auth info
  try {
    fs.rmSync('baileys_auth_info', { recursive: true, force: true });
  } catch(e) {}
  res.json({ success: true });
});

// Real Image/File Upload API
app.post('/api/upload', (req, res) => {
  const { fileData, fileName } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: 'لم يتم إرسال بيانات الملف.' });
  }
  try {
    const buffer = Buffer.from(fileData, 'base64');
    const ext = path.extname(fileName || 'image.jpg') || '.jpg';
    const baseName = path.basename(fileName || 'image.jpg', ext);
    const safeName = `${Date.now()}_${baseName.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    
    fs.writeFileSync(filePath, buffer);
    
    // Construct local server URL dynamically
    const host = req.get('host');
    const fileUrl = `${req.protocol}://${host}/uploads/${safeName}`;
    
    console.log(`[Upload] Real file saved on disk: ${filePath} -> ${fileUrl}`);
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('[Upload] Error saving file:', error);
    res.status(500).json({ error: 'فشل حفظ الملف على الخادم', details: error.message });
  }
});

app.post('/api/whatsapp/send', async (req, res) => {
  if (waStatus !== 'connected' || !waSocket) {
    return res.status(400).json({ error: 'WhatsApp not connected' });
  }

  const { phone, message } = req.body;
  
  try {
    const formattedPhone = phone.replace(/\D/g, '') + '@s.whatsapp.net';
    await waSocket.sendMessage(formattedPhone, { text: message });
    res.json({ success: true });
  } catch (err) {
    console.error('Error sending message via local Baileys:', err);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

let lastReceivedCreds = null;


// ======================================================
// Aliphia API Proxy - يحل مشكلة CORS في الإنتاج
// يعمل على /api_public/* ويعيد التوجيه لخوادم ألف ياء
// ======================================================
app.all('/api_public/*splat', async (req, res) => {
  let aliphiaPath = req.originalUrl.substring('/api_public'.length);
  const isGuestPath = aliphiaPath.startsWith('/guest/') || aliphiaPath.startsWith('guest/');

  // محاولة القراءة أولاً من الترويسات المرسلة من العميل (الواجهة الأمامية)
  let authHeader = req.headers['authorization'];
  let apiKey = req.headers['x-keyali-api'];

  // إذا لم يرسلها العميل، نستخدم بيئة السيرفر كبديل
  if (!authHeader || !apiKey) {
    const username = process.env.VITE_ALIPHIA_USERNAME?.trim();
    const password = process.env.VITE_ALIPHIA_PASSWORD?.trim() || '';
    const serverApiKey = process.env.VITE_ALIPHIA_API_KEY?.trim();

    if (username && serverApiKey) {
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
      authHeader = `Basic ${basicAuth}`;
      apiKey = serverApiKey;
    }
  }

  // حفظ آخر بيانات مستلمة للتشخيص
  lastReceivedCreds = {
    authHeaderReceived: !!req.headers['authorization'],
    apiKeyReceived: !!req.headers['x-keyali-api'],
    finalAuthHeader: authHeader,
    finalApiKey: apiKey,
    // محاولة استخراج الاسم والباسورد لتبسيط الفحص للمستخدم
    decodedUserPass: authHeader && authHeader.startsWith('Basic ') 
      ? Buffer.from(authHeader.substring(6), 'base64').toString('utf8') 
      : 'N/A'
  };

  if (!isGuestPath && (!authHeader || !apiKey)) {
    return res.status(401).json({ error: 'Aliphia credentials not configured on client or server' });
  }

  // بناء الرابط الكامل بطريقة مضمونة ومباشرة مع معلمات الاستعلام
  const aliphiaUrl = isGuestPath 
    ? 'https://aliphia.com/v1' + (aliphiaPath.startsWith('/') ? aliphiaPath : '/' + aliphiaPath)
    : 'https://aliphia.com/v1/api_public' + (aliphiaPath.startsWith('/') ? aliphiaPath : '/' + aliphiaPath);

  const clientContentType = req.headers['content-type'] || '';
  const headers = {
    'Accept': 'application/json, application/pdf, */*',
    'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  if (authHeader) headers['Authorization'] = authHeader;
  if (apiKey) headers['X-KEYALI-API'] = apiKey;

  let requestBody;
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (clientContentType.includes('application/json')) {
      headers['Content-Type'] = 'application/json';
      requestBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    } else if (clientContentType.includes('application/x-www-form-urlencoded')) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = typeof req.body === 'string' ? req.body : new URLSearchParams(req.body).toString();
    } else {
      headers['Content-Type'] = 'application/json'; // Default fallback
      requestBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers,
      body: requestBody,
    };

    const aliphiaRes = await fetch(aliphiaUrl, fetchOptions);
    console.log(`📡 [Aliphia Proxy] ${req.method} ${aliphiaUrl} -> Status: ${aliphiaRes.status}`);

    const contentType = aliphiaRes.headers.get('content-type') || '';
    
    // Copy all headers from Aliphia response, rewriting Content-Disposition for guest paths
    for (const [key, value] of aliphiaRes.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'content-disposition' && req.originalUrl.includes('/guest/')) {
        res.setHeader('Content-Disposition', 'inline');
      } else if (lowerKey === 'transfer-encoding' || lowerKey === 'content-encoding') {
        // Skip these to let Express handle them
      } else if (lowerKey === 'www-authenticate') {
        // Skip WWW-Authenticate header to prevent browser login dialog
      } else {
        res.setHeader(key, value);
      }
    }

    res.status(aliphiaRes.status);

    if (contentType.includes('application/json')) {
      res.json(await aliphiaRes.json());
    } else {
      const buffer = await aliphiaRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error('Aliphia proxy error:', error);
    res.status(500).json({ error: 'Proxy request to Aliphia failed' });
  }
});

// ======================================================
// Diagnostic Route - لفحص أي الحسابات تعمل مع ألف ياء
// ======================================================
app.get('/test-aliphia-connection', async (req, res) => {
  const results = {};

  const testCreds = async (username, password, apiKey, subPath) => {
    if (!username || !apiKey) {
      return { status: 'missing', error: 'Credentials are empty' };
    }
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    try {
      const response = await fetch(`https://aliphia.com/v1/api_public${subPath}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'X-KEYALI-API': apiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      const text = await response.text();
      let parsed = text;
      try {
        parsed = JSON.parse(text);
      } catch(e) {}

      return {
        pathTested: subPath,
        status: response.status,
        ok: response.ok,
        errorMsg: parsed.error || (response.ok ? null : text.substring(0, 100)),
        dataSample: parsed
      };
    } catch(e) {
      return { status: 'error', error: e.message };
    }
  };

  const oldApiKey = "ali_k0IC7CCdEd6dyIM0cbiyXF9Zo9LKEBAo0KyV";

  const userEnv = process.env.VITE_ALIPHIA_USERNAME || "08818672809340I";
  const passEnv = process.env.VITE_ALIPHIA_PASSWORD || "IXJ52u3I3nNqSf8";

  // فحص مفاتيح .env.local الحالية على المسار الصحيح
  results.activeConnectionTest = await testCreds(
    process.env.VITE_ALIPHIA_USERNAME,
    process.env.VITE_ALIPHIA_PASSWORD || '',
    process.env.VITE_ALIPHIA_API_KEY,
    '/clients/active'
  );

  // إبقاء فحص المسارات كمرجع احتياطي
  results.EnvUser_NewKey_OldPath = await testCreds(process.env.VITE_ALIPHIA_USERNAME, process.env.VITE_ALIPHIA_PASSWORD || '', process.env.VITE_ALIPHIA_API_KEY, '/client/active.json');

  // عرض آخر بيانات تم إرسالها من المتصفح (نافذة الإعدادات)
  results.lastRequestFromBrowser = lastReceivedCreds || "No request received yet since server start";

  res.json(results);
});

// ======================================================
// AI Chatbot Route (بشرى) - Enhanced Multimodal with Grounding Search
// ======================================================
app.post('/api/chat', async (req, res) => {
  const { message, history, context, image, customKey } = req.body;

  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مهيأ على الخادم أو غير متوفر في المتصفح. يرجى تهيئته أولاً.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const companyName = context?.companyName || 'مؤسسة خبراء الرسم';
    const userName = context?.userProfile?.name || 'غير معروف';
    const userRole = context?.userProfile?.role || 'غير معروف';
    const attendanceRadius = context?.attendanceRadius || 100;

    // Formatting system context beautifully so the AI gets accurate and comprehensive data
    const systemContextPrompt = `
أنت "بشرى" المساعد والذكاء الاصطناعي الرئيسي المتكامل لمنصة إدارة ومبيعات "${companyName}".
أنت "العين الساهرة على النظام"، فائق الذكاء، البشري، والمختصر. لديك معرفة شاملة ودقيقة بكل تفاصيل النظام ومستجدات العالم الخارجي لأنك مدعوم بالبحث المباشر في جوجل وتحليل الصور واللقطات الفوري.

بيانات النظام الحية الحالية:
1. اسم الشركة: ${companyName}
2. المستخدم الحالي المتصل: الإسم: "${userName}"، الصلاحية/الدور: "${userRole}".
3. نطاق الحضور الجغرافي المعتمد (الـ GPS): ${attendanceRadius} متر.

قائمة المشاريع الحالية في النظام:
${JSON.stringify(context?.projects || [], null, 2)}

قائمة الموظفين والمستخدمين الحالية في النظام (أعضاء الفريق):
${JSON.stringify(context?.employees || [], null, 2)}

إحصائيات الحضور اليومية:
${JSON.stringify(context?.todayAttendanceSummary || {}, null, 2)}

المعاملات المالية الأخيرة:
${JSON.stringify(context?.recentTransactions || [], null, 2)}

التعليمات والإرشادات الصارمة لإجاباتك:
- أجب باللغة العربية بلهجة مهنية وبشرية دافئة، واضحة، وذكية جداً، ومباشرة ومختصرة للغاية دون حشو أو تكرار بالعامية السعودية الراقية أو الفصحى المبسطة.
- إذا أرسل المستخدم صورة أو لقطة شاشة، فقم بتحليلها بدقة وسلاسة، واربط تفاصيلها بمعلومات النظام الخاصة بـ "${companyName}" إذا دعت الحاجة.
- استخدم أدوات البحث في جوجل المرافقة لك دائماً (Google Search Grounding) للبحث عن أي معلومة خارجية، أسعار مواد، قوانين، مستجدات، أو استشارات فنية واقتصادية، واذكر المعلومات المؤكدة بدقة واختصار.
- لا تذكر تفاصيل تقنية فنية كالهياكل البرمجية، الأكواد، أو أسماء الجداول والـ IDs إلا إذا كان اسم الموظف أو المشروع أو التاريخ.
- إذا لم تكن تفاصيل معينة موجودة في السياق، قل بأقصر عبارة ممكنة أن هذا العنصر غير مسجل وتفضل بتقديم خدمة بديلة.
- راعِ أدوار الحماية والخصوصية: إذا سألك فني أو موظف عادي (ليس مديراً: role ليس manager) عن بيانات مالية عامة للمؤسسة أو إجماليات رواتب الموظفين الآخرين، أخبره بلطف وبمنتهى الإيجاز أن هذه معلومات سرية مخصصة للإدارة فقط ومحجوبة لحماية الخصوصية. أما إذا كان السائل "manager" (مدير) فامنحه التفاصيل المالية بدقة ووضوح.
- احرص على أن تكون ردودك منسقة بشكل أنيق باستخدام Markdown (نقاط، خط عريض، جداول بسيطة ومختصرة إن لزم الأمر).
- التوجيه والانتقال الذكي: يمكنك توجيه المستخدم تلقائياً وفتح الصفحات له عن طريق إنهاء إجابتك بإضافة الرمز [NAVIGATE: tabId] (مثلاً [NAVIGATE: financials] لفتح المالية، [NAVIGATE: inventory] لفتح المخزن، [NAVIGATE: projects] لفتح المشاريع، [NAVIGATE: employees] لشؤون الموظفين، [NAVIGATE: approvals] للموافقات، [NAVIGATE: settings] للإعدادات). استخدم هذا الرمز حصراً إذا طلب المستخدم الانتقال أو فتح صفحة، أو عندما تقترح عليه الانتقال إليها لمتابعة تفاصيل موضوع سألك عنه.
- ردودك يجب أن تشعر المستخدم أنه يتحدث مع "العين الساهرة على النظام" التي تعرف كل شاردة وواردة في المؤسسة بنظرة ذكية واحترافية وبشرية وبأقل الكلمات الممكنة!
`;

    const contents = [];
    if (history && history.length > 0) {
      for (const h of history) {
        const hRole = h.role === 'bot' ? 'model' : h.role;
        contents.push({
          role: hRole,
          parts: [{ text: h.text }]
        });
      }
    }

    // Prepare current parts (supporting image + text)
    const currentParts = [];
    if (image && image.data) {
      currentParts.push({
        inlineData: {
          mimeType: image.mimeType || 'image/png',
          data: image.data
        }
      });
    }
    currentParts.push({ text: message });

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemContextPrompt,
        temperature: 0.7,
        tools: [{ googleSearch: {} }] // Google Search grounding enabled
      },
    });

    // Extract search grounding details to list sources on the client
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchSources = groundingChunks.map((chunk) => {
      if (chunk.web) {
        return {
          title: chunk.web.title,
          uri: chunk.web.uri
        };
      }
      return null;
    }).filter(Boolean);

    res.json({ 
      text: response.text,
      sources: searchSources
    });
  } catch (error) {
    console.error('Gemini chatbot error on server:', error);
    res.status(500).json({ error: 'فشل السيرفر في توليد رد ذكي من Gemini', details: error.message });
  }
});

// ======================================================
// TTS Route (Text-to-Speech via Gemini)
// ======================================================
app.post('/api/tts', async (req, res) => {
  const { text, stats, voiceFocus = 'all', customKey } = req.body;
  
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح الذكاء الاصطناعي غير مهيأ. الرجاء إدخال مفتاح في الإعدادات.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    let promptText = text;
    
    // If stats is provided, construct a highly customized concise Saudi Arabic prompt
    if (stats) {
      const { income, expenses, net, pendingPurchases, activeProjects, totalWorkers, totalEmployees, todayAttendance } = stats;
      const voiceFocusArabicMap = {
        'all': 'شامل للمال والعمليات الميدانية والعمالة والتنبيهات',
        'financial': 'المالي فقط (إيرادات ومصاريف وصافي أرباح وتدفقات مالية)',
        'operations': 'العمليات والميدانية والتوريدات فقط (مشاريع معلقة ومشتريات وعمالة وحضور الكادر)'
      };
      
      const focusText = voiceFocusArabicMap[voiceFocus] || voiceFocusArabicMap['all'];

      promptText = `أنت مساعد تنفيذي ذكي ومحترف لمؤسسة مقاولات كلادينج وسقوف سعودية تدعى 'خبراء الرسم'.
المطلوب منك توليد وقراءة تقرير صباحي شفهي لمدير المؤسسة العام (المالك) بلهجة عامية سعودية طبيعية جداً وودية ومباشرة كأنك رائد كادر العمل أو زميله (رجل يتكلم بلهجة سعودية بيضاء مبسطة ومريحة).

**الهدف الأساسي**: الاختصار الشديد جداً وسرد أهم الحقائق والمنجزات والملاحظات بدون مقدمات طويلة أو رسميات لا داعي لها. المالك مستمع إليك في صباح اليوم بينما ينفذ مهامه. ادخل في صلب الموضوع مباشرة.

المعطيات المالية والتشغيلية المباشرة هي:
- إجمالي الواردات: ${income} ريال.
- إجمالي المصروفات والنفقات: ${expenses} ريال.
- صافي الأرباح/التدفق النقدي: ${net} ريال (إذا كان سالباً فهو عجز مؤقت بسبب تسوية توريدات).
- عدد طلبات المشتريات المعلقة بانتظار الاعتماد: ${pendingPurchases}.
- عدد المشاريع النشطة الميدانية: ${activeProjects}.
- عدد عمال الميدان المسجلين في هذا اليوم: ${totalWorkers}.
- نسبة الحضور الإداري اليوم: ${todayAttendance} حاضرين من أصل ${totalEmployees} موظفين.

قوانين الصياغة الصارمة:
1. التركيز المطلوب هو: ${focusText}. ركز كلامك على هذا المكون بشكل خاص بذكاء واهتمام.
2. كن فائق الاختصار! التقرير يجب ألا يتجاوز 2 إلى 4 جمل قصيرة إطلاقاً.
3. اللكنة والأسلوب: لهجة عامية سعودية بيضاء محكية ومبسطة كأنك زميله (مثال: "يا هلا بك أبو فلان، اليوم أمور العمل كويسة وعندنا..." أو "هلا والله أبو أحمد، اليوم رصدنا عجز مؤقت..."، "عندنا كم طلب مشتريات يبغاله تعميد...") وعبر عن المبالغ بعبارات شفهية سهلة وقصيرة مثل "عشرة آلاف" أو "مية وخمسين ألف" بأقل كلمات ممكنة. لا تذكر أي تفاصيل تقنية أو كلام فائض.
4. صوتك رجل سعودي واثق، هادئ ومحترف ومباشر.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            // 'Puck' is a warm and natural male voice suited for professional/friendly persona
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const pcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const generatedText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (pcmBase64) {
      // Decode Base64 PCM data
      const pcmBuffer = Buffer.from(pcmBase64, 'base64');
      
      // Construct a valid WAV header for 24000 Hz, 16-bit Mono PCM
      const sampleRate = 24000;
      const numChannels = 1;
      const bitDepth = 16;
      const byteRate = sampleRate * numChannels * (bitDepth / 8);
      const blockAlign = numChannels * (bitDepth / 8);

      const wavHeader = Buffer.alloc(44);
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
      wavHeader.write('WAVE', 8);
      wavHeader.write('fmt ', 12);
      wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
      wavHeader.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
      wavHeader.writeUInt16LE(numChannels, 22);
      wavHeader.writeUInt32LE(sampleRate, 24);
      wavHeader.writeUInt32LE(byteRate, 28);
      wavHeader.writeUInt16LE(blockAlign, 32);
      wavHeader.writeUInt16LE(bitDepth, 34);
      wavHeader.write('data', 36);
      wavHeader.writeUInt32LE(pcmBuffer.length, 40);

      // Combine Header + PCM
      const fullWavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
      
      res.json({ 
        text: generatedText || text, 
        audio: fullWavBuffer.toString('base64'), 
        mimeType: 'audio/wav' 
      });
    } else {
      res.status(500).json({ error: "No audio generated from model." });
    }
  } catch (error) {
    console.error('TTS error on server:', error);
    res.status(500).json({ error: 'فشل توليد الصوت', details: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  // تقديم ملفات التطبيق المبني مع إعدادات كاش ذكية لضمان التحديث التلقائي
  app.use(express.static(path.join(process.cwd(), 'dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // معالجة كافة المسارات الأخرى للتوجيه الداخلي (React Router)
  app.get('*all', (req, res) => {
    const ext = path.extname(req.path);
    if (ext && ext !== '.html' && !req.path.endsWith('/')) {
      return res.status(404).send('Asset Not Found');
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});

} // end startServer

startServer();
