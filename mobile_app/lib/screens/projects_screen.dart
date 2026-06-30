import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/firebase_service.dart';
import 'package:geolocator/geolocator.dart';
import 'project_details_screen.dart';

class ProjectsScreen extends StatefulWidget {
  final FirebaseService firebaseService;
  const ProjectsScreen({Key? key, required this.firebaseService}) : super(key: key);

  @override
  _ProjectsScreenState createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        onPressed: _showCreateProjectSheet,
        backgroundColor: const Color(0xFF2C7A7D),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // عنوان الصفحة والبحث
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'مشاريع الشركة',
                  style: GoogleFonts.cairo(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.01),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: TextField(
                    onChanged: (val) {
                      setState(() {
                        _searchQuery = val.trim().toLowerCase();
                      });
                    },
                    textDirection: TextDirection.rtl,
                    style: GoogleFonts.cairo(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'البحث عن مشروع...',
                      hintStyle: GoogleFonts.cairo(fontSize: 12, color: Colors.grey[400]),
                      prefixIcon: Icon(Icons.search, color: Colors.grey[400], size: 20),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // قائمة المشاريع الحية
          Expanded(
            child: StreamBuilder<QuerySnapshot?>(
              stream: widget.firebaseService.getActiveProjects(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Text(
                      'حدث خطأ في تحميل المشاريع',
                      style: GoogleFonts.cairo(color: Colors.red),
                    ),
                  );
                }

                final docs = snapshot.data?.docs ?? [];
                
                // تصفية المشاريع حسب البحث
                final filteredDocs = docs.where((doc) {
                  final data = doc.data() as Map<String, dynamic>?;
                  if (data == null) return false;
                  final title = (data['title'] ?? '').toString().toLowerCase();
                  final supervisor = (data['supervisor'] ?? '').toString().toLowerCase();
                  return title.contains(_searchQuery) || supervisor.contains(_searchQuery);
                }).toList();

                if (filteredDocs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.grid_off_outlined, size: 48, color: Colors.grey[300]),
                        const SizedBox(height: 12),
                        Text(
                          'لا توجد مشاريع نشطة مطابقة',
                          style: GoogleFonts.cairo(color: Colors.grey[500], fontSize: 13),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  itemCount: filteredDocs.length,
                  itemBuilder: (context, index) {
                    final doc = filteredDocs[index];
                    final data = doc.data() as Map<String, dynamic>;
                    return _buildProjectCard(doc.id, data);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProjectCard(String id, Map<String, dynamic> data) {
    final title = data['title'] ?? 'مشروع بدون اسم';
    final supervisor = data['supervisor'] ?? 'لم يحدد مشرف';
    final progress = double.tryParse(data['progress']?.toString() ?? '0') ?? 0.0;
    final budget = double.tryParse(data['contractValue']?.toString() ?? data['budget']?.toString() ?? '0') ?? 0.0;
    
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProjectDetailsScreen(projectId: id, initialData: data),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: GoogleFonts.cairo(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0F172A),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(
                  'نشط',
                  style: GoogleFonts.cairo(
                    fontSize: 10,
                    color: const Color(0xFF3B82F6),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.person_outline, size: 14, color: Colors.grey[400]),
              const SizedBox(width: 4),
              Text(
                'المشرف: $supervisor',
                style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[500]),
              ),
              const Spacer(),
              Text(
                'الميزانية: ${(budget / 1000).toStringAsFixed(0)}K ر.س',
                style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[500], fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // شريط نسبة الإنجاز
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: LinearProgressIndicator(
                    value: progress / 100.0,
                    backgroundColor: const Color(0xFFF1F5F9),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2C7A7D)),
                    minHeight: 6,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '${progress.toInt()}%',
                style: GoogleFonts.cairo(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF2C7A7D),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // أزرار تفاعلية مدمجة
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: () => _showAttendanceSheet(id, data),
                icon: const Icon(Icons.gps_fixed, size: 14, color: Color(0xFF2563EB)),
                label: Text(
                  'التحضير الميداني',
                  style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF2563EB)),
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ProjectDetailsScreen(projectId: id, initialData: data),
                    ),
                  );
                },
                icon: const Icon(Icons.arrow_back, size: 14, color: Color(0xFF2C7A7D)),
                label: Text(
                  'إدارة المشروع',
                  style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D)),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

  void _showAttendanceSheet(String projectId, Map<String, dynamic> data) {
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
                Text(
                  'تسجيل الحضور للمشروع',
                  style: GoogleFonts.cairo(fontSize: 17, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                ),
                Text(
                  data['title'] ?? 'مشروع',
                  style: GoogleFonts.cairo(fontSize: 12, color: Colors.grey[500]),
                ),
                const SizedBox(height: 24),
                // بطاقة التحضير الذكي عبر الـ GPS
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.gps_fixed, color: Color(0xFF2563EB), size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'التحضير الذكي الميداني (GPS)',
                            style: GoogleFonts.cairo(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1E3A8A),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'يقوم النظام بمطابقة موقع جوالك الجغرافي الفعلي مع إحداثيات موقع العمل لتأكيد حضورك.',
                        style: GoogleFonts.cairo(fontSize: 10, color: const Color(0xFF1E40AF), height: 1.4),
                      ),
                      const SizedBox(height: 12),
                      Column(
                        children: [
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                final title = data['title'] ?? 'مشروع';
                                final double projectLat = double.tryParse(data['latitude']?.toString() ?? '24.7136') ?? 24.7136;
                                final double projectLng = double.tryParse(data['longitude']?.toString() ?? '46.6753') ?? 46.6753;

                                bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
                                if (!serviceEnabled) {
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ خدمة الموقع (GPS) معطلة بجهازك.', textDirection: TextDirection.rtl, style: GoogleFonts.cairo())));
                                  return;
                                }

                                LocationPermission permission = await Geolocator.checkPermission();
                                if (permission == LocationPermission.denied) {
                                  permission = await Geolocator.requestPermission();
                                  if (permission == LocationPermission.denied) {
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ تم رفض صلاحية الوصول للموقع.', textDirection: TextDirection.rtl, style: GoogleFonts.cairo())));
                                    return;
                                  }
                                }

                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('📡 جاري تحديد موقعك الجغرافي...', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()), duration: const Duration(seconds: 1)));

                                try {
                                  Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
                                  double distance = Geolocator.distanceBetween(position.latitude, position.longitude, projectLat, projectLng);

                                  if (distance <= 150.0) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('✅ تم التحضير بنجاح!', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF2C7A7D)));
                                    final uInfo = await _getCurrentUserData();
                                    await widget.firebaseService.recordAttendance(userId: uInfo['id']!, userName: uInfo['name']!, status: 'حاضر (ميدان)', locationName: title);
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ فشل التحضير! أنت على بعد ${distance.toStringAsFixed(0)} متر من موقع العمل.', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()), backgroundColor: Colors.red));
                                  }
                                } catch (e) {
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ خطأ أثناء حساب الإحداثيات.', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()), backgroundColor: Colors.red));
                                }
                              },
                              icon: const Icon(Icons.location_searching),
                              label: Text('التحقق والتحضير (GPS)', style: GoogleFonts.cairo(fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                            ),
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚡ تم تأكيد الحضور (تجاوز الموقع).', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF2C7A7D)));
                                final uInfo = await _getCurrentUserData();
                                await widget.firebaseService.recordAttendance(userId: uInfo['id']!, userName: uInfo['name']!, status: 'حاضر (تجاوز)', locationName: data['title'] ?? 'مشروع');
                              },
                              icon: const Icon(Icons.developer_mode),
                              label: Text('تخطي الموقع (للتطوير)', style: GoogleFonts.cairo(fontWeight: FontWeight.bold)),
                              style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF2563EB)), foregroundColor: const Color(0xFF2563EB), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showCreateProjectSheet() {
    final titleCtrl = TextEditingController();
    final supervisorCtrl = TextEditingController();
    final typeCtrl = TextEditingController();
    final clientNameCtrl = TextEditingController();
    final clientPhoneCtrl = TextEditingController();
    final budgetCtrl = TextEditingController();
    final startDateCtrl = TextEditingController();

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
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Center(
                    child: Container(
                      width: 40, height: 4,
                      decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text('إضافة مشروع جديد', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 16),
                  _buildTextField(titleCtrl, 'اسم المشروع *', Icons.work),
                  const SizedBox(height: 12),
                  _buildTextField(supervisorCtrl, 'اسم المشرف *', Icons.person),
                  const SizedBox(height: 12),
                  _buildTextField(typeCtrl, 'نوع المشروع', Icons.category),
                  const SizedBox(height: 12),
                  _buildTextField(clientNameCtrl, 'اسم العميل *', Icons.people),
                  const SizedBox(height: 12),
                  _buildTextField(clientPhoneCtrl, 'جوال العميل', Icons.phone, TextInputType.phone),
                  const SizedBox(height: 12),
                  _buildTextField(budgetCtrl, 'الميزانية / قيمة العقد *', Icons.monetization_on, TextInputType.number),
                  const SizedBox(height: 12),
                  _buildTextField(startDateCtrl, 'تاريخ البدء (مثال: 2026-06-11)', Icons.calendar_today),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (titleCtrl.text.isEmpty || supervisorCtrl.text.isEmpty || clientNameCtrl.text.isEmpty || budgetCtrl.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('يرجى تعبئة الحقول الإجبارية *', style: GoogleFonts.cairo())));
                          return;
                        }
                        Navigator.pop(context);
                        await widget.firebaseService.addProject({
                          'title': titleCtrl.text.trim(),
                          'supervisor': supervisorCtrl.text.trim(),
                          'type': typeCtrl.text.trim(),
                          'clientName': clientNameCtrl.text.trim(),
                          'clientPhone': clientPhoneCtrl.text.trim(),
                          'contractValue': double.tryParse(budgetCtrl.text.trim()) ?? 0.0,
                          'budget': double.tryParse(budgetCtrl.text.trim()) ?? 0.0, // Web expects budget
                          'startDate': startDateCtrl.text.trim().isNotEmpty ? startDateCtrl.text.trim() : DateTime.now().toIso8601String().split('T')[0],
                          'status': 'active', // Web sync
                          'priority': 'medium', // Web sync
                          'progress': 0, // Web sync
                          'phases': [], // Web sync
                          'description': '', // Web sync
                          'createdAt': DateTime.now().toIso8601String(),
                        });
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تم إضافة المشروع بنجاح', style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF2C7A7D)));
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2C7A7D),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('حفظ المشروع', style: GoogleFonts.cairo(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTextField(TextEditingController ctrl, String hint, IconData icon, [TextInputType type = TextInputType.text]) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      style: GoogleFonts.cairo(fontSize: 13),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.cairo(fontSize: 12, color: Colors.grey[500]),
        prefixIcon: Icon(icon, size: 18, color: const Color(0xFF2C7A7D)),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      ),
    );
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
