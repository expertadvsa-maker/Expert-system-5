import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';
import 'today_dashboard.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:local_auth/local_auth.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  void _login() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الرجاء إدخال البريد الإلكتروني وكلمة المرور')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found' || e.code == 'wrong-password' || e.code == 'invalid-credential') {
        try {
          await FirebaseAuth.instance.createUserWithEmailAndPassword(
            email: email,
            password: password,
          );
        } catch (regError) {
          if (mounted) {
            setState(() => _isLoading = false);
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('خطأ في التسجيل: $regError')));
          }
          return;
        }
      } else {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل الدخول: ${e.message}')));
        }
        return;
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('حدث خطأ بالاتصال: $e')));
      }
      return;
    }

    if (mounted) {
      setState(() => _isLoading = false);
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const TodayDashboard()));
    }
  }

  Future<void> _signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) return;
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final OAuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      await FirebaseAuth.instance.signInWithCredential(credential);
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const TodayDashboard()));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تعذر تسجيل الدخول بجوجل، الرجاء مراجعة الإعدادات.')));
    }
  }

  Future<void> _authenticateWithBiometrics() async {
    final LocalAuthentication auth = LocalAuthentication();
    try {
      final bool canAuthenticateWithBiometrics = await auth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await auth.isDeviceSupported();
      if (!canAuthenticate) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('جهازك لا يدعم البصمة')));
        return;
      }

      final bool didAuthenticate = await auth.authenticate(
        localizedReason: 'يرجى المصادقة بالبصمة لتسجيل الدخول',
        options: const AuthenticationOptions(biometricOnly: true),
      );

      if (didAuthenticate) {
        if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const TodayDashboard()));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('حدث خطأ أثناء قراءة البصمة.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // Background Gradient Orbs
          Positioned(
            top: -50,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF2C7A7D).withOpacity(0.4)),
            ),
          ),
          Positioned(
            bottom: -100,
            left: -100,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF10B981).withOpacity(0.2)),
            ),
          ),
          BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
            child: Container(color: Colors.transparent),
          ),
          
          // Content directly on screen (No bounding card)
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 40.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ClipOval(
                    child: Container(
                      color: Colors.white,
                      padding: const EdgeInsets.all(4),
                      child: ClipOval(
                        child: Image.asset('assets/logo.jpg', width: 120, height: 120, fit: BoxFit.cover),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'تسجيل الدخول',
                    style: GoogleFonts.cairo(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'مرحباً بك مجدداً في خبراء الرسم',
                    style: GoogleFonts.cairo(fontSize: 14, color: Colors.white70),
                  ),
                  const SizedBox(height: 50),
                  
                  // Email Field
                  TextField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    style: GoogleFonts.cairo(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'البريد الإلكتروني',
                      labelStyle: GoogleFonts.cairo(color: Colors.white54),
                      prefixIcon: const Icon(Icons.email_outlined, color: Colors.white54),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.08),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFF10B981))),
                    ),
                  ),
                  const SizedBox(height: 20),
                  
                  // Password Field
                  TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: GoogleFonts.cairo(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'كلمة المرور',
                      labelStyle: GoogleFonts.cairo(color: Colors.white54),
                      prefixIcon: const Icon(Icons.lock_outline, color: Colors.white54),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: Colors.white54),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.08),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFF10B981))),
                    ),
                  ),
                  const SizedBox(height: 10),
                  
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () {},
                      child: Text('نسيت كلمة المرور؟', style: GoogleFonts.cairo(color: const Color(0xFF10B981), fontSize: 13, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 30),
                  
                  // Login Button
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _login,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2C7A7D),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 8,
                        shadowColor: const Color(0xFF2C7A7D).withOpacity(0.5),
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Text('دخول', style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 20),
                  
                  // Quick Actions (Google & Fingerprint)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _signInWithGoogle,
                          icon: const Icon(Icons.g_mobiledata, size: 28, color: Colors.white),
                          label: Text('جوجل', style: GoogleFonts.cairo(color: Colors.white, fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.white.withOpacity(0.3)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _authenticateWithBiometrics,
                          icon: const Icon(Icons.fingerprint, size: 22, color: Colors.white),
                          label: Text('البصمة', style: GoogleFonts.cairo(color: Colors.white, fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.white.withOpacity(0.3)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
