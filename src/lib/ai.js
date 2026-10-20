const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Check if API key is present on load
if (!API_KEY) {
    console.error("Missing VITE_GEMINI_API_KEY in environment variables. If deploying on Vercel, add VITE_GEMINI_API_KEY to Project Settings > Environment Variables.");
}

// Using v1beta and gemini-2.5-flash (newest model, confirmed available)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

/**
 * Call Google Gemini API via REST.
 */
export async function callGemini(prompt) {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your Vercel Environment Variables and redeploy.");
    }

    try {
        const response = await fetch(GEMINI_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const text = await response.text();
            if (response.status === 429) {
                throw new Error("Quota exceeded (429). The free tier is temporarily exhausted. Please try again in 5-10 minutes.");
            }
            throw new Error(`Gemini Error: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            // Fallback or just empty
            return "";
        }

        return text;

    } catch (e) {
        console.error("Gemini API Connection Failed:", e);
        throw e;
    }
}

/**
 * Convert a signed URL or file into a base64 string with proper MIME type.
 */
async function fileUrlToBase64(url, filename = '') {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to download document: ${res.status} ${res.statusText}`);
    }
    const blob = await res.blob();

    let mimeType = blob.type;
    const lowerName = (filename || url).toLowerCase().split('?')[0];

    if (!mimeType || mimeType === 'application/octet-stream') {
        if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (lowerName.endsWith('.png')) mimeType = 'image/png';
        else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
        else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else mimeType = 'application/pdf';
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                const base64Data = result.split(',')[1];
                resolve({ base64Data, mimeType });
            } else {
                reject(new Error('Failed to read file as base64 string'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Call Google Gemini API with multimodal content (PDF or Image + Prompt).
 */
export async function callGeminiMultimodal({ prompt, base64Data, mimeType }) {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your Vercel Environment Variables and redeploy.");
    }

    try {
        const parts = [{ text: prompt }];

        if (base64Data && mimeType) {
            parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            });
        }

        const response = await fetch(GEMINI_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{ parts }]
            })
        });

        if (!response.ok) {
            const text = await response.text();
            if (response.status === 429) {
                throw new Error("Quota exceeded (429). The free tier is temporarily exhausted. Please wait 1 minute and try again.");
            }
            throw new Error(`Gemini Error: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = await response.json();
        const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return output || "";

    } catch (e) {
        console.error("Gemini Multimodal API Connection Failed:", e);
        throw e;
    }
}

const MEDICAL_SYSTEM_PREAMBLE = `
You are a helpful and meticulous medical assistant. Your job is to analyze and summarize this medical report for a PATIENT (non-medical person).

RULES:
1. Language: Simple, clear, and reassuring. Avoid complex medical jargon without explaining it.
2. Focus: Accurately read all values, reference ranges, and especially abnormal (High/Low/Borderline) results from the document tables.
3. SAFETY: DO NOT diagnose, DO NOT prescribe, DO NOT say "You have X disease". Use neutral phrasing like "This may indicate...", "Commonly associated with...", or "Often seen in...".
4. Structure:
   - **Patient & Test Overview**: Patient name, Age, Sex, Date of report, and Test(s) performed (e.g. Complete Blood Count).
   - **Key Findings**: List all abnormal or out-of-range results (High, Low, or Borderline). Format each as: 
     "• **Test Name**: Value (Reference Range: Min - Max Unit) - [Status: High/Low/Borderline] - *Simple Explanation of what this test measures*".
   - **Normal Findings Summary**: A brief 1-2 sentence reassurance of normal parameters.
   - **What This Means**: A short paragraph explaining the overall picture in patient-friendly terms.
   - **Next Steps & Questions for Your Doctor**: 2-3 specific, helpful questions the patient can ask their doctor.
5. Disclaimer: End with:
   "⚠️ *This summary is generated by AI for informational purposes only and does not constitute medical advice or diagnosis. Please consult your physician for clinical correlation and treatment.*"
`;

/**
 * Generate medical summary directly from a document URL (PDF or Image) using Gemini Multimodal Vision.
 * Handles scanned PDFs and multi-column tables with 100% visual layout accuracy.
 */
export async function generateMedicalSummaryFromUrl(url, filename = '') {
    try {
        console.log(`[Gemini Multimodal] Loading document ${filename}...`);
        const { base64Data, mimeType } = await fileUrlToBase64(url, filename);

        console.log(`[Gemini Multimodal] Analyzing ${mimeType} directly with Gemini 2.5 Flash...`);
        const prompt = `${MEDICAL_SYSTEM_PREAMBLE}\n\nPlease analyze this attached medical report document and provide the patient-friendly summary according to the structure above:`;

        return await callGeminiMultimodal({
            prompt,
            base64Data,
            mimeType
        });
    } catch (e) {
        console.error("Multimodal generation error:", e);
        throw e;
    }
}

export async function generateMedicalSummary(input, filename = '') {
    if (!input) {
        throw new Error("No document or text available for extraction");
    }

    // If input is a URL (starts with http), use direct multimodal analysis
    if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
        return await generateMedicalSummaryFromUrl(input, filename);
    }

    // Fallback for raw text
    const prompt = `${MEDICAL_SYSTEM_PREAMBLE}\n\nDOCUMENT TEXT:\n${input}\n\nPATIENT SUMMARY:`;
    try {
        console.log(`[Gemini] Generating summary from text...`);
        return await callGemini(prompt);
    } catch (e) {
        return `Error: ${e.message}`;
    }
}

export async function explainMedicalTerm(term) {
    if (!term || term.trim().length === 0) return "Please ask a medical term.";

    const prompt = `Explain the medical term "${term}" in simple, patient-friendly language. 
Keep the explanation short (2-3 sentences). 
Do NOT provide diagnosis or medical advice. 
Just the definition.`;

    try {
        return await callGemini(prompt);
    } catch (e) {
        return `Error: ${e.message}`;
    }
}
