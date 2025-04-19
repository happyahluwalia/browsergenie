# Chrome Extension: In-Browser LLM Summarizer

## Overview
This Chrome extension uses the T5-Small model to summarize pasted or selected text, entirely within the browser. It runs fully client-side using Xenova's `transformers.js` library.

## Goals
- No server-side inference: All processing is local for privacy and speed.
- Keep model size manageable (~45MB)
- Smooth UX using Web Workers to offload computation

## Key Technologies Evaluated

### JavaScript (`transformers.js`)
- Pros: Simple setup, cross-browser, no GPU required.
- Cons: Limited to smaller models, CPU only.

### WebAssembly (WASM)
- Pros: More efficient than JS; good for ONNX-style inference.
- Cons: Requires model conversion; setup overhead.

### WebGPU (WebLLM)
- Pros: GPU acceleration in-browser.
- Cons: Only supported in latest Chrome + hardware; large models (~700MB+).

## Chosen Stack for MVP
- **Model**: `T5-Small`
- **Library**: `transformers.js`
- **Inference**: Web Worker with lazy loading & caching in IndexedDB

## Architecture
1. User pastes or selects text in popup.
2. Sends text to background worker.
3. Worker loads model (if needed) and runs summarization.
4. Summary returned to popup and displayed.

## Pitfalls & Mitigations
- **Initial load delay**: Model is cached after first load.
- **UI freeze**: Inference is done in a worker thread.
- **Browser limits**: Model size kept under ~50MB for better compatibility.

## Future Enhancements
- Add DistilBART for better summaries (~130MB)
- Context-menu summarization
- Progress feedback while loading
- Customization: summary length slider, dark mode

---
Built with performance, privacy, and portability in mind.
