import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/firebase_service.dart';

class AssetsScreen extends StatefulWidget {
  final FirebaseService firebaseService;

  const AssetsScreen({Key? key, required this.firebaseService}) : super(key: key);

  @override
  _AssetsScreenState createState() => _AssetsScreenState();
}

class _AssetsScreenState extends State<AssetsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _assetSearchQuery = '';
  String _inventorySearchQuery = '';

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
          'الأصول والمخزون',
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
            Tab(text: 'أصول الشركة (معدات)'),
            Tab(text: 'المخزون العام'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAssetsTab(),
          _buildInventoryTab(),
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

  Widget _buildAssetsTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _assetSearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث عن أصل...',
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
            stream: FirebaseFirestore.instance.collection('assets').snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
              }
              if (snapshot.hasError) {
                return Center(child: Text('حدث خطأ في جلب بيانات الأصول', style: GoogleFonts.cairo()));
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return _buildPlaceholderTab('لا توجد أصول مسجلة', Icons.precision_manufacturing_outlined);
              }

              final docs = snapshot.data!.docs.where((doc) {
                final data = doc.data() as Map<String, dynamic>;
                final name = (data['name'] ?? '').toString().toLowerCase();
                final code = (data['code'] ?? '').toString().toLowerCase();
                final q = _assetSearchQuery.toLowerCase();
                return name.contains(q) || code.contains(q);
              }).toList();

              if (docs.isEmpty) {
                return _buildPlaceholderTab('لم يتم العثور على أصول مطابقة', Icons.search_off);
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                physics: const BouncingScrollPhysics(),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final data = docs[index].data() as Map<String, dynamic>;
                  final name = data['name'] ?? 'أصل بدون اسم';
                  final code = data['code'] ?? '#0000';
                  final status = data['status'] ?? 'available';
                  final assignedTo = data['assignedTo'] ?? 'المستودع الرئيسي';

                  Color statusColor = const Color(0xFF10B981);
                  String statusText = 'متاح';
                  
                  if (status == 'assigned') {
                    statusColor = const Color(0xFFF59E0B);
                    statusText = 'مُسلَّم كعهدة';
                  } else if (status == 'maintenance') {
                    statusColor = const Color(0xFFEF4444);
                    statusText = 'في الصيانة';
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
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: const BoxDecoration(
                            color: Color(0xFFFFFBEB),
                            shape: BoxShape.circle,
                          ),
                          child: const Center(
                            child: Icon(Icons.car_repair, color: Color(0xFFF59E0B)),
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
                              Text('الرمز: $code', style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[500])),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.location_on, size: 12, color: Colors.grey[400]),
                                  const SizedBox(width: 4),
                                  Text(assignedTo, style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500])),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            statusText,
                            style: GoogleFonts.cairo(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: statusColor,
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

  Widget _buildInventoryTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _inventorySearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث في المواد والمخزون...',
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
            stream: FirebaseFirestore.instance.collection('inventory').snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
              }
              if (snapshot.hasError) {
                return Center(child: Text('حدث خطأ في جلب بيانات المخزون', style: GoogleFonts.cairo()));
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return _buildPlaceholderTab('لا توجد مواد مسجلة في المخزون', Icons.inventory_2_outlined);
              }

              final docs = snapshot.data!.docs.where((doc) {
                final data = doc.data() as Map<String, dynamic>;
                final name = (data['name'] ?? '').toString().toLowerCase();
                final category = (data['category'] ?? '').toString().toLowerCase();
                final q = _inventorySearchQuery.toLowerCase();
                return name.contains(q) || category.contains(q);
              }).toList();

              if (docs.isEmpty) {
                return _buildPlaceholderTab('لم يتم العثور على مواد مطابقة للبحث', Icons.search_off);
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                physics: const BouncingScrollPhysics(),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final data = docs[index].data() as Map<String, dynamic>;
                  final name = data['name'] ?? 'مادة بدون اسم';
                  final category = data['category'] ?? 'عام';
                  final qty = double.tryParse(data['quantity']?.toString() ?? '0') ?? 0.0;
                  final unit = data['unit'] ?? 'وحدة';
                  final minThreshold = double.tryParse(data['minThreshold']?.toString() ?? '10') ?? 10.0;

                  final isLow = qty <= minThreshold;

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
                            color: Color(0xFFE6F4F4),
                            shape: BoxShape.circle,
                          ),
                          child: const Center(
                            child: Icon(Icons.inventory_2_outlined, color: Color(0xFF2C7A7D)),
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
                              Text('التصنيف: $category', style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[500])),
                              if (isLow)
                                Container(
                                  margin: const EdgeInsets.only(top: 4),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEE2E2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    'مخزون منخفض (أقل من الحد الآمن: $minThreshold)',
                                    style: GoogleFonts.cairo(fontSize: 8, color: const Color(0xFF991B1B), fontWeight: FontWeight.bold),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'الكمية المتوفرة',
                              style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                            ),
                            Text(
                              '${qty.toStringAsFixed(1)} $unit',
                              style: GoogleFonts.cairo(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: isLow ? const Color(0xFFEF4444) : const Color(0xFF2C7A7D),
                              ),
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
