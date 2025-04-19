// background.js

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

// --- Offscreen Document Management ---
let creating;
async function setupOffscreenDocument(path) {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(path)]
    });

    if (existingContexts.length > 0) {
        return; // Already exists
    }

    if (creating) {
        await creating;
    } else {
        console.log("Background: Creating offscreen document...");
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['WORKERS'],
            justification: 'Manages the T5 Web Worker'
        });
        try {
            await creating;
            console.log("Background: Offscreen document created successfully.");
        } catch (error) {
            console.error("Background: Error creating offscreen document:", error);
        } finally {
            creating = null;
        }
    }
}

async function sendMessageToOffscreen(message) {
    await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
    // console.log("Background: Sending message to offscreen:", message); // Less verbose log
    try {
        await chrome.runtime.sendMessage(message);
    } catch (error) {
        console.error("Background: Error sending message to offscreen:", error);
        // Attempting recovery might be too complex for MVP, just log error
        // Consider adding more robust error handling/retry later if needed
    }
}

// --- Event Listeners ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("Background: Received message:", message, "From:", sender); // Less verbose log

    if (message.type === 'taskComplete' && message.tabId) {
        chrome.tabs.sendMessage(message.tabId, {
            type: 'displayResult',
            label: message.label,
            result: message.result,
            durationMs: message.durationMs
        }).catch(error => {
            // Log if sending to the specific tab failed
            console.error(`Background: Could not send message to tab ${message.tabId}: ${error}`);
        });
    } else if (message.type === 'modelLoading') {
        console.log("Background: T5 Model is loading...");
    } else if (message.type === 'error') {
        console.error("Background: Received error from offscreen/worker:", message.error);
    }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "summarizeSelectedText",
        title: "Summarize (Local T5)", // Simplified title
        contexts: ["selection"]
      });
      chrome.contextMenus.create({
        id: "extractEventFromText",
        title: "Extract Event Info (Local T5)",
        contexts: ["selection"]
      });
      console.log("Background: Context menus created/updated.");
  });
  setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id || !info.selectionText) return;

  let taskType = null;
  if (info.menuItemId === "summarizeSelectedText") {
      taskType = 'summarize';
  } else if (info.menuItemId === "extractEventFromText") {
      taskType = 'extract_event';
  }

  if (taskType) {
    console.log(`Background: Requesting task '${taskType}'...`); // Simplified log
    sendMessageToOffscreen({
        type: 'processText',
        target: 'offscreen',
        task: taskType,
        text: info.selectionText,
        tabId: tab.id
    });
  }
});

console.log("Background script loaded.");
setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH); // Ensure offscreen exists on startup