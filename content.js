/**
 * Upgraded Content script for IG Story Viewer Exporter
 * Features: In-page SVG button, Instagram-native modal, 137+ viewer robust scroller, and Full Analysis PDF report.
 */

console.log("IG Story Viewer Exporter (Upgraded) loaded.");

const SVG_ICON = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.03v13m0-13c-2.819-.831-4.715-1.076-8.029-1.023A.99.99 0 0 0 3 6v11c0 .563.466 1.014 1.03 1.007 3.122-.043 5.018.212 7.97 1.023m0-13c2.819-.831 4.715-1.076 8.029-1.023A.99.99 0 0 1 21 6v11c0 .563-.466 1.014-1.03 1.007-3.122-.043-5.018.212-7.97 1.023"/>
</svg>`;

// Observe DOM to inject export button into Instagram Story Viewers modal
const observer = new MutationObserver(() => {
  injectExportButton();
});
observer.observe(document.body, { childList: true, subtree: true });

function injectExportButton() {
  const dialogs = document.querySelectorAll('div[role="dialog"]');
  for (const dialog of dialogs) {
    if (dialog.innerText.includes("Viewers") || dialog.innerText.includes("viewer")) {
      // Find header element
      const header = dialog.querySelector('header') || dialog.querySelector('div.x1cy8zhl') || dialog.firstElementChild;
      if (header && !header.querySelector('#ig-exporter-btn')) {
        const btn = document.createElement('button');
        btn.id = 'ig-exporter-btn';
        btn.innerHTML = `${SVG_ICON} Export`;
        btn.title = "Export Story Viewers & Analysis";
        btn.style.cssText = `
          display: flex;
          align-items: center;
          gap: 6px;
          background: #0095f6;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          margin-left: auto;
          margin-right: 12px;
          transition: background 0.2s;
          z-index: 9999;
        `;
        btn.onmouseover = () => btn.style.background = '#1877f2';
        btn.onmouseout = () => btn.style.background = '#0095f6';
        btn.onclick = (e) => {
          e.stopPropagation();
          showExportModal(dialog);
        };

        // Insert before close button or append to header
        header.appendChild(btn);
      }
    }
  }
}

function showExportModal(dialog) {
  if (document.getElementById('ig-export-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'ig-export-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background: #262626; color: #fff; width: 400px; border-radius: 14px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">📸 IG Story Exporter</h3>
        <button id="close-modal" style="background: none; border: none; color: #aaa; font-size: 20px; cursor: pointer;">&times;</button>
      </div>
      <p style="color: #aaa; font-size: 13px; margin-bottom: 20px;">Export all viewers, likes, and full analysis report with 1 click.</p>
      
      <div id="export-progress" style="margin-bottom: 20px; font-size: 14px; font-weight: 500; display: none; background: #363636; padding: 10px; border-radius: 8px;">
        ⏳ <span id="progress-text">Initializing scroller...</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button id="btn-csv" class="exp-opt-btn" style="background: #0095f6; color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">📥 Download CSV</button>
        <button id="btn-json" class="exp-opt-btn" style="background: #363636; color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">📦 Download JSON</button>
        <button id="btn-pdf" class="exp-opt-btn" style="background: #34c759; color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">📊 Full Analysis PDF Report</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('close-modal').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  document.getElementById('btn-csv').onclick = () => runExport('csv', dialog);
  document.getElementById('btn-json').onclick = () => runExport('json', dialog);
  document.getElementById('btn-pdf').onclick = () => runExport('pdf', dialog);
}

async function runExport(format, targetDialog) {
  const progressDiv = document.getElementById('export-progress');
  const progressText = document.getElementById('progress-text');
  const buttons = document.querySelectorAll('.exp-opt-btn');

  progressDiv.style.display = 'block';
  buttons.forEach(b => b.disabled = true);

  try {
    const data = await scrapeViewers(targetDialog, (msg) => {
      progressText.innerText = msg;
    });

    progressText.innerText = `Generating ${format.toUpperCase()} package...`;

    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === 'csv' || format === 'json' || format === 'pdf') {
      // Always generate all or specific format
      await generateAndDownload(data, timestampStr);
    }

    progressText.innerText = `✅ Successfully exported ${data.viewers.length} viewers!`;
    setTimeout(() => {
      const overlay = document.getElementById('ig-export-modal-overlay');
      if (overlay) overlay.remove();
    }, 2000);

  } catch (err) {
    progressText.innerText = `❌ Error: ${err.message}`;
    buttons.forEach(b => b.disabled = false);
  }
}

async function scrapeViewers(targetDialog, onProgress) {
  // 1. Detect total expected viewer count from header (e.g. "137", "137 views")
  let targetTotal = 0;
  const headerTextElements = targetDialog.querySelectorAll('span, div');
  for (const el of headerTextElements) {
    const text = el.innerText ? el.innerText.trim() : "";
    if (/^\d+$/.test(text) && parseInt(text) > 0) {
      targetTotal = parseInt(text);
      break;
    }
  }
  onProgress(`Target viewers detected: ${targetTotal || 'Auto'}`);

  // 2. Find scrollable container
  let scrollableContainer = targetDialog.querySelector('div[style*="overflow"]');
  if (!scrollableContainer) {
    const divs = targetDialog.querySelectorAll('div');
    for (const div of divs) {
      if (div.scrollHeight > div.clientHeight && div.clientHeight > 100) {
        scrollableContainer = div;
        break;
      }
    }
  }
  if (!scrollableContainer) scrollableContainer = targetDialog;

  // 3. Robust Auto-scrolling loop with duplicate prevention & rate limiting
  const viewerMap = new Map();
  let attempts = 0;
  let stagnantCount = 0;
  const maxAttempts = 200; // supports hundreds of viewers

  while (attempts < maxAttempts) {
    // Extract current visible viewers
    const links = targetDialog.querySelectorAll('a[href^="/"]');
    for (const a of links) {
      const href = a.getAttribute('href');
      const match = href.match(/^\/([a-zA-Z0-9_\.]+)\/?$/);
      if (match) {
        const username = match[1];
        if (["explore", "reels", "direct", "accounts", "stories", "p"].includes(username)) continue;

        if (!viewerMap.has(username)) {
          let curr = a;
          let displayName = "";
          let avatarUrl = "";
          let interaction = "Viewed";

          for (let i = 0; i < 4; i++) {
            if (curr.parentElement) {
              curr = curr.parentElement;
              const img = curr.querySelector('img');
              if (img && img.src && !avatarUrl) avatarUrl = img.src;

              const spans = curr.querySelectorAll('span, div');
              for (const span of spans) {
                const text = span.innerText ? span.innerText.trim() : "";
                if (text && text !== username && text.length < 50 && !text.includes("http")) {
                  if (text === "Liked" || text === "❤️") interaction = "Liked";
                  else if (!displayName && text !== username) displayName = text;
                }
              }
            }
          }

          viewerMap.set(username, {
            username,
            profileUrl: `https://www.instagram.com/${username}/`,
            displayName: displayName || username,
            avatarUrl: avatarUrl || "",
            interaction,
            exportedAt: new Date().toISOString()
          });
        }
      }
    }

    const currentCount = viewerMap.size;
    onProgress(`Scraped ${currentCount} / ${targetTotal || 'many'} viewers...`);

    // Check if we reached target total
    if (targetTotal > 0 && currentCount >= targetTotal) {
      break;
    }

    // Scroll down
    const previousHeight = scrollableContainer.scrollHeight;
    scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
    
    // Polite human-like delay (400-700ms) to avoid rate limits
    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));

    if (scrollableContainer.scrollHeight === previousHeight) {
      stagnantCount++;
      if (stagnantCount >= 3) break; // truly reached the bottom
    } else {
      stagnantCount = 0;
    }

    attempts++;
  }

  const viewers = Array.from(viewerMap.values());
  if (viewers.length === 0) throw new Error("No viewers found. Make sure the viewer list is open.");

  // Compute stats
  const totalLikes = viewers.filter(v => v.interaction === "Liked").length;
  const totalViews = viewers.length;

  return {
    exportedAt: new Date().toISOString(),
    totalViews,
    totalLikes,
    viewers
  };
}

