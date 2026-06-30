import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AliphiaQuotationsScreen extends StatefulWidget {
  const AliphiaQuotationsScreen({Key? key}) : super(key: key);

  @override
  State<AliphiaQuotationsScreen> createState() => _AliphiaQuotationsScreenState();
}

class _AliphiaQuotationsScreenState extends State<AliphiaQuotationsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      appBar: AppBar(
        title: Text('عروض الأسعار', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              color: const Color(0xFF2C7A7D).withOpacity(0.08),
              child: Row(
                children: [
                  const Icon(Icons.sync, size: 14, color: Color(0xFF2C7A7D)),
                  const SizedBox(width: 6),
                  Text('مزامنة تلقائية مع ألف ياء', style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF2C7A7D))),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: TextField(
                controller: _searchController,
                onChanged: (v) => setState(() => _searchQuery = v),
                style: GoogleFonts.cairo(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'ابحث برقم العرض أو اسم العميل...',
                  hintStyle: GoogleFonts.cairo(color: Colors.grey[400]),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF2C7A7D)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                ),
              ),
            ),
            Expanded(
              child: StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance
                    .collection('aliphia_quotes')
                    .orderBy('syncedAt', descending: true)
                    .snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
                  }
                  var docs = snapshot.data?.docs ?? [];
                  if (_searchQuery.isNotEmpty) {
                    docs = docs.where((d) {
                      final data = d.data() as Map<String, dynamic>;
                      final client = (data['client_name'] ?? '').toString().toLowerCase();
                      final number = (data['number'] ?? '').toString().toLowerCase();
                      return client.contains(_searchQuery.toLowerCase()) || number.contains(_searchQuery.toLowerCase());
                    }).toList();
                  }
                  if (docs.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.description_outlined, size: 64, color: Colors.grey[300]),
                          const SizedBox(height: 16),
                          Text('لا يوجد عروض أسعار بعد', style: GoogleFonts.cairo(fontSize: 16, color: Colors.grey[500])),
                          const SizedBox(height: 8),
                          Text('افتح المنصة وستظهر هنا تلقائياً', style: GoogleFonts.cairo(fontSize: 12, color: Colors.grey[400])),
                        ],
                      ),
                    );
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: docs.length,
                    itemBuilder: (context, index) {
                      final quote = docs[index].data() as Map<String, dynamic>;
                      final total = double.tryParse(quote['total']?.toString() ?? '0') ?? 0.0;
                      final status = quote['status']?.toString() ?? '';
                      final isAccepted = status.toLowerCase() == 'accepted' || status.contains('مقبول');
                      final statusColors = {
                        'accepted': const Color(0xFF059669),
                        'مقبول': const Color(0xFF059669),
                        'pending': const Color(0xFFD97706),
                        'معلق': const Color(0xFFD97706),
                        'rejected': const Color(0xFFDC2626),
                        'مرفوض': const Color(0xFFDC2626),
                      };
                      final statusColor = statusColors[status.toLowerCase()] ?? const Color(0xFF6B7280);
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border(right: BorderSide(color: statusColor, width: 4)),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(quote['number']?.toString() ?? '#', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF0F172A))),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: statusColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    isAccepted ? 'مقبول' : (status.isEmpty ? 'معلق' : status),
                                    style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(quote['client_name']?.toString() ?? 'بدون عميل', style: GoogleFonts.cairo(fontSize: 13, color: Colors.grey[700])),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_today, size: 12, color: Colors.grey),
                                    const SizedBox(width: 4),
                                    Text(quote['date']?.toString() ?? '', style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[600])),
                                  ],
                                ),
                                Text('${total.toStringAsFixed(2)} ريال', style: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 15, color: const Color(0xFF0F172A))),
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
        ),
      ),
    );
  }
}
