import 'package:cloud_firestore/cloud_firestore.dart';

class FirebaseService {
  FirebaseFirestore? _dbInstance;

  // الوصول الآمن لقاعدة البيانات Firestore دون التسبب في انهيار التطبيق
  FirebaseFirestore? get db {
    try {
      _dbInstance ??= FirebaseFirestore.instance;
      return _dbInstance;
    } catch (e) {
      // طباعة التنبيه في حالة عدم تهيئة الفايربيس للعمل دون اتصال بالخارج
      print('ℹ️ Firebase is not initialized yet. Using local mock mode: $e');
      return null;
    }
  }

  /// جلب الإعدادات العامة للنظام (مع معالجة استباقية لعدم التهيئة)
  Stream<DocumentSnapshot?> getSystemSettings() {
    final firestore = db;
    if (firestore == null) {
      return const Stream.empty();
    }
    return firestore.collection('system').doc('settings').snapshots();
  }

  /// جلب المشاريع النشطة
  Stream<QuerySnapshot?> getActiveProjects() {
    final firestore = db;
    if (firestore == null) {
      return const Stream.empty();
    }
    return firestore
        .collection('projects')
        .where('status', whereIn: ['active', 'in-progress']).snapshots();
  }

  /// جلب المعاملات المالية
  Stream<QuerySnapshot?> getTodayTransactions() {
    final firestore = db;
    if (firestore == null) {
      return const Stream.empty();
    }
    return firestore.collection('transactions').snapshots();
  }

  /// جلب الاعتمادات المعلقة
  Stream<QuerySnapshot?> getPendingApprovals() {
    final firestore = db;
    if (firestore == null) {
      return const Stream.empty();
    }
    return firestore
        .collection('transactions')
        .where('status', isEqualTo: 'pending')
        .snapshots();
  }

  /// تسجيل التحضير الذكي للموظف
  Future<void> recordAttendance({
    required String userId,
    required String userName,
    required String status,
    String? locationName,
  }) async {
    final firestore = db;
    if (firestore == null) {
      print('Mock Attendance Saved for: $userName ($status)');
      return;
    }
    final todayStr = DateTime.now().toIso8601String().split('T')[0];
    final attendanceRef = firestore.collection('attendance').doc('${userId}_$todayStr');

    await attendanceRef.set({
      'id': '${userId}_$todayStr',
      'userId': userId,
      'userName': userName,
      'date': todayStr,
      'dateString': todayStr,
      'checkIn': DateTime.now().toIso8601String(),
      'status': status,
      'location': locationName ?? 'تحضير جوال ذكي',
    });
  }

  /// جلب تحديثات ويوميات مشروع معين حياً
  Stream<QuerySnapshot?> getProjectUpdates(String projectId) {
    final firestore = db;
    if (firestore == null) {
      return const Stream.empty();
    }
    return firestore
        .collection('projectUpdates')
        .where('projectId', isEqualTo: projectId)
        .snapshots();
  }

  /// إضافة تحديث أو تقرير يومي للمشروع
  Future<void> addProjectUpdate({
    required String projectId,
    required String content,
    required String authorId,
    required String authorName,
  }) async {
    final firestore = db;
    if (firestore == null) return;

    final docRef = firestore.collection('projectUpdates').doc();
    await docRef.set({
      'id': docRef.id,
      'projectId': projectId,
      'content': content,
      'createdAt': DateTime.now().toIso8601String(),
      'authorId': authorId,
      'authorName': authorName,
    });
  }

  /// جلب كافة المهام التشغيلية العامة حياً
  Stream<QuerySnapshot?> getGeneralTasks() {
    final firestore = db;
    if (firestore == null) return const Stream.empty();
    return firestore.collection('generalTasks').snapshots();
  }

  /// جلب قائمة المستخدمين/الموظفين حياً لإسناد المهام
  Stream<QuerySnapshot?> getSystemUsers() {
    final firestore = db;
    if (firestore == null) return const Stream.empty();
    return firestore.collection('users').snapshots();
  }

