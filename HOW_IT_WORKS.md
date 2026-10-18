# How AlgoGit Works (Simple & Clear Explanation)

This document provides a simple, intuitive explanation of how the AlgoGit Chrome Extension works, what `manifest.json` does, and how each component communicates with LeetCode, Spring Boot, and GitHub.

---

## 🎬 The Real-World Analogy

Think of Chrome as a **Security Guard**, and the AlgoGit extension as **three different agents** stationed in three separate rooms:

```
┌──────────────────────────────────────────────────────────────┐
│  ROOM 1: THE LEETCODE TAB (Inside your browser screen)       │
│  - leetcode-main.js  ➔ (The Insider inside the safe)         │
│  - leetcode.js       ➔ (The Guard watching the door)         │
└──────────────────────────────┬───────────────────────────────┘
                               │ 📞 Walkie-Talkie (chrome.runtime.sendMessage)
┌──────────────────────────────▼───────────────────────────────┐
│  ROOM 2: THE GETAWAY VAN (Invisible background worker)       │
│  - background.js     ➔ (Talks to Spring Boot & GitHub)       │
└──────────────────────────────┬───────────────────────────────┘
                               │ 💾 Chrome Storage
┌──────────────────────────────▼───────────────────────────────┐
│  ROOM 3: THE DASHBOARD (The little popup window)             │
│  - popup.html & popup.js ➔ (Shows streaks, stats & links)    │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. What is `manifest.json` and what does it do?

Chrome is just a web browser. When you load an extension folder, **Chrome has no idea what your JavaScript files are for**. 

* If you put 10 JS files in a folder, Chrome doesn't know which one belongs to LeetCode, which one is for the popup, or which one is the background worker.
* **`manifest.json` is the Master Blueprint / Instruction Sheet for Chrome.**

### In your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "AlgoGit",

  // 1. Tell Chrome: "Run this script silently in the background"
  "background": {
    "service_worker": "background.js"
  },

  // 2. Tell Chrome: "When the user clicks the toolbar icon, open this popup HTML"
  "action": {
    "default_popup": "popup/popup.html"
  },

  // 3. Tell Chrome: "ONLY when the URL starts with leetcode.com/problems/*,
  //    inject these two scripts into that browser tab!"
  "content_scripts": [
    {
      "matches": ["https://leetcode.com/problems/*"],
      "js": ["content-scripts/leetcode-main.js"],
      "world": "MAIN"
    },
    {
      "matches": ["https://leetcode.com/problems/*"],
      "js": ["content-scripts/leetcode.js"]
    }
  ],

  // 4. Ask user permission for storage and desktop notifications
  "permissions": ["storage", "notifications", "identity"]
}
```

> **Summary**: Without `manifest.json`, Chrome does nothing. `manifest.json` tells Chrome **where** to inject scripts, **when** to activate them, and **which permissions** they have.

---

## 2. Why are there TWO scripts on LeetCode? (`leetcode-main.js` vs `leetcode.js`)

Chrome enforces a strict **security glass wall** between websites and extensions:

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│  INSIDE THE GLASS BOX (MAIN World)   │     │ OUTSIDE THE GLASS BOX (ISOLATED World)│
│                                      │     │                                      │
│  leetcode-main.js                    │     │  leetcode.js                         │
│  - Lives directly in webpage memory  │     │  - Lives in extension sandbox        │
│  - Can touch: window.monaco          │     │  - Can touch: chrome.runtime APIs    │
│  - CANNOT talk to background.js      │     │  - CANNOT touch window.monaco        │
└──────────────────┬───────────────────┘     └──────────────────▲───────────────────┘
                   │                                            │
                   │    Drops full code into hidden DOM bridge  │
                   └───────────────────► [ <div id="algogit-code-bridge"> ]
                                         Reads full code from bridge
