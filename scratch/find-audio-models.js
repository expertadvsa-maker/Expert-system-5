import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const apiKey = "AIzaSyBSZg_INKfLQgmZ-0T63d3yLmnuEIRE3Ks";

async function listModels() {
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  try {
    console.log("Listing models...");
    let response = await ai.models.list();
    // Gather all models
    let allModels = [];
    if (response.models) {
      allModels = [...response.models];
    }
    
    let nextToken = response.nextPageToken;
    while (nextToken) {
      const nextPage = await ai.models.list({ pageToken: nextToken });
      if (nextPage.models) {
        allModels = [...allModels, ...nextPage.models];
      }
      nextToken = nextPage.nextPageToken;
    }

    const output = allModels.map(m => {
      return {
        name: m.name,
        displayName: m.displayName,
        description: m.description,
        supportedActions: m.supportedActions,
      };
    });

    fs.writeFileSync('scratch/all-models.json', JSON.stringify(output, null, 2));
    console.log(`Saved ${allModels.length} models to scratch/all-models.json`);
  } catch (error) {
    console.error("Failed to list models:", error);
  }
}

listModels().then(() => process.exit(0));
