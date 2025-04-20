// model.worker.js (Handles DistilBART for Summarization, DistilBERT-QA for Events)
console.log("Model Worker: Script loaded.");

import { pipeline, env } from '@xenova/transformers';

// Configure environment
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

// --- Pipeline Management ---
const PIPELINE_CONFIG = {
    summarize: {
        task: 'summarization',
        model: 'Xenova/distilbart-cnn-6-6', // Changed model
        instance: null,
        options: {
            // DistilBART specific options (adjust if needed)
            max_length: 150,
            min_length: 30, // Keep min length higher for summary
            num_beams: 4,
            early_stopping: true,
        }
    },
    extract_event: {
        task: 'question-answering', // Changed task
        model: 'Xenova/distilbert-base-uncased-distilled-squad', // Changed model (QA)
        instance: null,
        options: { 
            // QA specific options if any (usually none needed here)
        }
    }
};

// Function to get (and initialize if needed) a pipeline instance
async function getPipeline(taskName, progress_callback = null) {
    const config = PIPELINE_CONFIG[taskName];
    if (!config) { throw new Error(`Unsupported task: ${taskName}`); }
    if (config.instance === null) {
        console.log(`Model Worker: Initializing pipeline for task '${taskName}' (Model: ${config.model})...`);
        self.postMessage({ type: 'modelLoading', task: taskName });
        const modelLoadStart = performance.now();
        try {
            config.instance = await pipeline(config.task, config.model, { progress_callback, ...config.options });
            const modelLoadEnd = performance.now();
            console.log(`Model Worker: Pipeline for task '${taskName}' initialized successfully in ${(modelLoadEnd - modelLoadStart).toFixed(2)} ms.`);
        } catch (error) {
            console.error(`Model Worker: Pipeline initialization FAILED for task '${taskName}':`, error);
            self.postMessage({ type: 'error', error: `Failed to load model for task '${taskName}': ${error.message}` });
            config.instance = null; throw error;
        }
    }
    return config.instance;
}

// --- Message Handling ---
self.onmessage = async (event) => {
    const message = event.data;
    // Expect type, text, task, and promptTemplate/promptQuestion
    if (message.type === 'processText' && message.text && message.task) {
        const task = message.task;
        const inputText = message.text;
        let generatedTextLabel = "Result";
        let processedInput = null; // Initialize to null

        try {
            // 1. Get the appropriate pipeline instance
            const processor = await getPipeline(task);

            // 2. Prepare input and determine label based on task
            if (task === 'summarize') {
                const template = message.promptTemplate || "summarize: {text}";
                try {
                    processedInput = template.replace("{text}", inputText);
                } catch (e) {
                    console.error("Model Worker: Error formatting summarize template. Using raw text.", e);
                    processedInput = inputText;
                }
                generatedTextLabel = "Summary (DistilBART)";
            } else if (task === 'extract_event') {
                const question = message.promptQuestion || "Is there an event in the text? If yes, give me details";
                // Ensure both question and context are strings before creating the object
                if (typeof question !== 'string' || typeof inputText !== 'string') {
                     throw new Error(`QA input type error: Question is ${typeof question}, Context is ${typeof inputText}`);
                }
                processedInput = { question: question, context: inputText };
                generatedTextLabel = "Event QA Result";
                // ** Add logging for QA inputs **
                console.log(`Model Worker: QA Input - Question Type: ${typeof question}, Value: "${question}"`);
                console.log(`Model Worker: QA Input - Context Type: ${typeof inputText}, Value (start): "${inputText.substring(0, 100)}..."`);
            }

            if (processedInput === null) { // Check if processedInput was set
                console.error("Model Worker: processedInput is still null before calling processor.");
                throw new Error("Failed to prepare input for the model.");
            }

            console.log(`Model Worker: Starting task '${task}' with input:`, processedInput);
            const startTime = performance.now();

            // 3. Run the pipeline
            const output = await processor(processedInput);

            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            console.log(`Model Worker: Task '${task}' completed in ${duration} ms.`);
            console.log("Model Worker: Raw Output:", output);

            // 4. Process the output based on the task
            let resultText = "";
            if (task === 'summarize') {
                resultText = output[0]?.summary_text || '[!] No summary text generated.';
            } else if (task === 'extract_event') {
                resultText = output?.answer || '[!] No answer found.';
            } else {
                resultText = JSON.stringify(output);
            }

            // 5. Send response back
            self.postMessage({
                type: 'taskComplete',
                task: task,
                result: resultText,
                label: generatedTextLabel,
                durationMs: duration,
                tabId: message.tabId
            });

        } catch (error) {
            console.error(`Model Worker: Error during task '${task}':`, error);
            if (!error.message.includes("Failed to load model")) {
                 self.postMessage({ type: 'error', error: `Task execution failed inside worker (${task}): ${error.message}`, tabId: message.tabId });
            }
        }
    } else {
        console.warn("Model Worker: Received message missing required fields:", message);
    }
};

console.log("Model Worker: Script ready and listening."); 