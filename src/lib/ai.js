const COHERE_API_KEY = import.meta.env.VITE_COHERE_API_KEY;
const COHERE_API_URL = "https://api.cohere.ai/v1/chat";

/**
 * Robust fetch for Cohere API.
 */
async function callCohere(message, temperature = 0.3) {
    if (!COHERE_API_KEY) {
        throw new Error("Missing VITE_COHERE_API_KEY");
    }

    try {
        const response = await fetch(COHERE_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${COHERE_API_KEY}`,
                "Content-Type": "application/json",
                "X-Client-Name": "MedLink-App"
            },
            body: JSON.stringify({
                message: message,
                model: "command", // Robust instruction-following model
                temperature: temperature,
                chat_history: [], // No history needed for single tasks
                connectors: [] // No web search
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Cohere API Error ${response.status}: ${errData.message || JSON.stringify(errData)}`);
        }

        const data = await response.json();
        return data.text || "";

    } catch (e) {
        console.error("Cohere Call Failed:", e);
        throw e;
    }
}

export async function generateMedicalSummary(text) {
    if (!text || text.trim().length === 0) {
        throw new Error("No text available for extraction");
    }

    // Cohere 'command' has good context, but we chunk to be safe and precise.
    const CHUNK_SIZE = 4000;
    const chunks = [];

    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    let finalOutput = "";

    // Strict Extraction Prompt
    const SYSTEM_PREAMBLE = `
You are a medical data extractor. Your job is to extract factual test results from OCR text.
RULES:
1. Extract ONLY: Patient Name/Age/Sex, Test Names, Values, Units, and Reference Ranges.
2. Ignore: Addresses, phone numbers, hospital slogans, footers, disclaimers.
3. Output Format: Bulleted list.
4. Do NOT generate paragraphs or narratives.
5. Do NOT add diagnosis or advice.
6. If the text is garbage or has no medical data, output "No medical data found in this section."
`;

    for (let i = 0; i < chunks.length; i++) {
        console.log(`[Cohere] Processing Chunk ${i + 1}/${chunks.length}...`);

        const prompt = `${SYSTEM_PREAMBLE}\n\nDOCUMENT TEXT:\n${chunks[i]}\n\nEXTRACTED DATA:`;

        try {
            // Temp 0 for maximum factuality
            const result = await callCohere(prompt, 0);
            finalOutput += result + "\n\n";

            // Respect rate limits (Trial tier is 5 calls/min, Production is higher)
            // We'll add a small delay.
            if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 1000));

        } catch (e) {
            finalOutput += `\n(Error processing part ${i + 1}: ${e.message})\n`;
        }
    }

    return finalOutput.trim();
}

export async function explainMedicalTerm(term) {
    if (!term || term.trim().length === 0) return "Please ask a medical term.";

    const prompt = `Explain the medical term "${term}" in simple, patient-friendly language. 
Keep the explanation short (2-3 sentences). 
Do NOT provide diagnosis or medical advice. 
Just the definition.`;

    try {
        // Temp 0.3 for slightly natural but focused explanation
        const answer = await callCohere(prompt, 0.3);
        return answer;
    } catch (e) {
        return "I cannot explain this term right now. Please try again later.";
    }
}
