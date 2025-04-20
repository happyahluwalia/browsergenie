// offscreen.js
console.log("Offscreen: Script loaded.");

let modelWorker; // Renamed worker variable to reflect its multi-model nature

function getModelWorker() {
    if (!modelWorker) {
        console.log("Offscreen: Creating model worker...");
        try {
            modelWorker = new Worker('model.worker.js');

            // Listen for messages FROM the worker
            modelWorker.onmessage = function(event) {
                // Forward the message back to the background script
                chrome.runtime.sendMessage(event.data);
            };

            // Listen for errors FROM the worker
            modelWorker.onerror = function(error) {
                console.error("Offscreen: Model worker onerror event:", error);
                chrome.runtime.sendMessage({ type: 'error', error: 'Worker onerror: ' + (error.message || 'Worker error occurred') });
                modelWorker = null; // Allow recreation on next attempt
            };
            console.log("Offscreen: Model worker created and listeners attached.");
        } catch (e) {
            console.error("Offscreen: Failed to create model worker:", e);
            chrome.runtime.sendMessage({ type: 'error', error: 'Failed to create worker in offscreen document. ' + e.message });
        }
    }
    return modelWorker;
}

// Listen for messages FROM the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'processText' && message.target === 'offscreen') {
        const worker = getModelWorker();
        if (worker) {
            try {
                worker.postMessage(message);
            } catch (postError) {
                console.error("Offscreen: Error posting message TO model worker:", postError);
                chrome.runtime.sendMessage({ type: 'error', error: 'Error posting message to worker: ' + postError.message });
            }
        } else {
            console.error("Offscreen: Model worker instance not available when needed.");
             chrome.runtime.sendMessage({ type: 'error', error: 'Worker instance not available in offscreen document.' });
        }
        return true;
    }
});

// Initialize worker when the offscreen document loads
getModelWorker();

console.log("Offscreen: Script initialized and listening."); 