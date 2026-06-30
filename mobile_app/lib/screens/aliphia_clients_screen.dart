import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AliphiaClientsScreen extends StatefulWidget {
  const AliphiaClientsScreen({Key? key}) : super(key: key);

  @override
  State<AliphiaClientsScreen> createState() => _AliphiaClientsScreenState();
}

class _AliphiaClientsScreenState extends State<AliphiaClientsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  void _filterClients(String query) {
    setState(() => _searchQuery = query.toLowerCase());
  }

  List<QueryDocumentSnapshot> _applySearch(List<QueryDocumentSnapshot> docs) {
    if (_searchQuery.isEmpty) return docs;
    return docs.where((doc) {
      final data = doc.data() as Map<String, dynamic>;
      final name = (data['name'] ?? '').toString().toLowerCase();
      final company = (data['company'] ?? '').toString().toLowerCase();
      return name.contains(_searchQuery) || company.contains(_searchQuery);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      appBar: AppBar(
        title: Text('عملاء ألف ياء',
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
                onChanged: _filterClients,
                style: GoogleFonts.cairo(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'ابحث عن عميل بالاسم أو الشركة...',
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
                    .collection('aliphia_clients')
                    .snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(
                        child: CircularProgressIndicator(
                            color: Color(0xFF2C7A7D)));
                  }
                  if (snapshot.hasError) {
                    return Center(
                      child: Text('خطأ في جلب العملاء: ${snapshot.error}',
                          style: GoogleFonts.cairo(color: Colors.red)),
                    );
                  }

                  final docs = _applySearch(snapshot.data?.docs ?? []);

                  if (docs.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.people_outline,
                              size: 64, color: Colors.grey[300]),
                          const SizedBox(height: 16),
                          Text('لا يوجد عملاء',
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
                      final client =
                          docs[index].data() as Map<String, dynamic>;
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
                            CircleAvatar(
                              radius: 24,
                              backgroundColor:
                                  const Color(0xFF2C7A7D).withOpacity(0.1),
                              child: const Icon(Icons.person,
                                  color: Color(0xFF2C7A7D)),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(client['name'] ?? 'بدون اسم',
                                      style: GoogleFonts.cairo(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                          color: const Color(0xFF0F172A))),
                                  if (client['company'] != null &&
                                      client['company'].toString().isNotEmpty)
                                    Text(client['company'],
                                        style: GoogleFonts.cairo(
                                            fontSize: 12,
                                            color: Colors.grey[600])),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(Icons.phone,
                                          size: 12, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Text(
                                          client['phone'] ?? 'لا يوجد رقم',
                                          style: GoogleFonts.cairo(
                                              fontSize: 11,
                                              color: Colors.grey[600])),
                                      const SizedBox(width: 12),
                                      const Icon(Icons.email,
                                          size: 12, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Flexible(
                                        child: Text(
                                            client['email'] ?? 'لا يوجد إيميل',
                                            style: GoogleFonts.cairo(
                                                fontSize: 11,
                                                color: Colors.grey[600]),
                                            overflow: TextOverflow.ellipsis),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.chevron_left,
                                  color: Colors.grey),
                              onPressed: () {
                                // TODO: Open client details
                              },
                            )
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
          // TODO: Add client logic
        },
        backgroundColor: const Color(0xFF2C7A7D),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