  /// إضافة مهمة تشغيلية جديدة مع المزامنة مع المشروع إذا كانت مرتبطة به
  Future<void> addGeneralTask(Map<String, dynamic> taskData) async {
    final firestore = db;
    if (firestore == null) return;

    final docRef = firestore.collection('generalTasks').doc();
    final String taskId = docRef.id;
    final Map<String, dynamic> finalTaskData = {
      'id': taskId,
      ...taskData,
    };

    await docRef.set(finalTaskData);

    // إذا كانت المهمة تابعة لمشروع، ندرجها كميلستون في المشروع ونحدث التقدم
    final String taskType = taskData['taskType'] ?? 'none';
    final String? projectId = taskData['linkedEntityId'];
    if (taskType == 'project' && projectId != null && projectId.isNotEmpty) {
      final projectRef = firestore.collection('projects').doc(projectId);
      final pSnap = await projectRef.get();
      if (pSnap.exists) {
        final pData = pSnap.data() as Map<String, dynamic>;
        final List<dynamic> milestones = pData['milestones'] as List<dynamic>? ?? [];
        
        final bool exists = milestones.any((m) => m['title'] == taskData['title']);
        if (!exists) {
          final List<dynamic> updatedMilestones = List.from(milestones);
          updatedMilestones.add({
            'title': taskData['title']?.toString().trim() ?? '',
            'weight': taskData['milestoneWeight'] ?? 10,
            'status': 'pending',
            'date': taskData['dueDate'] ?? '',
            'assignedTo': taskData['assignedEmployees'] ?? [],
            'description': taskData['description']?.toString().trim() ?? '',
          });

          final completedCount = updatedMilestones.where((m) => m['status'] == 'completed').length;
          final int progress = updatedMilestones.isNotEmpty
              ? ((completedCount / updatedMilestones.length) * 100).round()
              : 0;

          await projectRef.update({
            'milestones': updatedMilestones,
            'progress': progress,
          });
        }
      }
    }
  }

  /// تغيير حالة المهمة (مكتملة / معلقة) مع مزامنة ميلستون المشروع
  Future<void> toggleGeneralTaskStatus(String taskId, Map<String, dynamic> taskData) async {
    final firestore = db;
    if (firestore == null) return;

    final String currentStatus = taskData['status'] ?? 'pending';
    final String nextStatus = currentStatus == 'completed' ? 'pending' : 'completed';

    await firestore.collection('generalTasks').doc(taskId).update({
      'status': nextStatus,
    });

    final String taskType = taskData['taskType'] ?? 'none';
    final String? projectId = taskData['linkedEntityId'];
    if (taskType == 'project' && projectId != null && projectId.isNotEmpty) {
      final projectRef = firestore.collection('projects').doc(projectId);
      final pSnap = await projectRef.get();
      if (pSnap.exists) {
        final pData = pSnap.data() as Map<String, dynamic>;
        final List<dynamic> milestones = pData['milestones'] as List<dynamic>? ?? [];
        
        final List<dynamic> updatedMilestones = milestones.map((m) {
          if (m['title'] == taskData['title']) {
            final Map<String, dynamic> mCopy = Map.from(m);
            mCopy['status'] = nextStatus;
            mCopy['date'] = nextStatus == 'completed' ? DateTime.now().toIso8601String().split('T')[0] : '';
            return mCopy;
          }
          return m;
        }).toList();

        final completedCount = updatedMilestones.where((m) => m['status'] == 'completed').length;
        final int progress = updatedMilestones.isNotEmpty
            ? ((completedCount / updatedMilestones.length) * 100).round()
            : 0;

        await projectRef.update({
          'milestones': updatedMilestones,
          'progress': progress,
        });
      }
    }
  }

  /// أرشفة (حذف) المهمة التشغيلية
  Future<void> archiveGeneralTask(String taskId) async {
    final firestore = db;
    if (firestore == null) return;
    await firestore.collection('generalTasks').doc(taskId).update({
      'archived': true,
    });
  }

  /// جلب الموردين حياً
  Stream<QuerySnapshot?> getSuppliers() {
    final firestore = db;
    if (firestore == null) return const Stream.empty();
    return firestore.collection('suppliers').snapshots();
  }

  /// جلب العمالة الميدانية حياً
  Stream<QuerySnapshot?> getWorkers() {
    final firestore = db;
    if (firestore == null) return const Stream.empty();
    return firestore.collection('workers').snapshots();
  }

  /// جلب مصروفات العمالة لحساب النفقات الكلية
  Stream<QuerySnapshot?> getWorkerTransactions() {
    final firestore = db;
    if (firestore == null) return const Stream.empty();
    return firestore.collection('workerTransactions').snapshots();
  }

  /// جلب تحضير الموظفين اليوم حياً لمقارنتها بالعدد الكلي
  Stream<QuerySnapshot?> getTodayAttendance() {
    final firestore = db;
    if (firestore == null) return const Stream.empty();
    final todayStr = DateTime.now().toIso8601String().split('T')[0];
    return firestore
        .collection('attendance')
        .where('dateString', isEqualTo: todayStr)
        .snapshots();
  }

  /// إضافة عميل جديد بكامل الخانات
  Future<void> addClient(Map<String, dynamic> clientData) async {
    final firestore = db;
    if (firestore == null) return;
    await firestore.collection('clients').add({
      ...clientData,
      'createdAt': FieldValue.serverTimestamp(),
      'status': 'active',
    });
  }

  /// إضافة مشروع جديد بكامل الخانات
  Future<void> addProject(Map<String, dynamic> projectData) async {
    final firestore = db;
    if (firestore == null) return;
    await firestore.collection('projects').add({
      ...projectData,
      'createdAt': FieldValue.serverTimestamp(),
      'progress': 0,
      'status': 'active',
      'milestones': [],
    });
  }
}
