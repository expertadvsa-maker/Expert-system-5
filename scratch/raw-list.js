import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const apiKey = "AIzaSyBSZg_INKfLQgmZ-0T63d3yLmnuEIRE3Ks";

async function listModels() {
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  try {
    const response = await ai.models.list();
    fs.writeFileSync('scratch/raw-response.json', JSON.stringify(response, null, 2));
    console.log("Saved response.");
  } catch (error) {
    console.error("Failed:", error);
  }
}

listModels().then(() => process.exit(0));
