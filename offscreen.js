// offscreen.js
console.log("Offscreen: Script loaded.");

let t5Worker; // Renamed worker variable

function getT5Worker() {
    if (!t5Worker) {
        console.log("Offscreen: Creating T5 worker...");
        try {
            t5Worker = new Worker('summarize.worker.js');

            // Listen for messages FROM the worker
            t5Worker.onmessage = function(event) {
                // console.log("Offscreen: Received message FROM T5 worker:", event.data); // Keep log minimal
                // Forward the message back to the background script
                chrome.runtime.sendMessage(event.data);
            };

            // Listen for errors FROM the worker
            t5Worker.onerror = function(error) {
                console.error("Offscreen: T5 worker onerror event:", error);
                chrome.runtime.sendMessage({ type: 'error', error: 'Worker onerror: ' + (error.message || 'Worker error occurred') });
                t5Worker = null; // Allow recreation on next attempt
            };
            console.log("Offscreen: T5 worker created and listeners attached.");
        } catch (e) {
            console.error("Offscreen: Failed to create T5 worker:", e);
            chrome.runtime.sendMessage({ type: 'error', error: 'Failed to create worker in offscreen document. ' + e.message });
        }
    }
    return t5Worker;
}

// Listen for messages FROM the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'processText' && message.target === 'offscreen') {
        const worker = getT5Worker();
        if (worker) {
            // console.log("Offscreen: Posting message TO T5 worker:", message); // Keep log minimal
            try {
                worker.postMessage(message);
            } catch (postError) {
                console.error("Offscreen: Error posting message TO T5 worker:", postError);
                chrome.runtime.sendMessage({ type: 'error', error: 'Error posting message to worker: ' + postError.message });
            }
        } else {
            console.error("Offscreen: T5 worker instance not available when needed.");
             chrome.runtime.sendMessage({ type: 'error', error: 'Worker instance not available in offscreen document.' });
        }
        return true; // Indicate potential async response (though we don't use sendResponse here)
    }
});

// Initialize worker when the offscreen document loads
getT5Worker();

console.log("Offscreen: Script initialized and listening."); 