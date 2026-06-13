import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'scanner_screen.dart';
import '../services/firebase_service.dart';
import '../services/server_api_service.dart';

class PurchasesScreen extends StatefulWidget {
  final FirebaseService firebaseService;
  final ServerApiService apiService;

  const PurchasesScreen({Key? key, required this.firebaseService, required this.apiService}) : super(key: key);

  @override
  _PurchasesScreenState createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends State<PurchasesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _supplierSearchQuery = '';
  String _poSearchQuery = '';

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
          'المشتريات والموردين',
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
            Tab(text: 'قائمة الموردين'),
            Tab(text: 'طلبات الشراء (PO)'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSuppliersTab(),
          _buildPurchaseOrdersTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ScannerScreen(
                firebaseService: widget.firebaseService,
                apiService: widget.apiService,
              ),
            ),
          );
        },
        backgroundColor: const Color(0xFF2C7A7D),
        child: const Icon(Icons.document_scanner, color: Colors.white),
      ),
    );
  }

  Widget _buildSuppliersTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _supplierSearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث عن مورد...',
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
          child: FutureBuilder<List<dynamic>>(
            future: widget.apiService.fetchAliphiaClients(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
              }
              if (snapshot.hasError) {
                return Center(child: Text('حدث خطأ في جلب بيانات الموردين من ألف ياء', style: GoogleFonts.cairo()));
              }
              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return _buildPlaceholderTab('لا يوجد موردين مسجلين في النظام', Icons.storefront_outlined);
              }

              final docs = snapshot.data!.where((client) {
                final name = (client['name'] ?? '').toString().toLowerCase();
                final company = (client['company_name'] ?? '').toString().toLowerCase();
                final q = _supplierSearchQuery.toLowerCase();
                return name.contains(q) || company.contains(q);
              }).toList();

              if (docs.isEmpty) {
                return _buildPlaceholderTab('لم يتم العثور على موردين مطابقين للبحث', Icons.search_off);
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                physics: const BouncingScrollPhysics(),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final data = docs[index] as Map<String, dynamic>;
                  final name = data['name'] ?? 'مورد بدون اسم';
                  final company = data['company_name'] ?? 'بدون شركة';
                  final phone = data['phone'] ?? 'لا يوجد رقم';
                  // Aliphia might use 'balance' or similar field
                  final balance = double.tryParse(data['balance']?.toString() ?? '0') ?? 0.0;

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
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Center(
                            child: Icon(Icons.storefront, color: Color(0xFFEF4444)),
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
                              Text(company, style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[500])),
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
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'الرصيد / المستحقات',
                              style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                            ),
                            Text(
                              '${balance.toStringAsFixed(0)} ر.س',
                              style: GoogleFonts.cairo(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: balance > 0 ? const Color(0xFFEF4444) : const Color(0xFF10B981),
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

  Widget _buildPurchaseOrdersTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _poSearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث في طلبات الشراء...',
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
            stream: FirebaseFirestore.instance
                .collection('transactions')
                .where('type', whereIn: ['purchase', 'expense'])
                .snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
              }
              if (snapshot.hasError) {
                return Center(child: Text('حدث خطأ في جلب طلبات الشراء', style: GoogleFonts.cairo()));
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return _buildPlaceholderTab('لا توجد طلبات شراء مسجلة حالياً', Icons.shopping_cart_checkout);
              }

              final docs = snapshot.data!.docs.where((doc) {
                final data = doc.data() as Map<String, dynamic>;
                final desc = (data['description'] ?? '').toString().toLowerCase();
                final category = (data['category'] ?? '').toString().toLowerCase();
                final createdBy = (data['createdBy'] ?? '').toString().toLowerCase();
                final q = _poSearchQuery.toLowerCase();
                return desc.contains(q) || category.contains(q) || createdBy.contains(q);
              }).toList();

              if (docs.isEmpty) {
                return _buildPlaceholderTab('لم يتم العثور على طلبات شراء مطابقة للبحث', Icons.search_off);
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                physics: const BouncingScrollPhysics(),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final doc = docs[index];
                  final data = doc.data() as Map<String, dynamic>;
                  final desc = data['description'] ?? 'طلب توريد مواد';
                  final amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
                  final createdBy = data['createdByName'] ?? data['createdBy'] ?? 'مشرف الميدان';
                  
                  String dateStr = '';
                  try {
                    final rawDate = data['date'] ?? data['createdAt'];
                    if (rawDate != null) {
                      dateStr = rawDate.toString().split('T')[0];
                    }
                  } catch (_) {}

                  final status = data['status'] ?? 'pending';
                  String statusText = 'معلق';
                  Color statusColor = const Color(0xFFF59E0B);
                  if (status == 'approved') {
                    statusText = 'معتمد';
                    statusColor = const Color(0xFF10B981);
                  } else if (status == 'rejected') {
                    statusText = 'مرفوض';
                    statusColor = const Color(0xFFEF4444);
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
                            color: Color(0xFFFEF3C7),
                            shape: BoxShape.circle,
                          ),
                          child: const Center(
                            child: Icon(Icons.shopping_bag_outlined, color: Color(0xFFF59E0B)),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                desc,
                                style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                              ),
                              Text('بواسطة: $createdBy', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500])),
                              if (dateStr.isNotEmpty)
                                Text('التاريخ: $dateStr', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[400])),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20)),
                              child: Text(
                                statusText,
                                style: GoogleFonts.cairo(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: statusColor,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${amount.toStringAsFixed(0)} ر.س',
                              style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
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
