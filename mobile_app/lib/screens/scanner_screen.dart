import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:image_picker/image_picker.dart';
import '../services/firebase_service.dart';
import '../services/server_api_service.dart';

class ScannerScreen extends StatefulWidget {
  final FirebaseService firebaseService;
  final ServerApiService apiService;
  const ScannerScreen({
    Key? key,
    required this.firebaseService,
    required this.apiService,
  }) : super(key: key);

  @override
  _ScannerScreenState createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  bool _isScanning = false;
  bool _hasResult = false;

  // حقول الفاتورة المقروءة
  final TextEditingController _vendorController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _dateController = TextEditingController();
  final TextEditingController _itemsController = TextEditingController();
  String _invoiceType = 'expense'; // expense | purchase

  final ImagePicker _picker = ImagePicker();

  Future<void> _pickAndAnalyzeImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 80,
      );

      if (image == null) return;

      setState(() {
        _isScanning = true;
        _hasResult = false;
      });

      final File file = File(image.path);
      final List<int> imageBytes = await file.readAsBytes();
      final String base64Image = base64Encode(imageBytes);

      String mimeType = 'image/jpeg';
      final String extension = image.path.split('.').last.toLowerCase();
      if (extension == 'png') {
        mimeType = 'image/png';
      } else if (extension == 'webp') {
        mimeType = 'image/webp';
      }

      final Map<String, dynamic> data = await widget.apiService.analyzeInvoiceOCR(
        base64Image: base64Image,
        mimeType: mimeType,
      );

      if (data['error'] == 'not_an_invoice') {
        throw Exception('الصورة المرفقة لا يبدو أنها فاتورة صحيحة. الرجاء تصوير فاتورة واضحة.');
      }

      setState(() {
        _isScanning = false;
        _hasResult = true;
        _vendorController.text = data['vendor']?.toString() ?? '';
        _amountController.text = data['amount']?.toString() ?? '';
        
        final extractedDate = data['date']?.toString() ?? '';
        if (extractedDate.isNotEmpty && RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(extractedDate)) {
          _dateController.text = extractedDate;
        } else {
          _dateController.text = DateTime.now().toIso8601String().split('T')[0];
        }
        
        _itemsController.text = data['items']?.toString() ?? '';
      });
    } catch (e) {
      setState(() {
        _isScanning = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '⚠️ خطأ في معالجة الفاتورة: $e',
            textDirection: TextDirection.rtl,
            style: GoogleFonts.cairo(),
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showSourceSelectionBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'مسح الفاتورة ضوئياً',
                  style: GoogleFonts.cairo(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 14),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Color(0xFFE6F4F4),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.camera_alt, color: Color(0xFF2C7A7D)),
                  ),
                  title: Text(
                    'التقاط صورة بالكاميرا',
                    style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    _pickAndAnalyzeImage(ImageSource.camera);
                  },
                ),
                const SizedBox(height: 8),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.photo_library, color: Color(0xFF3B82F6)),
                  ),
                  title: Text(
                    'اختيار من معرض الصور',
                    style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    _pickAndAnalyzeImage(ImageSource.gallery);
                  },
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _submitTransaction() async {
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    final vendor = _vendorController.text.trim();
    final items = _itemsController.text.trim();
    
    if (amount <= 0 || vendor.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '⚠️ الرجاء التحقق من المدخلات! المبلغ والمورد مطلوبان.',
            textDirection: TextDirection.rtl,
            style: GoogleFonts.cairo(),
          ),
          backgroundColor: Colors.amber[800],
        ),
      );
      return;
    }

    try {
      final HttpsCallable createTransaction = FirebaseFunctions.instance.httpsCallable('createTransaction');
      await createTransaction.call({
        'amount': amount,
        'type': _invoiceType,
        'description': 'فاتورة ممسوحة ضوئياً: $items',
        'status': 'pending', // المدير العام يعتمدها لاحقاً
        'date': DateTime.now().toIso8601String(),
        'createdAt': DateTime.now().toIso8601String(),
        'vendorName': vendor,
        'createdBy': 'mobile_ocr_scanner',
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '✅ تم إرسال الفاتورة بنجاح إلى مركز الاعتمادات بانتظار المدير العام!',
            textDirection: TextDirection.rtl,
            style: GoogleFonts.cairo(),
          ),
          backgroundColor: const Color(0xFF2C7A7D),
        ),
      );

      setState(() {
        _hasResult = false;
        _vendorController.clear();
        _amountController.clear();
        _dateController.clear();
        _itemsController.clear();
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '❌ فشل حفظ الفاتورة: $e',
            textDirection: TextDirection.rtl,
            style: GoogleFonts.cairo(),
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'الماسح الذكي OCR',
                style: GoogleFonts.cairo(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'امسح الفواتير والإيصالات الميدانية لتسجيلها تلقائياً بالذكاء الاصطناعي وتخفيف الإدخال اليدوي.',
                style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[500], height: 1.4),
              ),
              const SizedBox(height: 20),

              if (!_hasResult && !_isScanning) ...[
                // منطقة التقاط الفاتورة
                GestureDetector(
                  onTap: _showSourceSelectionBottomSheet,
                  child: Container(
                    height: 240,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.01),
                          blurRadius: 10,
                          offset: const Offset(0, 6),
                        )
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.qr_code_scanner, color: Color(0xFF2C7A7D), size: 36),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          'اضغط هنا لالتقاط فاتورة أو إيصال',
                          style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'كاميرا الجوال / معرض الصور',
                          style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[400]),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              if (_isScanning) ...[
                // واجهة المسح الجاري
                Container(
                  height: 240,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(color: Color(0xFF2C7A7D)),
                        const SizedBox(height: 18),
                        Text(
                          'جاري قراءة الفاتورة بذكاء اصطناعي...',
                          style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D)),
                        ),
                        Text(
                          'استخراج النصوص والمبالغ والمورد',
                          style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[450]),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              if (_hasResult) ...[
                // تفاصيل الفاتورة المستخرجة
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.verified, color: Color(0xFF2C7A7D), size: 18),
                          const SizedBox(width: 6),
                          Text(
                            'البيانات المستخرجة بنجاح',
                            style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // نوع الفاتورة
                      Row(
                        children: [
                          Text(
                            'تصنيف العملية:',
                            style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                          ),
                          const SizedBox(width: 12),
                          ChoiceChip(
                            label: Text('مصروفات تشغيلية', style: GoogleFonts.cairo(fontSize: 10)),
                            selected: _invoiceType == 'expense',
                            onSelected: (val) => setState(() => _invoiceType = 'expense'),
                            selectedColor: const Color(0xFFE6F4F4),
                            labelStyle: TextStyle(color: _invoiceType == 'expense' ? const Color(0xFF2C7A7D) : Colors.black),
                          ),
                          const SizedBox(width: 8),
                          ChoiceChip(
                            label: Text('مشتريات مواد', style: GoogleFonts.cairo(fontSize: 10)),
                            selected: _invoiceType == 'purchase',
                            onSelected: (val) => setState(() => _invoiceType = 'purchase'),
                            selectedColor: const Color(0xFFE6F4F4),
                            labelStyle: TextStyle(color: _invoiceType == 'purchase' ? const Color(0xFF2C7A7D) : Colors.black),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // المورد / البائع
                      _buildScanField('المورد / المحل', _vendorController, Icons.storefront),
                      const SizedBox(height: 12),

                      // المبلغ
                      _buildScanField('إجمالي الفاتورة (ريال)', _amountController, Icons.monetization_on_outlined, isNumeric: true),
                      const SizedBox(height: 12),

                      // التاريخ
                      _buildScanField('تاريخ الفاتورة', _dateController, Icons.calendar_today),
                      const SizedBox(height: 12),

                      // تفاصيل المواد
                      _buildScanField('المواد والتفاصيل', _itemsController, Icons.description_outlined, maxLines: 2),
                      const SizedBox(height: 20),

                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _submitTransaction,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2C7A7D),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              child: Text(
                                'إرسال للمالية واعتماد',
                                style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          OutlinedButton(
                            onPressed: () {
                              setState(() {
                                _hasResult = false;
                              });
                            },
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: Colors.grey[300]!),
                              foregroundColor: Colors.grey[600],
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                            ),
                            child: Text(
                              'إلغاء',
                              style: GoogleFonts.cairo(fontSize: 12),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScanField(String label, TextEditingController controller, IconData icon, {bool isNumeric = false, int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[500]),
        ),
        const SizedBox(height: 4),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
          ),
          child: TextField(
            controller: controller,
            keyboardType: isNumeric ? TextInputType.number : TextInputType.text,
            maxLines: maxLines,
            style: GoogleFonts.cairo(fontSize: 12, color: const Color(0xFF0F172A), fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              prefixIcon: Icon(icon, color: Colors.grey[400], size: 16),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            ),
          ),
        ),
      ],
    );
  }
}
