import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/server_api_service.dart';

class FloatingAssistant extends StatefulWidget {
  final ServerApiService apiService;

  const FloatingAssistant({Key? key, required this.apiService}) : super(key: key);

  @override
  _FloatingAssistantState createState() => _FloatingAssistantState();
}

class _FloatingAssistantState extends State<FloatingAssistant> {
  final TextEditingController _chatController = TextEditingController();
  final List<Map<String, String>> _chatMessages = [
    {
      'role': 'bot',
      'text': 'مرحباً بك! أنا "خبير" العين الساهرة ومستشارك الذكي المتكامل في الشركة. تم تطويري وتزويدي بقدرات تحليل متقدمة لأجيبك على أي استفسار بدقة متناهية. كيف بدك نخدمك اليوم؟'
    }
  ];
  bool _isSending = false;

  Future<void> _sendMessage(void Function(void Function()) setModalState) async {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;

    setModalState(() {
      _chatMessages.add({'role': 'user', 'text': text});
      _chatController.clear();
      _isSending = true;
    });

    try {
      final contextData = {
        'companyName': 'خبراء الرسم',
        'userProfile': {
          'name': 'المدير العام',
          'role': 'manager',
        },
      };

      final response = await widget.apiService.chatWithBushra(
        message: text,
        history: _chatMessages
            .sublist(0, _chatMessages.length - 1)
            .map((m) => {
                  'role': m['role'] == 'bot' ? 'bot' : 'user',
                  'text': m['text'] ?? '',
                })
            .toList(),
        context: contextData,
      );

      setModalState(() {
        _chatMessages.add({
          'role': 'bot',
          'text': response['text'] ?? 'لم أستطع معالجة الطلب حالياً.',
        });
      });
    } catch (e) {
      setModalState(() {
        _chatMessages.add({
          'role': 'bot',
          'text': '⚠️ عذراً، حدث خطأ أثناء الاتصال بالخادم. تأكد من تشغيل سيرفر Express ومفتاح Gemini.',
        });
      });
    } finally {
      setModalState(() {
        _isSending = false;
      });
    }
  }

  void _showChatDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(builder: (context, setModalState) {
          return Directionality(
            textDirection: TextDirection.rtl,
            child: Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: Color(0xFFF4F7FA),
                borderRadius: BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
              ),
              child: Column(
                children: [
                  // Header
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
                      boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B5CF6).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.auto_awesome, color: Color(0xFF8B5CF6), size: 20),
                        ).animate(onPlay: (controller) => controller.repeat(reverse: true)).shimmer(duration: 2000.ms),
                        const SizedBox(width: 12),
                        Text(
                          'المساعد الذكي "خبير"',
                          style: GoogleFonts.cairo(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.grey),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),
                  // Messages
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(20),
                      physics: const BouncingScrollPhysics(),
                      itemCount: _chatMessages.length + (_isSending ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _chatMessages.length) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.only(
                                      topLeft: Radius.circular(16),
                                      topRight: Radius.circular(16),
                                      bottomLeft: Radius.circular(16),
                                    ),
                                  ),
                                  child: Text(
                                    'خبير يحلل ويصيغ الرد...',
                                    style: GoogleFonts.cairo(fontSize: 12, color: Colors.grey[600]),
                                  ).animate(onPlay: (controller) => controller.repeat(reverse: true)).fade(),
                                ),
                              ],
                            ),
                          );
                        }
                        final msg = _chatMessages[index];
                        final isBot = msg['role'] == 'bot';
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: Row(
                            mainAxisAlignment: isBot ? MainAxisAlignment.start : MainAxisAlignment.end,
                            children: [
                              if (isBot) ...[
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: const Color(0xFF8B5CF6).withOpacity(0.1),
                                  child: const Icon(Icons.auto_awesome, color: Color(0xFF8B5CF6), size: 16),
                                ),
                                const SizedBox(width: 8),
                              ],
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: isBot ? Colors.white : const Color(0xFF2C7A7D),
                                    borderRadius: BorderRadius.only(
                                      topLeft: const Radius.circular(16),
                                      topRight: const Radius.circular(16),
                                      bottomLeft: Radius.circular(isBot ? 0 : 16),
                                      bottomRight: Radius.circular(isBot ? 16 : 0),
                                    ),
                                    boxShadow: [
                                      if (isBot) BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 5))
                                    ],
                                  ),
                                  child: Text(
                                    msg['text']!,
                                    style: GoogleFonts.cairo(
                                      fontSize: 13,
                                      fontWeight: isBot ? FontWeight.w600 : FontWeight.bold,
                                      color: isBot ? const Color(0xFF1E293B) : Colors.white,
                                      height: 1.5,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1, end: 0),
                        );
                      },
                    ),
                  ),
                  // Prompts / Suggestions
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 5),
                    child: Row(
                      children: [
                        _buildSuggestionChip('استشارة فنية ذكية', 'أهلاً خبير، هل يمكنك تزويدي باستشارة فنية سريعة حول تصميم لوحة إعلانية خارجية وتكلفة المواد بالمتوسط؟', setModalState),
                        const SizedBox(width: 8),
                        _buildSuggestionChip('تحليل مالي', 'خبير، أعطني ملخصاً عن الأداء المالي للمشاريع هذا الشهر.', setModalState),
                        const SizedBox(width: 8),
                        _buildSuggestionChip('بحث عن عميل', 'خبير، ابحث لي عن آخر فواتير العميل "شركة الأفق".', setModalState),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  // Input Field
                  Container(
                    padding: EdgeInsets.fromLTRB(20, 10, 20, MediaQuery.of(context).viewInsets.bottom + 20),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
                      boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 15, offset: Offset(0, -5))],
                    ),
                    child: Row(
                      children: [
                        // Image attachment icon (UI only for now)
                        IconButton(
                          icon: const Icon(Icons.add_photo_alternate_outlined, color: Colors.grey),
                          onPressed: () {
                            // TODO: Implement image picking
                          },
                        ),
                        Expanded(
                          child: TextField(
                            controller: _chatController,
                            style: GoogleFonts.cairo(fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'اسأل خبير عن أي شيء...',
                              hintStyle: GoogleFonts.cairo(fontSize: 12, color: Colors.grey[400]),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                            ),
                            onSubmitted: (_) {
                               _sendMessage(setModalState);
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        GestureDetector(
                          onTap: () {
                            _sendMessage(setModalState);
                          },
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)]),
                              shape: BoxShape.circle,
                            ),
                            child: _isSending
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        });
      },
    );
  }

  Widget _buildSuggestionChip(String label, String prompt, void Function(void Function()) setModalState) {
    return GestureDetector(
      onTap: () {
        _chatController.text = prompt;
        _sendMessage(setModalState);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF8B5CF6).withOpacity(0.05),
          border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.2)),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.auto_awesome, color: Color(0xFF8B5CF6), size: 14),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.cairo(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF8B5CF6),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: FloatingActionButton(
        onPressed: () => _showChatDialog(context),
        backgroundColor: const Color(0xFF8B5CF6),
        child: const Icon(Icons.auto_awesome, color: Colors.white),
      ).animate(onPlay: (controller) => controller.repeat(reverse: true)).shimmer(duration: 3000.ms),
    );
  }
}
