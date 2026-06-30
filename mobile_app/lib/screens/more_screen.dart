import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';
import '../services/firebase_service.dart';
import '../services/server_api_service.dart';
import 'aliphia_clients_screen.dart';
import 'aliphia_invoices_screen.dart';
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
  // بوابة ألف ياء ERP
  String _aliphiaStatus = 'unknown'; // unknown, checking, connected, error
  String _aliphiaMessage = 'اضغط لفحص الاتصال بنظام ألف ياء';
  bool _loadingAliphiaData = false;



  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF4F7FA),
      child: Stack(
        children: [
          // Background Gradient Ornaments
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF38BDF8).withOpacity(0.12),
                boxShadow: [BoxShadow(color: const Color(0xFF38BDF8).withOpacity(0.1), blurRadius: 100)],
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            left: -150,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF2C7A7D).withOpacity(0.12),
                boxShadow: [BoxShadow(color: const Color(0xFF2C7A7D).withOpacity(0.1), blurRadius: 100)],
              ),
            ),
          ),
          
          Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // الترويسة والملف الشخصي للمدير
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 40, 20, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الخيارات والمساعد',
                        style: GoogleFonts.cairo(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF0F172A),
                        ),
                      ).animate().fadeIn(duration: 400.ms).slideX(begin: 0.1, end: 0),
                      const SizedBox(height: 16),
                      // كرت ملف المستخدم الأنيق المدمج
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF2C7A7D).withOpacity(0.08),
                              blurRadius: 30,
                              offset: const Offset(0, 10),
                            )
                          ],
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 55,
                              height: 55,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(colors: [Color(0xFF2C7A7D), Color(0xFF38BDF8)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 3),
                                boxShadow: [BoxShadow(color: const Color(0xFF2C7A7D).withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 5))],
                              ),
                              child: Center(
                                child: Text(
                                  'أ',
                                  style: GoogleFonts.cairo(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'المدير العام والمالك',
                                    style: GoogleFonts.cairo(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    'expertadvsa@gmail.com',
                                    style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF2C7A7D).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(100),
                              ),
                              child: Text(
                                'الإدارة العليا',
                                style: GoogleFonts.cairo(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF2C7A7D),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1, end: 0),
                      const SizedBox(height: 16),
                      _buildAliphiaCard().animate().fadeIn(delay: 200.ms).slideY(begin: 0.1, end: 0),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],      ),
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
                  onPressed: _loadingAliphiaData ? null : () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AliphiaInvoicesScreen())),
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
                  onPressed: _loadingAliphiaData ? null : () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AliphiaClientsScreen())),
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
