# Gmail Local Text Processor (MVP)

This Chrome Extension is a proof-of-concept demonstrating local, in-browser text processing within Gmail using the `Xenova/t5-small` model via the `transformers.js` library. It attempts both summarization and basic event extraction using the same model via different prompts, initiated from the context menu.

## Goal

To test the feasibility and performance of running a moderately sized transformer model (T5-Small) entirely client-side for processing selected text in Gmail, exploring the use of a single generative model for multiple tasks (summarization and event extraction) via prompt engineering.

## Features

*   **Context Menu Integration:** Right-click on selected text within Gmail (`https://mail.google.com/*`):
    *   "Summarize (Local T5)"
    *   "Extract Event Info (Local T5)"
*   **Local Processing:** Uses `transformers.js` with its ONNX/WASM backend to run the `Xenova/t5-small` model locally.
*   **Task Prompting:** Sends different prefixes (`summarize: ` or `extract event details: `) to the T5 model based on the chosen context menu action.
*   **Privacy-Focused:** Selected text is processed only within the user's browser.
*   **Basic Output:** Displays the generated text (summary or extracted info) and processing time using a simple browser `alert()`.

## Technology Stack

*   **Core Library:** `@xenova/transformers`
*   **Model:** `Xenova/t5-small`
*   **Execution:** Web Worker (`summarize.worker.js`) managed via an Offscreen Document (`offscreen.html`, `offscreen.js`).
*   **Bundling:** Webpack with Babel (`webpack.config.js`).
*   **Extension Framework:** Chrome Manifest V3.

## Architecture Flow

1.  **User Action:** User selects text in Gmail, right-clicks -> chooses "Summarize..." or "Extract Event Info...".
2.  **Context Menu Trigger:** `background.js` listener identifies the chosen action (`summarize` or `extract_event`).
3.  **Task Dispatch:** `background.js` sends a message (text, task type, tab ID) to `offscreen.js`.
4.  **Worker Communication:** `offscreen.js` creates/gets the `summarize.worker.js` and relays the message to it.
5.  **Task Execution (Worker):**
    *   `summarize.worker.js` loads the T5 model (on first run).
    *   Prepends the appropriate prefix (`summarize: ` or `extract event details: `) to the input text.
    *   Runs the text-to-text generation pipeline.
    *   Measures processing time.
6.  **Result Return:** Worker posts the result (generated text, task label, duration) back to `offscreen.js`.
7.  **Result Forwarding:** `offscreen.js` forwards the message back to `background.js`.
8.  **Display Result:** `background.js` sends the result details to `content.js` in the original Gmail tab.
9.  **User Notification:** `content.js` displays the result and processing time using `alert()`.

## Build Process

1.  Install dependencies: `npm install`
2.  Run the Webpack build: `npm run build` (assuming a `"build": "webpack"` script in `package.json`)
3.  This creates the `dist` directory.

## Loading the Extension

1.  Open Chrome -> `chrome://extensions/`.
2.  Enable "Developer mode".
3.  Click "Load unpacked" -> Select the `dist` directory.

## Usage

1.  Navigate to `https://mail.google.com/`.
2.  Select text.
3.  Right-click -> Choose "Summarize (Local T5)" or "Extract Event Info (Local T5)".
4.  Wait for processing (model download on first use).
5.  An `alert()` box shows the result and processing time.

## Challenges Encountered & Solutions (MVP)

*   **MV3 Worker Creation:** Service Workers can't directly create Web Workers. Solved using `chrome.offscreen` API.
*   **MV3 CSP (JS):** `importScripts` from CDN blocked. Solved by bundling `transformers.js` via Webpack.
*   **MV3 CSP (WASM):** WASM execution blocked. Solved by adding `'wasm-unsafe-eval'` to `content_security_policy.extension_pages.script-src` in `manifest.json`.
*   **MV3 `alert()`:** Service Workers lack `alert()`. Replaced with `console.error()` in `background.js`.
*   **Webpack Config:** Required careful configuration to copy necessary assets (`offscreen.html`, `.js`, `.wasm` files) to the output directory.
*   **T5 for Extraction:** Using T5 with a simple prompt for event extraction yields basic results; its accuracy is limited compared to dedicated NER models.

## Future Considerations

*   **UI:** Replace `alert()` with a better UI (e.g., side panel, injected element).
*   **Event Extraction Quality:** Evaluate T5 extraction thoroughly. Consider using a dedicated NER model (like `Xenova/bert-base-NER`) if higher accuracy is needed, accepting the trade-off of loading a second model.
*   **Prompt Engineering:** Improve prompts for T5 extraction.
*   **Error Handling:** More robust error display to the user.
*   **Performance:** Add progress indicators; explore model caching/quantization. 