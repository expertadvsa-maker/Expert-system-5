import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';

class ServerApiService {
  ServerApiService();

  /// قراءة الإعدادات الحية من التخزين المحلي وقاعدة البيانات
  Future<Map<String, String>> _getApiConfig() async {
    final prefs = await SharedPreferences.getInstance();
    String geminiKey = prefs.getString('geminiKey') ?? '';
    
    // Fetch from Firestore system/settings as fallback/primary if local is empty
    if (geminiKey.isEmpty) {
      try {
        final doc = await FirebaseFirestore.instance.collection('system').doc('settings').get();
        if (doc.exists) {
          geminiKey = doc.data()?['geminiApiKey'] ?? '';
        }
      } catch (e) {
        print('Error fetching gemini key from firestore: $e');
      }
    }

    return {
      'geminiKey': geminiKey,
      'aliphiaUser': prefs.getString('aliphiaUser') ?? '',
      'aliphiaPass': prefs.getString('aliphiaPass') ?? '',
      'aliphiaKey': prefs.getString('aliphiaKey') ?? '',
    };
  }

  /// إرسال رسالة إلى المساعد الذكي "بشرى" والحصول على رد نصي ومصادر البحث
  Future<Map<String, dynamic>> chatWithBushra({
    required String message,
    List<Map<String, String>> history = const [],
    Map<String, dynamic>? context,
  }) async {
    final config = await _getApiConfig();
    final geminiKey = config['geminiKey']!;
    
    if (geminiKey.isEmpty) throw Exception('مفتاح Gemini غير متوفر');

    final url = Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$geminiKey');
    
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'contents': [
            {
              'parts': [
                {'text': 'أنت خبير في إدارة المشاريع: \nسياق: ${jsonEncode(context)}\nرسالة: $message'}
              ]
            }
          ]
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final text = data['candidates']?[0]?['content']?['parts']?[0]?['text'] ?? 'لا يوجد رد';
        return {
          'text': text,
          'sources': [],
        };
      } else {
        throw Exception('فشل في الاتصال بالمساعد: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('خطأ في شبكة الاتصال بالمساعد: $e');
    }
  }

  /// طلب توليد ملف صوتي (WAV) للموجز الذكي اليومي بلهجة سعودية
  Future<Uint8List> generateSpeechReport({
    required Map<String, dynamic> stats,
    String voiceFocus = 'all',
  }) async {
    throw Exception('التوليد الصوتي يحتاج إلى إعداد خدمة خارجية (TTS API).');
  }

  /// إرسال الصورة لاستخراج نصوص الفاتورة عبر Gemini OCR
  Future<Map<String, dynamic>> analyzeInvoiceOCR({
    required String base64Image,
    required String mimeType,
  }) async {
    final config = await _getApiConfig();
    final geminiKey = config['geminiKey']!;
    if (geminiKey.isEmpty) throw Exception('مفتاح Gemini غير متوفر');
    
    final url = Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$geminiKey');
    
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'contents': [
            {
              'parts': [
                { 'text': 'من فضلك قم بقراءة هذه الصورة المرفقة. إذا لم تكن الصورة فاتورة حقيقية واضحة (كأن تكون صورة شخصية أو منظر طبيعي أو غير متعلقة بالمشتريات)، يجب عليك إرجاع الاستجابة التالية حصراً: {"error": "not_an_invoice"}. أما إذا كانت فاتورة، فاستخرج المورد والمبلغ الإجمالي والتاريخ وتفاصيل المواد، وأجب بتنسيق JSON حصراً بالصيغة التالية: {"vendor": "...", "amount": 0.0, "date": "YYYY-MM-DD", "items": "..."}' },
                {
                  'inlineData': {
                    'data': base64Image,
                    'mimeType': mimeType,
                  }
                }
              ]
            }
          ],
          'generationConfig': {
            'responseMimeType': 'application/json',
          }
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final String text = data['candidates']?[0]?['content']?['parts']?[0]?['text'] ?? '';
        return jsonDecode(text.trim());
      } else {
        throw Exception('فشل قراءة الفاتورة من السيرفر: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('خطأ في شبكة الاتصال بـ OCR: $e');
    }
  }

