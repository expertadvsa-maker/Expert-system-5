import { GoogleGenAI } from '@google/genai';

const apiKey = "AIzaSyBSZg_INKfLQgmZ-0T63d3yLmnuEIRE3Ks";

async function listModels() {
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  try {
    console.log("Listing models...");
    const response = await ai.models.list();
    console.log("Response keys:", Object.keys(response));
    console.log("Response contents:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Failed to list models:", error);
  }
}

listModels().then(() => process.exit(0));