async function generateAndDownload(data, timestampStr) {
  // 1. CSV
  let csv = "Username,Display Name,Interaction,Profile URL,Exported At\n";
  data.viewers.forEach(v => {
    csv += `"${v.username}","${v.displayName.replace(/"/g, '""')}","${v.interaction}","${v.profileUrl}","${v.exportedAt}"\n`;
  });
  await sendDownload(`ig_story_viewers_${timestampStr}.csv`, csv, "text/csv");

  // 2. JSON
  const json = JSON.stringify(data, null, 2);
  await sendDownload(`ig_story_viewers_${timestampStr}.json`, json, "application/json");

  // 3. Full Analysis PDF / HTML Report
  let htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IG Story Full Analysis Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #111; padding: 40px; margin: 0; }
    .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; font-size: 24px; color: #000; }
    .meta { color: #666; font-size: 13px; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
    .card { background: #f8f9fa; border: 1px solid #e5e5e5; border-radius: 10px; padding: 20px; }
    .card h3 { margin: 0 0 8px 0; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .card p { margin: 0; font-size: 28px; font-weight: bold; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
    th { background: #f8f9fa; font-weight: 600; color: #444; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; vertical-align: middle; margin-right: 12px; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .badge.liked { background: #ffebee; color: #d32f2f; }
    .badge.viewed { background: #e8f5e9; color: #2e7d32; }
    @media print { body { padding: 0; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>📊 Instagram Story Analysis Report</h1>
      <div class="meta">Generated on ${new Date().toLocaleString()}</div>
    </div>
    <button onclick="window.print()" style="background: #0095f6; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">🖨️ Save as PDF</button>
  </div>

  <div class="metrics">
    <div class="card">
      <h3>Total Viewers</h3>
      <p>${data.totalViews}</p>
    </div>
    <div class="card">
      <h3>Total Likes</h3>
      <p>${data.totalLikes}</p>
    </div>
    <div class="card">
      <h3>Engagement Rate</h3>
      <p>${data.totalViews > 0 ? ((data.totalLikes / data.totalViews) * 100).toFixed(1) : 0}%</p>
    </div>
  </div>

  <h2>Viewer List</h2>
  <table>
    <thead>
      <tr>
        <th>Viewer</th>
        <th>Interaction</th>
        <th>Profile URL</th>
      </tr>
    </thead>
    <tbody>`;

  data.viewers.forEach(v => {
    const badgeClass = v.interaction === "Liked" ? "liked" : "viewed";
    htmlReport += `
      <tr>
        <td>
          <img class="avatar" src="${v.avatarUrl || 'https://via.placeholder.com/36'}" alt="">
          <strong>@${v.username}</strong> <span style="color:#666; font-size:12px;">(${v.displayName})</span>
        </td>
        <td><span class="badge ${badgeClass}">${v.interaction}</span></td>
        <td><a href="${v.profileUrl}" target="_blank" style="color: #0095f6; text-decoration: none;">View Profile</a></td>
      </tr>`;
  });

  htmlReport += `
    </tbody>
  </table>
</body>
</html>`;

  await sendDownload(`ig_story_analysis_report_${timestampStr}.html`, htmlReport, "text/html");
}

function sendDownload(filename, content, mimeType) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "downloadData",
      filename,
      content,
      mimeType
    }, res => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (res && res.success) resolve(res);
      else reject(new Error(res ? res.error : "Download failed"));
    });
  });
}
