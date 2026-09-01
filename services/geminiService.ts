import { GoogleGenAI, Type } from "@google/genai";
import {
  ForensicReport,
  MediaType,
  GroundingSource,
} from "../types";

/**
 * Create the Gemini client only when it is needed.
 *
 * Vite exposes variables beginning with VITE_ to the frontend.
 * Netlify variable:
 *
 * VITE_GEMINI_API_KEY
 */
const getAI = (): GoogleGenAI => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "VITE_GEMINI_API_KEY is not configured. " +
      "Please add the API key in Netlify Environment Variables " +
      "and redeploy the application."
    );
  }

  return new GoogleGenAI({
    apiKey,
  });
};


/**
 * Generate the forensic analysis prompt according to media type.
 */
const getForensicPrompt = (mediaType: MediaType): string => {
  const baseInstruction = `
Act as a senior digital forensics expert specializing in
synthetic media identification and AI-generated media analysis.

Analyze the provided media file for signs of AI generation,
deepfakes, or other forms of synthetic media.

Your analysis must be:

1. Objective:
   Identify specific technical markers and observable evidence.

2. Responsible:
   Frame findings in terms of probability.
   Do not claim certainty when the evidence is inconclusive.

3. Attribution:
   Attempt to identify the specific AI tool or model when
   there are meaningful indicators.

Examples include:
Midjourney, DALL-E, Stable Diffusion, Sora, Kling,
Runway, ElevenLabs, Suno, Udio, Luma, etc.

Do not invent evidence or claim a specific generator
without reasonable supporting indicators.
`;

  const audioSpecifics = `
### Audio Forensic Protocols

- Model Attribution:
  Look for possible ElevenLabs cadence, Suno musical structure,
  Udio characteristics, or other synthetic-audio signatures.

- Spectral Integrity:
  Look for abrupt frequency cutoffs, unusual spectral patterns,
  excessive smoothness, or artifacts associated with neural vocoders.

- Physiological Cues:
  Examine natural breathing, mouth clicks, pauses,
  articulation, pitch transitions, and other biological markers.

- Temporal Consistency:
  Look for unnatural timing, repeated patterns,
  or suspiciously consistent speech characteristics.
`;

  const imageSpecifics = `
### Image Forensic Protocols

- Model Attribution:
  Look for visual characteristics potentially associated with
  Midjourney, DALL-E, Stable Diffusion, or other generators.

- Geometric Fidelity:
  Check complex structures, hands, fingers, objects,
  architecture, perspective, and non-Euclidean geometry.

- Lighting:
  Check shadows, reflections, illumination consistency,
  and physically inconsistent lighting.

- Specular Refraction:
  Examine eyes, pupils, reflective surfaces,
  mirrors, glass, and environmental reflections.

- Texture:
  Look for abnormal skin texture, repeated patterns,
  excessive smoothness, or inconsistent fine details.
`;

  const videoSpecifics = `
### Video Forensic Protocols

- Model Attribution:
  Look for possible characteristics associated with Sora,
  Kling, Runway, Luma Dream Machine, or other video generators.

- Temporal Coherence:
  Check whether objects, faces, backgrounds,
  and textures change unexpectedly between frames.

- Motion:
  Look for physically inconsistent movement,
  unnatural object deformation, or impossible motion.

- Lip Sync:
  Analyze alignment between speech phonemes
  and visible mouth movements.

- Identity Consistency:
  Check whether facial features remain stable
  throughout the video.

- Background Stability:
  Look for background morphing, object disappearance,
  texture changes, or frame-to-frame inconsistencies.
`;

  let specificInstruction = "";

  if (mediaType === MediaType.AUDIO) {
    specificInstruction = audioSpecifics;
  } else if (mediaType === MediaType.IMAGE) {
    specificInstruction = imageSpecifics;
  } else if (mediaType === MediaType.VIDEO) {
    specificInstruction = videoSpecifics;
  }

  return `
${baseInstruction}

${specificInstruction}

### Required Output

Return the forensic analysis as valid JSON.

The JSON must contain:

- isAIGenerated:
  Boolean indicating whether the media is likely AI generated.

- authenticityScore:
  Number from 0 to 100.
  Higher values indicate greater confidence that the media is authentic.

- reasoning:
  Detailed explanation of the technical reasoning.

- justification:
  Specific evidence supporting the conclusion.

- verdict:
  A concise forensic headline.

- generatorTool:
  Best estimate of the AI generator, or "Unknown/Organic"
  when there is insufficient evidence.

- attributionConfidence:
  Number from 0 to 100 indicating confidence
  in the identified generator.

- detectedArtifacts:
  Array of detected forensic artifacts.

Each artifact must contain:

- label
- description
- severity

Severity must be one of:

"low"
"medium"
"high"

Do not fabricate metadata, signatures, or evidence.
If the evidence is inconclusive, clearly state that.
`;
};


