import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/firebase_service.dart';
import '../services/server_api_service.dart';
import 'aliphia_clients_screen.dart';
import 'aliphia_invoices_screen.dart';
import 'aliphia_quotations_screen.dart';

class SalesScreen extends StatelessWidget {
  final FirebaseService firebaseService;
  final ServerApiService apiService;

  const SalesScreen({Key? key, required this.firebaseService, required this.apiService}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      appBar: AppBar(
        title: Text('المبيعات وألف ياء', style: GoogleFonts.cairo(fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'الربط السحابي (ألف ياء ERP)',
                style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),
              Text(
                'إدارة مبيعاتك وفواتيرك وعملائك المتزامنة مع السحابة بشكل فوري.',
                style: GoogleFonts.cairo(fontSize: 13, color: Colors.grey[600]),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: ListView(
                  children: [
                    _buildNavCard(
                      context: context,
                      title: 'العملاء',
                      subtitle: 'إدارة وتتبع عملائك',
                      icon: Icons.people,
                      color: const Color(0xFF3B82F6), // Blue
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => const AliphiaClientsScreen()));
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildNavCard(
                      context: context,
                      title: 'الفواتير',
                      subtitle: 'متابعة وتحصيل الفواتير',
                      icon: Icons.receipt_long,
                      color: const Color(0xFF10B981), // Green
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => const AliphiaInvoicesScreen()));
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildNavCard(
                      context: context,
                      title: 'عروض الأسعار',
                      subtitle: 'تقديم ومتابعة عروض الأسعار الذكية',
                      icon: Icons.request_quote,
                      color: const Color(0xFF8B5CF6), // Purple
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => const AliphiaQuotationsScreen()));
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.08),
              blurRadius: 15,
              offset: const Offset(0, 8),
            )
          ],
          border: Border.all(color: color.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color, size: 32),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.cairo(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_left, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }
}
