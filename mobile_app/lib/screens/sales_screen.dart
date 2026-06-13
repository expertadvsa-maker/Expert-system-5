import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/firebase_service.dart';
import '../services/server_api_service.dart';

class SalesScreen extends StatefulWidget {
  final FirebaseService firebaseService;
  final ServerApiService apiService;

  const SalesScreen({Key? key, required this.firebaseService, required this.apiService}) : super(key: key);

  @override
  _SalesScreenState createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _clientSearchQuery = '';
  String _quoteSearchQuery = '';
  String _invoiceSearchQuery = '';
  Future<List<dynamic>>? _quotesFuture;
  Future<List<dynamic>>? _invoicesFuture;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _quotesFuture = widget.apiService.fetchAliphiaQuotes();
    _invoicesFuture = widget.apiService.fetchAliphiaInvoices();
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
          'المبيعات وعروض الأسعار',
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
            Tab(text: 'العملاء'),
            Tab(text: 'عروض الأسعار'),
            Tab(text: 'الفواتير'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildClientsTab(),
          _buildQuotesTab(),
          _buildInvoicesTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        onPressed: () {
          if (_tabController.index == 0) {
            _showCreateClientSheet();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('سيتم تفعيل الميزة قريباً', style: GoogleFonts.cairo())),
            );
          }
        },
        backgroundColor: const Color(0xFF2C7A7D),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildClientsTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _clientSearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث عن عميل...',
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
            stream: FirebaseFirestore.instance.collection('clients').snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
              }
              if (snapshot.hasError) {
                return Center(child: Text('حدث خطأ في جلب بيانات العملاء', style: GoogleFonts.cairo()));
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return _buildPlaceholderTab('لا يوجد عملاء مسجلين', Icons.people_outline);
              }

              final docs = snapshot.data!.docs.where((doc) {
                final data = doc.data() as Map<String, dynamic>;
                final name = (data['name'] ?? '').toString().toLowerCase();
                final phone = (data['phone'] ?? '').toString().toLowerCase();
                final q = _clientSearchQuery.toLowerCase();
                return name.contains(q) || phone.contains(q);
              }).toList();

              if (docs.isEmpty) {
                return _buildPlaceholderTab('لم يتم العثور على عملاء مطابقين للبحث', Icons.search_off);
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                physics: const BouncingScrollPhysics(),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final data = docs[index].data() as Map<String, dynamic>;
                  final name = data['name'] ?? 'عميل بدون اسم';
                  final phone = data['phone'] ?? 'لا يوجد رقم';
                  final email = data['email'] ?? '';
                  final status = data['status'] ?? 'active';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
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
                          child: Center(
                            child: Text(
                              name.toString().isNotEmpty ? name.toString().substring(0, 1) : 'ع',
                              style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D)),
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
                                style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                              ),
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

  Widget _buildQuotesTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _quoteSearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث عن عرض سعر (بالرقم أو العميل)...',
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
          child: RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _quotesFuture = widget.apiService.fetchAliphiaQuotes();
              });
            },
            color: const Color(0xFF2C7A7D),
            child: FutureBuilder<List<dynamic>>(
              future: _quotesFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text('حدث خطأ في جلب عروض الأسعار من ألف ياء', style: GoogleFonts.cairo(), textAlign: TextAlign.center),
                    ),
                  );
                }
                final list = snapshot.data ?? [];
                if (list.isEmpty) {
                  return _buildPlaceholderTab('لا توجد عروض أسعار مسجلة في ألف ياء', Icons.request_quote_outlined);
                }

                final filteredList = list.where((quote) {
                  final number = (quote['quote_number'] ?? quote['number'] ?? '').toString().toLowerCase();
                  final client = (quote['client_name'] ?? quote['client'] ?? '').toString().toLowerCase();
                  final q = _quoteSearchQuery.toLowerCase();
                  return number.contains(q) || client.contains(q);
                }).toList();

                if (filteredList.isEmpty) {
                  return _buildPlaceholderTab('لم يتم العثور على عروض أسعار مطابقة للبحث', Icons.search_off);
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  itemCount: filteredList.length,
                  itemBuilder: (context, index) {
                    final quote = filteredList[index] as Map<String, dynamic>;
                    final number = quote['quote_number'] ?? quote['number'] ?? 'N/A';
                    final clientName = quote['client_name'] ?? quote['client'] ?? 'عميل غير محدد';
                    final date = quote['quote_date_created'] ?? quote['date'] ?? '';
                    final total = double.tryParse(quote['quote_total']?.toString() ?? quote['total']?.toString() ?? '0') ?? 0.0;
                    
                    final statusId = quote['quote_status_id']?.toString() ?? '1';
                    String statusText = 'مسودة';
                    Color statusColor = Colors.grey;
                    if (statusId == '2') {
                      statusText = 'مرسل';
                      statusColor = Colors.blue;
                    } else if (statusId == '3') {
                      statusText = 'مرفوض';
                      statusColor = Colors.red;
                    } else if (statusId == '4') {
                      statusText = 'مقبول';
                      statusColor = Colors.green;
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
                              color: Color(0xFFEFF6FF),
                              shape: BoxShape.circle,
                            ),
                            child: const Center(
                              child: Icon(Icons.request_quote_outlined, color: Colors.blue),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  number,
                                  style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                                ),
                                Text(clientName, style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[600])),
                                const SizedBox(height: 4),
                                Text('التاريخ: $date', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[400])),
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
                                  borderRadius: BorderRadius.circular(20),
                                ),
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
                                '${total.toStringAsFixed(2)} ر.س',
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
        ),
      ],
    );
  }

  Widget _buildInvoicesTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: TextField(
            onChanged: (val) => setState(() => _invoiceSearchQuery = val),
            decoration: InputDecoration(
              hintText: 'ابحث عن فاتورة (بالرقم أو العميل)...',
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
          child: RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _invoicesFuture = widget.apiService.fetchAliphiaInvoices();
              });
            },
            color: const Color(0xFF2C7A7D),
            child: FutureBuilder<List<dynamic>>(
              future: _invoicesFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D)));
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text('حدث خطأ في جلب الفواتير من ألف ياء', style: GoogleFonts.cairo(), textAlign: TextAlign.center),
                    ),
                  );
                }
                final list = snapshot.data ?? [];
                if (list.isEmpty) {
                  return _buildPlaceholderTab('لا توجد فواتير مصدرة في ألف ياء', Icons.receipt_long_outlined);
                }

                final filteredList = list.where((inv) {
                  final number = (inv['invoice_number'] ?? inv['number'] ?? '').toString().toLowerCase();
                  final client = (inv['client_name'] ?? inv['client'] ?? '').toString().toLowerCase();
                  final q = _invoiceSearchQuery.toLowerCase();
                  return number.contains(q) || client.contains(q);
                }).toList();

                if (filteredList.isEmpty) {
                  return _buildPlaceholderTab('لم يتم العثور على فواتير مطابقة للبحث', Icons.search_off);
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  itemCount: filteredList.length,
                  itemBuilder: (context, index) {
                    final inv = filteredList[index] as Map<String, dynamic>;
                    final number = inv['invoice_number'] ?? inv['number'] ?? 'N/A';
                    final clientName = inv['client_name'] ?? inv['client'] ?? 'عميل غير مححدد';
                    final date = inv['invoice_date_created'] ?? inv['date'] ?? '';
                    final total = double.tryParse(inv['invoice_total']?.toString() ?? inv['total']?.toString() ?? '0') ?? 0.0;
                    
                    final statusId = inv['invoice_status_id']?.toString() ?? '1';
                    String statusText = 'غير مدفوع';
                    Color statusColor = Colors.red;
                    if (statusId == '2') {
                      statusText = 'مدفوع';
                      statusColor = Colors.green;
                    } else if (statusId == '3') {
                      statusText = 'مدفوع جزئياً';
                      statusColor = Colors.orange;
                    } else if (statusId == '4') {
                      statusText = 'متأخر';
                      statusColor = const Color(0xFF991B1B);
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
                              child: Icon(Icons.receipt_long_outlined, color: Colors.orange),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  number,
                                  style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                                ),
                                Text(clientName, style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[600])),
                                const SizedBox(height: 4),
                                Text('التاريخ: $date', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[400])),
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
                                  borderRadius: BorderRadius.circular(20),
                                ),
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
                                '${total.toStringAsFixed(2)} ر.س',
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

  void _showCreateClientSheet() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final companyCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final taxNumCtrl = TextEditingController();

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
                  Text('إضافة عميل جديد', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 16),
                  _buildTextField(nameCtrl, 'اسم العميل *', Icons.person),
                  const SizedBox(height: 12),
                  _buildTextField(phoneCtrl, 'رقم الجوال *', Icons.phone, TextInputType.phone),
                  const SizedBox(height: 12),
                  _buildTextField(emailCtrl, 'البريد الإلكتروني', Icons.email, TextInputType.emailAddress),
                  const SizedBox(height: 12),
                  _buildTextField(companyCtrl, 'الشركة / المؤسسة', Icons.business),
                  const SizedBox(height: 12),
                  _buildTextField(addressCtrl, 'العنوان', Icons.location_on),
                  const SizedBox(height: 12),
                  _buildTextField(taxNumCtrl, 'الرقم الضريبي', Icons.receipt),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (nameCtrl.text.isEmpty || phoneCtrl.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('يرجى تعبئة الحقول الإجبارية *', style: GoogleFonts.cairo())));
                          return;
                        }
                        Navigator.pop(context);
                        await widget.firebaseService.addClient({
                          'name': nameCtrl.text.trim(),
                          'phone': phoneCtrl.text.trim(),
                          'email': emailCtrl.text.trim(),
                          'company': companyCtrl.text.trim(),
                          'address': addressCtrl.text.trim(),
                          'taxNumber': taxNumCtrl.text.trim(),
                        });
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تم إضافة العميل بنجاح', style: GoogleFonts.cairo()), backgroundColor: const Color(0xFF10B981)));
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2C7A7D),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('حفظ العميل', style: GoogleFonts.cairo(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
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
}