/**
 * Convert a File into a Base64 string.
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result as string;

        if (!result) {
          reject(new Error("Unable to read the selected file."));
          return;
        }

        const commaIndex = result.indexOf(",");

        if (commaIndex === -1) {
          reject(new Error("Invalid file data."));
          return;
        }

        const base64 = result.substring(commaIndex + 1);

        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the file."));
    };

    reader.readAsDataURL(file);
  });
};


/**
 * Analyze an uploaded media file.
 */
export const analyzeMedia = async (
  file: File,
  mediaType: MediaType
): Promise<ForensicReport> => {
  if (!file) {
    throw new Error("No media file was selected.");
  }

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || "application/octet-stream";

  try {
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",

      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
          {
            text: getForensicPrompt(mediaType),
          },
        ],
      },

      config: {
        thinkingConfig: {
          thinkingBudget: 16000,
        },

        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          required: [
            "isAIGenerated",
            "authenticityScore",
            "reasoning",
            "justification",
            "detectedArtifacts",
            "verdict",
          ],

          properties: {
            isAIGenerated: {
              type: Type.BOOLEAN,
            },

            authenticityScore: {
              type: Type.NUMBER,
              description:
                "Authenticity confidence score from 0 to 100.",
            },

            reasoning: {
              type: Type.STRING,
            },

            justification: {
              type: Type.STRING,
            },

            verdict: {
              type: Type.STRING,
            },

            generatorTool: {
              type: Type.STRING,
              description:
                'Likely AI generator or "Unknown/Organic".',
            },

            attributionConfidence: {
              type: Type.NUMBER,
              description:
                "Confidence in generator identification from 0 to 100.",
            },

            detectedArtifacts: {
              type: Type.ARRAY,

              items: {
                type: Type.OBJECT,

                required: [
                  "label",
                  "description",
                  "severity",
                ],

                properties: {
                  label: {
                    type: Type.STRING,
                  },

                  description: {
                    type: Type.STRING,
                  },

                  severity: {
                    type: Type.STRING,
                    enum: [
                      "low",
                      "medium",
                      "high",
                    ],
                  },
                },
              },
            },
          },
        },
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    try {
      return JSON.parse(text) as ForensicReport;
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini JSON response:",
        text
      );

      throw new Error(
        "Gemini returned an invalid forensic report."
      );
    }

  } catch (error) {
    console.error("Media analysis failed:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Media analysis failed. Please try again."
    );
  }
};


/**
 * Search the web for possible sources and references
 * related to the uploaded media.
 */
export const searchWebForSources = async (
  file: File,
  mediaType: MediaType
): Promise<{
  explanation: string;
  sources: GroundingSource[];
}> => {
  if (!file) {
    throw new Error("No media file was selected.");
  }

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || "application/octet-stream";

  try {
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",

      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },

          {
            text: `
Search the web to determine whether this ${mediaType}
or a very similar version exists online.

Specifically investigate:

- Known AI-generated media releases.
- AI generator showcases.
- Viral AI media.
- AI debunking articles.
- Discussions about possible AI origins.
- Possible associations with known generators.

Examples include:
Midjourney Showcase,
Sora samples,
Runway,
Kling,
ElevenLabs,
Suno,
Udio,
Luma,
and other relevant AI tools.

Identify which AI tool may have created the media,
but do not claim certainty without supporting evidence.
`,
          },
        ],
      },

      config: {
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });

    const sources: GroundingSource[] = [];

    const chunks =
      response.candidates?.[0]?.groundingMetadata
        ?.groundingChunks;

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk?.web) {
          sources.push({
            title: chunk.web.title || "Source",
            uri: chunk.web.uri,
          });
        }
      });
    }

    return {
      explanation:
        response.text ||
        "No specific origin details found.",

      sources,
    };

  } catch (error) {
    console.error(
      "Web source search failed:",
      error
    );

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Web source search failed. Please try again."
    );
  }
};