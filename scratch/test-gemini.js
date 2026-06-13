import { GoogleGenAI } from '@google/genai';

const apiKey = "AIzaSyBSZg_INKfLQgmZ-0T63d3yLmnuEIRE3Ks";

const ttsModels = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts"
];

async function test() {
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  for (const model of ttsModels) {
    console.log(`Testing TTS model: ${model}...`);
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: "أهلاً بك يا مدير النظام، الأمور اليوم جيدة." }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
      });

      const pcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log(`✅ Model ${model} SUCCESS!`);
      console.log("Response text:", text);
      console.log("PCM base64 length:", pcmBase64 ? pcmBase64.length : "undefined");
      return; // Stop on first success
    } catch (error) {
      console.error(`❌ Model ${model} failed:`, error.message);
    }
  }
}

test().then(() => process.exit(0));
