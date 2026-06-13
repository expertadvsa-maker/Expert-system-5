import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/firebase_service.dart';
import '../services/server_api_service.dart';

class MoreScreen extends StatefulWidget {
  final FirebaseService firebaseService;
  final ServerApiService apiService;
  const MoreScreen({
    Key? key,
    required this.firebaseService,
    required this.apiService,
  }) : super(key: key);

  @override
  _MoreScreenState createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  // للتحكم في المساعد الذكي بشرى
  final TextEditingController _chatController = TextEditingController();
  final List<Map<String, String>> _chatMessages = [
    {
      'role': 'bot',
      'text': 'أهلاً بك أبو أحمد! أنا "بشرى" المساعد الذكي لشركة خبراء الرسم. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن ميزانية المشاريع، حضور العمال، أو العمليات المالية الحية.'
    }
  ];
  bool _isSending = false;

  // بوابة ألف ياء ERP
  String _aliphiaStatus = 'unknown'; // unknown, checking, connected, error
  String _aliphiaMessage = 'اضغط لفحص الاتصال بنظام ألف ياء';
  bool _loadingAliphiaData = false;
  List<dynamic> _aliphiaInvoices = [];
  List<dynamic> _aliphiaClients = [];

  Future<void> _sendMessage() async {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _chatMessages.add({'role': 'user', 'text': text});
      _chatController.clear();
      _isSending = true;
    });

    try {
      // إعداد السياق الحقيقي للمساعد
      final contextData = {
        'companyName': 'خبراء الرسم',
        'userProfile': {
          'name': 'المدير العام (أبو أحمد)',
          'role': 'manager',
        },
        'attendanceRadius': 100,
        // يمكنك إرسال إحصائيات مبسطة هنا
      };

      final response = await widget.apiService.chatWithBushra(
        message: text,
        history: _chatMessages
            .sublist(0, _chatMessages.length - 1)
            .map((m) => {
                  'role': m['role'] == 'bot' ? 'bot' : 'user',
                  'text': m['text'] ?? '',
                })
            .toList(),
        context: contextData,
      );

      setState(() {
        _chatMessages.add({
          'role': 'bot',
          'text': response['text'] ?? 'لم أستطع معالجة الطلب حالياً.',
        });
      });
    } catch (e) {
      setState(() {
        _chatMessages.add({
          'role': 'bot',
          'text': '⚠️ عذراً، حدث خطأ أثناء الاتصال بالخادم. تأكد من تشغيل سيرفر Express ومفتاح Gemini.',
        });
      });
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // الترويسة والملف الشخصي للمدير
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'الخيارات والمساعد',
                    style: GoogleFonts.cairo(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // كرت ملف المستخدم الأنيق المدمج
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.01),
                          blurRadius: 10,
                          offset: const Offset(0, 6),
                        )
                      ],
                      border: Border.all(color: Colors.grey.withOpacity(0.05)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: const BoxDecoration(
                            color: Color(0xFF2C7A7D),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              'أ',
                              style: GoogleFonts.cairo(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'المدير العام والمالك',
                              style: GoogleFonts.cairo(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              'expertadvsa@gmail.com',
                              style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[450]),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE6F4F4),
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            'الإدارة العليا',
                            style: GoogleFonts.cairo(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF2C7A7D),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  _buildAliphiaCard(),
                ],
              ),
            ),

            // عنوان المحادثة
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                children: [
                  const Icon(Icons.support_agent, color: Color(0xFF2C7A7D), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'المساعد الذكي "بشرى" (Gemini AI)',
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // منطقة الشات
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 20.0),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.withOpacity(0.05)),
                ),
                child: Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        itemCount: _chatMessages.length,
                        itemBuilder: (context, index) {
                          final msg = _chatMessages[index];
                          final isBot = msg['role'] == 'bot';
                          return _buildChatMessage(msg['text'] ?? '', isBot);
                        },
                      ),
                    ),
                    if (_isSending)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'بشرى تفكر وتصيغ الرد...',
                              style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                            ),
                          ],
                        ),
                      ),
                    const Divider(height: 1),
                    Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: TextField(
                                controller: _chatController,
                                style: GoogleFonts.cairo(fontSize: 12),
                                textDirection: TextDirection.rtl,
                                onSubmitted: (val) => _sendMessage(),
                                decoration: InputDecoration(
                                  hintText: 'اسأل بشرى عن أي شيء...',
                                  hintStyle: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[400]),
                                  border: InputBorder.none,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: _sendMessage,
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: const BoxDecoration(
                                color: Color(0xFF2C7A7D),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.send, color: Colors.white, size: 18),
                            ),
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildChatMessage(String text, bool isBot) {
    return Align(
      alignment: isBot ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isBot ? const Color(0xFFEFF6FF) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: isBot ? const Radius.circular(16) : Radius.zero,
            bottomRight: isBot ? Radius.zero : const Radius.circular(16),
          ),
        ),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.7,
        ),
        child: Text(
          text,
          style: GoogleFonts.cairo(
            fontSize: 11.5,
            height: 1.5,
            color: isBot ? const Color(0xFF1E40AF) : const Color(0xFF0F172A),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // Aliphia ERP Integration Widgets & Methods
  // ==========================================

  Future<void> _checkConnection() async {
    setState(() {
      _aliphiaStatus = 'checking';
      _aliphiaMessage = 'جاري فحص الاتصال...';
    });
    try {
      final res = await widget.apiService.checkAliphiaConnection();
      final test = res['activeConnectionTest'];
      if (test != null && test['ok'] == true) {
        setState(() {
          _aliphiaStatus = 'connected';
          _aliphiaMessage = 'الاتصال مستقر مع ألف ياء ERP!';
        });
      } else {
        final error = test != null ? test['errorMsg'] : 'فشل الاتصال';
        setState(() {
          _aliphiaStatus = 'error';
          _aliphiaMessage = 'خطأ في التوثيق: $error';
        });
      }
    } catch (e) {
      setState(() {
        _aliphiaStatus = 'error';
        _aliphiaMessage = 'تعذر الاتصال بالسيرفر: $e';
      });
    }
  }

  Future<void> _showInvoicesBottomSheet() async {
    setState(() => _loadingAliphiaData = true);
    try {
      final invoices = await widget.apiService.fetchAliphiaInvoices();
      setState(() {
        _aliphiaInvoices = invoices;
        _loadingAliphiaData = false;
      });
      _displayInvoices();
    } catch (e) {
      setState(() => _loadingAliphiaData = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('⚠️ فشل جلب الفواتير: $e', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _showClientsBottomSheet() async {
    setState(() => _loadingAliphiaData = true);
    try {
      final clients = await widget.apiService.fetchAliphiaClients();
      setState(() {
        _aliphiaClients = clients;
        _loadingAliphiaData = false;
      });
      _displayClients();
    } catch (e) {
      setState(() => _loadingAliphiaData = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('⚠️ فشل جلب العملاء: $e', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _displayInvoices() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(24),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'فواتير ألف ياء ERP النشطة',
                      style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                    ),
                    Text(
                      '${_aliphiaInvoices.length} فاتورة',
                      style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[400]),
                    ),
                  ],
                ),
                const Divider(height: 24),
                if (_aliphiaInvoices.isEmpty)
                  Expanded(
                    child: Center(
                      child: Text(
                        'لا توجد فواتير مسجلة حالياً.',
                        style: GoogleFonts.cairo(color: Colors.grey[450]),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: ListView.builder(
                      physics: const BouncingScrollPhysics(),
                      itemCount: _aliphiaInvoices.length,
                      itemBuilder: (context, index) {
                        final inv = _aliphiaInvoices[index] as Map<String, dynamic>;
                        final number = inv['invoice_number'] ?? inv['number'] ?? 'N/A';
                        final client = inv['client_name'] ?? inv['client'] ?? 'عميل غير معروف';
                        final total = double.tryParse(inv['invoice_total']?.toString() ?? inv['total']?.toString() ?? '0') ?? 0.0;
                        final date = inv['invoice_date_created'] ?? inv['date'] ?? '';
                        final statusId = inv['invoice_status_id']?.toString() ?? '1';

                        Color statusColor;
                        String statusText;
                        if (statusId == '1') {
                          statusText = 'مسودة';
                          statusColor = Colors.grey;
                        } else if (statusId == '2') {
                          statusText = 'مرسل';
                          statusColor = Colors.blue;
                        } else if (statusId == '3') {
                          statusText = 'مدفوع جزئي';
                          statusColor = Colors.orange;
                        } else if (statusId == '4') {
                          statusText = 'مدفوع بالكامل';
                          statusColor = const Color(0xFF2C7A7D);
                        } else {
                          statusText = 'مستحق';
                          statusColor = Colors.red;
                        }

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.withOpacity(0.05)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'فاتورة #$number',
                                    style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                                  ),
                                  Text(
                                    client,
                                    style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                                  ),
                                  Text(
                                    date,
                                    style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[400]),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '${total.toStringAsFixed(1)} ر.س',
                                    style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: statusColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(100),
                                    ),
                                    child: Text(
                                      statusText,
                                      style: GoogleFonts.cairo(fontSize: 8, color: statusColor, fontWeight: FontWeight.bold),
                                    ),
                                  )
                                ],
                              )
                            ],
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _displayClients() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(24),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'عملاء ألف ياء ERP النشطين',
                      style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                    ),
                    Text(
                      '${_aliphiaClients.length} عميل',
                      style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[400]),
                    ),
                  ],
                ),
                const Divider(height: 24),
                if (_aliphiaClients.isEmpty)
                  Expanded(
                    child: Center(
                      child: Text(
                        'لا يوجد عملاء مسجلين حالياً.',
                        style: GoogleFonts.cairo(color: Colors.grey[450]),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: ListView.builder(
                      physics: const BouncingScrollPhysics(),
                      itemCount: _aliphiaClients.length,
                      itemBuilder: (context, index) {
                        final client = _aliphiaClients[index] as Map<String, dynamic>;
                        final name = client['client_name'] ?? client['name'] ?? 'عميل بدون اسم';
                        final phone = client['client_phone'] ?? client['phone'] ?? '';
                        final email = client['client_email'] ?? client['email'] ?? '';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.withOpacity(0.05)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFEFF6FF),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.person, color: Color(0xFF2563EB), size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                                    ),
                                    if (phone.isNotEmpty || email.isNotEmpty)
                                      Text(
                                        '${phone.isNotEmpty ? phone : ''} ${email.isNotEmpty ? " | " + email : ""}',
                                        style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[400]),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.arrow_back, size: 16, color: Colors.grey),
                                onPressed: () {},
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAliphiaCard() {
    Color statusColor;
    IconData statusIcon;
    if (_aliphiaStatus == 'connected') {
      statusColor = const Color(0xFF2C7A7D);
      statusIcon = Icons.check_circle;
    } else if (_aliphiaStatus == 'error') {
      statusColor = const Color(0xFFEF4444);
      statusIcon = Icons.error;
    } else if (_aliphiaStatus == 'checking') {
      statusColor = const Color(0xFFEAB308);
      statusIcon = Icons.sync;
    } else {
      statusColor = Colors.grey;
      statusIcon = Icons.help_outline;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 10,
            offset: const Offset(0, 6),
          )
        ],
        border: Border.all(color: Colors.grey.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.cloud_sync, color: Color(0xFF2C7A7D), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'بوابة ألف ياء ERP السحابية',
                      style: GoogleFonts.cairo(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      _aliphiaMessage,
                      style: GoogleFonts.cairo(
                        fontSize: 10,
                        color: _aliphiaStatus == 'error' ? Colors.red : Colors.grey[500],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (_aliphiaStatus == 'checking')
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)),
                )
              else
                Icon(statusIcon, color: statusColor, size: 18),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _aliphiaStatus == 'checking' ? null : _checkConnection,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF1F5F9),
                    foregroundColor: const Color(0xFF0F172A),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  icon: const Icon(Icons.wifi_find, size: 14),
                  label: Text(
                    'فحص الاتصال',
                    style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _loadingAliphiaData ? null : _showInvoicesBottomSheet,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE6F4F4),
                    foregroundColor: const Color(0xFF2C7A7D),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  icon: _loadingAliphiaData
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)),
                        )
                      : const Icon(Icons.receipt_long, size: 14),
                  label: Text(
                    'الفواتير',
                    style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _loadingAliphiaData ? null : _showClientsBottomSheet,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEFF6FF),
                    foregroundColor: const Color(0xFF2563EB),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  icon: const Icon(Icons.people_outline, size: 14),
                  label: Text(
                    'العملاء',
                    style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}
