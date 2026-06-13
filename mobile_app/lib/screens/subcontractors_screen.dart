import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/firebase_service.dart';

class SubcontractorsScreen extends StatefulWidget {
  final FirebaseService firebaseService;

  const SubcontractorsScreen({Key? key, required this.firebaseService}) : super(key: key);

  @override
  _SubcontractorsScreenState createState() => _SubcontractorsScreenState();
}

class _SubcontractorsScreenState extends State<SubcontractorsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _subcontractorSearchQuery = '';
  String _contractSearchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        title: Text(
          'مقاولي الباطن',
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
            Tab(text: 'قائمة المقاولين'),
            Tab(text: 'العقود والمستخلصات'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSubcontractorsTab(),
          _buildContractsTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('سيتم تفعيل هذه الميزة قريباً', style: GoogleFonts.cairo())),
          );
        },
        backgroundColor: const Color(0xFF2C7A7D),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildSubcontractorsTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _subcontractorSearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث عن مقاول...',
              hintStyle: GoogleFonts.cairo(color: Colors.grey[400], fontSize: 12),
              prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
              filled: true,
              fillColor: const Color(0xFFF1F5F9),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
          ),
        ),
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance.collection('subcontractors').snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
              }
              if (snapshot.hasError) {
                return Center(child: Text('حدث خطأ في جلب بيانات المقاولين', style: GoogleFonts.cairo()));
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return _buildPlaceholderTab('لا يوجد مقاولين مسجلين', Icons.engineering_outlined);
              }

              final docs = snapshot.data!.docs.where((doc) {
                final data = doc.data() as Map<String, dynamic>;
                final name = (data['name'] ?? '').toString().toLowerCase();
                final specialty = (data['specialty'] ?? '').toString().toLowerCase();
                final q = _subcontractorSearchQuery.toLowerCase();
                return name.contains(q) || specialty.contains(q);
              }).toList();

              if (docs.isEmpty) {
                return _buildPlaceholderTab('لم يتم العثور على مقاولين مطابقين للبحث', Icons.search_off);
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                physics: const BouncingScrollPhysics(),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final data = docs[index].data() as Map<String, dynamic>;
                  final name = data['name'] ?? 'مقاول بدون اسم';
                  final specialty = data['specialty'] ?? 'تخصص غير محدد';
                  final phone = data['phone'] ?? 'لا يوجد رقم';
                  final status = data['status'] ?? 'active';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.withOpacity(0.05)),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: const BoxDecoration(
                            color: Color(0xFFEEF2FF),
                            shape: BoxShape.circle,
                          ),
                          child: const Center(
                            child: Icon(Icons.handyman, color: Colors.indigo),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                              ),
                              Text(specialty, style: GoogleFonts.cairo(fontSize: 11, color: Colors.indigo)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.phone, size: 12, color: Colors.grey[500]),
                                  const SizedBox(width: 4),
                                  Text(phone, style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[500])),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: status == 'active' ? const Color(0xFFECFDF5) : Colors.grey[100],
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            status == 'active' ? 'نشط' : 'غير نشط',
                            style: GoogleFonts.cairo(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: status == 'active' ? const Color(0xFF10B981) : Colors.grey[600],
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildContractsTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _contractSearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث في عقود مقاولي الباطن...',
              hintStyle: GoogleFonts.cairo(color: Colors.grey[400], fontSize: 12),
              prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
              filled: true,
              fillColor: const Color(0xFFF1F5F9),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
          ),
        ),
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance.collection('subcontractors').snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
              }
              if (snapshot.hasError) {
                return Center(child: Text('حدث خطأ في جلب بيانات العقود', style: GoogleFonts.cairo()));
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return _buildPlaceholderTab('لا يوجد مقاولين مسجلين', Icons.engineering_outlined);
              }

              final docs = snapshot.data!.docs.where((doc) {
                final data = doc.data() as Map<String, dynamic>;
                final name = (data['name'] ?? '').toString().toLowerCase();
                final specialty = (data['specialty'] ?? data['serviceType'] ?? '').toString().toLowerCase();
                final q = _contractSearchQuery.toLowerCase();
                return name.contains(q) || specialty.contains(q);
              }).toList();

              if (docs.isEmpty) {
                return _buildPlaceholderTab('لم يتم العثور على عقود مطابقة للبحث', Icons.search_off);
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                physics: const BouncingScrollPhysics(),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final data = docs[index].data() as Map<String, dynamic>;
                  final name = data['name'] ?? 'مقاول بدون اسم';
                  final specialty = data['specialty'] ?? data['serviceType'] ?? 'تخصص غير محدد';
                  
                  final contractAmount = double.tryParse(data['contractAmount']?.toString() ?? '0') ?? 0.0;
                  final paidAmount = double.tryParse(data['paidAmount']?.toString() ?? '0') ?? 0.0;
                  final remainingAmount = contractAmount - paidAmount;
                  
                  double pct = 0.0;
                  if (contractAmount > 0) {
                    pct = (paidAmount / contractAmount).clamp(0.0, 1.0);
                  }

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.withOpacity(0.05)),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: const BoxDecoration(
                                color: Color(0xFFEEF2FF),
                                shape: BoxShape.circle,
                              ),
                              child: const Center(
                                child: Icon(Icons.handshake_outlined, color: Colors.indigo, size: 20),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                                  ),
                                  Text(specialty, style: GoogleFonts.cairo(fontSize: 10, color: Colors.indigo)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('قيمة العقد', style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500])),
                                Text('${contractAmount.toStringAsFixed(0)} ر.س', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('المدفوع', style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500])),
                                Text('${paidAmount.toStringAsFixed(0)} ر.س', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF10B981))),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('المتبقي', style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500])),
                                Text('${remainingAmount.toStringAsFixed(0)} ر.س', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: remainingAmount > 0 ? const Color(0xFFEF4444) : Colors.grey[600])),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: pct,
                                  minHeight: 6,
                                  backgroundColor: Colors.grey[100],
                                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.indigo),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${(pct * 100).toStringAsFixed(0)}%',
                              style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.indigo),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholderTab(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            message,
            style: GoogleFonts.cairo(fontSize: 14, color: Colors.grey[500], fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
