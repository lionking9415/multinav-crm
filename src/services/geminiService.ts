import { GoogleGenAI, Type } from "@google/genai";
import type { Client, HealthActivity, WorkforceData, AiInsight, GpPractice } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;

if (!API_KEY) {
    console.warn("VITE_GEMINI_API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "DISABLED" });

function buildPrompt(clients: Client[], activities: HealthActivity[], workforce: WorkforceData): string {
    
    // Create summaries to avoid overly long prompts for large datasets
    const clientSummary = {
        totalClients: clients.length,
        ethnicityDistribution: clients.reduce((acc: Record<string, number>, c) => {
            const key = c.ethnicity || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {}),
        ageRange: {
            min: Math.min(...clients.map(c => c.age || 0).filter(Boolean)),
            max: Math.max(...clients.map(c => c.age || 0).filter(Boolean)),
        },
        topReferralSources: Object.entries(clients.reduce((acc: Record<string, number>, c) => {
            const key = c.referralSource || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})).sort((a,b) => b[1] - a[1]).slice(0,3),
    };

    const activitySummary = {
        totalActivities: activities.length,
        topNavigationAssistance: Object.entries(activities.flatMap(a => a.navigationAssistance).reduce((acc: Record<string, number>, service) => {
            acc[service] = (acc[service] || 0) + 1;
            return acc;
        }, {})).sort((a,b) => b[1] - a[1]).slice(0,5),
        topServicesAccessed: Object.entries(activities.flatMap(a => a.servicesAccessed).reduce((acc: Record<string, number>, service) => {
            acc[service] = (acc[service] || 0) + 1;
            return acc;
        }, {})).sort((a,b) => b[1] - a[1]).slice(0,5),
    };

    return `
      Analyze the following summarized health navigation service data for Perth, Australia.
      The data includes summaries of multiple client cases, their health activities, and workforce details.
      Provide trends, identify gaps, and suggest recommendations based on the aggregated data.

      **System Instructions:**
      1. You are an expert public health analyst specializing in multicultural health.
      2. Your response MUST be a JSON array of objects.
      3. Each object in the array should have three keys: "title" (string), "insight" (string), and "recommendation" (string, optional).
      4. The analysis should be concise, insightful, and directly related to the provided data summaries.
      5. Base your analysis on these key areas:
         - Service usage patterns based on demographic and activity summaries.
         - Common health needs and potential service gaps identified from top services.
         - Engagement with specific types of services.
         - Workforce capacity and diversity in relation to the client population summary.

      **Data for Analysis:**

      **Client Demographics Summary:**
      ${JSON.stringify(clientSummary, null, 2)}

      **Health Navigation Activities Summary:**
      ${JSON.stringify(activitySummary, null, 2)}

      **Workforce Data:**
      - Perth North FTE: ${workforce.north.reduce((sum, s) => sum + s.fte, 0)}
      - Perth South FTE: ${workforce.south.reduce((sum, s) => sum + s.fte, 0)}
      - Workforce Languages: ${[...new Set(workforce.north.flatMap(s => s.languages).concat(workforce.south.flatMap(s => s.languages)))].join(', ')}

      Now, generate the JSON response based on this summarized data.
    `;
}

export async function generateInsights(clients: Client[], activities: HealthActivity[], workforce: WorkforceData): Promise<AiInsight[]> {
    if (!API_KEY || API_KEY === "DISABLED") {
        throw new Error("Gemini API key is not configured. Please set the VITE_GEMINI_API_KEY environment variable.");
    }
    
    const prompt = buildPrompt(clients, activities, workforce);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.3,
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            insight: { type: Type.STRING },
                            recommendation: { type: Type.STRING },
                        },
                        required: ["title", "insight"],
                    }
                }
            },
        });

        let jsonStr = response.text.trim();
        
        const parsedData = JSON.parse(jsonStr);

        if (Array.isArray(parsedData) && parsedData.every(item => 'title' in item && 'insight' in item)) {
            return parsedData as AiInsight[];
        } else {
            console.error("Unexpected AI response format:", parsedData);
            throw new Error("AI response is not in the expected format (Array of AiInsight).");
        }

    } catch (e) {
        console.error("Error calling Gemini API:", e);
        if (e instanceof Error) {
            throw new Error(`Failed to generate insights: ${e.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI service.");
    }
}

export async function generateReportInsights(
  clientSummary: object, 
  activitySummary: object, 
  workforceSummary: object, 
  dateRange: { start: string, end: string }
): Promise<AiInsight[]> {
    if (!API_KEY || API_KEY === "DISABLED") {
        throw new Error("Gemini API key is not configured. Please set the VITE_GEMINI_API_KEY environment variable.");
    }

    const prompt = `
        Analyze the following health navigation service data for the period ${dateRange.start} to ${dateRange.end}.
        You are an expert public health analyst. Your goal is to generate a high-level summary with key insights and actionable recommendations for a program report.
        
        **Instructions:**
        1. Your response MUST be a valid JSON array of objects. Do not include any text or markdown formatting before or after the JSON array.
        2. Each object must have "title" (string), "insight" (string), and an optional "recommendation" (string) key.
        3. Focus on trends, significant findings, and potential gaps identified *within the specified date range*.
        4. Keep insights concise, data-driven, and suitable for a formal report.

        **Data Summaries for Analysis:**
        Client Summary (for the period): ${JSON.stringify(clientSummary, null, 2)}
        Activity Summary (for the period): ${JSON.stringify(activitySummary, null, 2)}
        Workforce Snapshot (current): ${JSON.stringify(workforceSummary, null, 2)}

        Generate the JSON response.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.3,
                 responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            insight: { type: Type.STRING },
                            recommendation: { type: Type.STRING },
                        },
                        required: ["title", "insight"],
                    }
                }
            },
        });
        
        const jsonStr = response.text.trim();
        const parsedData = JSON.parse(jsonStr);

        if (Array.isArray(parsedData) && parsedData.every(item => 'title' in item && 'insight' in item)) {
            return parsedData as AiInsight[];
        } else {
            console.error("Unexpected AI response format for report:", parsedData);
            throw new Error("AI response is not in the expected format for the report.");
        }
    } catch (e) {
        console.error("Error calling Gemini API for report insights:", e);
        if (e instanceof Error) {
            throw new Error(`Failed to generate report insights: ${e.message}`);
        }
        throw new Error("An unknown error occurred while generating report insights.");
    }
}

