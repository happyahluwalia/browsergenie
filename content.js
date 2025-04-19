// content.js
// console.log("Content script loaded."); // Less verbose

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log("Content script received message:", message); // Less verbose

  if (message.type === 'displayResult' && message.result) {
    const title = message.label || "Result";
    let alertMessage = `${title}:\n\n${message.result}`;

    if (message.durationMs) {
      const durationSec = (parseFloat(message.durationMs) / 1000).toFixed(2);
      alertMessage += `\n\n(Processed in ${durationSec} seconds)`;
    }

    alert(alertMessage);

    sendResponse({ status: "result_displayed" });
  } else {
    // console.log("Content script received unhandled message:", message); // Less verbose
    sendResponse({ status: "unknown_message" });
  }
  // Keep true for potential async responses in the future
  return true;
}); 