import { GoogleGenAI } from "@google/genai";

async function runTest() {
  const apiKey = 'AQ.Ab8RN6KBm-tCCYjQl-r8EWNWcHnkIBJEoPcMUfkrVFXKT81c2Q';
  console.log("Testing with key:", apiKey);
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: "hi" }] }],
    });
    console.log("Success:", response.text);
  } catch (error) {
    console.error("Failed:", error);
  }
}

runTest();
