import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/firebase_service.dart';
import '../services/server_api_service.dart';

class AlertsScreen extends StatefulWidget {
  final FirebaseService firebaseService;
  final ServerApiService apiService;
  final Function(int) onNavigateToTab;
  const AlertsScreen({
    Key? key,
    required this.firebaseService,
    required this.apiService,
    required this.onNavigateToTab,
  }) : super(key: key);

  @override
  _AlertsScreenState createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'مركز التنبيهات',
                    style: GoogleFonts.cairo(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'تنبيهات النظام الذكية التي تتطلب اهتماماً أو إجراءً مباشراً.',
                    style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),

            Expanded(
              child: StreamBuilder<QuerySnapshot?>(
                stream: widget.firebaseService.getTodayTransactions(),
                builder: (context, snapshot) {
                  // سنقوم بحساب التنبيهات ديناميكياً من البيانات الحية
                  double income = 0.0;
                  double expenses = 0.0;
                  int pendingCount = 0;
                  int rejectedCount = 0;

                  if (snapshot.hasData && snapshot.data != null) {
                    for (var doc in snapshot.data!.docs) {
                      final data = doc.data() as Map<String, dynamic>;
                      final amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
                      final type = data['type']?.toString() ?? 'expense';
                      final status = data['status']?.toString() ?? 'pending';

                      if (status == 'approved' || status == 'completed') {
                        if (type == 'income') {
                          income += amount;
                        } else if (type == 'expense' || type == 'purchase') {
                          expenses += amount;
                        }
                      }

                      if (status == 'pending') {
                        pendingCount++;
                      }

                      if (status == 'rejected') {
                        rejectedCount++;
                      }
                    }
                  }

                  // إنشاء قائمة التنبيهات
                  final List<Map<String, dynamic>> alertsList = [];

                  if (pendingCount > 0) {
                    alertsList.add({
                      'id': 'pending_approvals',
                      'title': '$pendingCount اعتمادات شراء معلقة',
                      'desc': 'هناك فواتير وطلبات شراء مرفوعة من المشرفين بحاجة لاعتمادك.',
                      'type': 'amber',
                      'icon': Icons.pending_actions,
                      'actionText': 'الذهاب للاعتماد',
                      'targetTab': 2, // التبويب "اليوم"
                    });
                  }

                  if (expenses > income * 0.8 && income > 0) {
                    alertsList.add({
                      'id': 'budget_warning',
                      'title': 'المصروفات مرتفعة جداً اليوم',
                      'desc': 'إجمالي النفقات تخطى 80% من الواردات المسجلة. يرجى مراجعة الصرف.',
                      'type': 'red',
                      'icon': Icons.trending_up,
                      'actionText': 'عرض التفاصيل',
                      'targetTab': 2,
                    });
                  } else if (income == 0 && expenses > 0) {
                    alertsList.add({
                      'id': 'no_income_warning',
                      'title': 'عجز مؤقت - أقل من ميزانية المشاريع',
                      'desc': 'تم صرف مبالغ لمواد ميدانية في حين لم تسجل واردات بعد هذا اليوم.',
                      'type': 'amber',
                      'icon': Icons.warning_amber_rounded,
                      'actionText': 'عرض المالية',
                      'targetTab': 2,
                    });
                  }

                  if (rejectedCount > 0) {
                    alertsList.add({
                      'id': 'rejected_alerts',
                      'title': 'طلبات مرفوضة مؤخراً',
                      'desc': 'تم رفض $rejectedCount طلبات مشتريات. يرجى المراجعة للتعديل أو الحذف.',
                      'type': 'blue',
                      'icon': Icons.block,
                      'actionText': 'مراجعة المرفوضات',
                      'targetTab': 2,
                    });
                  }

                  // سيتم دمج تنبيهات حالة الربط السحابي في ListView عن طريق إضافة بطاقة خاصة بالأسفل
                  // سنكتفي حالياً بإظهار التنبيهات الأخرى في الـ ListView ونضيف حالة السيرفر في نهاية القائمة.
                  
                  return ListView.builder(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
                    itemCount: alertsList.length + 1,
                    itemBuilder: (context, index) {
                      if (index == alertsList.length) {
                        return FutureBuilder<Map<String, dynamic>>(
                          future: widget.apiService.checkAliphiaConnection(),
                          builder: (context, connectionSnapshot) {
                            if (connectionSnapshot.connectionState == ConnectionState.waiting) {
                              return _buildAlertTile({
                                'id': 'system_stable',
                                'title': 'جاري التحقق من الربط السحابي...',
                                'desc': 'يتم الآن فحص الاتصال مع خوادم ألف ياء.',
                                'type': 'grey',
                                'icon': Icons.sync,
                                'actionText': null,
                                'targetTab': null,
                              });
                            }
                            
                            bool isConnected = false;
                            if (connectionSnapshot.hasData && connectionSnapshot.data != null) {
                               isConnected = connectionSnapshot.data!['connected'] == true;
                            }

                            return _buildAlertTile({
                              'id': 'system_stable',
                              'title': isConnected ? 'خدمات الربط السحابي مستقرة' : 'انقطاع في الربط السحابي',
                              'desc': isConnected ? 'منصة الويب وتطبيق الجوال متزامنان بشكل كامل مع الخوادم.' : 'لا يمكن الاتصال بخادم ألف ياء. يرجى التحقق من إعدادات الربط.',
                              'type': isConnected ? 'blue' : 'red',
                              'icon': isConnected ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                              'actionText': isConnected ? null : 'تحديث الإعدادات',
                              'targetTab': isConnected ? null : 0, // 0 for MoreScreen/Settings
                            });
                          },
                        );
                      }
                      final alert = alertsList[index];
                      return _buildAlertTile(alert);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertTile(Map<String, dynamic> alert) {
    final title = alert['title'] ?? '';
    final desc = alert['desc'] ?? '';
    final type = alert['type'] ?? 'blue';
    final IconData icon = alert['icon'] ?? Icons.notifications;
    final String? actionText = alert['actionText'];
    final int? targetTab = alert['targetTab'];

    Color cardBgColor;
    Color iconColor;
    Color borderColors;

    if (type == 'red') {
      cardBgColor = const Color(0xFFFEF2F2);
      iconColor = const Color(0xFFEF4444);
      borderColors = const Color(0xFFFCA5A5);
    } else if (type == 'amber') {
      cardBgColor = const Color(0xFFFFFBEB);
      iconColor = const Color(0xFFD97706);
      borderColors = const Color(0xFFFDE68A);
    } else {
      cardBgColor = const Color(0xFFEFF6FF);
      iconColor = const Color(0xFF2563EB);
      borderColors = const Color(0xFFBFDBFE);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColors.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.cairo(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            desc,
            style: GoogleFonts.cairo(
              fontSize: 11,
              color: const Color(0xFF475569),
              height: 1.4,
            ),
          ),
          if (actionText != null && targetTab != null) ...[
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    widget.onNavigateToTab(targetTab);
                  },
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Row(
                    children: [
                      Text(
                        actionText,
                        style: GoogleFonts.cairo(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: iconColor,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.arrow_back, color: iconColor, size: 12),
                    ],
                  ),
                ),
              ],
            )
          ]
        ],
      ),
    );
  }
}
