/**
 * Content script for IG Story Viewer Exporter
 * Injected into instagram.com
 */

console.log("IG Story Viewer Exporter content script loaded.");

// Listen for export command from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startExport") {
    exportStoryViewers()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // asynchronous response
  }
});

async function exportStoryViewers() {
  // 1. Find the story viewers modal or scrollable container
  // Instagram story viewers modal typically has role="dialog" or contains "Viewers" header
  const dialogs = document.querySelectorAll('div[role="dialog"]');
  let targetDialog = null;

  for (const d of dialogs) {
    if (d.innerText.includes("Viewers") || d.innerText.includes("viewer")) {
      targetDialog = d;
      break;
    }
  }

  if (!targetDialog && dialogs.length > 0) {
    targetDialog = dialogs[0]; // fallback to first dialog if modal is open
  }

  if (!targetDialog) {
    throw new Error("Instagram Story Viewers modal not found! Please open your story viewers list on Instagram first.");
  }

  // Find scrollable container inside the dialog
  // Instagram viewer lists are scrollable overflow containers
  let scrollableContainer = targetDialog.querySelector('div.x78zum5.xdt5ytf.x10wh9gp') || targetDialog.querySelector('div[style*="overflow"]');
  if (!scrollableContainer) {
    // Try finding any tall div inside dialog
    const divs = targetDialog.querySelectorAll('div');
    for (const div of divs) {
      if (div.scrollHeight > div.clientHeight && div.clientHeight > 100) {
        scrollableContainer = div;
        break;
      }
    }
  }

  if (!scrollableContainer) {
    scrollableContainer = targetDialog; // fallback
  }

  // 2. Auto-scroll to bottom to load all viewers
  console.log("Auto-scrolling to load all story viewers...");
  let previousHeight = 0;
  let scrollAttempts = 0;
  const maxAttempts = 30; // safety limit

  while (scrollAttempts < maxAttempts) {
    previousHeight = scrollableContainer.scrollHeight;
    scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 800)); // wait for load
    
    if (scrollableContainer.scrollHeight === previousHeight) {
      // Try one more time to be sure
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (scrollableContainer.scrollHeight === previousHeight) {
        break;
      }
    }
    scrollAttempts++;
  }

  // 3. Extract viewer details
  const viewerMap = new Map();
  
  // Find all links matching instagram user profiles
  const links = targetDialog.querySelectorAll('a[href^="/"]');
  for (const a of links) {
    const href = a.getAttribute('href');
    const match = href.match(/^\/([a-zA-Z0-9_\.]+)\/?$/);
    if (match) {
      const username = match[1];
      if (["explore", "reels", "direct", "accounts", "stories", "p"].includes(username)) {
        continue;
      }

      if (!viewerMap.has(username)) {
        // Find parent row to extract display name and avatar
        let row = a.closest('div[style*="display"], div.x1dm5mii, div');
        let displayName = "";
        let avatarUrl = "";
        let interaction = "Viewed";

        // Walk up to find user container row
        let curr = a;
        for (let i = 0; i < 4; i++) {
          if (curr.parentElement) {
            curr = curr.parentElement;
            const img = curr.querySelector('img');
            if (img && img.src && !avatarUrl) {
              avatarUrl = img.src;
            }
            // Look for text elements other than username
            const spans = curr.querySelectorAll('span, div');
            for (const span of spans) {
              const text = span.innerText ? span.innerText.trim() : "";
              if (text && text !== username && text.length < 50 && !text.includes("http")) {
                if (text === "Liked" || text === "❤️") {
                  interaction = "Liked";
                } else if (!displayName && text !== username) {
                  displayName = text;
                }
              }
            }
          }
        }

        viewerMap.set(username, {
          username: username,
          profileUrl: `https://www.instagram.com/${username}/`,
          displayName: displayName || username,
          avatarUrl: avatarUrl || "",
          interaction: interaction,
          exportedAt: new Date().toISOString()
        });
      }
    }
  }

  const viewers = Array.from(viewerMap.values());
  if (viewers.length === 0) {
    throw new Error("No viewers detected. Make sure the story viewers list is fully visible.");
  }

  // 4. Generate Export Files (CSV, JSON, HTML Report)
  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  
  // CSV
  let csvContent = "Username,Display Name,Interaction,Profile URL,Exported At\n";
  viewers.forEach(v => {
    csvContent += `"${v.username}","${v.displayName.replace(/"/g, '""')}","${v.interaction}","${v.profileUrl}","${v.exportedAt}"\n`;
  });

  // JSON
  const jsonContent = JSON.stringify({
    exportedAt: new Date().toISOString(),
    totalViewers: viewers.length,
    viewers: viewers
  }, null, 2);

  // HTML Visual Report (Long Screenshot style)
  let htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Instagram Story Viewers Report - ${new Date().toLocaleDateString()}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fafafa; color: #262626; margin: 0; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 30px; }
    h1 { font-size: 24px; margin-bottom: 5px; color: #000; }
    .subtitle { color: #8e8e8e; font-size: 14px; margin-bottom: 25px; }
    .stats { display: flex; gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #efefef; padding: 15px 20px; border-radius: 8px; flex: 1; }
    .stat-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #8e8e8e; }
    .stat-card p { margin: 0; font-size: 20px; font-weight: bold; color: #000; }
    .viewer-list { display: flex; flex-direction: column; gap: 12px; }
    .viewer-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid #dbdbdb; border-radius: 8px; background: #fff; transition: background 0.2s; }
    .viewer-item:hover { background: #fafafa; }
    .viewer-info { display: flex; align-items: center; gap: 14px; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: #dbdbdb; }
    .names .username { font-weight: 600; font-size: 15px; color: #00376b; text-decoration: none; }
    .names .username:hover { text-decoration: underline; }
    .names .display-name { font-size: 13px; color: #8e8e8e; margin-top: 2px; }
    .badge { font-size: 12px; padding: 4px 10px; border-radius: 12px; font-weight: 500; }
    .badge.liked { background: #ffebee; color: #ed4956; }
    .badge.viewed { background: #e8f5e9; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📸 Instagram Story Viewers Report</h1>
    <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
    
    <div class="stats">
      <div class="stat-card">
        <h3>Total Viewers</h3>
        <p>${viewers.length}</p>
      </div>
      <div class="stat-card">
        <h3>Export Status</h3>
        <p>Success ⚡</p>
      </div>
    </div>

    <div class="viewer-list">`;

  viewers.forEach(v => {
    const badgeClass = v.interaction === "Liked" ? "liked" : "viewed";
    htmlReport += `
      <div class="viewer-item">
        <div class="viewer-info">
          <img class="avatar" src="${v.avatarUrl || 'https://via.placeholder.com/48'}" alt="${v.username}">
          <div class="names">
            <a class="username" href="${v.profileUrl}" target="_blank">@${v.username}</a>
            <div class="display-name">${v.displayName}</div>
          </div>
        </div>
        <span class="badge ${badgeClass}">${v.interaction}</span>
      </div>`;
  });

  htmlReport += `
    </div>
  </div>
</body>
</html>`;

  // Send messages to background script to trigger downloads
  await sendDownload(`ig_story_viewers_${timestampStr}.csv`, csvContent, "text/csv");
  await sendDownload(`ig_story_viewers_${timestampStr}.json`, jsonContent, "application/json");
  await sendDownload(`ig_story_viewers_report_${timestampStr}.html`, htmlReport, "text/html");

  return { success: true, count: viewers.length };
}

function sendDownload(filename, content, mimeType) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "downloadData",
      filename: filename,
      content: content,
      mimeType: mimeType
    }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.success) {
        resolve(response);
      } else {
        reject(new Error(response ? response.error : "Download failed"));
      }
    });
  });
}
