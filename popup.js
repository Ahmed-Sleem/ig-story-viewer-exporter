/**
 * Popup script for IG Story Viewer Exporter
 */

document.getElementById('exportBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('exportBtn');
  
  btn.disabled = true;
  statusEl.className = "loading";
  statusEl.innerText = "⏳ Scrolling & extracting viewers...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !tab.url.includes("instagram.com")) {
      throw new Error("Please open Instagram web (instagram.com) first!");
    }

    chrome.tabs.sendMessage(tab.id, { action: "startExport" }, (response) => {
      btn.disabled = false;
      if (chrome.runtime.lastError) {
        statusEl.className = "error";
        statusEl.innerText = "Error: " + chrome.runtime.lastError.message + ". Make sure you are on a story viewers page.";
        return;
      }

      if (response && response.success) {
        statusEl.className = "success";
        statusEl.innerText = `✅ Successfully exported ${response.count} viewers! Check Downloads.`;
      } else {
        statusEl.className = "error";
        statusEl.innerText = "Error: " + (response ? response.error : "Unknown error");
      }
    });

  } catch (err) {
    btn.disabled = false;
    statusEl.className = "error";
    statusEl.innerText = "Error: " + err.message;
  }
});
