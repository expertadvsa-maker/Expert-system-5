import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/today_dashboard.dart';
import 'screens/onboarding_screen.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Force update old base URL if still pointing to 192.168.1.6:3000
  try {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString('baseUrl') == 'http://192.168.1.6:3000') {
      await prefs.setString('baseUrl', 'http://127.0.0.1:3000');
      print('🔄 Base URL auto-migrated to http://127.0.0.1:3000');
    }
  } catch (e) {
    print('Error migrating base URL: $e');
  }
  
  // تهيئة الفايربيس برمجياً بشكل مستقل ليعمل على كافة الأجهزة (الأندرويد، الآيفون، والويب)
  // باستخدام نفس إعدادات قاعدة البيانات المشتركة مع منصة الويب
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print('✅ Firebase initialized successfully programmatically.');
    
  } catch (e) {
    print('⚠️ Firebase initialization/login failed: $e');
  }

  runApp(const ExpertSystemApp());
}

class ExpertSystemApp extends StatelessWidget {
  const ExpertSystemApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'خبراء الرسم',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF4F7FA), // Light grey background
        primaryColor: const Color(0xFF0F172A), // Dark slate
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2C7A7D), // Primary accent (Teal)
          primary: const Color(0xFF2C7A7D),
          secondary: const Color(0xFF38BDF8), // Light blue accent
          surface: Colors.white,
          background: const Color(0xFFF4F7FA),
        ),
        cardTheme: CardTheme(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: Colors.grey.withOpacity(0.1), width: 1),
          ),
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: false,
          iconTheme: IconThemeData(color: Color(0xFF0F172A)),
        ),
        textTheme: GoogleFonts.cairoTextTheme(
          Theme.of(context).textTheme,
        ),
      ),
      home: StreamBuilder<User?>(
        stream: FirebaseAuth.instance.authStateChanges(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(body: Center(child: CircularProgressIndicator(color: Color(0xFF2C7A7D))));
          }
          if (snapshot.hasData && snapshot.data != null) {
            return const TodayDashboard();
          }
          return const OnboardingScreen();
        },
      ),
    );
  }
}
