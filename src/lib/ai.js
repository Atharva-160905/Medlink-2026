const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Check if API key is present on load
if (!API_KEY) {
    console.error("Missing VITE_GEMINI_API_KEY in environment variables.");
}

// Using v1beta and gemini-2.5-flash (newest model, confirmed available)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

/**
 * Call Google Gemini API via REST.
 */
export async function callGemini(prompt) {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing. Please check your .env file.");
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

export async function generateMedicalSummary(text) {
    if (!text || text.trim().length === 0) {
        throw new Error("No text available for extraction");
    }

    const SYSTEM_PREAMBLE = `
You are a helpful medical assistant. Your job is to summarize a medical report for a PATIENT (non-medical person).
RULES:
1. Language: Simple, clear, and reassuring. Avoid complex jargon.
2. Focus: Explain what the results mean, especially abnormal ones.
3. SAFETY: DO NOT diagnose, DO NOT prescribe, DO NOT say "You have X disease". Use "This may indicate..." or "Commonly associated with...".
4. Structure:
   - **Patient Overview**: Name, Age, Sex (if found), Tests performed.
   - **Key Findings**: List ONLY abnormal results (High/Low). Format: "Test Name: Value (High/Low) - Simple Explanation".
   - **What This Means**: A short paragraph explaining the overall picture.
   - **Next Steps**: Advise consulting a doctor.
5. Disclaimer: End with "This summary is for informational purposes only and is not a diagnosis. Please consult your doctor."
`;

    const prompt = `${SYSTEM_PREAMBLE}\n\nDOCUMENT TEXT:\n${text}\n\nPATIENT SUMMARY:`;

    try {
        console.log(`[Gemini] Generating summary...`);
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
