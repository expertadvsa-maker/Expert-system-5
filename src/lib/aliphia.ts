// src/lib/aliphia.ts

const ALIPHIA_API_URL = '/api_public';

const aliphiaFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // 🔄 كسر التخزين المؤقت (Cache Busting) لضمان جلب أحدث البيانات فوراً من ألف ياء دون الاعتماد على كاش المتصفح أو البروكسي
  const hasQuery = cleanPath.includes('?');
  const cacheBustedPath = `${cleanPath}${hasQuery ? '&' : '?'}_t=${Date.now()}`;

  // إضافة هيدرز تمنع الكاش
  const finalOptions = {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  };

  // 1. محاولة الاتصال عبر البروكسي المحلي أولاً (إذا كان شغالاً في التطبيق المحلي)
  try {
    const response = await fetch(`${ALIPHIA_API_URL}${cacheBustedPath}`, finalOptions);
    if (response.status === 403 || response.status === 404) {
      throw new Error(`Proxy status: ${response.status}`);
    }
    return response;
  } catch (error) {
    const isGuest = cleanPath.startsWith('/guest/') || cleanPath.startsWith('guest/');
    const baseDirectUrl = isGuest ? 'https://aliphia.com/v1' : 'https://aliphia.com/v1/api_public';
    const directUrl = `${baseDirectUrl}${cacheBustedPath}`;
    
    // قائمة بالبروكسيات البديلة لتفادي الحظر المحلي للـ Cloudflare Workers في بعض الدول
    const proxies = [
      // 1. البروكسي المخصص للمشروع (قد يكون محظوراً في بعض الشبكات المحلية)
      () => {
        const customProxy = import.meta.env.VITE_ALIPHIA_CORS_PROXY || 'https://aliphia-proxy.expertadvsa.workers.dev';
        const cleanProxy = customProxy.endsWith('/') ? customProxy.slice(0, -1) : customProxy;
        return `${cleanProxy}?${encodeURIComponent(directUrl)}`;
      },
      // 2. البروكسي العام المجاني corsproxy.io (مستقر ومفتوح في السعودية)
      () => `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
      // 3. البروكسي العام المجاني allorigins (كاحتياطي أخير)
      () => `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`
    ];

    // إزالة هيدرز الكاش لتجنب فشل CORS Preflight على البروكسي الخارجي
    const cleanHeaders = { ...(finalOptions.headers || {}) } as Record<string, string>;
    delete cleanHeaders['Cache-Control'];
    delete cleanHeaders['Pragma'];
    delete cleanHeaders['Expires'];
    
    const fallbackOptions = {
      ...finalOptions,
      headers: cleanHeaders
    };

    let lastError: any = error;
    for (let i = 0; i < proxies.length; i++) {
      try {
        const proxiedUrl = proxies[i]();
        console.log(`🔌 [Aliphia Fallback] Attempting connection via proxy #${i + 1}: ${proxiedUrl}`);
        const response = await fetch(proxiedUrl, fallbackOptions);
        if (response.ok || response.status < 500) {
          return response;
        }
        throw new Error(`Proxy returned status ${response.status}`);
      } catch (proxyErr) {
        lastError = proxyErr;
        console.warn(`⚠️ Proxy #${i + 1} failed, trying next... Error:`, proxyErr);
      }
    }
    
    throw lastError;
  }
};

// Local cache persistence helper for connection stability
const saveToCache = (key: string, data: any) => {
  try {
    localStorage.setItem(`aliphia_cache_${key}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    console.warn("Could not save to local Aliphia cache:", e);
  }
};

const getFromCache = (key: string): any | null => {
  try {
    const raw = localStorage.getItem(`aliphia_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log(`🔌 Loaded Aliphia backup data from cache [key: ${key}, cached at ${new Date(parsed.timestamp).toLocaleString()}]`);
      return parsed.data;
    }
  } catch (e) {
    console.warn("Could not read from local Aliphia cache:", e);
  }
  return null;
};


