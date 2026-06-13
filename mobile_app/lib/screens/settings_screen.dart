import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:ui';
import 'login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _erpSyncEnabled = true;

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
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Text(
          'الإعدادات',
          style: GoogleFonts.cairo(
            fontWeight: FontWeight.w900,
            color: const Color(0xFF0F172A),
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildProfileCard(),
            const SizedBox(height: 24),

            Text(
              'التحكم العام',
              style: GoogleFonts.cairo(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 12),
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
            ]),
            
            const SizedBox(height: 24),
            Text(
              'النظام الذكي والمحاكاة',
              style: GoogleFonts.cairo(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 12),
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
                    Text('مثال: http://127.0.0.1:3000', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey)),
                  ],
                  () {
                    _saveSetting('baseUrl', _baseUrlController.text);
                  },
                );
              }),
              _buildDivider(),
              _buildNavigationSetting('وضع تقليل استهلاك البيانات', Icons.data_saver_on_outlined, onTap: () {}),
            ]),

            const SizedBox(height: 40),
            Center(
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (context) => const LoginScreen()),
                    (route) => false,
                  );
                },
                icon: const Icon(Icons.logout, color: Colors.white),
                label: Text(
                  'تسجيل الخروج',
                  style: GoogleFonts.cairo(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  elevation: 5,
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 5),
          )
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: const Color(0xFFE6F4F4),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF2C7A7D), width: 2),
            ),
            child: const Center(
              child: Icon(Icons.person, color: Color(0xFF2C7A7D), size: 30),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'أحمد المدير',
                  style: GoogleFonts.cairo(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                Text(
                  'مدير النظام',
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    color: const Color(0xFF2C7A7D),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: Colors.grey),
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsContainer(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        children: children,
      ),
    );
  }

  Widget _buildDivider() {
    return Divider(height: 1, indent: 60, endIndent: 20, color: Colors.grey.withOpacity(0.1));
  }

  Widget _buildSwitchSetting(String title, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: const Color(0xFF64748B), size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: GoogleFonts.cairo(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF334155),
              ),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xFF10B981),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationSetting(String title, IconData icon, {required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: const Color(0xFF64748B), size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: GoogleFonts.cairo(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF334155),
                ),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}