  /// تجهيز ترويسات المصادقة لنظام ألف ياء (إذا وجدت مفاتيح محلية)
  Map<String, String> _getAliphiaHeaders(Map<String, String> config) {
    final headers = <String, String>{};
    if (config['aliphiaUser']!.isNotEmpty && config['aliphiaKey']!.isNotEmpty) {
      final basicAuth = base64Encode(utf8.encode('${config['aliphiaUser']}:${config['aliphiaPass']}'));
      headers['Authorization'] = 'Basic $basicAuth';
      headers['X-KEYALI-API'] = config['aliphiaKey']!;
    }
    return headers;
  }

  /// فحص حالة الاتصال بـ ألف ياء ERP
  Future<Map<String, dynamic>> checkAliphiaConnection() async {
    final config = await _getApiConfig();
    final url = Uri.parse('https://aliphia.com/v1/api_public/clients/active?limit=1');
    
    try {
      final response = await http.get(
        url,
        headers: _getAliphiaHeaders(config),
      );
      if (response.statusCode == 200) {
        return {'status': 'connected', 'message': 'تم الاتصال بنجاح'};
      } else {
        throw Exception('فشل فحص الاتصال: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('خطأ في الاتصال بالخادم: $e');
    }
  }

  /// جلب الفواتير من ألف ياء
  Future<List<dynamic>> fetchAliphiaInvoices() async {
    final config = await _getApiConfig();
    final url = Uri.parse('https://aliphia.com/v1/api_public/invoices');
    
    try {
      final response = await http.get(
        url,
        headers: _getAliphiaHeaders(config),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data['response'] != null) {
          final res = data['response'];
          if (res['invoices'] is List) return res['invoices'];
          if (res['invoice'] is List) return res['invoice'];
          if (res is Map) return res.values.toList();
        }
        return [];
      } else if (response.statusCode == 404) {
        return [];
      } else {
        throw Exception('فشل جلب الفواتير: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('خطأ في جلب الفواتير: $e');
    }
  }

  /// جلب العملاء النشطين من ألف ياء
  Future<List<dynamic>> fetchAliphiaClients() async {
    final config = await _getApiConfig();
    final url = Uri.parse('https://aliphia.com/v1/api_public/clients/active');
    
    try {
      final response = await http.get(
        url,
        headers: _getAliphiaHeaders(config),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data['response'] != null) {
          final res = data['response'];
          if (res['clients'] is List) return res['clients'];
          if (res['client'] is List) return res['client'];
          if (res is Map) return res.values.toList();
        }
        return [];
      } else {
        throw Exception('فشل جلب العملاء: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('خطأ في جلب العملاء: $e');
    }
  }

  /// جلب عروض الأسعار من ألف ياء
  Future<List<dynamic>> fetchAliphiaQuotes() async {
    final config = await _getApiConfig();
    final url = Uri.parse('https://aliphia.com/v1/api_public/quotes');
    
    try {
      final response = await http.get(
        url,
        headers: _getAliphiaHeaders(config),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data['response'] != null) {
          final res = data['response'];
          if (res['quotes'] is List) return res['quotes'];
          if (res['quote'] is List) return res['quote'];
          if (res is Map) return res.values.toList();
        }
        return [];
      } else if (response.statusCode == 404) {
        return [];
      } else {
        throw Exception('فشل جلب عروض الأسعار: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('خطأ في جلب عروض الأسعار: $e');
    }
  }

  /// رفع صورة حقيقية من الكاميرا/المعرض مباشرة إلى Firebase Storage
  Future<String> uploadImage({
    required Uint8List imageBytes,
    required String fileName,
  }) async {
    // رفع مباشر لـ Firebase Storage بدون الحاجة لخادم وسيط
    try {
      final storageRef = FirebaseStorage.instance
          .ref()
          .child('uploads/$fileName');
      
      final uploadTask = storageRef.putData(
        imageBytes,
        SettableMetadata(contentType: 'image/jpeg'),
      );
      
      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      return downloadUrl;
    } catch (e) {
      throw Exception('خطأ في رفع الصورة إلى Firebase Storage: $e');
    }
  }
}

