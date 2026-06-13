import { GoogleGenAI } from '@google/genai';

const apiKey = "AIzaSyBSZg_INKfLQgmZ-0T63d3yLmnuEIRE3Ks";

const models = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-preview-02-05"
];

async function testAll() {
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  for (const model of models) {
    try {
      console.log(`Testing model: ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: "Short audio reply" }] }],
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
      if (pcmBase64) {
        console.log(`✅ Model ${model} SUCCESS! PCM data length: ${pcmBase64.length}`);
        return;
      } else {
        console.log(`❌ Model ${model} returned no audio data.`);
      }
    } catch (error) {
      console.log(`❌ Model ${model} FAILED: ${error.message}`);
    }
  }
}

testAll().then(() => process.exit(0));
