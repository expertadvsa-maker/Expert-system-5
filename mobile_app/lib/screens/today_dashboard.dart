import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:audioplayers/audioplayers.dart';
import '../services/firebase_service.dart';
import '../services/server_api_service.dart';
import 'projects_screen.dart';
import 'scanner_screen.dart';
import 'alerts_screen.dart';
import 'more_screen.dart';
import 'sales_screen.dart';
import 'dart:ui';
import 'dart:io';
import 'purchases_screen.dart';
import 'worker_profile_screen.dart';
import 'settings_screen.dart';
import 'employee_profile_screen.dart';
import 'subcontractors_screen.dart';
import 'assets_screen.dart';

class TodayDashboard extends StatefulWidget {
  const TodayDashboard({Key? key}) : super(key: key);

  @override
  _TodayDashboardState createState() => _TodayDashboardState();
}

class _TodayDashboardState extends State<TodayDashboard> {
  final FirebaseService _firebaseService = FirebaseService();
  final ServerApiService _apiService = ServerApiService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  // الاشتراكات لتلقي تحديثات البيانات الحية من Firestore
  StreamSubscription? _settingsSub;
  StreamSubscription? _projectsSub;
  StreamSubscription? _pendingSub;
  StreamSubscription? _transactionsSub;
  StreamSubscription? _workerTransactionsSub;
  StreamSubscription? _workersSub;
  StreamSubscription? _employeesSub;
  StreamSubscription? _attendanceSub;

  // قيم المؤشرات الحية من قاعدة البيانات
  double _income = 0.0;
  double _expenses = 0.0;
  double _workerExpense = 0.0;
  double _totalPurchases = 0.0;
  int _activeProjects = 0;
  int _pendingApprovals = 0;
  int _criticalAlerts = 0;
  int _employeesCount = 0;
  int _activeWorkers = 0;
  int _todayAttendance = 0;

  // قيم الإعدادات العامة
  String _companyName = 'خبراء الرسم';
  String _announcement = '';
  int _gpsRadius = 100;

  // التبويب النشط حالياً في الشريط السفلي
  int _currentTabIndex = 2;

  // المساعد الصوتي للتقرير الصباحي الذكي
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isAudioPlaying = false;
  bool _isAudioLoading = false;

  // البحث والتصفية للمهام التشغيلية
  String _taskSearchQuery = '';
  String _taskStatusFilter = 'all'; // all | pending | completed

  DateTime _parseDateTime(dynamic field) {
    if (field == null) return DateTime.fromMillisecondsSinceEpoch(0);
    if (field is Timestamp) return field.toDate();
    if (field is String) return DateTime.tryParse(field) ?? DateTime.fromMillisecondsSinceEpoch(0);
    return DateTime.fromMillisecondsSinceEpoch(0);
  }

  String _formatDate(dynamic field) {
    if (field == null) return '';
    if (field is Timestamp) {
      final dt = field.toDate();
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
    }
    if (field is String) return field.contains('T') ? field.split('T')[0] : field;
    return field.toString();
  }

