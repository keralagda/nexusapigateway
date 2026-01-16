import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PERSONA_PROMPT } from "../constants";
import { OutputFormat, SimulatedRequest } from "../types";

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
  request: SimulatedRequest, 
  modeContext: string,
  destination: string,
  format: OutputFormat,
  processingRules: string // New parameter for user instructions
): Promise<string> => {
  try {
    const ai = getGenAI();
    
    // Construct the Request Envelope
    const requestEnvelope = JSON.stringify({
      virtual_network_context: {
        method: request.method,
        path: request.path,
        headers: request.headers ? request.headers : "{}",
        timestamp: new Date().toISOString()
      },
      payload_content: request.body
    }, null, 2);
    
    const routingInstruction = destination 
      ? `[ROUTING TARGET]: Route processed data to: "${destination}"` 
      : `[ROUTING TARGET]: No external destination set. Return processed result locally.`;

    const formatInstruction = `[REQUIRED OUTPUT FORMAT]: ${format}`;

    const modeInstruction = modeContext 
      ? `[CURRENT OPERATION CONTEXT]: ${modeContext}` 
      : "";

    const userRulesInstruction = processingRules
      ? `[USER DEFINED TRANSFORMATION RULES]: The user has provided specific logic for this operation:\n"${processingRules}"\nFollow these rules strictly when processing the payload.`
      : "";

    const fullSystemInstruction = `${SYSTEM_PERSONA_PROMPT}
    
    ${modeInstruction}
    ${routingInstruction}
    ${formatInstruction}
    ${userRulesInstruction}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `ANALYZE THIS SIMULATED REQUEST:\n${requestEnvelope}`,
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
