
import { GoogleGenAI, Type } from "@google/genai";
import { ForensicReport, MediaType, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getForensicPrompt = (mediaType: MediaType) => {
  const baseInstruction = `Act as a senior digital forensics expert specializing in synthetic media identification and model attribution.
Analyze the provided media file for signs of AI generation (Deepfakes, Generative AI). 

Your analysis must be:
1. Objective: Identify specific technical markers.
2. Responsible: Frame findings in terms of probability.
3. Attribution: ATTEMPT TO IDENTIFY THE SPECIFIC AI TOOL/MODEL (e.g., Midjourney, DALL-E 3, Stable Diffusion, Sora, Kling, Runway, ElevenLabs, Suno, etc.) based on known signatures.`;

  const audioSpecifics = `
### Audio Forensic Protocols:
- **Model Attribution**: Scan for ElevenLabs cadence, Suno musical structure, or Udio spectral clarity.
- **Spectral Integrity**: Scan for abrupt frequency cutoffs (brick-wall filters) typical of neural vocoders.
- **Physiological Cues**: Check for absence of biological markers like mouth clicks or natural breathing.`;

  const imageSpecifics = `
### Image Forensic Protocols:
- **Model Attribution**: Look for Midjourney's v6 typical texture, DALL-E 3's semantic over-optimization, or Stable Diffusion XL's noise patterns.
- **Geometric Fidelity**: Check for non-Euclidean geometry in complex areas.
- **Specular Refraction**: Analyze pupil reflections and environmental mirroring.`;

  const videoSpecifics = `
### Video Forensic Protocols:
- **Model Attribution**: Identify Sora's physical world-model errors, Kling's temporal consistency, or Luma Dream Machine's motion signatures.
- **Temporal Coherence**: Look for background morphing between frames.
- **Lip-Sync Precision**: Analyze alignment of phonemes to lip shapes.`;

  let specificInstruction = "";
  if (mediaType === MediaType.AUDIO) specificInstruction = audioSpecifics;
  else if (mediaType === MediaType.IMAGE) specificInstruction = imageSpecifics;
  else if (mediaType === MediaType.VIDEO) specificInstruction = videoSpecifics;

  return `${baseInstruction}\n${specificInstruction}

Provide a detailed forensic report in JSON format. 
The 'verdict' should be a concise headline. 
The 'generatorTool' should be your best guess for the AI model used (or "Unknown/Organic").
The 'attributionConfidence' is how sure you are about the specific generator tool.`;
};

export const analyzeMedia = async (
  file: File,
  mediaType: MediaType
): Promise<ForensicReport> => {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: getForensicPrompt(mediaType) }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["isAIGenerated", "authenticityScore", "reasoning", "justification", "detectedArtifacts", "verdict"],
          properties: {
            isAIGenerated: { type: Type.BOOLEAN },
            authenticityScore: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            justification: { type: Type.STRING },
            verdict: { type: Type.STRING },
            generatorTool: { type: Type.STRING, description: "Identified AI model (e.g. Midjourney)" },
            attributionConfidence: { type: Type.NUMBER, description: "Confidence in generator identification 0-100" },
            detectedArtifacts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["label", "description", "severity"],
                properties: {
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as ForensicReport;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const searchWebForSources = async (
  file: File,
  mediaType: MediaType
): Promise<{ explanation: string, sources: GroundingSource[] }> => {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: `Search the web to find if this ${mediaType} or a very similar version of it exists. 
          Specifically look for any association with known AI generator releases (like 'Midjourney Showcase', 'Sora Sample', etc.) or viral AI debunking articles.
          Identify WHICH AI TOOL likely created this based on online discussions.` }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title || 'Source', uri: chunk.web.uri });
        }
      });
    }

    return {
      explanation: response.text || "No specific origin details found.",
      sources: sources
    };
  } catch (error) {
    console.error("Web search failed:", error);
    throw error;
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};
