# 📸 IG Story Viewer Exporter

> **The Story**: I was checking my Instagram stories and wanted to analyze who was viewing and interacting with my content. But Instagram web provides no built-in way to export or download your story viewers list. Taking endless manual screenshots is tedious and impractical. So I got the idea to build a clean, lightning-fast Chrome Extension that does it with a single click—capturing all viewers, profile pictures, display names, and interaction statuses into ready-to-use CSV, JSON, and visual HTML reports.

---

## ⚡ What It Does
- **Auto-Scrolling Engine**: Automatically scrolls Instagram's story viewer modal to the bottom to load every single viewer.
- **Rich Data Extraction**: Extracts username, display name, profile picture avatar URL, and like/view status.
- **Triple Export Formats**:
  1. **CSV**: For Excel / Google Sheets analysis.
  2. **JSON**: For developers and data pipelines.
  3. **Visual HTML Report**: A clean, modern offline web report (the ultimate "long screenshot" alternative) complete with profile cards and avatars.

---

## 🚀 Installation (30 Seconds)

1. **Clone or Download**: Download this repo or clone it locally.
2. **Open Chrome Extensions**: Navigate to `chrome://extensions/` in Google Chrome.
3. **Enable Developer Mode**: Toggle **Developer mode** ON in the top-right corner.
4. **Load Extension**: Click **Load unpacked** and select the extension folder.

---

## 💡 Usage

1. Open [Instagram Web](https://www.instagram.com) and go to your story.
2. Click on **Viewers** to open the viewer list modal.
3. Click the extension icon in your Chrome toolbar.
4. Click **📥 Export Viewers**.
5. Your files download instantly to your Downloads folder!

---

## 🛠️ Tech Stack
- **Manifest V3** (Modern Chrome Extension standards)
- **Vanilla JavaScript** (Zero bloated dependencies, lightning fast)
- **HTML5 & CSS3** (Clean, responsive styling)
