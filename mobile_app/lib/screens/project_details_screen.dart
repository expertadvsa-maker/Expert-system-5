import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../services/server_api_service.dart';

class ProjectDetailsScreen extends StatefulWidget {
  final String projectId;
  final Map<String, dynamic> initialData;

  const ProjectDetailsScreen({
    Key? key,
    required this.projectId,
    required this.initialData,
  }) : super(key: key);

  @override
  _ProjectDetailsScreenState createState() => _ProjectDetailsScreenState();
}

class _ProjectDetailsScreenState extends State<ProjectDetailsScreen> with SingleTickerProviderStateMixin {
  final ServerApiService _apiService = ServerApiService();
  late TabController _tabController;
  final TextEditingController _chatController = TextEditingController();
  final TextEditingController _clientChatController = TextEditingController();
  final TextEditingController _handoverTextController = TextEditingController();
  final TextEditingController _maintenanceRequestController = TextEditingController();
  int _clientRating = 5;
  bool _isSavingHandover = false;
  String _chatSubTab = 'team';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 7, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _chatController.dispose();
    _clientChatController.dispose();
    _handoverTextController.dispose();
    _maintenanceRequestController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('projects').doc(widget.projectId).snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const Scaffold(body: Center(child: Text('حدث خطأ في تحميل البيانات')));
        }
        
        final data = (snapshot.hasData && snapshot.data!.exists) 
            ? snapshot.data!.data() as Map<String, dynamic> 
            : widget.initialData;

        final title = data['title'] ?? 'مشروع بدون اسم';
        final progress = double.tryParse(data['progress']?.toString() ?? '0') ?? 0.0;

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            centerTitle: true,
            iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
            title: Text(
              title,
              style: GoogleFonts.cairo(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF0F172A),
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: const Color(0xFF2C7A7D),
              unselectedLabelColor: Colors.grey[500],
              indicatorColor: const Color(0xFF2C7A7D),
              labelStyle: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13),
              unselectedLabelStyle: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: const [
                Tab(icon: Icon(Icons.dashboard_outlined, size: 20), text: 'نظرة عامة'),
                Tab(icon: Icon(Icons.layers_outlined, size: 20), text: 'المراحل'),
                Tab(icon: Icon(Icons.group_outlined, size: 20), text: 'الفريق'),
                Tab(icon: Icon(Icons.attach_money_outlined, size: 20), text: 'الحسابات'),
                Tab(icon: Icon(Icons.folder_outlined, size: 20), text: 'التوثيق'),
                Tab(icon: Icon(Icons.chat_bubble_outline, size: 20), text: 'تواصل'),
                Tab(icon: Icon(Icons.verified_outlined, size: 20), text: 'التسليم'),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildOverviewTab(data, progress),
              _buildMilestonesTab(data),
              _buildTeamTab(data),
              _buildFinancialsTab(data),
              _buildMonitoringTab(data),
              _buildChatTab(data),
              _buildHandoverTab(data),
            ],
          ),
        );
      },
    );
  }

  // ==================== 1. OVERVIEW TAB ====================
  Widget _buildOverviewTab(Map<String, dynamic> data, double progress) {
    final clientName = data['clientName'] ?? 'غير محدد';
    final supervisor = data['supervisor'] ?? 'غير محدد';
    final budget = double.tryParse(data['contractValue']?.toString() ?? data['budget']?.toString() ?? '0') ?? 0.0;
    
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('transactions').where('projectId', isEqualTo: widget.projectId).snapshots(),
      builder: (context, txSnapshot) {
        double expenses = 0.0;
        double paidIncomes = 0.0;
        
        if (txSnapshot.hasData) {
          for (var doc in txSnapshot.data!.docs) {
            final tData = doc.data() as Map<String, dynamic>;
            final tAmt = double.tryParse(tData['amount']?.toString() ?? '0') ?? 0.0;
            if (tData['type'] == 'expense' || tData['type'] == 'purchase') {
              expenses += tAmt;
            } else if (tData['type'] == 'income') {
              paidIncomes += tAmt;
            }
          }
        }

        final margin = budget > 0 ? ((budget - expenses) / budget) * 100 : 0.0;
        final balance = budget - paidIncomes;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // كرت الإنجاز
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2C7A7D), Color(0xFF1F5C5E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF2C7A7D).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 5)),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('نسبة الإنجاز الكلية', style: GoogleFonts.cairo(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                        Text('${progress.toInt()}%', style: GoogleFonts.cairo(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: progress / 100,
                        backgroundColor: Colors.white.withOpacity(0.2),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFBBF24)),
                        minHeight: 8,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Text('المعلومات الأساسية', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    _buildDetailRow(Icons.person, 'العميل', clientName),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.engineering, 'المشرف الميداني', supervisor),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.calendar_month, 'تاريخ الاستلام', _formatDate(data['startDate'] ?? data['createdAt'])),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Text('بوابة العميل والاتصال الجغرافي', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.withOpacity(0.1)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildDetailRow(Icons.person_pin, 'العميل المربوط', clientName),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.phone, 'رقم العميل', data['clientPhone'] ?? 'بدون رقم'),
                    if (data['clientPin'] != null) ...[
                      const Divider(height: 24),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.lock, size: 16, color: Color(0xFFD97706)),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('رمز الوصول للعميل (PIN)', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[600], fontWeight: FontWeight.bold)),
                              Text(data['clientPin'].toString(), style: GoogleFonts.cairo(fontSize: 13, color: const Color(0xFF0F172A), fontWeight: FontWeight.w900, letterSpacing: 2)),
                            ],
                          ),
                          const Spacer(),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFFFFBEB),
                              elevation: 0,
                              side: const BorderSide(color: Color(0xFFFDE68A)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              minimumSize: Size.zero,
                            ),
                            onPressed: () {
                              final textToCopy = 'مرحباً،\nيمكنك متابعة مشروعك عبر الرابط:\nhttps://expert-system-5.web.app/?clientPortal=true&projectId=${widget.projectId}\nرمز الوصول الخاص بك: ${data['clientPin']}';
                              Clipboard.setData(ClipboardData(text: textToCopy));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('✅ تم نسخ بيانات وصول العميل لمشاركتها', style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF2C7A7D))
                              );
                            },
                            child: Text('نسخ للتعميم', style: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFFB45309))),
                          ),
                        ],
                      ),
                    ],
                    const Divider(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () async {
                              final link = data['locationLink']?.toString() ?? '';
                              if (link.isNotEmpty) {
                                final uri = Uri.parse(link);
                                if (await canLaunchUrl(uri)) {
                                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('تعذر فتح رابط الموقع: $link', style: GoogleFonts.cairo()))
                                  );
                                }
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('⚠️ لا يوجد رابط موقع جغرافي مضاف لهذا المشروع', style: GoogleFonts.cairo()))
                                );
                              }
                            },
                            icon: const Icon(Icons.map_outlined, size: 16, color: Colors.white),
                            label: Text('تحديد الموقع على الخريطة', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.grey[100],
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.all(12),
                          ),
                          icon: const Icon(Icons.phone_in_talk, color: Color(0xFF0F172A), size: 18),
                          onPressed: () async {
                            final phone = data['clientPhone']?.toString() ?? '';
                            if (phone.isNotEmpty) {
                              final uri = Uri.parse('tel:$phone');
                              if (await canLaunchUrl(uri)) {
                                await launchUrl(uri);
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('تعذر إجراء الاتصال بالرقم: $phone', style: GoogleFonts.cairo()))
                                );
                              }
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('⚠️ لا يوجد هاتف للعميل', style: GoogleFonts.cairo()))
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              
              Text('الإحصائيات المالية', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    _buildDetailRow(Icons.account_balance_wallet, 'قيمة العقد المعتمدة', '${budget.toStringAsFixed(0)} ر.س'),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.payments, 'المدفوع من العميل', '${paidIncomes.toStringAsFixed(0)} ر.س', color: Colors.green),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.money_off, 'المتبقي', '${balance.toStringAsFixed(0)} ر.س', color: Colors.orange),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.trending_down, 'المصروفات والتكاليف', '${expenses.toStringAsFixed(0)} ر.س', color: Colors.red),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.pie_chart, 'صافي الربح المتوقع', '${(budget - expenses).toStringAsFixed(0)} ر.س', color: margin > 20 ? Colors.green : Colors.orange),
                  ],
                ),
              ),
            ],
          ),
        );
      }
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value, {Color? color}) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 16, color: const Color(0xFF64748B)),
        ),
        const SizedBox(width: 12),
        Text(label, style: GoogleFonts.cairo(fontSize: 12, color: Colors.grey[600], fontWeight: FontWeight.bold)),
        const Spacer(),
        Text(value, style: GoogleFonts.cairo(fontSize: 12, color: color ?? const Color(0xFF0F172A), fontWeight: FontWeight.w900)),
      ],
    );
  }

  // ==================== 2. MILESTONES TAB ====================
  int _calculateProjectProgress(List<dynamic> milestones) {
    if (milestones.isEmpty) return 0;
    double totalWeight = 0;
    double completedWeight = 0;
    for (var m in milestones) {
      final weight = double.tryParse(m['weight']?.toString() ?? '0') ?? 0.0;
      totalWeight += weight;
      final status = m['status'] ?? 'pending';
      if (status == 'completed') {
        completedWeight += weight;
      } else if (status == 'in-progress' || status == 'review-requested') {
        completedWeight += (weight * 0.5);
      }
    }
    if (totalWeight == 0) return 0;
    return ((completedWeight / totalWeight) * 100).round();
  }

  Future<void> _toggleMilestone(List<dynamic> milestones, int index) async {
    final List<Map<String, dynamic>> updatedMilestones = List.from(
      milestones.map((m) => Map<String, dynamic>.from(m as Map))
    );
    final isCompleted = updatedMilestones[index]['status'] == 'completed';
    updatedMilestones[index]['status'] = isCompleted ? 'pending' : 'completed';
    updatedMilestones[index]['date'] = DateTime.now().toIso8601String();
    
    final newProgress = _calculateProjectProgress(updatedMilestones);
    final allCompleted = updatedMilestones.isNotEmpty && updatedMilestones.every((m) => m['status'] == 'completed');
    final nextStatus = allCompleted ? 'completed' : 'active';

    await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).update({
      'milestones': updatedMilestones,
      'progress': newProgress,
      'status': nextStatus,
    });
  }

  Future<void> _deleteMilestone(List<dynamic> milestones, int index) async {
    final List<Map<String, dynamic>> updatedMilestones = List.from(
      milestones.map((m) => Map<String, dynamic>.from(m as Map))
    );
    updatedMilestones.removeAt(index);
    
    final newProgress = _calculateProjectProgress(updatedMilestones);
    final allCompleted = updatedMilestones.isNotEmpty && updatedMilestones.every((m) => m['status'] == 'completed');
    final nextStatus = allCompleted ? 'completed' : 'active';

    await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).update({
      'milestones': updatedMilestones,
      'progress': newProgress,
      'status': nextStatus,
    });
  }

  Future<void> _showAddMilestoneDialog(BuildContext context, List<dynamic> milestones, List<Map<String, dynamic>> workers) async {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final weightCtrl = TextEditingController(text: '10');
    DateTime? selectedDate;
    String? selectedWorkerId;

    await showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return Directionality(
              textDirection: TextDirection.rtl,
              child: AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                title: Text(
                  'إضافة مرحلة تشغيلية جديدة',
                  style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 16),
                ),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: titleCtrl,
                        style: GoogleFonts.cairo(fontSize: 12),
                        decoration: InputDecoration(
                          labelText: 'اسم المرحلة *',
                          labelStyle: GoogleFonts.cairo(fontSize: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: descCtrl,
                        maxLines: 2,
                        style: GoogleFonts.cairo(fontSize: 12),
                        decoration: InputDecoration(
                          labelText: 'وصف المرحلة',
                          labelStyle: GoogleFonts.cairo(fontSize: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: weightCtrl,
                        keyboardType: TextInputType.number,
                        style: GoogleFonts.cairo(fontSize: 12),
                        decoration: InputDecoration(
                          labelText: 'الوزن النسبي (%) *',
                          labelStyle: GoogleFonts.cairo(fontSize: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: DateTime.now(),
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) {
                            setDialogState(() {
                              selectedDate = picked;
                            });
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 15),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                selectedDate == null
                                    ? 'تحديد تاريخ الاستحقاق المخطط'
                                    : '${selectedDate!.year}-${selectedDate!.month.toString().padLeft(2, '0')}-${selectedDate!.day.toString().padLeft(2, '0')}',
                                style: GoogleFonts.cairo(fontSize: 12, color: selectedDate == null ? Colors.grey[600] : Colors.black),
                              ),
                              const Icon(Icons.calendar_month, color: Color(0xFF2C7A7D)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedWorkerId,
                        style: GoogleFonts.cairo(fontSize: 12, color: Colors.black),
                        decoration: InputDecoration(
                          labelText: 'تعيين عامل/فني مسؤول',
                          labelStyle: GoogleFonts.cairo(fontSize: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: [
                          DropdownMenuItem<String>(
                            value: null,
                            child: Text('-- بدون تعيين --', style: GoogleFonts.cairo(fontSize: 12)),
                          ),
                          ...workers.map((w) => DropdownMenuItem<String>(
                                value: w['id'],
                                child: Text(w['name'] ?? '', style: GoogleFonts.cairo(fontSize: 12)),
                              )),
                        ],
                        onChanged: (val) {
                          setDialogState(() {
                            selectedWorkerId = val;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: Text('إلغاء', style: GoogleFonts.cairo(color: Colors.grey)),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2C7A7D),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () async {
                      if (titleCtrl.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('يرجى إدخال اسم المرحلة', style: GoogleFonts.cairo()), backgroundColor: Colors.red),
                        );
                        return;
                      }
                      final weight = int.tryParse(weightCtrl.text.trim()) ?? 10;
                      if (weight <= 0) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('الوزن يجب أن يكون قيمة موجبة أكبر من صفر', style: GoogleFonts.cairo()), backgroundColor: Colors.red),
                        );
                        return;
                      }

                      final newMilestone = {
                        'title': titleCtrl.text.trim(),
                        'description': descCtrl.text.trim(),
                        'weight': weight,
                        'status': 'pending',
                        'date': DateTime.now().toIso8601String(),
                        'dueDate': selectedDate?.toIso8601String() ?? '',
                        'assignedWorkerId': selectedWorkerId ?? '',
                      };

                      final List<dynamic> updatedMilestones = List.from(milestones);
                      updatedMilestones.add(newMilestone);

                      final newProgress = _calculateProjectProgress(updatedMilestones);
                      final allCompleted = updatedMilestones.isNotEmpty && updatedMilestones.every((m) => m['status'] == 'completed');
                      final nextStatus = allCompleted ? 'completed' : 'active';

                      await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).update({
                        'milestones': updatedMilestones,
                        'progress': newProgress,
                        'status': nextStatus,
                      });

                      if (dialogContext.mounted) Navigator.pop(dialogContext);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('✅ تم إضافة المرحلة بنجاح', style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF2C7A7D)),
                      );
                    },
                    child: Text('حفظ وإضافة', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMilestonesTab(Map<String, dynamic> data) {
    final milestones = data['milestones'] as List<dynamic>? ?? [];
    
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('workers').snapshots(),
      builder: (context, workerSnapshot) {
        Map<String, String> workerNames = {};
        List<Map<String, dynamic>> workersList = [];
        if (workerSnapshot.hasData) {
          for (var doc in workerSnapshot.data!.docs) {
            final wData = doc.data() as Map<String, dynamic>;
            final wId = doc.id;
            final wName = wData['name'] ?? 'فني';
            workerNames[wId] = wName;
            workersList.add({'id': wId, 'name': wName, ...wData});
          }
        }

        final int totalWeight = milestones.fold(0, (sum, m) => sum + (int.tryParse(m['weight']?.toString() ?? '0') ?? 0));

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.withOpacity(0.1)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('إجمالي الأوزان:', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.grey[600])),
                          Text('$totalWeight%', style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 13, color: const Color(0xFF0F172A))),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: () => _showAddMilestoneDialog(context, milestones, workersList),
                    icon: const Icon(Icons.add, size: 16, color: Colors.white),
                    label: Text('إضافة مرحلة', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2C7A7D),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: milestones.isEmpty
                  ? _buildEmptyState('لا توجد مراحل مسجلة لهذا المشروع', Icons.format_list_bulleted)
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      physics: const BouncingScrollPhysics(),
                      itemCount: milestones.length,
                      itemBuilder: (context, index) {
                        final milestone = milestones[index] as Map<String, dynamic>;
                        final String mTitle = milestone['title'] ?? 'مرحلة غير مسماة';
                        final String mDesc = milestone['description'] ?? '';
                        final int mWeight = int.tryParse(milestone['weight']?.toString() ?? '10') ?? 10;
                        final String mDueDate = milestone['dueDate'] ?? '';
                        final String assignedWorkerId = milestone['assignedWorkerId'] ?? '';
                        final isCompleted = milestone['status'] == 'completed';
                        final workerName = workerNames[assignedWorkerId] ?? '';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: isCompleted ? Colors.green.withOpacity(0.3) : Colors.grey.withOpacity(0.1)),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2)),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 28,
                                    height: 28,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: isCompleted ? const Color(0xFFD1FAE5) : const Color(0xFFF1F5F9),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Text(
                                      '${index + 1}',
                                      style: GoogleFonts.cairo(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w900,
                                        color: isCompleted ? const Color(0xFF065F46) : const Color(0xFF475569),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          mTitle,
                                          style: GoogleFonts.cairo(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w900,
                                            color: const Color(0xFF0F172A),
                                            decoration: isCompleted ? TextDecoration.lineThrough : null,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 8,
                                          runSpacing: 4,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF8FAFC),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text('الوزن: $mWeight%', style: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF475569))),
                                            ),
                                            if (mDueDate.isNotEmpty)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFF8FAFC),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    const Icon(Icons.access_time, size: 10, color: Colors.grey),
                                                    const SizedBox(width: 4),
                                                    Text('مخطط: ${_formatDate(mDueDate)}', style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[600], fontWeight: FontWeight.bold)),
                                                  ],
                                                ),
                                              ),
                                            if (workerName.isNotEmpty)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFECFDF5),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    const Icon(Icons.person_outline, size: 10, color: Colors.green),
                                                    const SizedBox(width: 4),
                                                    Text('المعين: $workerName', style: GoogleFonts.cairo(fontSize: 9, color: const Color(0xFF047857), fontWeight: FontWeight.bold)),
                                                  ],
                                                ),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              if (mDesc.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                Container(
                                  padding: const EdgeInsets.only(right: 8),
                                  decoration: const BoxDecoration(
                                    border: Border(right: BorderSide(color: Color(0xFFE2E8F0), width: 2)),
                                  ),
                                  child: Text(
                                    mDesc,
                                    style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF64748B), height: 1.4),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                    onPressed: () => _deleteMilestone(milestones, index),
                                  ),
                                  const SizedBox(width: 10),
                                  ElevatedButton.icon(
                                    onPressed: () => _toggleMilestone(milestones, index),
                                    icon: Icon(
                                      isCompleted ? Icons.check_circle_outline : Icons.radio_button_unchecked,
                                      size: 14,
                                      color: isCompleted ? Colors.white : const Color(0xFF0F172A),
                                    ),
                                    label: Text(
                                      isCompleted ? 'مكتملة معتمدة' : 'اعتماد المرحلة',
                                      style: GoogleFonts.cairo(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isCompleted ? Colors.white : const Color(0xFF0F172A),
                                      ),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isCompleted ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  // ==================== 3. TEAM TAB ====================
  Widget _buildTeamTab(Map<String, dynamic> data) {
    final workerIds = List<String>.from(data['workerIds'] ?? []);

    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('workers').snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        
        final allWorkers = snapshot.data!.docs;
        final projectWorkers = allWorkers.where((w) => workerIds.contains(w.id)).toList();

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: ElevatedButton.icon(
                onPressed: () => _showAddWorkerSheet(context, workerIds),
                icon: const Icon(Icons.add, size: 18),
                label: Text('إضافة فرد للفريق', style: GoogleFonts.cairo(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2C7A7D),
                  minimumSize: const Size(double.infinity, 45),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            if (projectWorkers.isEmpty)
              Expanded(child: _buildEmptyState('لم يتم تعيين عمال للمشروع', Icons.group_off)),
            if (projectWorkers.isNotEmpty)
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: projectWorkers.length,
                  itemBuilder: (context, index) {
                    final worker = projectWorkers[index].data() as Map<String, dynamic>;
                    return Card(
                      elevation: 0,
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF2C7A7D).withOpacity(0.1),
                          child: const Icon(Icons.person, color: Color(0xFF2C7A7D)),
                        ),
                        title: Text(worker['name'] ?? '', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text(worker['role'] ?? 'عامل يومية', style: GoogleFonts.cairo(fontSize: 11)),
                        trailing: IconButton(
                          icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                          onPressed: () async {
                            await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).update({
                              'workerIds': FieldValue.arrayRemove([projectWorkers[index].id])
                            });
                          },
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        );
      }
    );
  }

  // ==================== 4. FINANCIALS TAB ====================
  Widget _buildFinancialsTab(Map<String, dynamic> data) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('transactions')
          .where('projectId', isEqualTo: widget.projectId)
          .snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        
        var docs = snapshot.data!.docs;
        docs.sort((a, b) {
          final aTime = _parseDateTime((a.data() as Map<String, dynamic>)['createdAt'] ?? (a.data() as Map<String, dynamic>)['date']);
          final bTime = _parseDateTime((b.data() as Map<String, dynamic>)['createdAt'] ?? (b.data() as Map<String, dynamic>)['date']);
          return bTime.compareTo(aTime);
        });

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _showAddTransactionDialog(context, widget.projectId, 'income'),
                      icon: const Icon(Icons.add, size: 16),
                      label: Text('دفعة عميل', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _showAddTransactionDialog(context, widget.projectId, 'expense'),
                      icon: const Icon(Icons.remove, size: 16),
                      label: Text('تسجيل مصروف', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: docs.isEmpty
                  ? _buildEmptyState('لا توجد حركات مالية مسجلة', Icons.receipt_long)
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      physics: const BouncingScrollPhysics(),
                      itemCount: docs.length,
                      itemBuilder: (context, index) {
                        final data = docs[index].data() as Map<String, dynamic>;
                        final amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
                        final type = data['type'] ?? 'expense';
                        final desc = data['description'] ?? 'حركة مالية';
                        final date = _formatDate(data['date'] ?? data['createdAt']);
                        final isIncome = type == 'income';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.withOpacity(0.05)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: isIncome ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isIncome ? Icons.trending_up : Icons.trending_down,
                                  color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                  size: 16,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(desc, style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
                                    Text(date, style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[400])),
                                  ],
                                ),
                              ),
                              Text(
                                (isIncome ? '+' : '-') + '${amount.toStringAsFixed(0)} ر.س',
                                style: GoogleFonts.cairo(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  // ==================== 5. MONITORING & DOCS TAB ====================
  Widget _buildMonitoringTab(Map<String, dynamic> data) {
    final photoUrls = List<String>.from(data['photoUrls'] ?? []);
    final fileAttachments = List<dynamic>.from(data['fileAttachments'] ?? []);

    if (photoUrls.isEmpty && fileAttachments.isEmpty) {
      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: ElevatedButton.icon(
              onPressed: _pickAndUploadImage,
              icon: const Icon(Icons.upload_file),
              label: Text('رفع ملفات أو صور', style: GoogleFonts.cairo(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2C7A7D), minimumSize: const Size(double.infinity, 45)),
            ),
          ),
          Expanded(child: _buildEmptyState('لا توجد ملفات أو صور مرفقة', Icons.folder_open)),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ElevatedButton.icon(
          onPressed: _pickAndUploadImage,
          icon: const Icon(Icons.upload_file),
          label: Text('رفع ملفات أو صور', style: GoogleFonts.cairo(fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2C7A7D), minimumSize: const Size(double.infinity, 45)),
        ),
        const SizedBox(height: 20),
        if (photoUrls.isNotEmpty) ...[
          Text('الصور المرفقة', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10),
            itemCount: photoUrls.length,
            itemBuilder: (context, index) {
              return ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: _buildImageWidget(photoUrls[index]),
              );
            },
          ),
          const SizedBox(height: 20),
        ],
        if (fileAttachments.isNotEmpty) ...[
          Text('المستندات', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 10),
          ...fileAttachments.map((f) => Card(
            child: ListTile(
              leading: const Icon(Icons.picture_as_pdf, color: Colors.red),
              title: Text(f['name'] ?? 'مستند', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold)),
              subtitle: Text(f['uploadedAt'] ?? '', style: GoogleFonts.cairo(fontSize: 10)),
              trailing: const Icon(Icons.download, size: 18),
            ),
          )).toList()
        ]
      ],
    );
  }

  Widget _buildImageWidget(String urlOrBase64) {
    if (urlOrBase64.startsWith('data:image/') && urlOrBase64.contains(';base64,')) {
      try {
        final base64Str = urlOrBase64.split(';base64,')[1];
        final bytes = base64.decode(base64Str);
        return Image.memory(bytes, fit: BoxFit.cover);
      } catch (e) {
        return const Center(child: Icon(Icons.broken_image, color: Colors.red));
      }
    } else if (urlOrBase64.startsWith('http')) {
      return Image.network(
        urlOrBase64,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => const Center(child: Icon(Icons.broken_image, color: Colors.grey)),
      );
    } else {
      try {
        final bytes = base64.decode(urlOrBase64);
        return Image.memory(bytes, fit: BoxFit.cover);
      } catch (e) {
        return const Center(child: Icon(Icons.broken_image, color: Colors.grey));
      }
    }
  }

  // ==================== 6. CHAT TAB ====================
  Future<bool> _sendWhatsappMessage(String phone, String message) async {
    try {
      final snap = await FirebaseFirestore.instance.collection('system').doc('settings').get();
      if (!snap.exists) return false;
      final data = snap.data();
      final waSettings = data?['whatsappSettings'] as Map<String, dynamic>?;
      if (waSettings == null || waSettings['enabled'] != true || phone.isEmpty) return false;

      final formattedPhone = phone.replaceAll(RegExp(r'\D'), '');
      if (formattedPhone.length < 9) return false;

      final String provider = waSettings['provider'] ?? '';
      final String apiUrl = waSettings['apiUrl'] ?? '';
      final String instanceId = waSettings['instanceId'] ?? '';
      final String token = waSettings['token'] ?? '';
      final String senderName = waSettings['senderName'] ?? 'النظام الآلي';

      final fullMessage = '$message\n\n― $senderName';

      if (provider == 'greenapi') {
        final url = Uri.parse('$apiUrl/waInstance$instanceId/sendMessage/$token');
        await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'chatId': '$formattedPhone@c.us',
            'message': fullMessage,
          }),
        );
      } else if (provider == 'evolution') {
        final url = Uri.parse('$apiUrl/message/sendText/$instanceId');
        await http.post(
          url,
          headers: {
            'Content-Type': 'application/json',
            'apikey': token,
          },
          body: jsonEncode({
            'number': formattedPhone,
            'text': fullMessage,
          }),
        );
      } else if (provider == 'ultramsg') {
        final url = Uri.parse('$apiUrl/$instanceId/messages/chat');
        await http.post(
          url,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: {
            'token': token,
            'to': formattedPhone,
            'body': fullMessage,
          },
        );
      } else {
        final prefs = await SharedPreferences.getInstance();
        final baseUrl = prefs.getString('baseUrl') ?? 'http://192.168.1.6:3000';
        final url = Uri.parse('$baseUrl/api/whatsapp/send');
        await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'phone': formattedPhone, 'message': fullMessage}),
        );
      }
      return true;
    } catch (e) {
      print('WhatsApp send failed in Dart: $e');
      return false;
    }
  }

  Future<void> _showMeetingDialog(BuildContext context, Map<String, dynamic> projectData, List<Map<String, dynamic>> workers) async {
    final List<String> selectedParticipants = [];
    final clientName = projectData['clientName'] ?? '';
    final clientPhone = projectData['clientPhone'] ?? '';

    if (clientName.isNotEmpty) selectedParticipants.add('client_id');
    for (var w in workers) {
      selectedParticipants.add(w['id']);
    }

    await showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return Directionality(
              textDirection: TextDirection.rtl,
              child: AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                title: Text(
                  'إعداد وبدء اجتماع فيديو',
                  style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 16),
                ),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'حدد المشاركين المدعوين للاجتماع:',
                        style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 12),
                      if (clientName.isNotEmpty)
                        CheckboxListTile(
                          title: Text('$clientName (العميل) ⭐', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold)),
                          value: selectedParticipants.contains('client_id'),
                          activeColor: const Color(0xFF2C7A7D),
                          onChanged: (val) {
                            setDialogState(() {
                              if (val == true) {
                                selectedParticipants.add('client_id');
                              } else {
                                selectedParticipants.remove('client_id');
                              }
                            });
                          },
                        ),
                      ...workers.map((w) {
                        final wId = w['id'];
                        final wName = w['name'] ?? '';
                        final wRole = w['role'] ?? 'فني';
                        return CheckboxListTile(
                          title: Text(wName, style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold)),
                          subtitle: Text(wRole, style: GoogleFonts.cairo(fontSize: 10)),
                          value: selectedParticipants.contains(wId),
                          activeColor: const Color(0xFF2C7A7D),
                          onChanged: (val) {
                            setDialogState(() {
                              if (val == true) {
                                selectedParticipants.add(wId);
                              } else {
                                selectedParticipants.remove(wId);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: Text('إلغاء', style: GoogleFonts.cairo(color: Colors.grey)),
                  ),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.video_call, color: Colors.white, size: 16),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () async {
                      if (selectedParticipants.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('⚠️ يرجى اختيار مشارك واحد على الأقل', style: GoogleFonts.cairo()), backgroundColor: Colors.red),
                        );
                        return;
                      }

                      final roomName = 'expert-meet-${widget.projectId}-${DateTime.now().millisecondsSinceEpoch}';
                      final meetingUrl = 'https://meet.jit.si/$roomName';
                      final uInfo = await _getCurrentUserData();

                      await FirebaseFirestore.instance.collection('projectUpdates').add({
                        'projectId': widget.projectId,
                        'content': 'تم بدء اجتماع فيديو الآن عبر النظام بواسطة ${uInfo['name']}. يرجى الانضمام: $meetingUrl',
                        'createdAt': DateTime.now().toIso8601String(),
                        'authorId': uInfo['id'] ?? 'system',
                        'authorName': uInfo['name'] ?? 'النظام',
                      });

                      int sentCount = 0;
                      final String projectTitle = projectData['title'] ?? 'المشروع';
                      final meetingMessage = 'دعوة اجتماع فيديو من مشروع ($projectTitle)\n\nيدعوك ${uInfo['name']} للانضمام إلى اجتماع فيديو قيد الانعقاد الآن.\nارتباط الاجتماع للبدء:\n$meetingUrl';

                      for (final pId in selectedParticipants) {
                        String phoneToSend = '';
                        if (pId == 'client_id' && clientPhone.isNotEmpty) {
                          phoneToSend = clientPhone;
                        } else {
                          final w = workers.firstWhere((x) => x['id'] == pId, orElse: () => {});
                          if (w.isNotEmpty) {
                            phoneToSend = w['phone']?.toString() ?? '';
                          }
                        }

                        if (phoneToSend.isNotEmpty) {
                          final success = await _sendWhatsappMessage(phoneToSend, meetingMessage);
                          if (success) sentCount++;
                        }
                      }

                      if (dialogContext.mounted) Navigator.pop(dialogContext);

                      final uri = Uri.parse(meetingUrl);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }

                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('✅ تم بدء الاجتماع وتم إرسال دعوات الواتساب لـ $sentCount من المشاركين', style: GoogleFonts.cairo()),
                          backgroundColor: const Color(0xFF2C7A7D),
                        ),
                      );
                    },
                    label: Text('بدء الاجتماع وإرسال الدعوات', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildChatTab(Map<String, dynamic> projectData) {
    final clientName = projectData['clientName'] ?? 'العميل';
    final clientPhone = projectData['clientPhone'] ?? '';
    final clientEmail = projectData['clientEmail'] ?? '';
    final clientRating = projectData['clientRating'] ?? 0;

    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('workers').snapshots(),
      builder: (context, workerSnapshot) {
        List<Map<String, dynamic>> workersList = [];
        if (workerSnapshot.hasData) {
          for (var doc in workerSnapshot.data!.docs) {
            final wData = doc.data() as Map<String, dynamic>;
            workersList.add({'id': doc.id, ...wData});
          }
        }

        final projectWorkers = workersList.where((w) {
          final workerIds = List<String>.from(projectData['workerIds'] ?? []);
          return workerIds.contains(w['id']);
        }).toList();

        return Column(
          children: [
            Container(
              color: Colors.white,
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _chatSubTab = 'team'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(color: _chatSubTab == 'team' ? const Color(0xFF2C7A7D) : Colors.transparent, width: 2.5)),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'تواصل الفريق الفني',
                          style: GoogleFonts.cairo(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: _chatSubTab == 'team' ? const Color(0xFF2C7A7D) : Colors.grey[500],
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _chatSubTab = 'client'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(color: _chatSubTab == 'client' ? const Color(0xFF2C7A7D) : Colors.transparent, width: 2.5)),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'مراسلة العميل (خاصة)',
                          style: GoogleFonts.cairo(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: _chatSubTab == 'client' ? const Color(0xFF2C7A7D) : Colors.grey[500],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: Colors.grey.withOpacity(0.1))),
              ),
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('تقييم العميل:', style: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey[600])),
                      Row(
                        children: List.generate(5, (index) {
                          final star = index + 1;
                          return InkWell(
                            onTap: () async {
                              try {
                                await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).update({
                                  'clientRating': star,
                                });
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('✅ تم تحديث تقييم العميل', style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF2C7A7D))
                                );
                              } catch (e) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('❌ حدث خطأ في التحديث', style: GoogleFonts.cairo()))
                                );
                              }
                            },
                            child: Icon(
                              Icons.star,
                              size: 16,
                              color: star <= clientRating ? const Color(0xFFFBBF24) : Colors.grey[300],
                            ),
                          );
                        }),
                      ),
                    ],
                  ),
                  const Spacer(),
                  IconButton(
                    style: IconButton.styleFrom(backgroundColor: const Color(0xFFEFF6FF), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                    icon: const Icon(Icons.video_call, color: Color(0xFF2563EB), size: 18),
                    tooltip: 'بدء اجتماع فيديو',
                    onPressed: () => _showMeetingDialog(context, projectData, projectWorkers),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    style: IconButton.styleFrom(backgroundColor: const Color(0xFFECFDF5), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                    icon: const Icon(Icons.chat_bubble_outline, color: Color(0xFF10B981), size: 18),
                    tooltip: 'مراسلة واتساب',
                    onPressed: () async {
                      if (clientPhone.isNotEmpty) {
                        final cleanPhone = clientPhone.replaceAll(RegExp(r'\D'), '');
                        final url = 'https://wa.me/$cleanPhone';
                        final uri = Uri.parse(url);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('تعذر فتح واتساب', style: GoogleFonts.cairo()))
                          );
                        }
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('⚠️ لا يوجد هاتف للعميل', style: GoogleFonts.cairo()))
                        );
                      }
                    },
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    style: IconButton.styleFrom(backgroundColor: const Color(0xFFFEF2F2), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                    icon: const Icon(Icons.mail_outline, color: Color(0xFFEF4444), size: 18),
                    tooltip: 'بريد إلكتروني',
                    onPressed: () async {
                      final email = clientEmail.isNotEmpty ? clientEmail : 'hello@example.com';
                      final url = 'mailto:$email';
                      final uri = Uri.parse(url);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri);
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('تعذر فتح تطبيق البريد', style: GoogleFonts.cairo()))
                        );
                      }
                    },
                  ),
                ],
              ),
            ),

            Expanded(
              child: _chatSubTab == 'team'
                  ? _buildTeamUpdatesList()
                  : _buildClientPrivateChatList(),
            ),

            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5))],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _chatSubTab == 'team' ? _chatController : _clientChatController,
                      decoration: InputDecoration(
                        hintText: _chatSubTab == 'team' ? 'أرسل تحديثاً للمشروع...' : 'اكتب رسالة خاصة للعميل...',
                        hintStyle: GoogleFonts.cairo(fontSize: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                        filled: true,
                        fillColor: Colors.grey[100],
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: _chatSubTab == 'team' ? const Color(0xFF2C7A7D) : const Color(0xFFD97706),
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 18),
                      onPressed: () async {
                        final controller = _chatSubTab == 'team' ? _chatController : _clientChatController;
                        if (controller.text.trim().isEmpty) return;
                        final text = controller.text.trim();
                        controller.clear();
                        final uInfo = await _getCurrentUserData();

                        if (_chatSubTab == 'team') {
                          await FirebaseFirestore.instance.collection('projectUpdates').add({
                            'projectId': widget.projectId,
                            'content': text,
                            'createdAt': DateTime.now().toIso8601String(),
                            'authorId': uInfo['id'] ?? 'system',
                            'authorName': uInfo['name'] ?? 'الجوال',
                          });
                        } else {
                          await FirebaseFirestore.instance
                              .collection('projects')
                              .doc(widget.projectId)
                              .collection('clientChats')
                              .add({
                            'text': text,
                            'createdAt': FieldValue.serverTimestamp(),
                            'senderName': uInfo['name'] ?? 'الجوال',
                            'senderId': uInfo['id'] ?? 'system',
                            'senderRole': 'manager',
                          });

                          await FirebaseFirestore.instance.collection('projectUpdates').add({
                            'projectId': widget.projectId,
                            'content': 'قام ${uInfo['name']} بإرسال رسالة مباشرة للعميل.',
                            'createdAt': DateTime.now().toIso8601String(),
                            'authorId': uInfo['id'] ?? 'system',
                            'authorName': uInfo['name'] ?? 'النظام',
                          });

                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('✅ تم إرسال الرسالة بنجاح عبر النظام للعميل 💬', style: GoogleFonts.cairo()),
                              backgroundColor: const Color(0xFF2C7A7D),
                            ),
                          );
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTeamUpdatesList() {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('projectUpdates')
          .where('projectId', isEqualTo: widget.projectId)
          .snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        var docs = snapshot.data!.docs;
        docs.sort((a, b) {
          final aTime = _parseDateTime((a.data() as Map<String, dynamic>)['createdAt']);
          final bTime = _parseDateTime((b.data() as Map<String, dynamic>)['createdAt']);
          return aTime.compareTo(bTime);
        });

        if (docs.isEmpty) return _buildEmptyState('لا توجد تحديثات سابقة للفريق', Icons.chat_bubble_outline);

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: docs.length,
          itemBuilder: (context, index) {
            final data = docs[index].data() as Map<String, dynamic>;
            final isMe = data['authorId'] == FirebaseAuth.instance.currentUser?.uid;

            return Align(
              alignment: isMe ? Alignment.centerLeft : Alignment.centerRight,
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isMe ? const Color(0xFF2C7A7D) : Colors.white,
                  borderRadius: BorderRadius.circular(16).copyWith(
                    bottomLeft: isMe ? const Radius.circular(0) : null,
                    bottomRight: !isMe ? const Radius.circular(0) : null,
                  ),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 5, offset: const Offset(0, 2))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (!isMe)
                      Text(data['authorName'] ?? 'مستخدم', style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue)),
                    Text(data['content'] ?? '', style: GoogleFonts.cairo(color: isMe ? Colors.white : Colors.black87, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(_formatDate(data['createdAt']), style: GoogleFonts.cairo(fontSize: 8, color: isMe ? Colors.white70 : Colors.grey)),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildClientPrivateChatList() {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('projects')
          .doc(widget.projectId)
          .collection('clientChats')
          .snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        var docs = snapshot.data!.docs;
        docs.sort((a, b) {
          final aTime = _parseDateTime((a.data() as Map<String, dynamic>)['createdAt']);
          final bTime = _parseDateTime((b.data() as Map<String, dynamic>)['createdAt']);
          return aTime.compareTo(bTime);
        });

        if (docs.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.lock_outline, size: 48, color: Colors.amber[200]),
                  const SizedBox(height: 10),
                  Text('هذه المساحة مخصصة للرسائل المباشرة مع العميل.', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey[600]), textAlign: TextAlign.center),
                  Text('يمكن للعميل رؤية هذه الرسائل فقط.', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[400]), textAlign: TextAlign.center),
                ],
              ),
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: docs.length,
          itemBuilder: (context, index) {
            final data = docs[index].data() as Map<String, dynamic>;
            final senderId = data['senderId'] ?? '';
            final senderRole = data['senderRole'] ?? '';
            final isMine = senderId == FirebaseAuth.instance.currentUser?.uid || senderRole != 'client';

            return Align(
              alignment: isMine ? Alignment.centerLeft : Alignment.centerRight,
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isMine ? const Color(0xFFFEF3C7) : Colors.white,
                  borderRadius: BorderRadius.circular(16).copyWith(
                    bottomLeft: isMine ? const Radius.circular(0) : null,
                    bottomRight: !isMine ? const Radius.circular(0) : null,
                  ),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 5, offset: const Offset(0, 2))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (!isMine)
                      Text(data['senderName'] ?? 'العميل', style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber[800])),
                    Text(data['text'] ?? '', style: GoogleFonts.cairo(color: const Color(0xFF78350F), fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(
                      data['createdAt'] != null
                          ? _formatDate(data['createdAt'])
                          : '',
                      style: GoogleFonts.cairo(fontSize: 8, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // ==================== 7. HANDOVER TAB ====================
  Widget _buildHandoverTab(Map<String, dynamic> data) {
    final bool isHandedOver = data['handoverAccepted'] == true;
    final clientName = data['clientName'] ?? 'العميل';
    final title = data['title'] ?? 'المشروع';

    if (!isHandedOver) {
      if (_handoverTextController.text.isEmpty) {
        _handoverTextController.text = 'أقر أنا ($clientName) بصفتي المالك أو الممثل النظامي للمشروع، باستلام مشروع ($title) بالكامل. وبعد المعاينة والفحص الميداني، أؤكد أن جميع الأعمال والمراحل والتشطيبات قد تم تنفيذها وتسليمها بحسب المواصفات الفنية وجداول الكميات المتفق عليها بالعقد، وبجودة مرضية تماماً ولا يوجد لدي أي التزامات متبقية أو ملاحظات فنية تمنع التسليم، وأقر بسريان شروط الضمانات المحددة للأنظمة المرفقة.';
      }

      final defaultGuarantees = [
        'ضمان الهيكل الإنشائي (10 سنوات)',
        'ضمان العزل المائي والحراري (5 سنوات)',
        'ضمان التمديدات الكهربائية والسباكة (سنة كاملة)',
        'صيانة وقائية مجانية (أول 6 أشهر)'
      ];

      return SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        child: Directionality(
          textDirection: TextDirection.rtl,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // كرت العنوان
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.star_outline, color: Color(0xFFD97706), size: 30),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('التسليم النهائي وإصدار الضمانات', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF92400E))),
                          Text('المرحلة الأخيرة في رحلة المشروع لضمان حقوق كافة الأطراف.', style: GoogleFonts.cairo(fontSize: 10, color: const Color(0xFFB45309))),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Text('نص إقرار الاستلام للعميل', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 8),
              Stack(
                children: [
                  TextField(
                    controller: _handoverTextController,
                    maxLines: 6,
                    style: GoogleFonts.cairo(fontSize: 12),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    left: 8,
                    child: ElevatedButton.icon(
                      onPressed: () => _generateAIHandoverText(clientName, title),
                      icon: const Icon(Icons.auto_awesome, size: 12, color: Color(0xFFD97706)),
                      label: Text('إعادة صياغة الذكاء الاصطناعي', style: GoogleFonts.cairo(fontSize: 9, color: const Color(0xFF334155))),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF1F5F9),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        minimumSize: Size.zero,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              Text('الضمانات المرفقة بالتسليم', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: defaultGuarantees.map((g) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4.0),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 16),
                        const SizedBox(width: 8),
                        Text(g, style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF475569))),
                      ],
                    ),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 20),

              Text('تقييم العميل لرحلة المشروع', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final starVal = index + 1;
                  return IconButton(
                    icon: Icon(
                      Icons.star,
                      color: starVal <= _clientRating ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                      size: 32,
                    ),
                    onPressed: () {
                      setState(() {
                        _clientRating = starVal;
                      });
                    },
                  );
                }),
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _isSavingHandover ? null : () async {
                    setState(() {
                      _isSavingHandover = true;
                    });
                    try {
                      await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).update({
                        'status': 'maintenance',
                        'handoverAccepted': true,
                        'handoverDate': DateTime.now().toIso8601String(),
                        'handoverSignatureText': _handoverTextController.text,
                        'clientRating': _clientRating,
                        'guarantees': defaultGuarantees
                      });
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('✅ تم إنهاء المشروع وتوثيق الاستلام بنجاح!', style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF2C7A7D))
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('❌ فشل توثيق الاستلام: $e', style: GoogleFonts.cairo()), backgroundColor: Colors.red)
                      );
                    } finally {
                      setState(() {
                        _isSavingHandover = false;
                      });
                    }
                  },
                  icon: _isSavingHandover 
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.shield_outlined, color: Colors.white),
                  label: Text(_isSavingHandover ? 'جاري الحفظ والتوثيق...' : 'اعتماد التوقيع وإقفال المشروع', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    } else {
      // Completed Handover & Maintenance requests view
      final approvedText = data['handoverSignatureText'] ?? '';
      final rating = data['clientRating'] ?? 5;
      final handoverDate = data['handoverDate'] ?? '';
      final guarantees = List<dynamic>.from(data['guarantees'] ?? []);

      return SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        child: Directionality(
          textDirection: TextDirection.rtl,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // كرت التسليم الناجح
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.verified_user_outlined, color: Color(0xFF059669), size: 36),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('المشروع مكتمل نهائياً ومحمي بالضمان', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF065F46))),
                          Text('تاريخ التسليم: ${_formatDate(handoverDate)}', style: GoogleFonts.cairo(fontSize: 10, color: const Color(0xFF047857))),
                        ],
                      ),
                    ),
                    Row(
                      children: List.generate(5, (idx) => Icon(
                        Icons.star,
                        color: idx < rating ? const Color(0xFFF59E0B) : const Color(0xFFD1D5DB),
                        size: 14,
                      )),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Text('إقرار الاستلام المعتمد', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Text(
                  approvedText,
                  style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF475569), height: 1.5),
                ),
              ),
              const SizedBox(height: 20),

              Text('الضمانات السارية الفعالة', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: guarantees.map((g) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.01), blurRadius: 4)],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 14),
                      const SizedBox(width: 6),
                      Text(g.toString(), style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFF334155))),
                    ],
                  ),
                )).toList(),
              ),
              if (data['fileAttachments'] != null && (data['fileAttachments'] as List).isNotEmpty) ...[
                const SizedBox(height: 20),
                Text('المستندات والمرفقات النهائية', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 8),
                ...List<dynamic>.from(data['fileAttachments'] ?? []).map((f) {
                  return Card(
                    color: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.withOpacity(0.1))),
                    child: ListTile(
                      leading: const Icon(Icons.picture_as_pdf, color: Colors.red),
                      title: Text(f['name'] ?? 'مستند نهائي', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                      subtitle: Text(f['uploadedAt'] ?? '', style: GoogleFonts.cairo(fontSize: 9)),
                      trailing: IconButton(
                        icon: const Icon(Icons.open_in_new, size: 18, color: Color(0xFF2C7A7D)),
                        onPressed: () async {
                          final link = f['url']?.toString() ?? '';
                          if (link.isNotEmpty) {
                            final uri = Uri.parse(link);
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(uri, mode: LaunchMode.externalApplication);
                            }
                          }
                        },
                      ),
                    ),
                  );
                }).toList(),
              ],
              const SizedBox(height: 24),

              const Divider(),
              const SizedBox(height: 12),

              // قسم الصيانة
              Text('سجل خدمات الصيانة والمتابعة الدورية', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF0F172A))),
              Text('تتبع بلاغات الصيانة للضمانات أو الزيارات الدورية للمشروع.', style: GoogleFonts.cairo(fontSize: 9.5, color: Colors.grey[500])),
              const SizedBox(height: 12),

              // نموذج إضافة بلاغ صيانة
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _maintenanceRequestController,
                      style: GoogleFonts.cairo(fontSize: 11),
                      decoration: InputDecoration(
                        hintText: 'اكتب وصف مشكلة الصيانة بتفصيل للتبليغ...',
                        hintStyle: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[400]),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () async {
                      final reqText = _maintenanceRequestController.text.trim();
                      if (reqText.isEmpty) return;
                      _maintenanceRequestController.clear();
                      
                      await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).collection('maintenance').add({
                        'projectId': widget.projectId,
                        'date': DateTime.now().toIso8601String(),
                        'description': reqText,
                        'status': 'pending',
                        'reportedBy': 'staff',
                      });

                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('✅ تم تسجيل طلب الصيانة بالمنصة!', style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF2C7A7D))
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    child: Text('تسجيل الطلب', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white)),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // قائمة بلاغات الصيانة الحية
              StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance.collection('projects').doc(widget.projectId).collection('maintenance').snapshots(),
                builder: (context, mSnapshot) {
                  if (!mSnapshot.hasData) {
                    return const Center(child: Padding(
                      padding: EdgeInsets.all(12.0),
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)),
                    ));
                  }

                  final mDocs = mSnapshot.data!.docs;
                  
                  if (mDocs.isEmpty) {
                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0), style: BorderStyle.solid),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.build, color: Colors.grey[400], size: 28),
                          const SizedBox(height: 8),
                          Text('صيانة مستقرة', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF475569))),
                          Text('لا توجد طلبات صيانة مسجلة حتى الآن للمشروع.', style: GoogleFonts.cairo(fontSize: 9.5, color: Colors.grey[400])),
                        ],
                      ),
                    );
                  }

                  // ترتيبهم يدوياً حسب التاريخ التنازلي
                  final sortedMDocs = mDocs.toList()
                    ..sort((a, b) {
                      final aData = a.data() as Map<String, dynamic>;
                      final bData = b.data() as Map<String, dynamic>;
                      final aTime = _parseDateTime(aData['date']);
                      final bTime = _parseDateTime(bData['date']);
                      return bTime.compareTo(aTime);
                    });

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: sortedMDocs.length,
                    itemBuilder: (context, idx) {
                      final docId = sortedMDocs[idx].id;
                      final mData = sortedMDocs[idx].data() as Map<String, dynamic>;
                      final desc = mData['description'] ?? '';
                      final date = mData['date'] ?? '';
                      final status = mData['status'] ?? 'pending';

                      Color statusBg = const Color(0xFFFFFBEB);
                      Color statusText = const Color(0xFFD97706);
                      String statusAr = 'معلق للمعاينة';
                      if (status == 'completed') {
                        statusBg = const Color(0xFFECFDF5);
                        statusText = const Color(0xFF059669);
                        statusAr = 'تم الحل مكتمل';
                      } else if (status == 'in-progress') {
                        statusBg = const Color(0xFFEFF6FF);
                        statusText = const Color(0xFF2563EB);
                        statusAr = 'قيد الصيانة والتنفيذ';
                      }

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                                        child: Text('بلاغ #${docId.substring(0, 5)}', style: GoogleFonts.cairo(fontSize: 8, fontWeight: FontWeight.bold, color: const Color(0xFF475569))),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(_formatDate(date), style: GoogleFonts.cairo(fontSize: 8, color: Colors.grey[400])),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(desc, style: GoogleFonts.cairo(fontSize: 10.5, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B))),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(6)),
                                  child: Text(statusAr, style: GoogleFonts.cairo(fontSize: 8.5, fontWeight: FontWeight.bold, color: statusText)),
                                ),
                                if (status != 'completed') ...[
                                  const SizedBox(height: 4),
                                  TextButton(
                                    onPressed: () async {
                                      final nextStatus = status == 'pending' ? 'in-progress' : 'completed';
                                      await FirebaseFirestore.instance
                                          .collection('projects')
                                          .doc(widget.projectId)
                                          .collection('maintenance')
                                          .doc(docId)
                                          .update({'status': nextStatus});
                                    },
                                    style: TextButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text('تحديث الحالة', style: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D))),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      );
    }
  }

  // ==================== UTILS ====================
  Widget _buildEmptyState(String msg, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: Colors.grey[300]),
          const SizedBox(height: 10),
          Text(msg, style: GoogleFonts.cairo(color: Colors.grey[500], fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  DateTime _parseDateTime(dynamic field) {
    if (field == null) return DateTime.fromMillisecondsSinceEpoch(0);
    if (field is Timestamp) return field.toDate();
    if (field is String) return DateTime.tryParse(field) ?? DateTime.fromMillisecondsSinceEpoch(0);
    return DateTime.fromMillisecondsSinceEpoch(0);
  }

  String _formatDate(dynamic field) {
    if (field == null) return '';
    if (field is Timestamp) {
      final dt = field.toDate();
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
    }
    if (field is String) return field.contains('T') ? field.split('T')[0] : field;
    return field.toString();
  }

  // ==================== DIALOGS ====================
  Future<void> _showAddWorkerSheet(BuildContext context, List<String> currentWorkerIds) async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('إضافة عامل/مهندس للمشروع', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Expanded(
                child: StreamBuilder<QuerySnapshot>(
                  stream: FirebaseFirestore.instance.collection('workers').snapshots(),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
                    final allWorkers = snapshot.data!.docs.where((w) => !currentWorkerIds.contains(w.id)).toList();
                    if (allWorkers.isEmpty) return Center(child: Text('جميع العمال مضافين بالفعل لهذا المشروع.', style: GoogleFonts.cairo()));
                    
                    return ListView.builder(
                      itemCount: allWorkers.length,
                      itemBuilder: (ctx, index) {
                        final w = allWorkers[index].data() as Map<String, dynamic>;
                        return ListTile(
                          leading: const CircleAvatar(child: Icon(Icons.person)),
                          title: Text(w['name'] ?? '', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text(w['role'] ?? '', style: GoogleFonts.cairo(fontSize: 11)),
                          trailing: IconButton(
                            icon: const Icon(Icons.add_circle, color: Colors.green),
                            onPressed: () async {
                              await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).update({
                                'workerIds': FieldValue.arrayUnion([allWorkers[index].id])
                              });
                              if (ctx.mounted) Navigator.pop(ctx);
                            },
                          ),
                        );
                      },
                    );
                  }
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showAddTransactionDialog(BuildContext context, String projectId, String type) async {
    final amountCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(type == 'income' ? 'إضافة دفعة مستلمة' : 'تسجيل مصروف/فاتورة', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 15)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                style: GoogleFonts.cairo(),
                decoration: InputDecoration(
                  labelText: 'المبلغ (ر.س)',
                  labelStyle: GoogleFonts.cairo(fontSize: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                style: GoogleFonts.cairo(),
                decoration: InputDecoration(
                  labelText: 'البيان (الوصف)',
                  labelStyle: GoogleFonts.cairo(fontSize: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text('إلغاء', style: GoogleFonts.cairo(color: Colors.grey))),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: type == 'income' ? Colors.green : Colors.red),
              onPressed: () async {
                if (amountCtrl.text.isEmpty || descCtrl.text.isEmpty) return;
                await FirebaseFirestore.instance.collection('transactions').add({
                  'projectId': projectId,
                  'amount': double.tryParse(amountCtrl.text) ?? 0.0,
                  'description': descCtrl.text,
                  'type': type,
                  'createdAt': DateTime.now().toIso8601String(),
                  'date': DateTime.now().toIso8601String(),
                });
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: Text('حفظ وتسجيل', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndUploadImage() async {
    final ImagePicker picker = ImagePicker();
    final ImageSource? source = await showDialog<ImageSource>(
      context: context,
      builder: (context) => Directionality(
        textDirection: TextDirection.rtl,
        child: SimpleDialog(
          title: Text('إضافة صورة للمشروع', style: GoogleFonts.cairo(fontWeight: FontWeight.bold)),
          children: [
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, ImageSource.camera),
              child: Row(
                children: [
                  const Icon(Icons.camera_alt, color: Color(0xFF2C7A7D)),
                  const SizedBox(width: 10),
                  Text('التقاط صورة بالكاميرا', style: GoogleFonts.cairo()),
                ],
              ),
            ),
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, ImageSource.gallery),
              child: Row(
                children: [
                  const Icon(Icons.photo_library, color: Color(0xFF2C7A7D)),
                  const SizedBox(width: 10),
                  Text('اختيار من المعرض', style: GoogleFonts.cairo()),
                ],
              ),
            ),
          ],
        ),
      ),
    );

    if (source != null) {
      final XFile? file = await picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 70,
      );
      if (file != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('📸 جاري حفظ الصورة في ملفات المشروع...', style: GoogleFonts.cairo()),
            backgroundColor: const Color(0xFF2C7A7D),
          )
        );

        String finalUrl = '';
        try {
          final Uint8List imageBytes = await file.readAsBytes();
          final String fileName = file.name;
          finalUrl = await _apiService.uploadImage(imageBytes: imageBytes, fileName: fileName);
        } catch (e) {
          print('Server upload failed, falling back to base64 in firestore: $e');
          try {
            final Uint8List imageBytes = await file.readAsBytes();
            final String base64Data = base64Encode(imageBytes);
            finalUrl = 'data:image/jpeg;base64,$base64Data';
          } catch (err) {
            print('Error reading image bytes: $err');
          }
        }

        if (finalUrl.isNotEmpty) {
          await FirebaseFirestore.instance.collection('projects').doc(widget.projectId).update({
            'photoUrls': FieldValue.arrayUnion([finalUrl])
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ تم إرفاق الصورة الحقيقية بنجاح!', style: GoogleFonts.cairo()),
              backgroundColor: const Color(0xFF2C7A7D),
            )
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('❌ فشل إرفاق الصورة.', style: GoogleFonts.cairo()),
              backgroundColor: Colors.red,
            )
          );
        }
      }
    }
  }

  void _generateAIHandoverText(String clientName, String projectTitle) {
    final text = 'أقر أنا ($clientName) بصفتي المالك أو الممثل النظامي للمشروع، باستلام مشروع ($projectTitle) بالكامل. وبعد المعاينة والفحص الميداني، أؤكد أن جميع الأعمال والمراحل والتشطيبات قد تم تنفيذها وتسليمها بحسب المواصفات الفنية وجداول الكميات المتفق عليها بالعقد، وبجودة مرضية تماماً ولا يوجد لدي أي التزامات متبقية أو ملاحظات فنية تمنع التسليم، وأقر بسريان شروط الضمانات المحددة للأنظمة المرفقة.';
    setState(() {
      _handoverTextController.text = text;
    });
  }

  Future<Map<String, String>> _getCurrentUserData() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return {'id': 'unknown_user', 'name': 'موظف غير معروف'};
    }
    try {
      final snap = await FirebaseFirestore.instance
          .collection('users')
          .where('uid', isEqualTo: user.uid)
          .limit(1)
          .get();
      if (snap.docs.isNotEmpty) {
        final data = snap.docs.first.data();
        final name = data['name'] ?? user.displayName ?? user.email ?? 'موظف';
        return {'id': user.uid, 'name': name};
      }
    } catch (e) {
      print('Error getting user data: $e');
    }
    return {'id': user.uid, 'name': user.displayName ?? user.email ?? 'موظف'};
  }
}

