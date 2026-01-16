import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PERSONA_PROMPT } from "../constants";
import { OutputFormat } from "../types";

let genAI: GoogleGenAI | null = null;

const getGenAI = (): GoogleGenAI => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is missing from environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export const processPayload = async (
  input: string, 
  modeContext: string,
  destination: string,
  format: OutputFormat
): Promise<string> => {
  try {
    const ai = getGenAI();
    
    const routingInstruction = destination 
      ? `[ROUTING TARGET]: Route processed data to: "${destination}"` 
      : `[ROUTING TARGET]: No external destination set. Return processed result locally.`;

    const formatInstruction = `[REQUIRED OUTPUT FORMAT]: ${format}`;

    const modeInstruction = modeContext 
      ? `[CURRENT OPERATION CONTEXT]: ${modeContext}` 
      : "";

    const fullSystemInstruction = `${SYSTEM_PERSONA_PROMPT}
    
    ${modeInstruction}
    ${routingInstruction}
    ${formatInstruction}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: input,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.1, 
        maxOutputTokens: 2048,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Nexus Core.");
    }
    return text;
  } catch (error) {
    console.error("Nexus Gateway Error:", error);
    throw error;
  }
};