  @override
  void initState() {
    super.initState();
    _listenToFirebaseData();
    _audioPlayer.onPlayerComplete.listen((event) {
      if (mounted) {
        setState(() {
          _isAudioPlaying = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _settingsSub?.cancel();
    _projectsSub?.cancel();
    _pendingSub?.cancel();
    _transactionsSub?.cancel();
    _workerTransactionsSub?.cancel();
    _workersSub?.cancel();
    _employeesSub?.cancel();
    _attendanceSub?.cancel();
    _audioPlayer.dispose();
    super.dispose();
  }

  /// الاستماع لقاعدة البيانات الحية (Firestore) ومزامنة المؤشرات مع المنصة فوراً
  void _listenToFirebaseData() {
    // 1. الاستماع لإعدادات النظام واسم الشركة والإعلان العام
    _settingsSub = _firebaseService.getSystemSettings().listen((snap) {
      if (snap != null && snap.exists) {
        final data = snap.data() as Map<String, dynamic>?;
        if (data != null) {
          setState(() {
            _companyName = data['companyName'] ?? 'خبراء الرسم';
            _announcement = data['generalAnnouncement'] ?? '';
            _gpsRadius = int.tryParse(data['attendanceRadius']?.toString() ?? '100') ?? 100;
          });
        }
      }
    });

    // 2. الاستماع لعدد المشاريع النشطة
    _projectsSub = _firebaseService.getActiveProjects().listen((snap) {
      if (snap != null) {
        setState(() {
          _activeProjects = snap.docs.length;
        });
      }
    });

    // 3. الاستماع لطلبات الشراء والاعتمادات المعلقة
    _pendingSub = _firebaseService.getPendingApprovals().listen((snap) {
      if (snap != null) {
        setState(() {
          _pendingApprovals = snap.docs.length;
        });
      }
    });

    // 4. الاستماع للحركات المالية لحساب الأرباح والخسائر والإنذارات
    _transactionsSub = _firebaseService.getTodayTransactions().listen((snap) {
      if (snap != null) {
        double tempIncome = 0.0;
        double tempExpenses = 0.0;
        double tempPurchases = 0.0;
        int criticalCount = 0;

        final ninetyDaysAgo = DateTime.now().subtract(const Duration(days: 90));

        for (var doc in snap.docs) {
          final data = doc.data() as Map<String, dynamic>?;
          if (data != null) {
            double amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
            String type = data['type']?.toString() ?? 'expense';
            String status = data['status']?.toString() ?? 'pending';
            DateTime txDate = _parseDateTime(data['createdAt'] ?? data['date']);

            // إحصائيات آخر 90 يوم
            if (txDate.isAfter(ninetyDaysAgo)) {
              if (status == 'approved' || status == 'completed') {
                if (type == 'income') {
                  tempIncome += amount;
                } else if (type == 'expense') {
                  tempExpenses += amount;
                } else if (type == 'purchase') {
                  tempPurchases += amount;
                }
              }
            }

            if (status == 'rejected') {
              criticalCount++;
            }
          }
        }

        setState(() {
          _income = tempIncome;
          _expenses = tempExpenses;
          _totalPurchases = tempPurchases;
          _criticalAlerts = criticalCount;
        });
      }
    });

    // 5. الاستماع لمصروفات العمالة
    _workerTransactionsSub = _firebaseService.getWorkerTransactions().listen((snap) {
      if (snap != null) {
        double tempWorkerExpense = 0.0;
        for (var doc in snap.docs) {
          final data = doc.data() as Map<String, dynamic>?;
          if (data != null && data['type'] == 'payment') {
            double amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
            tempWorkerExpense += amount;
          }
        }
        setState(() {
          _workerExpense = tempWorkerExpense;
        });
      }
    });

    // 6. الاستماع للعمال النشطين
    _workersSub = _firebaseService.getWorkers().listen((snap) {
      if (snap != null) {
        setState(() {
          _activeWorkers = snap.docs.length;
        });
      }
    });

    // 7. الاستماع للموظفين المسجلين في شؤون الموظفين
    _employeesSub = _firebaseService.getSystemUsers().listen((snap) {
      if (snap != null) {
        setState(() {
          _employeesCount = snap.docs.length;
        });
      }
    });

    // 8. الاستماع لحضور اليوم
    _attendanceSub = _firebaseService.getTodayAttendance().listen((snap) {
      if (snap != null) {
        setState(() {
          _todayAttendance = snap.docs.length;
        });
      }
    });
  }

  // منطق النص التكيفي التلقائي بناءً على معطيات الخزينة والمصروفات
  Map<String, dynamic> _getFinancialStatus() {
    double totalExpenses = _expenses + _workerExpense;
    double net = _income - totalExpenses;

    if (_income == 0.0 && totalExpenses == 0.0) {
      return {
        'title': 'لا توجد حركات مالية مسجلة اليوم',
        'desc': 'لم يتم تسجيل أي إيرادات أو مصروفات حتى الآن في النظام.',
        'color': const Color(0xFF64748B), 
        'bgColor': const Color(0xFFF1F5F9),
        'netText': '0.0 ر.س',
        'isDeficit': false,
      };
    }

    if (net >= 0) {
      return {
        'title': 'الوضع مستقر، والقرار عندك في 3 نقاط.',
        'desc': 'صافي اليوم إيجابي. الميزانيات مرصودة والواردات تغطي النفقات بالكامل.',
        'color': const Color(0xFF2C7A7D), // زمردي
        'bgColor': const Color(0xFFE6F4F4),
        'netText': '${_formatCurrency(net)} ر.س',
        'isDeficit': false,
      };
    } else {
      return {
        'title': 'عجز مؤقت - أقل من ميزانية المشاريع.',
        'desc': 'المصاريف تجاوزت الواردات مؤقتاً بقيمة ${_formatCurrency(net.abs())} ر.س بسبب فواتير معلقة.',
        'color': const Color(0xFFEF4444), // أحمر دافئ
        'bgColor': const Color(0xFFFEF2F2),
        'netText': '${_formatCurrency(net)} ر.س',
        'isDeficit': true,
      };
    }
  }

  // توليد التنبيهات الحية بناءً على معطيات Firestore الحقيقية
  List<Map<String, dynamic>> _getLiveAlerts() {
    List<Map<String, dynamic>> alerts = [];
    if (_pendingApprovals > 0) {
      alerts.add({
        'id': 'pur',
        'text': '$_pendingApprovals طلبات شراء معلقة تنتظر موافقتك الآن',
        'type': 'amber',
        'icon': Icons.shopping_bag,
        'action': () => _showApprovalsSheet(),
      });
    }
    double totalExpenses = _expenses + _workerExpense;
    if (_income > 0 && totalExpenses > _income * 0.8) {
      alerts.add({
        'id': 'exp',
        'text': 'المصروفات الحالية تجاوزت 80% من إجمالي الدخل لهذا الشهر!',
        'type': 'red',
        'icon': Icons.warning_amber_rounded,
        'action': () => _showFinancialsSheet(),
      });
    }
    if (_employeesCount > 0 && _todayAttendance < _employeesCount * 0.5) {
      alerts.add({
        'id': 'att',
        'text': 'حضور منخفض اليوم: $_todayAttendance حاضرين فقط من أصل $_employeesCount',
        'type': 'blue',
        'icon': Icons.people,
        'action': () => _showEmployeesSheet(),
      });
    }
    return alerts;
  }

  String _formatCurrency(double n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toStringAsFixed(0);
  }

  /// طلب تشغيل التقرير الصوتي المسموع بالعامية السعودية من السيرفر
  Future<void> _playVoiceReport() async {
    if (_isAudioPlaying) {
      await _audioPlayer.stop();
      setState(() => _isAudioPlaying = false);
      return;
    }

    setState(() {
      _isAudioLoading = true;
    });

    try {
      final stats = {
        'income': _income > 0 ? _income : 125000.0,
        'expenses': (_expenses + _workerExpense) > 0 ? (_expenses + _workerExpense) : 167000.0,
        'net': _income - (_expenses + _workerExpense),
        'pendingPurchases': _pendingApprovals,
        'activeProjects': _activeProjects,
        'totalWorkers': _activeWorkers,
        'totalEmployees': _employeesCount,
        'todayAttendance': _todayAttendance,
      };

      final audioBytes = await _apiService.generateSpeechReport(
        stats: stats,
        voiceFocus: 'all',
      );

      final tempDir = Directory.systemTemp;
      final tempFile = File('${tempDir.path}/morning_report.wav');
      await tempFile.writeAsBytes(audioBytes);
      await _audioPlayer.play(DeviceFileSource(tempFile.path));

      setState(() {
        _isAudioLoading = false;
        _isAudioPlaying = true;
      });
    } catch (e) {
      setState(() => _isAudioLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'فشل تشغيل التقرير: ${e.toString()}',
            textDirection: TextDirection.rtl,
            style: GoogleFonts.cairo(),
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _getFinancialStatus();

    // قائمة الشاشات الخاصة بالتبويبات
    final List<Widget> screens = [
      MoreScreen(firebaseService: _firebaseService, apiService: _apiService),
      AlertsScreen(
        firebaseService: _firebaseService,
        onNavigateToTab: (index) {
          setState(() {
            _currentTabIndex = index;
          });
        },
      ),
      _buildTodayTabBody(status),
      ProjectsScreen(firebaseService: _firebaseService),
      SalesScreen(firebaseService: _firebaseService, apiService: _apiService),
      PurchasesScreen(firebaseService: _firebaseService, apiService: _apiService),
      const SizedBox(), // Menu tab handled via openEndDrawer()
    ];

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: const Color(0xFFF1F5F9), // Lighter background for floating effect
      appBar: _buildAppBar(),
      endDrawer: SizedBox(
        width: MediaQuery.of(context).size.width * 0.45, // Reduced by ~40%
        child: _buildSideDrawer(context),
      ),
      body: Stack(
        children: [
          screens[_currentTabIndex],
          // Swipe Hint for hidden drawer
          Positioned(
            right: 0,
            top: MediaQuery.of(context).size.height / 3,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF2C7A7D).withOpacity(0.9),
                borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), bottomLeft: Radius.circular(12)),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4, offset: const Offset(-2, 0))],
              ),
              child: RotatedBox(
                quarterTurns: 3,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.keyboard_double_arrow_up, color: Colors.white, size: 12),
                    const SizedBox(width: 4),
                    Text('اسحب للقائمة', style: GoogleFonts.cairo(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        onPressed: () {
          setState(() => _currentTabIndex = 2);
          Navigator.push(context, MaterialPageRoute(builder: (context) => ScannerScreen(firebaseService: _firebaseService, apiService: _apiService)));
        },
        backgroundColor: const Color(0xFF2C7A7D),
        elevation: 8,
        child: const Icon(Icons.qr_code_scanner, color: Colors.white),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      bottomNavigationBar: _buildBottomNavBar(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.transparent, // Floating App Bar effect
      elevation: 0,
      centerTitle: false,
      actions: [
        Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_none, color: Color(0xFF0F172A), size: 24),
              onPressed: () {
                setState(() {
                  _currentTabIndex = 1; // Switches to AlertsScreen tab
                });
              },
            ),
            if (_pendingApprovals + _criticalAlerts > 0)
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: Text(
                    '${_pendingApprovals + _criticalAlerts}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
      ],
      title: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: Color(0xFF2C7A7D),
               shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                _companyName.isNotEmpty ? _companyName.substring(0, 1) : 'خ',
                style: GoogleFonts.cairo(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'لوحة التحكم',
                style: GoogleFonts.cairo(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                ),
              ),
              Text(
                _companyName,
                style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500], fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSideDrawer(BuildContext context) {
    return Drawer(
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: Container(
          color: Colors.white,
          child: Column(
            children: [
              // ترويسة القائمة الجانبية المدمجة
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(top: 50, bottom: 20, right: 16, left: 16),
                decoration: const BoxDecoration(
                  color: Color(0xFF0F172A),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(20),
                    bottomRight: Radius.circular(20),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // صورة المستخدم
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF2C7A7D), width: 2),
                      ),
                      child: const CircleAvatar(
                        radius: 26,
                        backgroundColor: Color(0xFF1E293B),
                        child: Icon(Icons.person, color: Colors.white, size: 28),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // اسم المستخدم
                    Text(
                      'أبو أحمد (المدير)',
                      style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    // اسم الشركة ونظام الإدارة
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$_companyName - نظام الإدارة',
                        style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[400]),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

              // خيارات القائمة
              Expanded(
                child: ListView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  children: [
                    _buildDrawerItem(Icons.dashboard_outlined, 'الرئيسية', () {
                      Navigator.pop(context);
                      setState(() => _currentTabIndex = 2);
                    }, isSelected: _currentTabIndex == 2),
                    _buildDrawerItem(Icons.bolt_outlined, 'موجز AI', () {
                      Navigator.pop(context);
                    }),

                    const Divider(height: 10, color: Colors.black12),
                    _buildDrawerItem(Icons.business_center_outlined, 'المشاريع', () {
                      Navigator.pop(context);
                      setState(() => _currentTabIndex = 3);
                    }, isSelected: _currentTabIndex == 3),
                    _buildDrawerItem(Icons.assignment_outlined, 'المهام', () {
                      Navigator.pop(context);
                      _showCreateTaskBottomSheet();
                    }, trailingIcon: Icons.add),
                    _buildDrawerItem(Icons.handyman_outlined, 'المقاولين', () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (context) => SubcontractorsScreen(firebaseService: _firebaseService)));
                    }),
                    _buildDrawerItem(Icons.inventory_2_outlined, 'المخزون والمواد', () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (context) => AssetsScreen(firebaseService: _firebaseService)));
                    }),
                    _buildDrawerItem(Icons.architecture_outlined, 'الأصول والمعدات', () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (context) => AssetsScreen(firebaseService: _firebaseService)));
                    }),

                    const Divider(height: 10, color: Colors.black12),
                    _buildDrawerItem(Icons.point_of_sale_outlined, 'المبيعات', () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (context) => SalesScreen(firebaseService: _firebaseService, apiService: _apiService)));
                    }),
                    _buildDrawerItem(Icons.star_outline, 'المقاولات الخاصة', () {
                      Navigator.pop(context);
                    }),
                    _buildDrawerItem(Icons.support_agent_outlined, 'إدارة المناديب', () {
                      Navigator.pop(context);
                    }),
                    _buildDrawerItem(Icons.shopping_cart_outlined, 'المشتريات', () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (context) => PurchasesScreen(firebaseService: _firebaseService, apiService: _apiService)));
                    }),
                    _buildDrawerItem(Icons.local_shipping_outlined, 'الموردين', () {
                      Navigator.pop(context);
                    }),
                    _buildDrawerItem(Icons.qr_code_scanner, 'الماسح الذكي', () {
                      Navigator.pop(context);
                      setState(() => _currentTabIndex = 4);
                    }),

                    const Divider(height: 10, color: Colors.black12),
                    _buildDrawerItem(Icons.account_balance_wallet_outlined, 'المالية', () {
                      Navigator.pop(context);
                      _showFinancialsSheet();
                    }),
                    _buildDrawerItem(Icons.receipt_long_outlined, 'المصروفات', () {
                      Navigator.pop(context);
                      _showLedgerSheet();
                    }),
                    _buildDrawerItem(Icons.account_balance_outlined, 'البنوك والخزينة', () {
                      Navigator.pop(context);
                      _showFinancialsSheet();
                    }),
                    _buildDrawerItem(Icons.check_circle_outline, 'الاعتمادات', () {
                      Navigator.pop(context);
                      _showApprovalsSheet();
                    }, badge: _pendingApprovals > 0 ? '$_pendingApprovals معلقة' : null),

                    const Divider(height: 10, color: Colors.black12),
                    _buildDrawerItem(Icons.people_outline, 'الموظفين', () {
                      Navigator.pop(context);
                      _showEmployeesSheet();
                    }),
                    _buildDrawerItem(Icons.gps_fixed_outlined, 'الحضور والغياب', () {
                      Navigator.pop(context);
                      setState(() => _currentTabIndex = 1);
                    }, isSelected: _currentTabIndex == 1),
                    _buildDrawerItem(Icons.payments_outlined, 'الرواتب', () {
                      Navigator.pop(context);
                    }),
                    _buildDrawerItem(Icons.construction_outlined, 'العمالة اليومية', () {
                      Navigator.pop(context);
                      _showWorkersSheet();
                    }),
                    _buildDrawerItem(Icons.star_half_outlined, 'تقييم الأداء', () {
                      Navigator.pop(context);
                    }),

                    const Divider(height: 10, color: Colors.black12),
                    _buildDrawerItem(Icons.pie_chart_outline, 'التقارير', () {
                      Navigator.pop(context);
                    }),
                    _buildDrawerItem(Icons.photo_library_outlined, 'المعرض', () {
                      Navigator.pop(context);
                    }),
                    _buildDrawerItem(Icons.folder_open_outlined, 'الأرشيف', () {
                      Navigator.pop(context);
                    }),
                    _buildDrawerItem(Icons.description_outlined, 'العقود والمستندات', () {
                      Navigator.pop(context);
                    }),
                    _buildDrawerItem(Icons.settings_outlined, 'إعدادات النظام', () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (context) => const SettingsScreen()));
                    }),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDrawerSection(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      child: Text(
        title,
        style: GoogleFonts.cairo(
          fontSize: 9,
          fontWeight: FontWeight.bold,
          color: Colors.grey[500],
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  Widget _buildDrawerItem(IconData icon, String title, VoidCallback onTap, {String? badge, IconData? trailingIcon, bool isSelected = false}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: isSelected
          ? BoxDecoration(
              color: const Color(0xFF2C7A7D).withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            )
          : null,
      child: ListTile(
        dense: true,
        leading: Icon(icon, color: isSelected ? const Color(0xFF2C7A7D) : const Color(0xFF475569), size: 19),
        title: Text(
          title,
          style: GoogleFonts.cairo(
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
            color: isSelected ? const Color(0xFF2C7A7D) : const Color(0xFF0F172A),
          ),
        ),
        trailing: badge != null
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(color: const Color(0xFFFEE2E2)),
                ),
                child: Text(
                  badge,
                  style: GoogleFonts.cairo(fontSize: 8, fontWeight: FontWeight.bold, color: const Color(0xFFEF4444)),
                ),
              )
            : trailingIcon != null
                ? Icon(trailingIcon, size: 16, color: const Color(0xFF2C7A7D))
                : null,
        onTap: onTap,
      ),
    );
  }

  Widget _buildTodayTabBody(Map<String, dynamic> status) {
    final liveAlerts = _getLiveAlerts();

    return DefaultTabController(
      length: 3,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. ترويسة التاريخ والإعلان
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'لوحة التحكم الميدانية',
                      style: GoogleFonts.cairo(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      'اليوم، ' + DateTime.now().toIso8601String().split('T')[0],
                      style: GoogleFonts.cairo(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
              if (_announcement.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                  child: _buildAnnouncementBanner(),
                ),

              // 2. شريط التبويبات (Tabs)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    )
                  ],
                ),
                child: TabBar(
                  indicator: BoxDecoration(
                    color: const Color(0xFF2C7A7D),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.grey[600],
                  labelStyle: GoogleFonts.cairo(fontWeight: FontWeight.bold, fontSize: 13),
                  unselectedLabelStyle: GoogleFonts.cairo(fontWeight: FontWeight.w600, fontSize: 13),
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: Colors.transparent,
                  tabs: const [
                    Tab(text: 'نظرة عامة'),
                    Tab(text: 'العمليات'),
                    Tab(text: 'الكادر والمالية'),
                  ],
                ),
              ),

              // 3. محتوى التبويبات (Tab Views)
              Expanded(
                child: TabBarView(
                  children: [
                    // التبويب الأول: نظرة عامة
                    SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSmartSummaryCard(status),
                          const SizedBox(height: 16),
                          if (liveAlerts.isNotEmpty) ...[
                            _buildLiveAlertsSection(liveAlerts),
                            const SizedBox(height: 16),
                          ],
                          _buildIndicatorsSection(status['netText'], status['color']),
                          const SizedBox(height: 16),
                          _buildQuickActionsGrid(),
                          const SizedBox(height: 30), // padding
                        ],
                      ),
                    ),

                    // التبويب الثاني: العمليات والمهام
                    SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildTasksManagerSection(),
                          const SizedBox(height: 30), // padding
                        ],
                      ),
                    ),

                    // التبويب الثالث: الكادر والمالية
                    SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildTransactionsAndWorkersSection(),
                          const SizedBox(height: 30), // padding
                        ],
                      ),
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

  Widget _buildAnnouncementBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        children: [
          const Icon(Icons.campaign, color: Color(0xFFD97706), size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _announcement,
              style: GoogleFonts.cairo(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF92400E),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSmartSummaryCard(Map<String, dynamic> status) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.white.withOpacity(0.6), Colors.white.withOpacity(0.2)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withOpacity(0.8), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF2C7A7D).withOpacity(0.05),
                blurRadius: 20,
                offset: const Offset(0, 10),
              )
            ],
          ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'الموجز الذكي الصباحي',
                style: GoogleFonts.cairo(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[450],
                ),
              ),
              GestureDetector(
                onTap: _playVoiceReport,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F172A),
                    shape: BoxShape.circle,
                  ),
                  child: _isAudioLoading
                      ? const Padding(
                          padding: EdgeInsets.all(8.0),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Icon(
                          _isAudioPlaying ? Icons.pause : Icons.volume_up,
                          color: Colors.white,
                          size: 16,
                        ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            status['title'],
            style: GoogleFonts.cairo(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            status['desc'],
            style: GoogleFonts.cairo(
              fontSize: 12,
              color: Colors.grey[500],
              height: 1.4,
            ),
          ),
          if (_isAudioPlaying) ...[
            const SizedBox(height: 10),
            Row(
              children: List.generate(
                8,
                (index) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 3,
                  height: 10.0 + (index % 3) * 6,
                  decoration: BoxDecoration(
                    color: status['color'],
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              _buildTag('مالي حقيقي', status['color'], status['bgColor']),
              const SizedBox(width: 8),
              _buildTag('تحضير GPS', const Color(0xFF475569), const Color(0xFFF1F5F9)),
              const SizedBox(width: 8),
              _buildTag('ألف ياء ERP', const Color(0xFF475569), const Color(0xFFF1F5F9)),
            ],
          )
        ],
      ),
        ),
      ),
    );
  }

  Widget _buildTag(String text, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        text,
        style: GoogleFonts.cairo(
          fontSize: 10,
          color: textColor,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildLiveAlertsSection(List<Map<String, dynamic>> alerts) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: alerts.map((alert) {
        Color mainColor = const Color(0xFF2C7A7D);
        Color bgColor = const Color(0xFFE6F4F4);
        if (alert['type'] == 'red') {
          mainColor = const Color(0xFFEF4444);
          bgColor = const Color(0xFFFEF2F2);
        } else if (alert['type'] == 'amber') {
          mainColor = const Color(0xFFD97706);
          bgColor = const Color(0xFFFFFBEB);
        } else if (alert['type'] == 'blue') {
          mainColor = const Color(0xFF2563EB);
          bgColor = const Color(0xFFEFF6FF);
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 6),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: mainColor.withOpacity(0.15)),
          ),
          child: InkWell(
            onTap: alert['action'] as VoidCallback?,
            child: Row(
              children: [
                Icon(alert['icon'] as IconData, color: mainColor, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    alert['text'] as String,
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: mainColor,
                    ),
                  ),
                ),
                Icon(Icons.chevron_left, color: mainColor.withOpacity(0.5), size: 16),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildIndicatorsSection(String netText, Color netColor) {
    double totalExpenses = _expenses + _workerExpense;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'مؤشرات الأداء العامة (آخر 90 يوم)',
          style: GoogleFonts.cairo(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 8),
        // المؤشرات المالية
        Row(
          children: [
            _buildIndicatorCard('الواردات', _formatCurrency(_income), const Color(0xFF10B981), const Color(0xFFECFDF5)),
            _buildIndicatorCard('المصاريف', _formatCurrency(totalExpenses), const Color(0xFFEF4444), const Color(0xFFFEF2F2)),
            _buildIndicatorCard('صافي الربح', netText, netColor, netColor.withOpacity(0.08)),
            _buildIndicatorCard('طلبات معلقة', '$_pendingApprovals', const Color(0xFFF59E0B), const Color(0xFFFEF3C7)),
          ],
        ),
        const SizedBox(height: 6),
        // المؤشرات التشغيلية
        Row(
          children: [
            _buildIndicatorCard('المشاريع النشطة', '$_activeProjects', const Color(0xFF6366F1), const Color(0xFFEEF2FF)),
            _buildIndicatorCard('عمال اليومية', '$_activeWorkers', const Color(0xFF14B8A6), const Color(0xFFF0FDF4)),
            _buildIndicatorCard('الفريق الكلي', '$_employeesCount', const Color(0xFF64748B), const Color(0xFFF8FAFC)),
            _buildIndicatorCard('الحضور اليوم', '$_todayAttendance', const Color(0xFF3B82F6), const Color(0xFFEFF6FF)),
          ],
        ),
      ],
    );
  }

  Widget _buildIndicatorCard(String title, String value, Color color, Color bgColor) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.grey.withOpacity(0.06)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.circle, color: color, size: 6),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.cairo(
                fontSize: 9,
                color: Colors.grey[500],
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              value,
              style: GoogleFonts.cairo(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionsGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'وصول سريع',
          style: GoogleFonts.cairo(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _buildQuickActionItem(Icons.add_task, 'مهمة', () => _showCreateTaskBottomSheet(), const Color(0xFF6366F1), const Color(0xFFEEF2FF)),
            _buildQuickActionItem(Icons.star_outline, 'اعتمادات', () => _showApprovalsSheet(), const Color(0xFFF59E0B), const Color(0xFFFEF3C7)),
            _buildQuickActionItem(Icons.account_balance_wallet_outlined, 'المالية', () => _showFinancialsSheet(), const Color(0xFF10B981), const Color(0xFFECFDF5)),
            _buildQuickActionItem(Icons.auto_awesome, 'ذكاء ميداني', () => _showAiFieldInsightSheet(), const Color(0xFF8B5CF6), const Color(0xFFF5F3FF)),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActionItem(IconData icon, String label, VoidCallback onTap, Color color, Color bgColor) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.6),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withOpacity(0.8), width: 1),
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: bgColor.withOpacity(0.8),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: GoogleFonts.cairo(
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                  color: const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTasksManagerSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'إدارة العمليات والمهام المشتركة',
                    style: GoogleFonts.cairo(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  Text(
                    'تتبع ومزامنة المهام المرتبطة بأقسام المنصة المختلفة',
                    style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500]),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.add_circle_outline, color: Color(0xFF2C7A7D), size: 20),
                onPressed: () => _showCreateTaskBottomSheet(),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // شريط البحث
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.search, color: Colors.grey, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    onChanged: (val) {
                      setState(() {
                        _taskSearchQuery = val.trim();
                      });
                    },
                    style: GoogleFonts.cairo(fontSize: 11),
                    decoration: InputDecoration(
                      hintText: 'ابحث بالاسم أو التفاصيل...',
                      hintStyle: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[400]),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // أزرار التصفية
          Row(
            children: [
              _buildFilterTab('all', 'الكل'),
              const SizedBox(width: 6),
              _buildFilterTab('pending', 'المعلقة'),
              const SizedBox(width: 6),
              _buildFilterTab('completed', 'المكتملة'),
            ],
          ),
          const SizedBox(height: 12),

          // قائمة المهام الحية من Firestore
          StreamBuilder<QuerySnapshot?>(
            stream: _firebaseService.getGeneralTasks(),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(child: Text('خطأ في تحميل المهام', style: GoogleFonts.cairo(fontSize: 11)));
              }
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: Padding(
                  padding: EdgeInsets.all(12.0),
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)),
                ));
              }

              final docs = snapshot.data?.docs ?? [];
              // تصفية المهام برمجياً في الذاكرة لتجنب Composite Indexes
              final filteredTasks = docs.where((doc) {
                final data = doc.data() as Map<String, dynamic>;
                if (data['archived'] == true) return false;

                // تصفية البحث
                final title = data['title']?.toString().toLowerCase() ?? '';
                final desc = data['description']?.toString().toLowerCase() ?? '';
                if (_taskSearchQuery.isNotEmpty &&
                    !title.contains(_taskSearchQuery.toLowerCase()) &&
                    !desc.contains(_taskSearchQuery.toLowerCase())) {
                  return false;
                }

                // تصفية الحالة
                final status = data['status'] ?? 'pending';
                if (_taskStatusFilter != 'all' && status != _taskStatusFilter) {
                  return false;
                }

                return true;
              }).toList();

              if (filteredTasks.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      children: [
                        const Icon(Icons.playlist_add_check, color: Colors.grey, size: 28),
                        const SizedBox(height: 8),
                        Text(
                          'لا توجد مهام مطابقة حالياً',
                          style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredTasks.length,
                itemBuilder: (context, index) {
                  final doc = filteredTasks[index];
                  final data = doc.data() as Map<String, dynamic>;
                  final taskId = doc.id;
                  final title = data['title'] ?? 'مهمة عامة';
                  final description = data['description'] ?? '';
                  final status = data['status'] ?? 'pending';
                  final priority = data['priority'] ?? 'medium';
                  final taskType = data['taskType'] ?? 'none';
                  final entityName = data['linkedEntityName'] ?? '';
                  final dueDate = data['dueDate'] ?? '';
                  final completed = status == 'completed';

                  Color priorityColor = Colors.grey;
                  String priorityText = 'عادية';
                  if (priority == 'high') {
                    priorityColor = Colors.red;
                    priorityText = 'عاجلة';
                  } else if (priority == 'medium') {
                    priorityColor = Colors.amber;
                    priorityText = 'متوسطة';
                  }

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: completed ? const Color(0xFFF8FAFC) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.withOpacity(0.06)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // دائرة اختيار الحالة
                        InkWell(
                          onTap: () => _firebaseService.toggleGeneralTaskStatus(taskId, data),
                          child: Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: completed ? const Color(0xFF10B981) : Colors.transparent,
                              border: Border.all(color: completed ? const Color(0xFF10B981) : Colors.grey),
                            ),
                            child: completed
                                ? const Icon(Icons.check, size: 12, color: Colors.white)
                                : null,
                          ),
                        ),
                        const SizedBox(width: 10),

                        // محتوى المهمة
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      title,
                                      style: GoogleFonts.cairo(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: completed ? Colors.grey : const Color(0xFF0F172A),
                                        decoration: completed ? TextDecoration.lineThrough : null,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: priorityColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(100),
                                    ),
                                    child: Text(
                                      priorityText,
                                      style: GoogleFonts.cairo(fontSize: 8, color: priorityColor, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              if (description.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  description,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.cairo(fontSize: 9.5, color: Colors.grey[500]),
                                ),
                              ],
                              const SizedBox(height: 4),

                              // معلومات نوع المهمة والارتباط
                              Wrap(
                                spacing: 4,
                                runSpacing: 2,
                                children: [
                                  if (taskType == 'project' && entityName.isNotEmpty)
                                    _buildSmallTag('📁 مشروع: $entityName', const Color(0xFF6366F1), const Color(0xFFEEF2FF))
                                  else if (taskType == 'purchases' && entityName.isNotEmpty)
                                    _buildSmallTag('🛒 مورد: $entityName', const Color(0xFFD97706), const Color(0xFFFFFBEB))
                                  else if (taskType == 'inventory')
                                    _buildSmallTag('📦 مخزن: ${data['inventoryAction'] ?? "جرد"}', const Color(0xFF14B8A6), const Color(0xFFF0FDF4))
                                  else
                                    _buildSmallTag('عامة مستقلة', const Color(0xFF64748B), const Color(0xFFF8FAFC)),

                                  if (dueDate.isNotEmpty)
                                    _buildSmallTag('⏳ الاستحقاق: $dueDate', const Color(0xFFEF4444), const Color(0xFFFEF2F2)),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // زر الحذف/الأرشفة للمهمة
                        IconButton(
                          icon: const Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                          onPressed: () => _firebaseService.archiveGeneralTask(taskId),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ],
      );
  }

  Widget _buildFilterTab(String id, String label) {
    bool active = _taskStatusFilter == id;
    return InkWell(
      onTap: () {
        setState(() {
          _taskStatusFilter = id;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 9.5,
            fontWeight: FontWeight.bold,
            color: active ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildSmallTag(String text, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: GoogleFonts.cairo(fontSize: 8, color: textColor, fontWeight: FontWeight.bold),
      ),
    );
  }

  void _showAiFieldInsightSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), shape: BoxShape.circle),
                    child: const Icon(Icons.auto_awesome, color: Color(0xFFFBBF24), size: 24),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('الذكاء الميداني', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      Text('AI FIELD ANALYSIS', style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500], letterSpacing: 1.0)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
                child: Text(
                  'استناداً لمؤشر المشاريع، الإنفاق مستقر مع وجود $_pendingApprovals طلبات توريد معلقة. يُنصح بتعميد فواتير الكلادينج بالسرعة الممكنة لتفادي تأخير استحقاق اليوميات.',
                  style: GoogleFonts.cairo(fontSize: 12, color: Colors.white.withOpacity(0.9), height: 1.5),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF0F172A),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    setState(() => _currentTabIndex = 0);
                  },
                  child: Text('استشارة الذكاء الاصطناعي "بشرى" ←', style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTransactionsAndWorkersSection() {
    return Column(
      children: [
        // كرت آخر الحركات المالية حياً
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'آخر الحركات المالية بالمنصة',
                        style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                      ),
                      Text(
                        'مزامنة فورية لكافة معاملات الدخل والرواتب والمشتريات',
                        style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Color(0xFF2C7A7D), size: 18),
                    onPressed: () => _showFinancialsSheet(),
                  ),
                ],
              ),
              const Divider(height: 16),
              StreamBuilder<QuerySnapshot?>(
                stream: _firebaseService.getTodayTransactions(),
                builder: (context, snapshot) {
                  if (snapshot.hasError || !snapshot.hasData) {
                    return const SizedBox(height: 40);
                  }
                  final docs = snapshot.data!.docs;
                  if (docs.isEmpty) {
                    return Center(child: Text('لا توجد حركات مالية مسجلة', style: GoogleFonts.cairo(fontSize: 10)));
                  }
                  
                  // ترتيب المعاملات يدوياً بالذاكرة بالوقت الأحدث لتفادي composite indexes
                  final sortedDocs = docs.toList()
                    ..sort((a, b) {
                      final aData = a.data() as Map<String, dynamic>;
                      final bData = b.data() as Map<String, dynamic>;
                      final aTime = _parseDateTime(aData['createdAt'] ?? aData['date']);
                      final bTime = _parseDateTime(bData['createdAt'] ?? bData['date']);
                      return bTime.compareTo(aTime);
                    });

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: sortedDocs.length > 5 ? 5 : sortedDocs.length,
                    itemBuilder: (context, index) {
                      final data = sortedDocs[index].data() as Map<String, dynamic>;
                      final amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
                      final type = data['type'] ?? 'expense';
                      final desc = data['description'] ?? 'عملية مالية';
                      final date = _formatDate(data['date'] ?? data['createdAt']);

                      final isIncome = type == 'income';
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: isIncome ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isIncome ? Icons.trending_up : Icons.trending_down,
                                color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                size: 14,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(desc, style: GoogleFonts.cairo(fontSize: 10.5, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
                                  Text(date, style: GoogleFonts.cairo(fontSize: 8, color: Colors.grey[400])),
                                ],
                              ),
                            ),
                            Text(
                              (isIncome ? '+' : '-') + '${amount.toStringAsFixed(0)} ر.س',
                              style: GoogleFonts.cairo(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),

        const SizedBox(height: 10),

        // كرت العمالة الحالية
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'العمالة الميدانية الحالية',
                        style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                      ),
                      Text(
                        'كادر الفنيين والعمال اليوميين المتواجدين بالعمل',
                        style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Color(0xFF2C7A7D), size: 18),
                    onPressed: () => _showWorkersSheet(),
                  ),
                ],
              ),
              const Divider(height: 16),
              StreamBuilder<QuerySnapshot?>(
                stream: _firebaseService.getWorkers(),
                builder: (context, snapshot) {
                  if (snapshot.hasError || !snapshot.hasData) {
                    return const SizedBox(height: 40);
                  }
                  final docs = snapshot.data!.docs;
                  if (docs.isEmpty) {
                    return Center(child: Text('لا يوجد عمالة مسجلين حالياً', style: GoogleFonts.cairo(fontSize: 10)));
                  }

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: docs.length > 5 ? 5 : docs.length,
                    itemBuilder: (context, index) {
                      final data = docs[index].data() as Map<String, dynamic>;
                      final name = data['name'] ?? 'عامل';
                      final role = data['role'] ?? 'فني';
                      final dailyRate = data['dailyRate'] ?? 0;

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: const BoxDecoration(
                                color: Color(0xFFE6F4F4),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  name.isNotEmpty ? name.substring(0, 1) : 'ع',
                                  style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D)),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(name, style: GoogleFonts.cairo(fontSize: 10.5, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A))),
                                  Text(role, style: GoogleFonts.cairo(fontSize: 8.5, color: Colors.grey[450])),
                                ],
                              ),
                            ),
                            Text(
                              '$dailyRate ر.س / يوم',
                              style: GoogleFonts.cairo(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF2C7A7D),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
      ],
    );
  }

  // ==========================================
  // النوافذ التفاعلية والأوراق المنزلقة (Bottom Sheets)
  // ==========================================

  // 1. ورقة إنشاء مهمة تشغيلية ذكية جديدة
  void _showCreateTaskBottomSheet() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String priority = 'medium';
    String taskType = 'none';
    String linkedEntityId = '';
    String linkedEntityName = '';
    int milestoneWeight = 10;
    double estimatedBudget = 0.0;
    String inventoryAction = 'جرد مخازن';
    DateTime? dueDate;
    List<String> assignedEmployees = [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
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
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'إضافة مهمة تشغيلية جديدة',
                        style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 12),

                      // العنوان
                      TextField(
                        controller: titleController,
                        style: GoogleFonts.cairo(fontSize: 11),
                        decoration: InputDecoration(
                          labelText: 'عنوان المهمة *',
                          labelStyle: GoogleFonts.cairo(fontSize: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // التفاصيل
                      TextField(
                        controller: descController,
                        style: GoogleFonts.cairo(fontSize: 11),
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'وصف أو متطلبات الإنجاز',
                          labelStyle: GoogleFonts.cairo(fontSize: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // الموظفون لإسناد المهمة
                      Text('إسناد وتوجيه الموظفين (اختر من القائمة):', style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[650])),
                      const SizedBox(height: 4),
                      StreamBuilder<QuerySnapshot?>(
                        stream: _firebaseService.getSystemUsers(),
                        builder: (context, userSnap) {
                          if (!userSnap.hasData) return const SizedBox(height: 10);
                          final users = userSnap.data!.docs;
                          return Container(
                            height: 34,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              itemCount: users.length,
                              itemBuilder: (context, i) {
                                final uData = users[i].data() as Map<String, dynamic>;
                                final uId = users[i].id;
                                final uName = uData['name'] ?? 'موظف';
                                final selected = assignedEmployees.contains(uId);

                                return Padding(
                                  padding: const EdgeInsets.only(left: 6.0),
                                  child: FilterChip(
                                    label: Text(uName, style: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.bold)),
                                    selected: selected,
                                    onSelected: (val) {
                                      setModalState(() {
                                        if (val) {
                                          assignedEmployees.add(uId);
                                        } else {
                                          assignedEmployees.remove(uId);
                                        }
                                      });
                                    },
                                    selectedColor: const Color(0xFFE6F4F4),
                                    checkmarkColor: const Color(0xFF2C7A7D),
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 10),

                      // تاريخ الاستحقاق ومستوى السرعة
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: DateTime.now(),
                                  firstDate: DateTime.now(),
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                );
                                if (picked != null) {
                                  setModalState(() => dueDate = picked);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      dueDate == null
                                          ? 'تاريخ الاستحقاق'
                                          : dueDate!.toIso8601String().split('T')[0],
                                      style: GoogleFonts.cairo(fontSize: 10.5),
                                    ),
                                    const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: priority,
                                  style: GoogleFonts.cairo(fontSize: 10.5, color: Colors.black),
                                  isExpanded: true,
                                  onChanged: (val) {
                                    if (val != null) {
                                      setModalState(() => priority = val);
                                    }
                                  },
                                  items: [
                                    DropdownMenuItem(value: 'low', child: Text('عادية الأهمية', style: GoogleFonts.cairo())),
                                    DropdownMenuItem(value: 'medium', child: Text('متوسطة', style: GoogleFonts.cairo())),
                                    DropdownMenuItem(value: 'high', child: Text('عاجلة جداً 🔥', style: GoogleFonts.cairo())),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // نوع المهمة والارتباط
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(14)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('ربط المهمة بقسم المنصة:', style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              decoration: BoxDecoration(color: Colors.white, border: Border.all(color: Colors.grey.withOpacity(0.3)), borderRadius: BorderRadius.circular(10)),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: taskType,
                                  isExpanded: true,
                                  style: GoogleFonts.cairo(fontSize: 10.5, color: Colors.black, fontWeight: FontWeight.bold),
                                  onChanged: (val) {
                                    if (val != null) {
                                      setModalState(() {
                                        taskType = val;
                                        linkedEntityId = '';
                                        linkedEntityName = '';
                                      });
                                    }
                                  },
                                  items: [
                                    DropdownMenuItem(value: 'none', child: Text('عامة مستقلة (غير مرتبطة)', style: GoogleFonts.cairo())),
                                    DropdownMenuItem(value: 'project', child: Text('📁 مرتبطة بمشروع ميداني', style: GoogleFonts.cairo())),
                                    DropdownMenuItem(value: 'purchases', child: Text('🛒 مرتبطة بمورد / مشتريات', style: GoogleFonts.cairo())),
                                    DropdownMenuItem(value: 'inventory', child: Text('📦 مرتبطة بالمستودع والمخازن', style: GoogleFonts.cairo())),
                                  ],
                                ),
                              ),
                            ),

                            // الحقول الديناميكية الشرطية
                            if (taskType == 'project') ...[
                              const SizedBox(height: 8),
                              StreamBuilder<QuerySnapshot?>(
                                stream: _firebaseService.getActiveProjects(),
                                builder: (context, projSnap) {
                                  if (!projSnap.hasData) return const SizedBox();
                                  final projs = projSnap.data!.docs;
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10),
                                    decoration: BoxDecoration(color: Colors.white, border: Border.all(color: Colors.grey.withOpacity(0.3)), borderRadius: BorderRadius.circular(10)),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: linkedEntityId.isEmpty ? null : linkedEntityId,
                                        hint: Text('-- اختر المشروع --', style: GoogleFonts.cairo(fontSize: 10.5)),
                                        isExpanded: true,
                                        style: GoogleFonts.cairo(fontSize: 10.5, color: Colors.black),
                                        onChanged: (val) {
                                          if (val != null) {
                                            final projDoc = projs.firstWhere((element) => element.id == val);
                                            final projTitle = (projDoc.data() as Map<String, dynamic>)['title'] ?? '';
                                            setModalState(() {
                                              linkedEntityId = val;
                                              linkedEntityName = projTitle;
                                            });
                                          }
                                        },
                                        items: projs.map((p) {
                                          final pTitle = (p.data() as Map<String, dynamic>)['title'] ?? 'مشروع';
                                          return DropdownMenuItem(value: p.id, child: Text(pTitle, style: GoogleFonts.cairo()));
                                        }).toList(),
                                      ),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                style: GoogleFonts.cairo(fontSize: 10.5),
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  labelText: 'تأثير المهمة على إنجاز المشروع (%)',
                                  labelStyle: GoogleFonts.cairo(fontSize: 9),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                  isDense: true,
                                ),
                                onChanged: (val) {
                                  milestoneWeight = int.tryParse(val) ?? 10;
                                },
                              ),
                            ],

                            if (taskType == 'purchases') ...[
                              const SizedBox(height: 8),
                              StreamBuilder<QuerySnapshot?>(
                                stream: _firebaseService.getSuppliers(),
                                builder: (context, supSnap) {
                                  if (!supSnap.hasData) return const SizedBox();
                                  final sups = supSnap.data!.docs;
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10),
                                    decoration: BoxDecoration(color: Colors.white, border: Border.all(color: Colors.grey.withOpacity(0.3)), borderRadius: BorderRadius.circular(10)),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: linkedEntityId.isEmpty ? null : linkedEntityId,
                                        hint: Text('-- اختر المورد --', style: GoogleFonts.cairo(fontSize: 10.5)),
                                        isExpanded: true,
                                        style: GoogleFonts.cairo(fontSize: 10.5, color: Colors.black),
                                        onChanged: (val) {
                                          if (val != null) {
                                            final supDoc = sups.firstWhere((element) => element.id == val);
                                            final supName = (supDoc.data() as Map<String, dynamic>)['name'] ?? '';
                                            setModalState(() {
                                              linkedEntityId = val;
                                              linkedEntityName = supName;
                                            });
                                          }
                                        },
                                        items: sups.map((s) {
                                          final sName = (s.data() as Map<String, dynamic>)['name'] ?? 'مورد';
                                          return DropdownMenuItem(value: s.id, child: Text(sName, style: GoogleFonts.cairo()));
                                        }).toList(),
                                      ),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 6),
                              TextField(
                                style: GoogleFonts.cairo(fontSize: 10.5),
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  labelText: 'الميزانية التقديرية التوريدية (ريال)',
                                  labelStyle: GoogleFonts.cairo(fontSize: 9),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                  isDense: true,
                                ),
                                onChanged: (val) {
                                  estimatedBudget = double.tryParse(val) ?? 0.0;
                                },
                              ),
                            ],

                            if (taskType == 'inventory') ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                decoration: BoxDecoration(color: Colors.white, border: Border.all(color: Colors.grey.withOpacity(0.3)), borderRadius: BorderRadius.circular(10)),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: inventoryAction,
                                    isExpanded: true,
                                    style: GoogleFonts.cairo(fontSize: 10.5, color: Colors.black),
                                    onChanged: (val) {
                                      if (val != null) {
                                        setModalState(() => inventoryAction = val);
                                      }
                                    },
                                    items: [
                                      DropdownMenuItem(value: 'جرد مخازن', child: Text('جرد الدوري للمخازن والمستودعات', style: GoogleFonts.cairo())),
                                      DropdownMenuItem(value: 'صرف مواد', child: Text('جدولة وصرف مواد لمشروع ميداني', style: GoogleFonts.cairo())),
                                      DropdownMenuItem(value: 'استلام بضاعة', child: Text('فرز واستلام بضاعة واردة', style: GoogleFonts.cairo())),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // زر الحفظ
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2C7A7D),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              onPressed: () async {
                                final title = titleController.text.trim();
                                if (title.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('يرجى كتابة عنوان المهمة', textDirection: TextDirection.rtl, style: GoogleFonts.cairo())),
                                  );
                                  return;
                                }

                                final Map<String, dynamic> taskData = {
                                  'title': title,
                                  'description': descController.text.trim(),
                                  'priority': priority,
                                  'taskType': taskType,
                                  'linkedEntityId': linkedEntityId,
                                  'linkedEntityName': linkedEntityName,
                                  'dueDate': dueDate != null ? dueDate!.toIso8601String().split('T')[0] : '',
                                  'assignedEmployees': assignedEmployees,
                                  'status': 'pending',
                                  'archived': false,
                                  'createdAt': DateTime.now().toIso8601String(),
                                  'milestoneWeight': taskType == 'project' ? milestoneWeight : null,
                                  'estimatedBudget': taskType == 'purchases' ? estimatedBudget : null,
                                  'inventoryAction': taskType == 'inventory' ? inventoryAction : null,
                                };

                                await _firebaseService.addGeneralTask(taskData);
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('✅ تم تسجيل المهمة وإسنادها بنجاح!', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()),
                                    backgroundColor: const Color(0xFF2C7A7D),
                                  ),
                                );
                              },
                              child: Text('حفظ العمل وإسناد المهمة', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: Text('إلغاء', style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey)),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  // 2. ورقة الخزينة والمالية العامة والرسم البياني
  void _showFinancialsSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        double totalExpenses = _expenses + _workerExpense;
        double net = _income - totalExpenses;

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(20),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'الخزينة والمالية العامة',
                  style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                ),
                Text(
                  'تقارير المحاسبة والسيولة الإجمالية لآخر 90 يوم',
                  style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                ),
                const Divider(height: 20),

                // بطاقات الملخص المالي
                Row(
                  children: [
                    Expanded(
                      child: _buildFinancialSummaryBox('الدخل الإجمالي', _income, const Color(0xFF10B981)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildFinancialSummaryBox('المصروفات والرواتب', totalExpenses, const Color(0xFFEF4444)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _buildFinancialSummaryBox('صافي السيولة النقدية', net, net >= 0 ? const Color(0xFF2C7A7D) : const Color(0xFFEF4444)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildFinancialSummaryBox('المشتريات السحابية', _totalPurchases, const Color(0xFFF59E0B)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // مؤشر الإنتاجية الأسبوعي
                Text('مؤشر الإنتاجية الأسبوعي بالمنصة', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF334155))),
                const SizedBox(height: 6),
                Container(
                  height: 100,
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: CustomPaint(
                    painter: AreaChartPainter([400, 300, 500, 278, 189, 390, 349]),
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('السبت', style: GoogleFonts.cairo(fontSize: 8, color: Colors.grey)),
                    Text('الاثنين', style: GoogleFonts.cairo(fontSize: 8, color: Colors.grey)),
                    Text('الأربعاء', style: GoogleFonts.cairo(fontSize: 8, color: Colors.grey)),
                    Text('الجمعة', style: GoogleFonts.cairo(fontSize: 8, color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 16),

                // زر تسجيل حركة مالية سريعة
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      _showAddTransactionDialog();
                    },
                    icon: const Icon(Icons.add, size: 16),
                    label: Text('تسجيل حركة مالية جديدة بالمنصة', style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFinancialSummaryBox(String label, double amount, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500], fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(
            '${amount.toStringAsFixed(0)} ر.س',
            style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w900, color: color),
          ),
        ],
      ),
    );
  }

  // 3. ورقة دفتر الأستاذ والتاريخ المالي الكامل
  void _showLedgerSheet() {
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
          padding: const EdgeInsets.all(20),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'دفتر الأستاذ للعمليات المالية',
                  style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                ),
                Text(
                  'قائمة بكافة حركات الخزينة والمقاولات المسجلة بالمنصة حياً',
                  style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                ),
                const Divider(height: 20),

                Expanded(
                  child: StreamBuilder<QuerySnapshot?>(
                    stream: _firebaseService.getTodayTransactions(),
                    builder: (context, snapshot) {
                      if (!snapshot.hasData) {
                        return const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)));
                      }
                      final docs = snapshot.data!.docs;
                      if (docs.isEmpty) {
                        return Center(child: Text('دفتر الأستاذ فارغ حالياً', style: GoogleFonts.cairo()));
                      }

                      final sortedDocs = docs.toList()
                        ..sort((a, b) {
                          final aData = a.data() as Map<String, dynamic>;
                          final bData = b.data() as Map<String, dynamic>;
                          final aTime = _parseDateTime(aData['createdAt'] ?? aData['date']);
                          final bTime = _parseDateTime(bData['createdAt'] ?? bData['date']);
                          return bTime.compareTo(aTime);
                        });

                      return ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        itemCount: sortedDocs.length,
                        itemBuilder: (context, index) {
                          final data = sortedDocs[index].data() as Map<String, dynamic>;
                          final amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
                          final type = data['type'] ?? 'expense';
                          final desc = data['description'] ?? 'حركة مالية';
                          final date = _formatDate(data['date'] ?? data['createdAt']);
                          final status = data['status'] ?? 'pending';
                          final isIncome = type == 'income';

                          Color statusColor = Colors.grey;
                          if (status == 'approved' || status == 'completed') {
                            statusColor = const Color(0xFF2C7A7D);
                          } else if (status == 'rejected') {
                            statusColor = Colors.red;
                          }

                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.withOpacity(0.05)),
                            ),
                            child: Row(
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(desc, style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Text(date, style: GoogleFonts.cairo(fontSize: 8.5, color: Colors.grey)),
                                        const SizedBox(width: 8),
                                        Text('| الحالة: $status', style: GoogleFonts.cairo(fontSize: 8.5, color: statusColor, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ],
                                ),
                                const Spacer(),
                                Text(
                                  (isIncome ? '+' : '-') + '${amount.toStringAsFixed(0)} ر.س',
                                  style: GoogleFonts.cairo(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                    color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
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
        );
      },
    );
  }

  // تسجيل حركة مالية جديدة
  void _showAddTransactionDialog() {
    final descController = TextEditingController();
    final amountController = TextEditingController();
    String type = 'expense';
    String status = 'approved';

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: Colors.white,
              title: Text(
                'تسجيل حركة مالية جديدة بالمنصة',
                style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold),
                textDirection: TextDirection.rtl,
              ),
              content: Directionality(
                textDirection: TextDirection.rtl,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: descController,
                      style: GoogleFonts.cairo(fontSize: 11),
                      decoration: InputDecoration(
                        labelText: 'الوصف أو التفاصيل',
                        labelStyle: GoogleFonts.cairo(fontSize: 10),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: amountController,
                      style: GoogleFonts.cairo(fontSize: 11),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'المبلغ المالي (ريال)',
                        labelStyle: GoogleFonts.cairo(fontSize: 10),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('نوع المعاملة:', style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold)),
                        DropdownButton<String>(
                          value: type,
                          style: GoogleFonts.cairo(fontSize: 11, color: Colors.black),
                          onChanged: (val) {
                            if (val != null) {
                              setDialogState(() => type = val);
                            }
                          },
                          items: [
                            DropdownMenuItem(value: 'income', child: Text('واردات / دخل', style: GoogleFonts.cairo())),
                            DropdownMenuItem(value: 'expense', child: Text('نفقات / مصروفات', style: GoogleFonts.cairo())),
                            DropdownMenuItem(value: 'purchase', child: Text('توريدات / مشتريات', style: GoogleFonts.cairo())),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('إلغاء', style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2C7A7D)),
                  onPressed: () async {
                    final desc = descController.text.trim();
                    final amount = double.tryParse(amountController.text) ?? 0.0;
                    if (desc.isEmpty || amount <= 0) return;

                    final firestore = _firebaseService.db;
                    if (firestore != null) {
                      await firestore.collection('transactions').add({
                        'description': desc,
                        'amount': amount,
                        'type': type,
                        'status': status,
                        'date': DateTime.now().toIso8601String(),
                        'createdAt': DateTime.now().toIso8601String(),
                      });
                    }

                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('✅ تم تسجيل المعاملة بالمنصة بنجاح!', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()),
                        backgroundColor: const Color(0xFF2C7A7D),
                      ),
                    );
                  },
                  child: Text('حفظ وتسجيل', style: GoogleFonts.cairo(fontSize: 11, color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // 4. مركز اعتمادات المشتريات والتوريد مع السحب للاعتماد
  void _showApprovalsSheet() {
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
          padding: const EdgeInsets.all(20),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'مركز اعتمادات المشتريات والتوريدات',
                  style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                ),
                Text(
                  'اعتماد أو رفض طلبات الشراء المدخلة من الكادر الميداني',
                  style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                ),
                const Divider(height: 20),

                Expanded(
                  child: StreamBuilder<QuerySnapshot?>(
                    stream: _firebaseService.getPendingApprovals(),
                    builder: (context, snapshot) {
                      if (!snapshot.hasData) {
                        return const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)));
                      }
                      final docs = snapshot.data!.docs;
                      if (docs.isEmpty) {
                        return Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.verified_outlined, color: Color(0xFF2C7A7D), size: 36),
                              const SizedBox(height: 8),
                              Text('أنت مواكب لكل شيء! لا توجد طلبات معلقة', style: GoogleFonts.cairo(fontSize: 11, color: Colors.grey[600])),
                            ],
                          ),
                        );
                      }

                      return ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        itemCount: docs.length,
                        itemBuilder: (context, index) {
                          final doc = docs[index];
                          final data = doc.data() as Map<String, dynamic>;
                          final amount = double.tryParse(data['amount']?.toString() ?? '0') ?? 0.0;
                          final desc = data['description'] ?? 'طلب مشتريات';
                          final date = _formatDate(data['date'] ?? data['createdAt']);

                          return Dismissible(
                            key: Key(doc.id),
                            direction: DismissDirection.startToEnd,
                            background: Container(
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              decoration: BoxDecoration(
                                color: const Color(0xFF2C7A7D),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(Icons.check, color: Colors.white, size: 24),
                            ),
                            onDismissed: (dir) async {
                              await _firebaseService.db?.collection('transactions').doc(doc.id).update({
                                'status': 'approved',
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('✅ تم اعتماد الطلب: "$desc" بنجاح!', textDirection: TextDirection.rtl, style: GoogleFonts.cairo()),
                                  backgroundColor: const Color(0xFF2C7A7D),
                                ),
                              );
                            },
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Colors.grey.withOpacity(0.08)),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(desc, style: GoogleFonts.cairo(fontSize: 11.5, fontWeight: FontWeight.bold)),
                                        Text('تاريخ الطلب: $date', style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500])),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            ElevatedButton(
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: const Color(0xFF2C7A7D),
                                                foregroundColor: Colors.white,
                                                elevation: 0,
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                                              ),
                                              onPressed: () async {
                                                await _firebaseService.db?.collection('transactions').doc(doc.id).update({
                                                  'status': 'approved',
                                                });
                                              },
                                              child: Text('اعتماد التوريد', style: GoogleFonts.cairo(fontSize: 9.5, fontWeight: FontWeight.bold)),
                                            ),
                                            const SizedBox(width: 8),
                                            OutlinedButton(
                                              style: OutlinedButton.styleFrom(
                                                foregroundColor: Colors.red,
                                                side: const BorderSide(color: Colors.redAccent),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                                              ),
                                              onPressed: () async {
                                                await _firebaseService.db?.collection('transactions').doc(doc.id).update({
                                                  'status': 'rejected',
                                                });
                                              },
                                              child: Text('رفض الطلب', style: GoogleFonts.cairo(fontSize: 9.5)),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    '${amount.toStringAsFixed(0)} ر.س',
                                    style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
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
      },
    );
  }

  // 5. ورقة إدارة العمالة اليومية الفعالة وإضافة عامل
  void _showWorkersSheet() {
    final nameController = TextEditingController();
    final roleController = TextEditingController();
    final rateController = TextEditingController();
    bool showAddForm = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.85,
              ),
              child: Directionality(
                textDirection: TextDirection.rtl,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'كادر العمالة الميدانية اليومية',
                          style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                        ),
                        IconButton(
                          icon: Icon(showAddForm ? Icons.close : Icons.add_circle, color: const Color(0xFF2C7A7D)),
                          onPressed: () {
                            setModalState(() => showAddForm = !showAddForm);
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 16),

                    if (showAddForm) ...[
                      // نموذج إضافة عامل
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          children: [
                            TextField(
                              controller: nameController,
                              style: GoogleFonts.cairo(fontSize: 11),
                              decoration: InputDecoration(
                                labelText: 'اسم العامل بالكامل',
                                labelStyle: GoogleFonts.cairo(fontSize: 10),
                                isDense: true,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: roleController,
                              style: GoogleFonts.cairo(fontSize: 11),
                              decoration: InputDecoration(
                                labelText: 'الدور (فني كلادينج، حداد، نجار...)',
                                labelStyle: GoogleFonts.cairo(fontSize: 10),
                                isDense: true,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: rateController,
                              style: GoogleFonts.cairo(fontSize: 11),
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'اليومية المستحقة (ريال/يوم)',
                                labelStyle: GoogleFonts.cairo(fontSize: 10),
                                isDense: true,
                              ),
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2C7A7D)),
                                onPressed: () async {
                                  final name = nameController.text.trim();
                                  final role = roleController.text.trim();
                                  final rate = double.tryParse(rateController.text) ?? 0.0;

                                  if (name.isEmpty || role.isEmpty || rate <= 0) return;

                                  final firestore = _firebaseService.db;
                                  if (firestore != null) {
                                    await firestore.collection('workers').add({
                                      'name': name,
                                      'role': role,
                                      'dailyRate': rate,
                                      'createdAt': DateTime.now().toIso8601String(),
                                    });
                                  }

                                  nameController.clear();
                                  roleController.clear();
                                  rateController.clear();
                                  setModalState(() => showAddForm = false);
                                },
                                child: Text('تسجيل العامل في المنصة', style: GoogleFonts.cairo(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],

                    Expanded(
                      child: StreamBuilder<QuerySnapshot?>(
                        stream: _firebaseService.getWorkers(),
                        builder: (context, snapshot) {
                          if (!snapshot.hasData) {
                            return const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)));
                          }
                          final docs = snapshot.data!.docs;
                          if (docs.isEmpty) {
                            return Center(child: Text('لا توجد عمالة مسجلة بالمنصة حالياً', style: GoogleFonts.cairo()));
                          }

                          return ListView.builder(
                            physics: const BouncingScrollPhysics(),
                            itemCount: docs.length,
                            itemBuilder: (context, index) {
                              final workerId = docs[index].id;
                              final wData = docs[index].data() as Map<String, dynamic>;
                              final name = wData['name'] ?? 'عامل مقاولات';
                              final role = wData['role'] ?? 'فني';
                              final rate = wData['dailyRate'] ?? 0;

                              return GestureDetector(
                                onTap: () {
                                  Navigator.pop(context);
                                  Navigator.push(context, MaterialPageRoute(builder: (context) => WorkerProfileScreen(workerId: workerId, initialData: wData)));
                                },
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: Colors.grey.withOpacity(0.05)),
                                  ),
                                  child: Row(
                                  children: [
                                    Container(
                                      width: 34,
                                      height: 34,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFE6F4F4),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Center(
                                        child: Text(
                                          name.isNotEmpty ? name.substring(0, 1) : 'م',
                                          style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D)),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(name, style: GoogleFonts.cairo(fontSize: 11.5, fontWeight: FontWeight.bold)),
                                          Text(role, style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500])),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text('$rate ر.س / يوم', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF2C7A7D))),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                                          onPressed: () async {
                                            await _firebaseService.db?.collection('workers').doc(workerId).delete();
                                          },
                                        ),
                                        ],
                                      ),
                                    ],
                                  ),
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
          },
        );
      },
    );
  }

  // 6. ورقة شؤون الموظفين والكادر العام
  void _showEmployeesSheet() {
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
          padding: const EdgeInsets.all(20),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'كادر شؤون الموظفين بالمنصة',
                  style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                ),
                Text(
                  'سجل الموظفين والمشرفين المعتمدين وصلاحياتهم الفعالة',
                  style: GoogleFonts.cairo(fontSize: 10, color: Colors.grey[500]),
                ),
                const Divider(height: 20),

                Expanded(
                  child: StreamBuilder<QuerySnapshot?>(
                    stream: _firebaseService.getSystemUsers(),
                    builder: (context, snapshot) {
                      if (!snapshot.hasData) {
                        return const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2C7A7D)));
                      }
                      final docs = snapshot.data!.docs;
                      if (docs.isEmpty) {
                        return Center(child: Text('لا يوجد موظفين مسجلين حالياً', style: GoogleFonts.cairo()));
                      }

                      return ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        itemCount: docs.length,
                        itemBuilder: (context, index) {
                          final eData = docs[index].data() as Map<String, dynamic>;
                          final name = eData['name'] ?? 'موظف';
                          final role = eData['role'] ?? 'employee';
                          final email = eData['email'] ?? '';

                          String roleAr = 'موظف كادر';
                          Color roleColor = Colors.grey;
                          if (role == 'manager') {
                            roleAr = 'مدير عام';
                            roleColor = const Color(0xFF2C7A7D);
                          } else if (role == 'supervisor') {
                            roleAr = 'مشرف ميداني';
                            roleColor = Colors.indigo;
                          }

                          return GestureDetector(
                            onTap: () {
                              Navigator.pop(context);
                              Navigator.push(context, MaterialPageRoute(builder: (context) => EmployeeProfileScreen(employeeId: docs[index].id, initialData: eData)));
                            },
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey.withOpacity(0.05)),
                              ),
                              child: Row(
                              children: [
                                Container(
                                  width: 34,
                                  height: 34,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEEF2FF),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      name.isNotEmpty ? name.substring(0, 1) : 'ع',
                                      style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.indigo),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(name, style: GoogleFonts.cairo(fontSize: 11.5, fontWeight: FontWeight.bold)),
                                      Text(email, style: GoogleFonts.cairo(fontSize: 9, color: Colors.grey[500])),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: roleColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Text(
                                    roleAr,
                                    style: GoogleFonts.cairo(fontSize: 8, color: roleColor, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
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
      },
    );
  }



  Widget _buildBottomNavBar() {
    return Container(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, -5),
          )
        ],
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF2C7A7D),
        unselectedItemColor: Colors.grey[400],
        selectedLabelStyle: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.bold),
        unselectedLabelStyle: GoogleFonts.cairo(fontSize: 9),
        currentIndex: _currentTabIndex,
        onTap: (index) {
          setState(() {
            _currentTabIndex = index;
          });
        },
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.more_horiz, size: 22), label: 'المزيد'),
          BottomNavigationBarItem(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.notifications_none, size: 22),
                if (_pendingApprovals + _criticalAlerts > 0)
                  Positioned(
                    right: -4,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: Color(0xFFEF4444),
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 14,
                        minHeight: 14,
                      ),
                      child: Text(
                        '${_pendingApprovals + _criticalAlerts}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            label: 'تنبيهات',
          ),
          const BottomNavigationBarItem(icon: Icon(Icons.home_outlined, size: 22), label: 'اليوم'),
          const BottomNavigationBarItem(icon: Icon(Icons.grid_view_outlined, size: 21), label: 'مشاريع'),
          const BottomNavigationBarItem(icon: Icon(Icons.qr_code_scanner, size: 21), label: 'ماسح'),
        ],
      ),
    );
  }
}

// رسم بياني مخصص لتمثيل مؤشر الإنتاجية الأسبوعي بالمنصة
class AreaChartPainter extends CustomPainter {
  final List<double> values;
  AreaChartPainter(this.values);

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    final paint = Paint()
      ..color = const Color(0xFF2C7A7D)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          const Color(0xFF2C7A7D).withOpacity(0.20),
          const Color(0xFF2C7A7D).withOpacity(0.0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    final path = Path();
    final fillPath = Path();

    double dx = size.width / (values.length - 1);
    double maxVal = values.reduce((a, b) => a > b ? a : b);
    if (maxVal == 0) maxVal = 1.0;

    for (int i = 0; i < values.length; i++) {
      double x = i * dx;
      double y = size.height - (values[i] / maxVal) * (size.height - 10);

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
    }

    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
