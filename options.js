// options.js

// Renamed and updated defaults
const DEFAULT_SETTINGS = {
    summarizePrompt: "summarize: {text}", // Still using T5/BART style default
    extractQaQuestion: "Is there an event in the text? If yes, give me details" // QA question
};

// Function to save options
function saveOptions() {
  const summarizePrompt = document.getElementById('summarizePrompt').value;
  // Get value from the QA question textarea
  const extractQaQuestion = document.getElementById('extractQaQuestion').value;

  chrome.storage.sync.set(
    {
      summarizePrompt: summarizePrompt || DEFAULT_SETTINGS.summarizePrompt,
      // Save under the new key
      extractQaQuestion: extractQaQuestion || DEFAULT_SETTINGS.extractQaQuestion
    },
    () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved.'; // Updated status text
      setTimeout(() => { status.textContent = ''; }, 1500);
      console.log("Settings saved.");
    }
  );
}

// Function to restore options
function restoreOptions() {
  chrome.storage.sync.get(
    DEFAULT_SETTINGS, // Use updated defaults object
    (items) => {
      document.getElementById('summarizePrompt').value = items.summarizePrompt;
      // Restore to the QA question textarea
      document.getElementById('extractQaQuestion').value = items.extractQaQuestion;
      console.log("Settings restored:", items);
    }
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);

console.log("Options script loaded."); 