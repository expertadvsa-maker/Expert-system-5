import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class EmployeeProfileScreen extends StatefulWidget {
  final String employeeId;
  final Map<String, dynamic> initialData;

  const EmployeeProfileScreen({
    Key? key,
    required this.employeeId,
    required this.initialData,
  }) : super(key: key);

  @override
  _EmployeeProfileScreenState createState() => _EmployeeProfileScreenState();
}

class _EmployeeProfileScreenState extends State<EmployeeProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('users').doc(widget.employeeId).snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const Scaffold(body: Center(child: Text('حدث خطأ في جلب بيانات الموظف')));
        }
        
        final data = (snapshot.hasData && snapshot.data!.exists) 
            ? snapshot.data!.data() as Map<String, dynamic> 
            : widget.initialData;

        final name = data['name'] ?? 'موظف بدون اسم';
        final role = data['role'] ?? 'employee';
        final email = data['email'] ?? 'بدون بريد';

        String roleAr = 'موظف كادر';
        Color roleColor = Colors.grey;
        if (role == 'manager') {
          roleAr = 'مدير عام';
          roleColor = const Color(0xFF2C7A7D);
        } else if (role == 'supervisor') {
          roleAr = 'مشرف ميداني';
          roleColor = Colors.indigo;
        } else if (role == 'admin') {
          roleAr = 'مدير نظام';
          roleColor = Colors.purple;
        }

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            centerTitle: true,
            iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
            title: Text(
              'ملف الموظف',
              style: GoogleFonts.cairo(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF0F172A),
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              labelColor: const Color(0xFF2C7A7D),
              unselectedLabelColor: Colors.grey[500],
              indicatorColor: const Color(0xFF2C7A7D),
              labelStyle: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13),
              unselectedLabelStyle: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: const [
                Tab(text: 'تقييم الأداء'),
                Tab(text: 'مسيرات الرواتب'),
                Tab(text: 'العهد المسلمة'),
              ],
            ),
          ),
          body: Column(
            children: [
              _buildProfileHeader(name, roleAr, email, roleColor),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildPerformanceTab(),
                    _buildPayrollsTab(),
                    _buildAssetsTab(),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProfileHeader(String name, String roleAr, String email, Color roleColor) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: roleColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    name.isNotEmpty ? name.substring(0, 1) : 'م',
                    style: GoogleFonts.cairo(fontSize: 24, fontWeight: FontWeight.bold, color: roleColor),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                    ),
                    Text(email, style: GoogleFonts.cairo(fontSize: 12, color: Colors.grey[500])),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: roleColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  roleAr,
                  style: GoogleFonts.cairo(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: roleColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2C7A7D), Color(0xFF1F5C5E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: const Color(0xFF2C7A7D).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 5)),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('التقييم العام', style: GoogleFonts.cairo(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                    Row(
                      children: [
                        const Icon(Icons.star, color: Color(0xFFFBBF24), size: 16),
                        const SizedBox(width: 4),
                        Text('4.8/5.0', style: GoogleFonts.cairo(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ],
                ),
                Container(width: 1, height: 30, color: Colors.white24),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('حالة الدوام', style: GoogleFonts.cairo(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                    Row(
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 16),
                        const SizedBox(width: 4),
                        Text('منتظم', style: GoogleFonts.cairo(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.insert_chart_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('لا توجد تقييمات مسجلة حالياً', style: GoogleFonts.cairo(fontSize: 14, color: Colors.grey[500], fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildPayrollsTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.request_quote_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('لا توجد مسيرات رواتب مصدرة', style: GoogleFonts.cairo(fontSize: 14, color: Colors.grey[500], fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildAssetsTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.devices_other, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('لا توجد عهد مستلمة', style: GoogleFonts.cairo(fontSize: 14, color: Colors.grey[500], fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
