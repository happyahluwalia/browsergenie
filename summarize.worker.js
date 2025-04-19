// summarize.worker.js (Using T5 for multiple tasks via prompts)
console.log("T5 Worker: Script loaded.");

import { pipeline, env } from '@xenova/transformers';

// Configure environment - Skip local check, use WASM
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

// Pipeline instance holder
class TextToTextPipeline {
    static task = 'summarization';
    static model = 'Xenova/t5-small';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            console.log("T5 Worker: Initializing pipeline...");
            self.postMessage({ type: 'modelLoading' });
            const modelLoadStart = performance.now();
            try {
                this.instance = await pipeline(this.task, this.model, { progress_callback });
                const modelLoadEnd = performance.now();
                console.log(`T5 Worker: Pipeline initialized successfully in ${(modelLoadEnd - modelLoadStart).toFixed(2)} ms.`);
            } catch (error) {
                console.error("T5 Worker: Pipeline initialization FAILED:", error);
                self.postMessage({ type: 'error', error: 'Failed to load T5 model: ' + error.message });
                throw error; // Propagate error
            }
        } else {
            // console.log("T5 Worker: Pipeline instance already exists."); // Can be noisy
        }
        return this.instance;
    }
}

// Listen for messages from the offscreen document
self.onmessage = async (event) => {
    // console.log("T5 Worker: Received message:", event.data); // Keep log minimal
    const message = event.data;

    if (message.type === 'processText' && message.text) {
        const task = message.task || 'summarize';
        let inputText = message.text;
        let generatedTextLabel = "Summary";

        // Prepend task-specific prefix
        if (task === 'summarize') {
            inputText = `summarize: ${message.text}`;
            generatedTextLabel = "Summary";
        } else if (task === 'extract_event') {
            inputText = `extract event details: ${message.text}`;
            generatedTextLabel = "Extracted Event Info";
        } else {
            // Fallback to summarize if task is unknown
            inputText = `summarize: ${message.text}`;
            generatedTextLabel = "Summary (defaulted)";
        }

        try {
            const generator = await TextToTextPipeline.getInstance(/* progress_callback */);
            // console.log(`T5 Worker: Starting generation for task '${task}'...`); // Keep log minimal

            const startTime = performance.now();
            const output = await generator(inputText, {
                max_length: 150,
                min_length: 10,
                num_beams: 4,
                early_stopping: true,
            });
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            console.log(`T5 Worker: Task '${task}' completed in ${duration} ms.`);
            // console.log("T5 Worker: Raw Output:", output); // Raw output can be verbose

            const resultText = output[0]?.summary_text || output[0]?.generated_text || '[!] No text generated.';

            // Send response back
            self.postMessage({
                type: 'taskComplete',
                task: task,
                result: resultText,
                label: generatedTextLabel,
                durationMs: duration,
                tabId: message.tabId
            });

        } catch (error) {
            console.error(`T5 Worker: Error during task '${task}':`, error);
            self.postMessage({
                type: 'error',
                error: `Task execution failed inside worker (${task}): ` + error.message,
                tabId: message.tabId
            });
        }
    } else {
        console.warn("T5 Worker: Received message with unknown type or missing text:", message);
    }
};

console.log("T5 Worker: Script ready and listening.");