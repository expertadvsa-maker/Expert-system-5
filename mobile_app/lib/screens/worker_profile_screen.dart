import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class WorkerProfileScreen extends StatefulWidget {
  final String workerId;
  final Map<String, dynamic> initialData;

  const WorkerProfileScreen({
    Key? key,
    required this.workerId,
    required this.initialData,
  }) : super(key: key);

  @override
  _WorkerProfileScreenState createState() => _WorkerProfileScreenState();
}

class _WorkerProfileScreenState extends State<WorkerProfileScreen> with SingleTickerProviderStateMixin {
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
      stream: FirebaseFirestore.instance.collection('workers').doc(widget.workerId).snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const Scaffold(body: Center(child: Text('حدث خطأ في جلب بيانات العامل')));
        }
        
        final data = (snapshot.hasData && snapshot.data!.exists) 
            ? snapshot.data!.data() as Map<String, dynamic> 
            : widget.initialData;

        final name = data['name'] ?? 'عامل بدون اسم';
        final profession = data['profession'] ?? 'غير محدد';
        final status = data['status'] ?? 'active';
        final balance = double.tryParse(data['balance']?.toString() ?? '0') ?? 0.0;

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            centerTitle: true,
            iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
            title: Text(
              'ملف العامل',
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
                Tab(text: 'كشف الحساب'),
                Tab(text: 'سجل الحضور'),
                Tab(text: 'السلف الدائمة'),
              ],
            ),
          ),
          body: Column(
            children: [
              _buildProfileHeader(name, profession, status, balance),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildTransactionsTab(),
                    _buildAttendanceTab(),
                    _buildAdvancesTab(),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProfileHeader(String name, String profession, String status, double balance) {
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
                decoration: const BoxDecoration(
                  color: Color(0xFFE6F4F4),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    name.isNotEmpty ? name.substring(0, 1) : 'ع',
                    style: GoogleFonts.cairo(fontSize: 24, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D)),
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
                    Text(profession, style: GoogleFonts.cairo(fontSize: 13, color: Colors.grey[600])),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: status == 'active' ? const Color(0xFFECFDF5) : Colors.grey[100],
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  status == 'active' ? 'متاح' : 'غير متاح',
                  style: GoogleFonts.cairo(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: status == 'active' ? const Color(0xFF10B981) : Colors.grey[600],
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
                Text('الرصيد المستحق', style: GoogleFonts.cairo(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                Text('${balance.toStringAsFixed(0)} ر.س', style: GoogleFonts.cairo(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionsTab() {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('transactions')
          .where('workerId', isEqualTo: widget.workerId)
          .snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
        
        var docs = snapshot.data!.docs;
        if (docs.isEmpty) {
          return Center(child: Text('لا توجد حركات مالية', style: GoogleFonts.cairo(color: Colors.grey[500])));
        }

        docs.sort((a, b) {
          final aData = a.data() as Map<String, dynamic>;
          final bData = b.data() as Map<String, dynamic>;
          final aTime = _parseDateTime(aData['createdAt'] ?? aData['date']);
          final bTime = _parseDateTime(bData['createdAt'] ?? bData['date']);
          return bTime.compareTo(aTime);
        });

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          physics: const BouncingScrollPhysics(),
          itemCount: docs.length,
          itemBuilder: (context, index) {
            final data = docs[index].data() as Map<String, dynamic>;
            final amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
            final isIncome = data['type'] == 'income';
            final desc = data['description'] ?? 'حركة مالية';
            final date = _formatDate(data['date'] ?? data['createdAt']);

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
        );
      },
    );
  }

  Widget _buildAttendanceTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.fingerprint, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('لا يوجد سجل حضور حالياً', style: GoogleFonts.cairo(fontSize: 14, color: Colors.grey[500], fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildAdvancesTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.money_off, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('لا توجد سلف مسجلة حالياً', style: GoogleFonts.cairo(fontSize: 14, color: Colors.grey[500], fontWeight: FontWeight.bold)),
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
}
