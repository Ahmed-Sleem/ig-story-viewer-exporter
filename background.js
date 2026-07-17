/**
 * Background service worker for IG Story Viewer Exporter
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("IG Story Viewer Exporter installed successfully.");
});

// Handle download requests from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadData") {
    const { filename, content, mimeType } = request;
    const blob = new Blob([content], { type: mimeType });
    const reader = new FileReader();
    reader.onload = function() {
      const dataUrl = reader.result;
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download error:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      });
    };
    reader.readAsDataURL(blob);
    return true; // Keep message channel open for async sendResponse
  }
});
