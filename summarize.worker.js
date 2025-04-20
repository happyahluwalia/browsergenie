// summarize.worker.js (Using T5 for multiple tasks via prompts passed in message)
console.log("T5 Worker: Script loaded.");

import { pipeline, env } from '@xenova/transformers';

// Configure environment
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

// REMOVED storage loading logic and promptTemplates global variable

// Pipeline instance holder
class TextToTextPipeline {
    static task = 'summarization';
    static model = 'Xenova/t5-small';
    static instance = null;

    static async getInstance(progress_callback = null) {
        // REMOVED prompt loading check here
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
                throw error;
            }
        } 
        return this.instance;
    }
}

// Listen for messages
self.onmessage = async (event) => {
    const message = event.data;

    // Expect the prompt template to be part of the message
    if (message.type === 'processText' && message.text && message.promptTemplate) {
        const task = message.task || 'summarize';
        let inputText = message.text;
        let generatedTextLabel = "Result"; // Default label
        const template = message.promptTemplate; // Use the template passed in the message

        // Determine label based on task
        if (task === 'summarize') {
            generatedTextLabel = "Summary";
        } else if (task === 'extract_event') {
            generatedTextLabel = "Extracted Event Info";
        } else {
             generatedTextLabel = `Result (${task})`;
        }

        // Construct input using the template
        try {
             // Basic safety check for the placeholder
             if (template.includes("{text}")) {
                inputText = template.replace("{text}", message.text);
             } else {
                console.warn("T5 Worker: Prompt template missing {text} placeholder. Using raw text instead.");
                // If placeholder is missing, maybe just use raw text or prepend template?
                // For now, let's just use raw text as a fallback.
                inputText = message.text;
             }
        } catch (e) {
             console.error("T5 Worker: Error formatting prompt template. Using raw text.", e);
             inputText = message.text; // Fallback to raw text
        }

        try {
            const generator = await TextToTextPipeline.getInstance(/* progress_callback */);

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
        console.warn("T5 Worker: Received message missing required fields (type=processText, text, promptTemplate):", message);
    }
};

// REMOVED initial prompt load call

console.log("T5 Worker: Script ready and listening.");