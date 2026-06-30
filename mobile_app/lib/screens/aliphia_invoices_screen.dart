import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AliphiaInvoicesScreen extends StatefulWidget {
  const AliphiaInvoicesScreen({Key? key}) : super(key: key);

  @override
  State<AliphiaInvoicesScreen> createState() => _AliphiaInvoicesScreenState();
}

class _AliphiaInvoicesScreenState extends State<AliphiaInvoicesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  void _filterInvoices(String query) {
    setState(() => _searchQuery = query.toLowerCase());
  }

  List<QueryDocumentSnapshot> _applySearch(List<QueryDocumentSnapshot> docs) {
    if (_searchQuery.isEmpty) return docs;
    return docs.where((doc) {
      final data = doc.data() as Map<String, dynamic>;
      final clientName = (data['client_name'] ?? '').toString().toLowerCase();
      final number = (data['number'] ?? '').toString().toLowerCase();
      return clientName.contains(_searchQuery) || number.contains(_searchQuery);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      appBar: AppBar(
        title: Text('فواتير ألف ياء',
            style: GoogleFonts.cairo(
                fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: Column(
          children: [
            // Sync Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              color: const Color(0xFF2C7A7D).withOpacity(0.1),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.sync, size: 14, color: Color(0xFF2C7A7D)),
                  const SizedBox(width: 6),
                  Text(
                    'مزامنة تلقائية مع ألف ياء',
                    style: GoogleFonts.cairo(
                        fontSize: 12,
                        color: const Color(0xFF2C7A7D),
                        fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            // Search Bar
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: TextField(
                controller: _searchController,
                onChanged: _filterInvoices,
                style: GoogleFonts.cairo(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'ابحث برقم الفاتورة أو اسم العميل...',
                  hintStyle: GoogleFonts.cairo(color: Colors.grey[400]),
                  prefixIcon:
                      const Icon(Icons.search, color: Color(0xFF2C7A7D)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                ),
              ),
            ),
            Expanded(
              child: StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance
                    .collection('aliphia_invoices')
                    .orderBy('date', descending: true)
                    .snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(
                        child: CircularProgressIndicator(
                            color: Color(0xFF2C7A7D)));
                  }
                  if (snapshot.hasError) {
                    return Center(
                      child: Text('خطأ في جلب الفواتير: ${snapshot.error}',
                          style: GoogleFonts.cairo(color: Colors.red)),
                    );
                  }

                  final docs =
                      _applySearch(snapshot.data?.docs ?? []);

                  if (docs.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long,
                              size: 64, color: Colors.grey[300]),
                          const SizedBox(height: 16),
                          Text('لا يوجد فواتير',
                              style: GoogleFonts.cairo(
                                  fontSize: 16, color: Colors.grey[500])),
                        ],
                      ),
                    );
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: docs.length,
                    itemBuilder: (context, index) {
                      final inv =
                          docs[index].data() as Map<String, dynamic>;
                      final total =
                          double.tryParse(inv['total']?.toString() ?? '0') ??
                              0.0;
                      final status =
                          inv['status']?.toString() ?? 'غير محدد';
                      final isPaid = status.toLowerCase() == 'paid' ||
                          status.contains('مدفوع');

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withOpacity(0.02),
                                blurRadius: 10,
                                offset: const Offset(0, 4))
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isPaid
                                    ? const Color(0xFFECFDF5)
                                    : const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                isPaid
                                    ? Icons.check_circle
                                    : Icons.pending_actions,
                                color: isPaid
                                    ? const Color(0xFF059669)
                                    : const Color(0xFFDC2626),
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                          inv['number'] ?? '#INV-000',
                                          style: GoogleFonts.cairo(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              color:
                                                  const Color(0xFF0F172A))),
                                      Text(
                                          '${total.toStringAsFixed(2)} ريال',
                                          style: GoogleFonts.cairo(
                                              fontWeight: FontWeight.w900,
                                              fontSize: 14,
                                              color:
                                                  const Color(0xFF0F172A))),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(inv['client_name'] ?? 'بدون عميل',
                                      style: GoogleFonts.cairo(
                                          fontSize: 12,
                                          color: Colors.grey[700])),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(Icons.calendar_today,
                                          size: 12, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Text(
                                          inv['date'] ?? 'بدون تاريخ',
                                          style: GoogleFonts.cairo(
                                              fontSize: 11,
                                              color: Colors.grey[600])),
                                    ],
                                  ),
                                ],
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
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Add invoice logic
        },
        backgroundColor: const Color(0xFF2C7A7D),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