export async function scanForGps(query: string): Promise<Omit<GpPractice, 'id' | 'notes'>[]> {
    if (!API_KEY || API_KEY === "DISABLED") {
        throw new Error("Gemini API key is not configured. Please set the VITE_GEMINI_API_KEY environment variable.");
    }

    const searchTimestamp = new Date().toISOString();
    const prompt = `
        You are a local clinic search engine. Use Google Search to find GP clinics, medical practices, and doctors in Perth, Western Australia that match this specific search query.

        SEARCH QUERY: "${query}"
        SEARCH TIME: ${searchTimestamp}

        SEARCH STRATEGY:
        - Perform multiple targeted Google searches to find the most relevant results for this SPECIFIC query.
        - If the query mentions a language (e.g. "Tagalog", "Dutch", "Somali", "Arabic"), search for doctors and clinics where staff speak that language. Try searches like: "${query} GP Perth", "${query} speaking doctor Perth WA", "${query} language doctor clinic Perth".
        - If the query mentions a suburb or area, focus results on that geographic area and nearby suburbs.
        - If the query mentions a specialty, search for that specific medical specialty.
        - Look at clinic websites, Healthdirect, HotDoc, Google Maps listings, and medical directories for accurate information.

        CRITICAL RULES:
        1. You MUST use Google Search to find REAL practices. Do NOT make up or hallucinate any practice names, addresses, phone numbers, or websites.
        2. Every result MUST be directly relevant to: "${query}". Do NOT pad results with generic GP practices.
        3. Each search query should produce DIFFERENT results based on what was asked. "GPs that speak Tagalog" must return completely different results than "GPs that speak Dutch".
        4. If you cannot find practices matching the query, return an empty array []. Do NOT return irrelevant results.
        5. Return up to 15 results maximum, prioritized by relevance and proximity.
        6. For each practice, provide the most accurate and up-to-date: name, full street address, phone number, and website URL.

        Your response MUST be a valid JSON array only. No text or markdown before or after.
        Each object: { "name": string, "address": string, "phone": string, "website": string }
        Use "" for any field you cannot find.
    `;

    console.group('🔍 [scanForGps] GP Scan Debug');
    console.log('📝 User query:', query);
    console.log('📤 Full prompt sent to Gemini:\n', prompt);
    console.groupEnd();

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.7,
            },
        });

        const rawText = response.text;

        console.group('🔍 [scanForGps] Gemini Response Debug');
        console.log('📥 Raw response text:\n', rawText);
        // Log grounding metadata if available
        if (response.candidates?.[0]?.groundingMetadata) {
            console.log('🌐 Grounding metadata:', JSON.stringify(response.candidates[0].groundingMetadata, null, 2));
        }
        if (response.candidates?.[0]?.groundingMetadata?.searchEntryPoint) {
            console.log('🔗 Search entry point:', response.candidates[0].groundingMetadata.searchEntryPoint);
        }
        console.groupEnd();

        let jsonStr = rawText.trim();
        // The model might wrap the JSON in markdown backticks
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith('```')) {
             jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        const parsedData = JSON.parse(jsonStr);

        console.log('🔍 [scanForGps] Parsed results count:', parsedData.length);
        console.log('🔍 [scanForGps] Parsed results:', JSON.stringify(parsedData, null, 2));

        if (Array.isArray(parsedData) && (parsedData.length === 0 || (parsedData.length > 0 && 'name' in parsedData[0] && typeof parsedData[0].name === 'string'))) {
            return parsedData.map((item: any) => ({
                name: item.name || 'N/A',
                address: item.address || 'N/A',
                phone: item.phone || 'N/A',
                website: item.website || 'N/A'
            }));
        } else {
            console.error("Unexpected AI response format:", parsedData);
            throw new Error("AI response is not in the expected format (Array of GpPractice).");
        }
    } catch (e) {
        console.error("❌ [scanForGps] Error calling or parsing Gemini API:", e);
        if (e instanceof Error) {
            throw new Error(`Failed to scan for GPs: ${e.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI service.");
    }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
    if (!API_KEY || API_KEY === "DISABLED") {
        // Mock translation if API key is not available
        console.warn("VITE_GEMINI_API_KEY not set, using mock translation.");
        return new Promise(resolve => setTimeout(() => resolve(`(Translated to ${targetLanguage}) ${text}`), 500));
    }

    const prompt = `Translate the following text to ${targetLanguage}. Provide ONLY the translated text, without any additional explanation or formatting.

Text to translate:
"${text}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.1,
            },
        });
        return response.text.trim();
    } catch (e) {
        console.error("Error calling Gemini API for translation:", e);
        if (e instanceof Error) {
            throw new Error(`Failed to translate text: ${e.message}`);
        }
        throw new Error("An unknown error occurred during translation.");
    }
}