export const forceArabicInAliphiaPdfUrl = (url: string): string => {
  try {
    const match = url.match(/\/view\/(api_pdf|pdf)\/([^?\/&]+)/);
    if (!match) return url;
    
    const prefix = match[1];
    const base64Token = match[2];
    
    // Decode base64 browser-compatibly
    let decodedText = '';
    try {
      decodedText = decodeURIComponent(escape(atob(base64Token)));
    } catch (e) {
      decodedText = atob(base64Token);
    }
    
    // Parse JSON
    const parsed = JSON.parse(decodedText);
    if (parsed.lng) {
      parsed.lng = 'ar';
    }
    
    // Encode back to base64 browser-compatibly
    const newJsonString = JSON.stringify(parsed);
    const newBase64Token = btoa(unescape(encodeURIComponent(newJsonString))).replace(/=/g, '');
    
    // Reconstruct URL
    return url.replace(base64Token, newBase64Token);
  } catch (e) {
    console.warn("Could not force Arabic in Aliphia PDF URL:", e);
    return url;
  }
};

export const normalizeAliphiaPdfUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  let finalUrl = '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('aliphia.com/guest/view/')) {
      finalUrl = url.replace('aliphia.com/guest/view/', 'aliphia.com/v1/guest/view/');
    } else {
      finalUrl = url;
    }
  } else {
    let cleanPath = url;
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    if (cleanPath.startsWith('v1/')) {
      cleanPath = cleanPath.substring(3);
    }
    finalUrl = `https://aliphia.com/v1/${cleanPath}`;
  }
  
  return forceArabicInAliphiaPdfUrl(finalUrl);
};

export const getProxiedAliphiaPdfUrl = (url: string | null | undefined): string => {
  return normalizeAliphiaPdfUrl(url).replace('https://aliphia.com/v1', '/api_public');
};

export interface AliphiaCredentials {
  username?: string;
  password?: string;
  apiKey?: string;
  userId?: string;       // رقم المستخدم في ألف ياء (مطلوب لإنشاء المستندات)
  invoiceGroupId?: string; // مجموعة الترقيم (افتراضي: 1)
  taxRateId?: string;    // معرّف ضريبة القيمة المضافة 15% في ألف ياء
}

let cachedCredentials: AliphiaCredentials | null = null;
let currentCompanyId: string | null = null;

export const getAliphiaCredentials = async (): Promise<AliphiaCredentials | null> => {
  const activeCompanyId = localStorage.getItem('activeCompanyId') || 'default';

  if (cachedCredentials && currentCompanyId === activeCompanyId) return cachedCredentials;

  // 1. القراءة من التخزين المحلي
  try {
    const activeCompanyId = localStorage.getItem('activeCompanyId') || 'default';
    const local = localStorage.getItem(`aliphia_credentials_${activeCompanyId}`);
    if (local) {
      const parsed = JSON.parse(local) as AliphiaCredentials;
      cachedCredentials = {
        username: parsed.username?.trim(),
        password: parsed.password?.trim(),
        apiKey: parsed.apiKey?.trim(),
        userId: parsed.userId?.trim(),
        invoiceGroupId: parsed.invoiceGroupId?.trim() || '1',
        taxRateId: parsed.taxRateId?.trim(),
      };
      currentCompanyId = activeCompanyId;
      return cachedCredentials;
    }
  } catch(e) {
    console.error("Failed to load local credentials", e);
  }

  // 2. القراءة من ملف البيئة كاحتياطي
  if (import.meta.env.VITE_ALIPHIA_USERNAME && import.meta.env.VITE_ALIPHIA_API_KEY) {
    cachedCredentials = {
      username: import.meta.env.VITE_ALIPHIA_USERNAME.trim(),
      password: (import.meta.env.VITE_ALIPHIA_PASSWORD || '').trim(),
      apiKey: import.meta.env.VITE_ALIPHIA_API_KEY.trim(),
      userId: (import.meta.env.VITE_ALIPHIA_USER_ID || '1').trim(),
      invoiceGroupId: '1',
      taxRateId: (import.meta.env.VITE_ALIPHIA_TAX_RATE_ID || '').trim(),
    };
    currentCompanyId = activeCompanyId;
    return cachedCredentials;
  }
  
  return null;
};

