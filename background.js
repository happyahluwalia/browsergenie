// background.js

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
const DEFAULT_SETTINGS = {
    summarizePrompt: "summarize: {text}",
    extractQaQuestion: "Is there an event in the text? If yes, give me details"
};

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
            justification: 'Manages the model Web Worker'
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
        console.log(`Background: Model for task '${message.task || 'unknown'}' is loading...`);
    } else if (message.type === 'error') {
        console.error("Background: Received error from offscreen/worker:", message.error);
    }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "summarizeSelectedText",
        title: "Summarize (Local DistilBART)",
        contexts: ["selection"]
      });
      chrome.contextMenus.create({
        id: "extractEventFromText",
        title: "Ask about Events (Local QA)",
        contexts: ["selection"]
      });
      console.log("Background: Context menus created/updated.");
  });
  // Also ensure default settings are set on install/update
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      // This will only write if items don't exist or if defaults changed
      chrome.storage.sync.set(items);
  });
  setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
});

// Handle context menu click - NOW fetches prompt template
chrome.contextMenus.onClicked.addListener(async (info, tab) => { // Make listener async
  if (!tab || !tab.id || !info.selectionText) return;

  let taskType = null;
  let settingKey = null;
  let messagePayload = {};

  if (info.menuItemId === "summarizeSelectedText") {
      taskType = 'summarize';
      settingKey = 'summarizePrompt';
      messagePayload.promptKey = settingKey;
  } else if (info.menuItemId === "extractEventFromText") {
      taskType = 'extract_event';
      settingKey = 'extractQaQuestion';
      messagePayload.questionKey = settingKey;
  }

  if (taskType && settingKey) {
    console.log(`Background: Requesting task '${taskType}'...`);

    try {
        // Fetch all settings (includes the one we need)
        const items = await chrome.storage.sync.get(DEFAULT_SETTINGS);
        const settingValue = items[settingKey];

        if (messagePayload.promptKey) {
            messagePayload.promptTemplate = settingValue;
        } else if (messagePayload.questionKey) {
            messagePayload.promptQuestion = settingValue;
        }

        // Send the message to the offscreen document
        sendMessageToOffscreen({
            type: 'processText',
            target: 'offscreen',
            task: taskType,
            text: info.selectionText,
            ...messagePayload,
            tabId: tab.id
        });
    } catch (error) {
        console.error("Background: Error fetching settings from storage:", error);
    }
  }
});

console.log("Background script loaded.");
setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH); // Ensure offscreen exists on startup