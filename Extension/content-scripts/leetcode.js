
console.log("🚀 LeetCode content script loaded");
function detectLanguage() {
  // 1. Check Monaco editor's data-mode-id (e.g., 'cpp', 'java', 'python3', 'sql')
  const monacoEditor = document.querySelector('.monaco-editor[data-mode-id], [data-mode-id]');
  if (monacoEditor) {
    const mode = monacoEditor.getAttribute('data-mode-id');
    if (mode) {
      if (mode.toLowerCase() === 'cpp') return 'cpp';
      if (mode.toLowerCase() === 'csharp') return 'csharp';
      return mode;
    }
  }

  // 2. Strict exact match for language names (prevents words like "Console" or "Code" matching "C")
  const exactRegex = /^(C\+\+|cpp|Java|Python3?|JavaScript|TypeScript|C#|csharp|C|Go|Rust|MySQL|MS SQL Server|Oracle|PostgreSQL|SQL|Pandas|Kotlin|Swift|Ruby|PHP)$/i;

  const langBtn = Array.from(document.querySelectorAll('button')).find(el => {
    const text = el.innerText?.trim();
    return text && exactRegex.test(text);
  });
  if (langBtn) {
    const m = langBtn.innerText.trim().match(exactRegex);
    if (m) return m[1];
  }

  // 3. Fallback scan with EXACT match only
  const raw = [...document.querySelectorAll('*')]
    .find(el => exactRegex.test(el.innerText?.trim()))?.innerText?.trim();

  const match = raw?.match(exactRegex);
  return match ? match[1] : "Unknown";
}
function detectDifficulty() {
  const el = Array.from(document.querySelectorAll('*'))
    .find(el => el.textContent.trim().match(/^(Easy|Medium|Hard)$/i));
  return el ? el.textContent.trim() : 'Unknown';
}

function getLeetCodeSubmissionData() {
  try {
    const lineElements = Array.from(document.querySelectorAll('.view-line'));

  const lines = lineElements
    .map(el => el.innerText.trim())
    .filter((line, index, self) => line && self.indexOf(line) === index);

  const code = lines.join('\n').trim();

  if (!code) {
    console.warn("❌ Could not extract code from submission viewer");
    return null;
  }

  const slug = location.pathname.split('/')[2];
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

    



    const data = {
      platform: 'leetcode',
      title,
      code,
      language: detectLanguage(),
      difficulty: detectDifficulty()
    };
    console.log("📝 Extracted LeetCode submission data:", data);
    return data;
  } catch (e) {
    console.error("❌ Error extracting LeetCode submission data:", e);
    return null;
  }
}

function sendSubmissionToBackground(data) {
  try {
    console.log("📤 Sending submission to background:", data);
    chrome.runtime.sendMessage({ action: 'submission', data }, (response) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message?.includes("context invalidated")) {
          console.warn("⚠️ AlgoGit: Extension was reloaded in chrome://extensions. Please refresh (F5) this page to reconnect.");
        } else {
          console.log("✅ AlgoGit background response:", response || "ok");
        }
      } else {
        console.log("✅ Message dispatched to background script successfully");
      }
    });
  } catch (err) {
    if (err.message && err.message.includes("Extension context invalidated")) {
      console.warn("⚠️ AlgoGit: Extension was reloaded in chrome://extensions. Please refresh (F5) this page to reconnect.");
    } else {
      console.error("❌ AlgoGit send error:", err);
    }
  }
}

let activeResultObserver = null;

function waitForResultWithObserver() {
  if (activeResultObserver) {
    activeResultObserver.disconnect();
    activeResultObserver = null;
  }

  let handled = false;

  activeResultObserver = new MutationObserver((mutations) => {
    if (handled) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const text = node.innerText || '';
        const match = text.match(/\b(Accepted|Wrong Answer|Runtime Error|Time Limit Exceeded|Compilation Error)\b/i);

        if (match) {
          handled = true;
          const status = match[0];
          console.log(`✅ Final Result Detected: ${status}`);

          if (activeResultObserver) {
            activeResultObserver.disconnect();
            activeResultObserver = null;
          }

          // Short delay to let editor/DOM settle
          setTimeout(() => {
            const submission = getLeetCodeSubmissionData();
            if (submission) {
              submission.status = status;
              sendSubmissionToBackground(submission);
            }
          }, 400);

          return;
        }
      }
    }
  });

  activeResultObserver.observe(document.body, { childList: true, subtree: true });

  // Timeout after 60s so observer doesn't run forever
  setTimeout(() => {
    if (activeResultObserver && !handled) {
      activeResultObserver.disconnect();
      activeResultObserver = null;
    }
  }, 60000);
}

// Global delegated event listener for Submit button
// Works continuously across all submissions and SPA problem navigation without needing page reload
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) {
    const text = (btn.innerText || '').trim();
    const isSubmit = /^submit$/i.test(text) || btn.getAttribute('data-e2e-locator') === 'console-submit-button';
    if (isSubmit) {
      console.log("🟡 Submit button clicked!");
      waitForResultWithObserver();
    }
  }
}, true);

