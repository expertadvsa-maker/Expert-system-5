import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:ui';
import 'login_screen.dart';
import 'package:flutter_animate/flutter_animate.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;

  final TextEditingController _baseUrlController = TextEditingController();
  final TextEditingController _geminiKeyController = TextEditingController();
  final TextEditingController _aliUserController = TextEditingController();
  final TextEditingController _aliPassController = TextEditingController();
  final TextEditingController _aliKeyController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _baseUrlController.text = prefs.getString('baseUrl') ?? 'http://127.0.0.1:3000';
      _geminiKeyController.text = prefs.getString('geminiKey') ?? '';
      _aliUserController.text = prefs.getString('aliphiaUser') ?? '';
      _aliPassController.text = prefs.getString('aliphiaPass') ?? '';
      _aliKeyController.text = prefs.getString('aliphiaKey') ?? '';
    });
  }

  Future<void> _saveSetting(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  void _showConfigDialog(String title, List<Widget> fields, VoidCallback onSave) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(title, style: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 16)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: fields,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('إلغاء', style: GoogleFonts.cairo(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () {
                onSave();
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('تم الحفظ بنجاح!', style: GoogleFonts.cairo()),
                    backgroundColor: const Color(0xFF10B981),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2C7A7D),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text('حفظ', style: GoogleFonts.cairo(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, {bool obscure = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.cairo(fontSize: 12),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      body: Stack(
        children: [
          // Background Gradient Ornaments
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF38BDF8).withOpacity(0.15),
                boxShadow: [BoxShadow(color: const Color(0xFF38BDF8).withOpacity(0.1), blurRadius: 100)],
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF2C7A7D).withOpacity(0.15),
                boxShadow: [BoxShadow(color: const Color(0xFF2C7A7D).withOpacity(0.1), blurRadius: 100)],
              ),
            ),
          ),
          
          SafeArea(
            child: Column(
              children: [
                _buildAppBar(),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
                    physics: const BouncingScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildProfileCard().animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0, curve: Curves.easeOutQuad),
                        const SizedBox(height: 32),

                        Text(
                          'التحكم العام',
                          style: GoogleFonts.cairo(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF0F172A),
                          ),
                        ).animate().fadeIn(delay: 100.ms).slideX(begin: 0.1, end: 0),
                        const SizedBox(height: 16),
                        
                        _buildSettingsContainer([
                          _buildSwitchSetting('تفعيل الإشعارات الميدانية', Icons.notifications_active_outlined, _notificationsEnabled, (val) {
                            setState(() => _notificationsEnabled = val);
                          }),
                          _buildDivider(),
                          _buildNavigationSetting('إعدادات الربط مع ألف ياء ERP', Icons.sync_rounded, onTap: () {
                            _showConfigDialog(
                              'إعدادات نظام ألف ياء ERP',
                              [
                                _buildTextField('اسم المستخدم للـ API', _aliUserController),
                                _buildTextField('كلمة المرور', _aliPassController, obscure: true),
                                _buildTextField('مفتاح API', _aliKeyController),
                              ],
                              () {
                                _saveSetting('aliphiaUser', _aliUserController.text);
                                _saveSetting('aliphiaPass', _aliPassController.text);
                                _saveSetting('aliphiaKey', _aliKeyController.text);
                              },
                            );
                          }),
                        ]).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1, end: 0),
                        
                        const SizedBox(height: 32),
                        Text(
                          'النظام الذكي والمحاكاة',
                          style: GoogleFonts.cairo(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF0F172A),
                          ),
                        ).animate().fadeIn(delay: 300.ms).slideX(begin: 0.1, end: 0),
                        const SizedBox(height: 16),
                        
                        _buildSettingsContainer([
                          _buildNavigationSetting('إعدادات الذكاء الاصطناعي (بشرى)', Icons.auto_awesome, onTap: () {
                            _showConfigDialog(
                              'إعدادات مفتاح Gemini',
                              [
                                _buildTextField('Gemini API Key', _geminiKeyController),
                                Text('احصل على المفتاح من Google AI Studio والصقه هنا.', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey)),
                              ],
                              () {
                                _saveSetting('geminiKey', _geminiKeyController.text);
                              },
                            );
                          }),
                          _buildDivider(),
                          _buildNavigationSetting('إعدادات سيرفر الاتصال', Icons.dns_outlined, onTap: () {
                            _showConfigDialog(
                              'إعدادات مسار السيرفر الأساسي',
                              [
                                _buildTextField('رابط السيرفر (Base URL)', _baseUrlController),
                                Text('مثال: http://192.168.1.5:3000', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey)),
                              ],
                              () {
                                _saveSetting('baseUrl', _baseUrlController.text);
                              },
                            );
                          }),
                          _buildDivider(),
                          _buildNavigationSetting('وضع تقليل استهلاك البيانات', Icons.data_saver_on_outlined, onTap: () {}),
                        ]).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1, end: 0),

                        const SizedBox(height: 50),
                        Center(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              Navigator.pushAndRemoveUntil(
                                context,
                                MaterialPageRoute(builder: (context) => const LoginScreen()),
                                (route) => false,
                              );
                            },
                            icon: const Icon(Icons.logout, color: Colors.white, size: 20),
                            label: Text(
                              'تسجيل الخروج من النظام',
                              style: GoogleFonts.cairo(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Colors.white,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFEF4444),
                              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 0,
                            ),
                          ),
                        ).animate().fadeIn(delay: 500.ms).scale(begin: const Offset(0.9, 0.9), curve: Curves.elasticOut),
                        const SizedBox(height: 60),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
              child: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF0F172A), size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          Text(
            'الإعدادات',
            style: GoogleFonts.cairo(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(width: 48), // Balance for centering
        ],
      ),
    );
  }

  Widget _buildProfileCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.8),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2C7A7D).withOpacity(0.08),
            blurRadius: 30,
            offset: const Offset(0, 10),
          )
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF2C7A7D), Color(0xFF38BDF8)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [BoxShadow(color: const Color(0xFF2C7A7D).withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 5))],
            ),
            child: const Center(
              child: Icon(Icons.person, color: Colors.white, size: 34),
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'أحمد المدير',
                  style: GoogleFonts.cairo(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                Text(
                  'مدير النظام الميداني',
                  style: GoogleFonts.cairo(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF2C7A7D),
                  ),
                ),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: const Icon(Icons.edit_rounded, color: Color(0xFF64748B)),
              onPressed: () {},
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsContainer(List<Widget> children) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.7),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 20,
                offset: const Offset(0, 10),
              )
            ],
          ),
          child: Column(
            children: children,
          ),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Divider(height: 1, indent: 64, endIndent: 24, color: Colors.grey.withOpacity(0.15));
  }

  Widget _buildSwitchSetting(String title, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: value ? const Color(0xFF10B981).withOpacity(0.1) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: value ? const Color(0xFF10B981) : const Color(0xFF64748B), size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: GoogleFonts.cairo(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF334155),
              ),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xFF10B981),
            activeTrackColor: const Color(0xFF10B981).withOpacity(0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationSetting(String title, IconData icon, {required VoidCallback onTap}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF2C7A7D).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: const Color(0xFF2C7A7D), size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.cairo(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF334155),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B), size: 20),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

