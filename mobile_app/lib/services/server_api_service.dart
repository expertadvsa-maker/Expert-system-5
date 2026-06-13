import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

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
      'baseUrl': prefs.getString('baseUrl') ?? 'http://127.0.0.1:3000',
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
    final baseUrl = config['baseUrl']!;
    final url = Uri.parse('$baseUrl/api/chat');
    
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': message,
          'history': history,
          'context': context,
          'customKey': config['geminiKey'], // حقن المفتاح الخاص بالذكاء
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('فشل في الاتصال بالمساعد بشرى: ${response.statusCode}');
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
    final config = await _getApiConfig();
    final baseUrl = config['baseUrl']!;
    final url = Uri.parse('$baseUrl/api/tts');
    
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'stats': stats,
          'voiceFocus': voiceFocus,
          'customKey': config['geminiKey'], // حقن المفتاح
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final String base64Audio = data['audio'];
        return base64.decode(base64Audio);
      } else {
        throw Exception('فشل توليد التقرير المسموع: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('خطأ أثناء توليد الصوت: $e');
    }
  }

  /// إرسال الصورة لاستخراج نصوص الفاتورة عبر Gemini OCR
  Future<Map<String, dynamic>> analyzeInvoiceOCR({
    required String base64Image,
    required String mimeType,
  }) async {
    final config = await _getApiConfig();
    final baseUrl = config['baseUrl']!;
    final url = Uri.parse('$baseUrl/api/chat');
    
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': 'من فضلك قم بقراءة هذه الفاتورة المرفقة واستخراج المورد والمبلغ الإجمالي والتاريخ وتفاصيل المواد. أجب بتنسيق JSON حصراً دون أي نصوص خارجية بالصيغة التالية: {"vendor": "...", "amount": 0.0, "date": "YYYY-MM-DD", "items": "..."}',
          'image': {
            'data': base64Image,
            'mimeType': mimeType,
          },
          'customKey': config['geminiKey'],
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final String text = data['text'] ?? '';
        
        String cleanJson = text.trim();
        if (cleanJson.contains('```json')) {
          cleanJson = cleanJson.split('```json')[1].split('```')[0].trim();
        } else if (cleanJson.contains('```')) {
          cleanJson = cleanJson.split('```')[1].split('```')[0].trim();
        }
        
        final startIndex = cleanJson.indexOf('{');
        final endIndex = cleanJson.lastIndexOf('}');
        if (startIndex != -1 && endIndex != -1) {
          cleanJson = cleanJson.substring(startIndex, endIndex + 1);
        }

        return jsonDecode(cleanJson);
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
    final baseUrl = config['baseUrl']!;
    final url = Uri.parse('$baseUrl/test-aliphia-connection');
    
    try {
      final response = await http.get(
        url,
        headers: _getAliphiaHeaders(config),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
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
    final baseUrl = config['baseUrl']!;
    final url = Uri.parse('$baseUrl/api_public/invoices');
    
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
    final baseUrl = config['baseUrl']!;
    final url = Uri.parse('$baseUrl/api_public/clients/active');
    
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
    final baseUrl = config['baseUrl']!;
    final url = Uri.parse('$baseUrl/api_public/quotes');
    
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

  /// رفع صورة حقيقية من الكاميرا/المعرض إلى الخادم
  Future<String> uploadImage({
    required Uint8List imageBytes,
    required String fileName,
  }) async {
    final config = await _getApiConfig();
    final baseUrl = config['baseUrl']!;
    final url = Uri.parse('$baseUrl/api/upload');
    
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'fileData': base64Encode(imageBytes),
          'fileName': fileName,
        }),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['url'];
      } else {
        throw Exception('فشل رفع الملف إلى الخادم: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('خطأ في شبكة الاتصال أثناء الرفع: $e');
    }
  }
}