```

### A. Inside the Glass Box: `leetcode-main.js` (`world: "MAIN"`)
* LeetCode's editor (Monaco Editor) stores your code inside a JavaScript variable in RAM: `window.monaco.editor.getModels()[0]`.
* Because `leetcode-main.js` runs in the `MAIN` world, it can read that RAM buffer:
  ```javascript
  const fullCode = window.monaco.editor.getModels()[0].getValue();
  ```
* This gets **100% of your code** — all lines, closing brackets `}`, comments, and indentation (completely bypassing Monaco's virtual scrolling cutoff!).
* **The Catch**: Chrome forbids this script from talking to `background.js` or your Spring Boot backend for security reasons.
* **The Solution**: It drops the code into an invisible container on the webpage:
  ```html
  <div id="algogit-code-bridge" style="display:none">your full code here</div>
  ```

### B. Outside the Glass Box: `leetcode.js` (`ISOLATED` World)
* This script stands outside the glass box.
* It watches your screen with browser event listeners:
  1. *"Did the user click Submit?"* ➔ Starts `MutationObserver`.
  2. *"Did the green 'Accepted' banner appear?"* ➔ Triggers immediately!
* When "Accepted" appears, it reads the full code from the hidden bridge:
  ```javascript
  const code = document.getElementById('algogit-code-bridge').textContent;
  ```
* And because it has extension privileges, it radios `background.js`:
  ```javascript
  chrome.runtime.sendMessage({ action: 'submission', data: submissionData });
  ```

---

## 3. What does `background.js` do?

`background.js` is an **invisible service worker**. You never see it on your screen. It runs in the background of your Chrome browser.

1. It sits and listens for radio messages from `leetcode.js`.
2. When a submission message arrives:
   * It retrieves your GitHub repo URL and email from Chrome local storage (`chrome.storage.local`).
   * It sends an HTTP POST request to your local Spring Boot backend:
     ```javascript
     fetch("http://localhost:8080/submission/submit", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(submissionData)
     });
     ```
3. When the backend responds with success:
   * It triggers a **native desktop notification**: *"Solution 'Two Sum' synced successfully!"*.
   * It saves the submission in `recentSubmissions` so the popup can display it with a direct link.

---

## 4. What does the Spring Boot Backend do?

When `Submissioncontroller.java` receives the POST request from `background.js`:

1. **AI Classification (`AiService.java`)**:
   * Sends your code to Groq AI (`openai/gpt-oss-20b`).
   * AI analyzes the algorithm and categorizes it (e.g. `Sliding Window`, `Array`, `Dynamic Programming`).
2. **GitHub Push (`GithubPushService.java`)**:
   * Base64 encodes your code.
   * Calls GitHub REST API `PUT /repos/{owner}/{repo}/contents/{path}`:
     * Saves code to: `leetcode/Sliding_Window/Two_Sum/solution.cpp`
     * Saves rich documentation to: `leetcode/Sliding_Window/Two_Sum/README.md` (with clickable problem link, Shields.io badges, problem description & constraints, LaTeX math equations, and Big-O complexity table)
3. **Database Records (`PostgreSQL`)**:
   * Calculates your daily streak (increments streak if consecutive calendar day).
   * Increments platform count (e.g. `leetcodeEasy + 1`).
   * Saves a `SubmissionRecord` with direct GitHub file & folder URLs.
4. Returns the direct GitHub URL to `background.js`.

---

## 5. What does the Popup (`popup.js` & `popup.html`) do?

When you click the **AlgoGit icon** in your Chrome toolbar, the popup opens:

1. **Stats**: It calls `POST /problems/getcounts` to display your total solved problems (Easy, Medium, Hard).
2. **Streaks**: It calls `POST /streak/getstreak` to show your current streak 🔥 and active weekly days (M, T, W, T, F, S, S).
3. **Recent Submissions Feed**:
   * Instantly loads your latest solutions from Chrome storage (0 ms delay).
   * Connects to `POST /submission/recent` on your backend.
   * Renders solution cards with:
     * Platform badge (`LC` in orange, `GFG` in green).
     * Difficulty tag (`Easy`, `Medium`, `Hard`).
     * Language tag (`C++`, `Python`, `Java`, `SQL`).
     * A clickable **`Code ↗`** button that opens the exact committed file on GitHub!

---

## 🌟 The Complete Flow in 5 Bullet Points:
1. **`manifest.json`** tells Chrome: *"When the user is on LeetCode, activate our scripts"*.
2. **`leetcode-main.js`** extracts the 100% full code from Monaco Editor's memory and places it into the hidden bridge.
3. **`leetcode.js`** detects the "Accepted" verdict, reads the code from the bridge, and sends it to `background.js`.
4. **`background.js`** forwards the payload to Spring Boot at `http://localhost:8080/submission/submit`.
5. **Spring Boot** uses Groq AI to classify the topic, pushes the files to GitHub via REST API, records the streak in PostgreSQL, and updates your popup activity feed!
