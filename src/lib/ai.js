const OLLAMA_URL = "/api/ollama/api/generate";
const OLLAMA_MODEL = "llama3.2"; // Detected local model

/**
 * Call local Ollama instance.
 */
async function callOllama(prompt) {
    try {
        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.2, // Slight creativity for explanations, but grounded
                    num_ctx: 8192
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response || "";

    } catch (e) {
        console.error("Ollama Connection Failed:", e);
        if (e.message.includes("Failed to fetch") || e.message.includes("NetworkError")) {
            throw new Error("Local AI is not running. Please start Ollama (run 'ollama serve').");
        }
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
        console.log(`[Ollama] Generating summary...`);
        const result = await callOllama(prompt);
        return result.trim();
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
        return await callOllama(prompt);
    } catch (e) {
        return `Error: ${e.message}`;
    }
}
