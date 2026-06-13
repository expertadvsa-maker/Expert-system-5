import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';
import 'login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({Key? key}) : super(key: key);

  @override
  _OnboardingScreenState createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, String>> _pages = [
    {
      'title': 'المساعد الميداني الذكي',
      'description': 'ارفع تقاريرك الصوتية والنصية وسيقوم المساعد الذكي بتحليلها وربطها بالمشاريع تلقائياً.',
      'icon': 'auto_awesome'
    },
    {
      'title': 'ماسح ضوئي ذكي للفواتير',
      'description': 'صور الفواتير ومستخلصات الشراء وسيقوم الذكاء الاصطناعي باستخراج تفاصيلها ورفعها للمنصة المحاسبية.',
      'icon': 'document_scanner'
    },
    {
      'title': 'إدارة لحظية للفريق',
      'description': 'تتبع الحضور والغياب للعمالة الميدانية، واسند المهام، وراقب الميزانية والمصروفات من مكان واحد.',
      'icon': 'groups'
    },
  ];

  IconData _getIconData(String iconStr) {
    switch (iconStr) {
      case 'auto_awesome':
        return Icons.auto_awesome;
      case 'document_scanner':
        return Icons.document_scanner;
      case 'groups':
        return Icons.groups;
      default:
        return Icons.star;
    }
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
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
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF2C7A7D).withOpacity(0.4),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -100,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF10B981).withOpacity(0.3),
              ),
            ),
          ),
          // Blur Layer
          BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
            child: Container(color: Colors.transparent),
          ),
          // Content
          SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    onPageChanged: (index) {
                      setState(() {
                        _currentPage = index;
                      });
                    },
                    itemCount: _pages.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white.withOpacity(0.05),
                                border: Border.all(color: Colors.white.withOpacity(0.1)),
                              ),
                              child: index == 0 
                                ? ClipOval(child: Image.asset('assets/logo.jpg', width: 120, height: 120, fit: BoxFit.cover))
                                : Icon(
                                    _getIconData(_pages[index]['icon']!),
                                    size: 100,
                                    color: const Color(0xFF2C7A7D),
                                  ),
                            ),
                            const SizedBox(height: 60),
                            Text(
                              _pages[index]['title']!,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.cairo(
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 20),
                            Text(
                              _pages[index]['description']!,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.cairo(
                                fontSize: 14,
                                height: 1.6,
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                // Indicators and Next Button
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40.0, vertical: 40.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: List.generate(
                          _pages.length,
                          (index) => AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.only(right: 8),
                            height: 8,
                            width: _currentPage == index ? 24 : 8,
                            decoration: BoxDecoration(
                              color: _currentPage == index
                                  ? const Color(0xFF10B981)
                                  : Colors.white.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: _nextPage,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(50),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF2C7A7D).withOpacity(0.8),
                                borderRadius: BorderRadius.circular(50),
                                border: Border.all(color: Colors.white.withOpacity(0.2)),
                              ),
                              child: Row(
                                children: [
                                  Text(
                                    _currentPage == _pages.length - 1 ? 'ابدأ الآن' : 'التالي',
                                    style: GoogleFonts.cairo(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
