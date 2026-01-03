import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromUrl(url, fileType) {
    console.log(`Extracting text from ${fileType}...`);
    // Determine type from extension if fileType not provided or generic
    const isPdf = fileType === 'pdf' || url.toLowerCase().split('?')[0].endsWith('.pdf');

    try {
        if (isPdf) {
            const text = await extractPdfText(url);
            // If text is very short/empty, it's likely a scan (no text layer)
            if (!text || text.length < 50) {
                // Graceful error for scanned PDFs
                throw new Error("Scanned PDF detected (no selectable text). Please upload an image or paste text manually.");
            }
            return text;
        }
        // Fallback or Image
        return await extractImageText(url);
    } catch (e) {
        console.error("Text extraction failed:", e);
        // Throw proper error message to be shown in UI
        throw e.message ? e : new Error("Could not extract text from document.");
    }
}

async function extractImageText(url) {
    const { data: { text } } = await Tesseract.recognize(
        url,
        'eng',
        {
            // logger: m => console.log(m) 
        }
    );
    return cleanExtractedText(text);
}

function cleanExtractedText(text) {
    if (!text) return "";

    // 1. Split into lines
    const lines = text.split(/\r?\n/);

    // 2. Filter and clean lines
    const cleanedLines = lines.map(line => {
        let cleaned = line.trim();
        // Remove multiple spaces
        cleaned = cleaned.replace(/\s+/g, ' ');
        // Remove noise chars (OCR artifacts)
        cleaned = cleaned.replace(/^[|_~`\-><]+/, '').replace(/[|_~`\-><]+$/, '');

        // STRICT PII / Noise Removal (Replaced with empty string, not placeholders)

        // Emails
        cleaned = cleaned.replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, '');
        // Phone numbers (Generic patterns)
        cleaned = cleaned.replace(/(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g, '');
        // URLs
        cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
        // Dates (Timestamps/Printed On) - keep simple dates, remove long timestamps?
        // Actually, Patient DoB and Test Date are important. Keep dates.

        return cleaned.trim();
    }).filter(line => {
        // Filter out very short lines or garbage
        if (line.length < 3) return false;

        // Filter Footer/Header text
        if (/page\s+\d+\s+of\s+\d+/i.test(line)) return false;
        if (/printed\s+on/i.test(line)) return false;
        if (/electronically\s+signed/i.test(line)) return false;
        if (/verified\s+by/i.test(line)) return false;
        if (/end\s+of\s+report/i.test(line)) return false;

        // Filter Addresses (Heuristic: Lines with state/zip codes)
        // Hard to do strictly without losing patient info.
        // We'll rely on lines being short/garbage or header position primarily.

        // Alpha-numeric check (remove lines that are mostly symbols)
        const alphaNumeric = line.replace(/[^a-zA-Z0-9]/g, '').length;
        if (alphaNumeric < 2) return false;

        return true;
    });

    return cleanedLines.join('\n');
}

async function extractPdfText(url) {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // Add spaces between items to preserve words
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return cleanExtractedText(fullText);
}