export const saveAliphiaCredentials = async (creds: AliphiaCredentials) => {
  const activeCompanyId = localStorage.getItem('activeCompanyId') || 'default';
  localStorage.setItem(`aliphia_credentials_${activeCompanyId}`, JSON.stringify(creds));
  cachedCredentials = creds;
  currentCompanyId = activeCompanyId;
};

export const clearAliphiaCredentials = async () => {
  const activeCompanyId = localStorage.getItem('activeCompanyId') || 'default';
  localStorage.removeItem(`aliphia_credentials_${activeCompanyId}`);
  cachedCredentials = null;
  currentCompanyId = null;
};

const getHeaders = async (contentType = 'application/json') => {
  const creds = await getAliphiaCredentials();
  if (!creds?.username || !creds?.apiKey) return {};
  
  const rawAuth = `${creds.username}:${creds.password || ''}`;
  const basicAuth = btoa(unescape(encodeURIComponent(rawAuth)));
  const headers: Record<string, string> = {
    'Authorization': `Basic ${basicAuth}`,
    'X-KEYALI-API': creds.apiKey
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
};

export const fetchAliphiaClients = async () => {
  const creds = await getAliphiaCredentials();
  if (!creds) {
    console.warn("⚠️ مفاتيح Aliphia غير متوفرة. يتم استخدام بيانات تجريبية.");
    // Fallback Mock Data
    return [
      { id: 'AL-1001', name: 'شركة التقنية الحديثة', phone: '0500000001' },
      { id: 'AL-1002', name: 'مؤسسة الإعمار الذكي', phone: '0500000002' },
      { id: 'AL-1003', name: 'أحمد عبدالله للاتصالات', phone: '0500000003' },
    ];
  }

  try {
    const response = await aliphiaFetch('/clients/active', {
      method: 'GET',
      headers: await getHeaders(''),
    });
    if (!response.ok) throw new Error('فشل جلب بيانات العملاء من ألف ياء');
    const data = await response.json();
    
    // استخراج قائمة العملاء بمرونة سواء كانت مصفوفة (Array) أو كائن (Object)
    let clientsList: any[] = [];
    if (Array.isArray(data)) {
      clientsList = data;
    } else if (data.response && (data.response.clients || data.response.client)) {
      const rawClients = data.response.clients || data.response.client;
      clientsList = Array.isArray(rawClients) 
        ? rawClients 
        : Object.values(rawClients);
    } else if (data.response) {
      clientsList = Array.isArray(data.response) 
        ? data.response 
        : Object.values(data.response);
    } else if (data.data) {
      clientsList = Array.isArray(data.data) 
        ? data.data 
        : Object.values(data.data);
    }
    
    const mapped = clientsList.map((c: any) => ({
      id: c.client_id?.toString() || c.id?.toString(),
      name: c.client_name || c.name || 'عميل غير معروف',
      phone: c.client_phone || c.phone || '',
      email: c.client_email || c.email || ''
    }));

    saveToCache('clients', mapped);
    return mapped;
  } catch (error) {
    console.error('Aliphia fetch error:', error);
    const backup = getFromCache('clients');
    if (backup) {
      console.log('⚡ Fallback to cached Aliphia clients due to connection error.');
      return backup;
    }
    throw error;
  }
};

export const createAliphiaDocument = async (
  type: 'invoice' | 'quotation',
  docData: any,
  onCreated?: (id: string) => Promise<void>
) => {
  const creds = await getAliphiaCredentials();
  if (!creds) {
    console.warn(`⚠️ مفاتيح Aliphia غير متوفرة.`);
    return { success: true, id: Math.floor(Math.random() * 10000), pdf_url: '' };
  }

  try {
    const isInvoice = type === 'invoice';
    const endpoint = isInvoice ? '/invoice' : '/quote';
    const docKey   = isInvoice ? 'invoice'  : 'quote';
    const itemsKey = isInvoice ? 'invoice_items' : 'quote_items';
    const dateKey  = isInvoice ? 'invoice_date_created' : 'quote_date_created';

    // استخدام بيانات الاعتماد المخزنة
    const userId        = creds.userId        || docData.user_id         || '1';
    const groupId       = creds.invoiceGroupId || docData.invoice_group_id || '1';
    const taxRateId     = creds.taxRateId     || '';
    const docDate       = docData.date || new Date().toISOString().split('T')[0];

    let docId = docData.existing_id;

    if (!docId) {
      // الخطوة 1: إنشاء مستند فارغ
      const createBody: any = {
        client_id: String(docData.client_id || ''),
        [dateKey]: docDate,
      };

      if (isInvoice) {
        createBody.invoice_date_supply = docDate;
        createBody.invoice_date_due = docData.date_due || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        createBody.invoice_group_id = String(groupId);
        createBody.user_id = String(userId);
      } else {
        createBody.invoice_group_id = String(groupId);
        createBody.user_id = String(userId);
      }

      const createPayload = {
        [docKey]: createBody
      };

      console.log(`📤 [Aliphia] ${type} POST → ${endpoint} | Payload:`, JSON.stringify(createPayload));

      const createResponse = await aliphiaFetch(endpoint, {
        method: 'POST',
        headers: await getHeaders('application/json'),
        body: JSON.stringify(createPayload)
      });

      const createResponseText = await createResponse.text();
      console.log(`📥 [Aliphia] POST ${createResponse.status}:`, createResponseText.substring(0, 400));

      let createResponseData: any = {};
      try { createResponseData = JSON.parse(createResponseText); } catch(e) {}

      if (!createResponse.ok) {
        const errMsg = createResponseData?.error || createResponseData?.message || `HTTP ${createResponse.status}`;
        throw new Error(`فشل إنشاء المستند: ${errMsg}`);
      }

      docId = createResponseData?.response?.[docKey]?.[`${docKey}_id`] || 
              createResponseData?.[`${docKey}_id`];

      if (!docId) {
        throw new Error(`لم يتم استرجاع معرف المستند من ألف ياء`);
      }

      console.log(`✅ [Aliphia] ${type} created successfully with ID: ${docId}`);

      // استدعاء رد اتصال التحديث الفوري لحفظ الـ ID في قاعدة البيانات قبل المتابعة
      if (onCreated) {
        try {
          await onCreated(String(docId));
          console.log(`✅ [Aliphia] local record updated with ID: ${docId}`);
        } catch (dbErr) {
          console.error(`⚠️ [Aliphia] onCreated callback failed:`, dbErr);
        }
      }
    } else {
      console.log(`ℹ️ [Aliphia] Using existing document ID: ${docId}, skipping POST creation.`);
    }

    // الخطوة 2: تحديث المستند بالبنود
    const itemsList = Array.isArray(docData.items) ? docData.items : [];
    const formattedItems = itemsList.map((item: any, index: number) => {
      const itemObj: any = {
        item_name: String(item.name || ''),
        item_price: Number(item.price || 0),
        item_quantity: Number(item.quantity || 1),
        item_order: index + 1,
        item_lookup_id: 0
      };
      if (item.description) {
        itemObj.item_description = String(item.description);
      }
      if (taxRateId) {
        itemObj.item_tax_rate_id = String(taxRateId);
      }
      return itemObj;
    });

    // تحديث كل البيانات المطلوبة لتجنب 500 في الـ PUT
    const updateBody: any = {
      [`${docKey}_id`]: String(docId),
      client_id: String(docData.client_id || ''),
      [dateKey]: docDate,
      [itemsKey]: formattedItems
    };

    if (isInvoice) {
      updateBody.invoice_date_supply = docDate;
      updateBody.invoice_date_due = docData.date_due || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      updateBody.invoice_group_id = String(groupId);
      updateBody.user_id = String(userId);
    } else {
      updateBody.invoice_group_id = String(groupId);
      updateBody.user_id = String(userId);
    }

    if (docData.terms) updateBody.terms = docData.terms;
    if (docData.notes) updateBody.notes = docData.notes;

    const updatePayload = {
      [docKey]: updateBody
    };

    console.log(`📤 [Aliphia] ${type} PUT → ${endpoint} | Payload:`, JSON.stringify(updatePayload));

    const updateResponse = await aliphiaFetch(endpoint, {
      method: 'PUT',
      headers: await getHeaders('application/json'),
      body: JSON.stringify(updatePayload)
    });

    const updateResponseText = await updateResponse.text();
    console.log(`📥 [Aliphia] PUT ${updateResponse.status}:`, updateResponseText.substring(0, 400));

    let updateResponseData: any = {};
    try { updateResponseData = JSON.parse(updateResponseText); } catch(e) {}

    if (!updateResponse.ok) {
      const errMsg = updateResponseData?.error || updateResponseData?.message || `HTTP ${updateResponse.status}`;
      throw new Error(`فشل إضافة البنود للمستند: ${errMsg}`);
    }

    // الخطوة 3: جلب تفاصيل المستند بالكامل للحصول على رقم المستند ورابط PDF
    console.log(`🔄 [Aliphia] Fetching details for ${type} ${docId}...`);
    const detailResponse = await aliphiaFetch(`${endpoint}/${docId}`, {
      method: 'GET',
      headers: await getHeaders(''),
    });

    if (detailResponse.ok) {
      const detailText = await detailResponse.text();
      let detailData: any = {};
      try { detailData = JSON.parse(detailText); } catch(e) {}
      
      if (detailData.response?.[docKey]) {
        const docDetail = detailData.response?.[docKey] || {};
        const normalizedPdf = normalizeAliphiaPdfUrl(docDetail.pdf_url);
        docDetail.pdf_url = normalizedPdf;
        if (docDetail.pdf_link) docDetail.pdf_link = normalizeAliphiaPdfUrl(docDetail.pdf_link);
        return {
          ...docDetail,
          id: docDetail[`${docKey}_id`] || docId,
          pdf_url: normalizedPdf,
          response: docDetail,
          status: "success"
        };
      }
    }

    // fallback لو فشل الـ GET لأي سبب، نرجع رد الـ PUT المنسق
    return {
      ...updateResponseData,
      id: docId,
      pdf_url: '',
      response: {
        [`${docKey}_id`]: docId,
        pdf_url: ''
      },
      status: "success"
    };
  } catch (error) {
    console.error('Aliphia create doc error:', error);
    throw error;
  }
};

export const createAliphiaClient = async (clientData: { name: string; phone?: string; email?: string }) => {
  const creds = await getAliphiaCredentials();
  if (!creds) {
    console.warn("⚠️ مفاتيح Aliphia غير متوفرة. يتم محاكاة إنشاء العميل.");
    return {
      success: true,
      client: {
        id: 'AL-' + Math.floor(Math.random() * 10000),
        name: clientData.name,
        phone: clientData.phone || '',
        email: clientData.email || ''
      }
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('client_name', clientData.name);
    if (clientData.phone) formData.append('client_phone', clientData.phone);
    if (clientData.email) formData.append('client_email', clientData.email);

    const response = await aliphiaFetch('/client', {
      method: 'POST',
      headers: await getHeaders('application/x-www-form-urlencoded'),
      body: formData.toString()
    });

    if (!response.ok) throw new Error('فشل إنشاء العميل في ألف ياء');
    const data = await response.json();
    
    const newId = data.response?.client_id || data.data?.client_id || data.id || Math.floor(Math.random() * 10000).toString();
    
    return {
      success: true,
      client: {
        id: newId.toString(),
        name: clientData.name,
        phone: clientData.phone || '',
        email: clientData.email || ''
      }
    };
  } catch (error) {
    console.error('Aliphia create client error:', error);
    throw error;
  }
};


export const checkAliphiaConnection = async () => {
  const start = Date.now();
  const creds = await getAliphiaCredentials();
  
  if (!creds?.username || !creds?.apiKey) {
    return { status: 'disconnected', latency: 0, message: 'مفاتيح الربط غير مضافة (اضغط هنا للإعداد)' };
  }

  try {
    const headers = await getHeaders('');
    const response = await aliphiaFetch('/clients/active', {
      method: 'GET',
      headers,
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      return { status: 'connected', latency, message: 'متصل ومستقر' };
    } else {
      let errorText = '';
      try {
        const clone = response.clone();
        const errJson = await clone.json();
        errorText = errJson.error || errJson.message || errJson.msg || (typeof errJson === 'object' ? JSON.stringify(errJson) : '');
      } catch (e) {
        try {
          const clone = response.clone();
          errorText = await clone.text();
        } catch (et) {}
      }

      if (errorText.toLowerCase().includes('hourly limit') || response.status === 429) {
        return { 
          status: 'error', 
          latency, 
          message: 'تم تجاوز الحد المسموح به للطلبات في الساعة (انتظر حتى نهاية الساعة)' 
        };
      }

      // تنظيف رسالة الخطأ من أي وسوم HTML قد يرجعها السيرفر (مثل خطأ 403)
      const strippedError = errorText.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
      const cleanErrorMsg = strippedError ? strippedError.substring(0, 150) : `كود الحالة: ${response.status}`;

      return { 
        status: 'error', 
        latency, 
        message: `الخادم يرفض الاتصال: ${cleanErrorMsg}` 
      };
    }
  } catch (error: any) {
    const errMsg = error?.message || 'خطأ في الشبكة';
    return { status: 'error', latency: Date.now() - start, message: `المتصفح أو الخادم يمنع الاتصال: ${errMsg}` };
  }
};


export const fetchAliphiaInvoices = async () => {
  const creds = await getAliphiaCredentials();
  if (!creds) return [];

  try {
    const response = await aliphiaFetch('/invoices', {
      method: 'GET',
      headers: await getHeaders(''),
    });
    
    if (response.status === 404) {
      try {
        const errData = await response.clone().json();
        if (errData.error === 'InvoiceNotFound' || errData.error === 'InvoiceNotFound') {
          return [];
        }
      } catch (e) {}
    }
    
    if (!response.ok) throw new Error('فشل جلب الفواتير من ألف ياء');
    const data = await response.json();
    
    // استخراج الفواتير بمرونة
    const list = 
      Array.isArray(data) ? data : 
      (data.response && Array.isArray(data.response.invoices) ? data.response.invoices :
      (data.response && Array.isArray(data.response.invoice) ? data.response.invoice :
      (data.response && typeof data.response === 'object' ? Object.values(data.response) :
      (data.data || []))));
      
    const mapped = list.map((item: any) => {
      if (item) {
        if (item.pdf_url) item.pdf_url = normalizeAliphiaPdfUrl(item.pdf_url);
        if (item.pdf_link) item.pdf_link = normalizeAliphiaPdfUrl(item.pdf_link);
      }
      return item;
    });

    saveToCache('invoices', mapped);
    return mapped;
  } catch (error) {
    console.error('Aliphia invoices fetch error:', error);
    const backup = getFromCache('invoices');
    if (backup) {
      console.log('⚡ Fallback to cached Aliphia invoices');
      return backup;
    }
    return [];
  }
};

export const fetchAliphiaQuotations = async () => {
  const creds = await getAliphiaCredentials();
  if (!creds) return [];

  try {
    const response = await aliphiaFetch('/quotes', {
      method: 'GET',
      headers: await getHeaders(''),
    });
    
    if (response.status === 404) {
      try {
        const errData = await response.clone().json();
        if (errData.error === 'QuoteNotFound' || errData.error === 'QuoteNotFound') {
          return [];
        }
      } catch (e) {}
    }
    
    if (!response.ok) throw new Error('فشل جلب عروض الأسعار من ألف ياء');
    const data = await response.json();
    
    const list = 
      Array.isArray(data) ? data : 
      (data.response && Array.isArray(data.response.quotes) ? data.response.quotes :
      (data.response && Array.isArray(data.response.quote) ? data.response.quote :
      (data.response && typeof data.response === 'object' ? Object.values(data.response) :
      (data.data || []))));
      
    const mapped = list.map((item: any) => {
      if (item) {
        if (item.pdf_url) item.pdf_url = normalizeAliphiaPdfUrl(item.pdf_url);
        if (item.pdf_link) item.pdf_link = normalizeAliphiaPdfUrl(item.pdf_link);
      }
      return item;
    });

    saveToCache('quotes', mapped);
    return mapped;
  } catch (error) {
    console.error('Aliphia quotes fetch error:', error);
    const backup = getFromCache('quotes');
    if (backup) {
      console.log('⚡ Fallback to cached Aliphia quotations');
      return backup;
    }
    return [];
  }
};

export const fetchAliphiaInvoiceDetails = async (invoiceId: string) => {
  const creds = await getAliphiaCredentials();
  if (!creds) throw new Error('بيانات الربط مع ألف ياء غير متوفرة');

  try {
    const response = await aliphiaFetch(`/invoice/${invoiceId}`, {
      method: 'GET',
      headers: await getHeaders(''),
    });
    if (!response.ok) {
      let errorText = '';
      try {
        const clone = response.clone();
        const errJson = await clone.json();
        errorText = errJson.error || errJson.message || errJson.msg || (typeof errJson === 'object' ? JSON.stringify(errJson) : '');
      } catch (e) {
        try {
          const clone = response.clone();
          errorText = await clone.text();
        } catch (et) {}
      }
      const cleanMsg = errorText ? errorText.substring(0, 150) : `كود الحالة: ${response.status}`;
      throw new Error(`فشل جلب تفاصيل الفاتورة من ألف ياء: ${cleanMsg}`);
    }
    const data = await response.json();
    const invoice = data.response?.invoice || data.invoice || data.response || data;
    if (invoice) {
      if (invoice.pdf_url) invoice.pdf_url = normalizeAliphiaPdfUrl(invoice.pdf_url);
      if (invoice.pdf_link) invoice.pdf_link = normalizeAliphiaPdfUrl(invoice.pdf_link);
    }
    return invoice;
  } catch (error) {
    console.error('Aliphia invoice detail fetch error:', error);
    throw error;
  }
};

export const fetchAliphiaQuotationDetails = async (quoteId: string) => {
  const creds = await getAliphiaCredentials();
  if (!creds) throw new Error('بيانات الربط مع ألف ياء غير متوفرة');

  try {
    const response = await aliphiaFetch(`/quote/${quoteId}`, {
      method: 'GET',
      headers: await getHeaders(''),
    });
    if (!response.ok) {
      let errorText = '';
      try {
        const clone = response.clone();
        const errJson = await clone.json();
        errorText = errJson.error || errJson.message || errJson.msg || (typeof errJson === 'object' ? JSON.stringify(errJson) : '');
      } catch (e) {
        try {
          const clone = response.clone();
          errorText = await clone.text();
        } catch (et) {}
      }
      const cleanMsg = errorText ? errorText.substring(0, 150) : `كود الحالة: ${response.status}`;
      throw new Error(`فشل جلب تفاصيل عرض السعر من ألف ياء: ${cleanMsg}`);
    }
    const data = await response.json();
    const quote = data.response?.quote || data.quote || data.response || data;
    if (quote) {
      if (quote.pdf_url) quote.pdf_url = normalizeAliphiaPdfUrl(quote.pdf_url);
      if (quote.pdf_link) quote.pdf_link = normalizeAliphiaPdfUrl(quote.pdf_link);
    }
    return quote;
  } catch (error) {
    console.error('Aliphia quote detail fetch error:', error);
    throw error;
  }
};
