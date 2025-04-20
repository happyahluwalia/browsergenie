# Gmail Local Text Summarizer (MVP)

This Chrome Extension is a proof-of-concept demonstrating local, in-browser text summarization within Gmail using `transformers.js`. It uses the `Xenova/distilbart-cnn-6-6` model initiated via the context menu.

**Note on Extraction:** Attempts to implement event/entity extraction using local models (T5-based QA, BERT-based NER, DistilBERT-based QA) encountered significant limitations or errors within the current library/model constraints. See 'Challenges' section.

## Goal

To test the feasibility and performance of running transformer models entirely client-side for processing selected text in Gmail. This MVP focuses on providing text summarization using the DistilBART model.

## Features

*   **Context Menu Integration:** Right-click on selected text within Gmail:
    *   "Summarize (Local DistilBART)"
*   **Local Processing:** Uses `transformers.js` with ONNX/WASM backend to run `Xenova/distilbart-cnn-6-6` locally.
*   **Configurable Summarization Prompting:** Options page allows editing the summarization prompt template (uses `{text}` placeholder).
*   **Options Page:** Access via Chrome Extensions page -> Details -> Extension options.
*   **Privacy-Focused:** Selected text processed client-side.
*   **Basic Output:** Displays summary and processing time via `alert()`.

## Technology Stack

*   **Core Library:** `@xenova/transformers`
*   **Model:** `Xenova/distilbart-cnn-6-6`
*   **Execution:** Single Web Worker (`model.worker.js`) via Offscreen Document.
*   **Settings:** `chrome.storage.sync` for prompt template.
*   **Options UI:** `options.html`, `options.js`.
*   **Bundling:** Webpack, Babel.
*   **Extension Framework:** Chrome Manifest V3.

## Architecture Flow

(Simplified flow focusing on Summarization)
1.  **User Action:** Select text, right-click -> Choose "Summarize...".
2.  **Context Menu Trigger:** `background.js` identifies action.
3.  **Task Dispatch:** `background.js` fetches prompt template from storage and sends message (text, task='summarize', template, tab ID) to `offscreen.js`.
4.  **Worker Communication:** `offscreen.js` relays message to `model.worker.js`.
5.  **Task Execution (Worker):**
    *   Loads DistilBART pipeline if needed.
    *   Prepares input using template.
    *   Runs summarization pipeline.
    *   Measures time.
6.  **Result Return:** Worker posts result back to `offscreen.js`.
7.  **Result Forwarding:** `offscreen.js` forwards to `background.js`.
8.  **Display Result:** `background.js` sends to `content.js`.
9.  **User Notification:** `content.js` displays result via `alert()`.

## Build Process & Loading

(Steps remain the same: `npm install`, `npm run build`, load `dist` unpacked)

## Usage

1.  (Optional) Configure Summarization Prompt: Go to Extension options.
2.  Go to Gmail, select text.
3.  Right-click -> Choose "Summarize (Local DistilBART)".
4.  Wait for processing (model download on first use).
5.  `alert()` shows result.

## Challenges Encountered & Solutions (MVP)

*   **MV3 Constraints:** Addressed worker creation (`chrome.offscreen`), CSP for JS/WASM (`manifest.json`), API limitations (`alert()`, worker `chrome.*` access) through architecture and configuration.
*   **Webpack Config:** Ensured necessary file bundling/copying.
*   **Event Extraction Investigation:**
    *   **Initial Goal:** Extract structured event details (date, time, title).
    *   **T5 Prompting:** Using `Xenova/t5-small` with various prompts (e.g., `extract event details: {text}`) proved unreliable for structured output.
    *   **General NER:** Using `Xenova/bert-base-NER` identified general entities (PER, LOC, ORG) but failed to extract specific event components (dates/times weren't recognized as distinct entities).
    *   **Question Answering:** Using `Xenova/distilbert-base-...-squad` (both cased and uncased) with a configurable question failed due to an internal `TypeError: t.split is not a function` within the library's tokenizer when processing the QA input object. This seems to be a library/pipeline issue for QA in this context.
    *   **Conclusion (MVP):** Reliable local event extraction (beyond basic NER) proved difficult with readily available `transformers.js`-compatible models and techniques. The MVP now focuses solely on summarization.
*   **Model Performance:** Switching from T5-small to DistilBART-CNN improved summarization quality (subjectively) but increased model download size and inference time significantly.

## Future Considerations

*   **UI:** Replace `alert()`.
*   **Summarization Model Choice:** Re-evaluate T5-small vs. DistilBART based on user tolerance for speed vs. quality. Add option to select summarizer.
*   **Event Extraction:** Revisit if/when more suitable local models (or library fixes for QA) become available, or consider server-side options.
*   **Performance:** Explore WebGPU backend (see below), further quantization, caching.
*   **Error Handling/Progress:** Improve user feedback. 