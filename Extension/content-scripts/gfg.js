// ==============================================================================
// AlgoGit - GeeksforGeeks (GFG) Content Script
// Description: Runs on GFG problem pages to capture code submissions,
//              detect programming language and problem difficulty, observe the
//              DOM for execution results (e.g., Correct Answer, Wrong Answer),
//              and dispatch submission data to the background service worker.
// ==============================================================================

console.log("🚀 GeeksforGeeks content script loaded");

// ------------------------------------------------------------------------------
// SECTION 1: Language Detection
// Extracts selected language from GFG language dropdown/selector
// ------------------------------------------------------------------------------
function detectLanguageGFG() {
  const codeLang = document.querySelector('[id^="languageSelector"] option:checked')?.innerText;
  return codeLang || "Unknown";
}

// ------------------------------------------------------------------------------
// SECTION 2: Difficulty Detection
// Scans DOM elements for GFG difficulty label (Easy, Medium, Hard)
// ------------------------------------------------------------------------------
function detectDifficultyGFG() {
  const difficultyEl = [...document.querySelectorAll('*')]
    .find(el => el.textContent.match(/Difficulty:\s*(Easy|Medium|Hard)/i));
  const match = difficultyEl?.textContent.match(/Difficulty:\s*(Easy|Medium|Hard)/i);
  return match ? match[1] : "Unknown";
}

// ------------------------------------------------------------------------------
// SECTION 3: Code & Problem Metadata Extraction
// Extracts solution code from Ace Editor memory buffer via DOM Bridge / Main World
// ------------------------------------------------------------------------------
let latestGFGMainWorldCode = '';

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ALGOGIT_GFG_CODE_RESPONSE') {
    if (event.data.code) {
      latestGFGMainWorldCode = event.data.code;
    }
  }
});

function getGFGSubmissionData() {
  let code = '';

  // 1. Primary: Extract from DOM Bridge connected directly to Ace editor memory buffer
  const bridge = document.getElementById('algogit-gfg-bridge');
  if (bridge && bridge.textContent && bridge.textContent.trim().length > 0) {
    code = bridge.textContent;
    console.log(`✅ Extracted complete code from GFG Ace bridge (${code.length} chars, ${code.split('\n').length} lines)`);
  } else if (latestGFGMainWorldCode && latestGFGMainWorldCode.trim().length > 0) {
    code = latestGFGMainWorldCode;
    console.log(`✅ Extracted complete code from GFG window message cache (${code.length} chars)`);
  }

  // 2. Fallback: DOM line scan
  if (!code) {
    console.warn("⚠️ GFG bridge not found, falling back to DOM .ace_line elements...");
    const codeEl = document.querySelector('.ace_content') || document.querySelector('code');
    if (codeEl) {
      const lines = Array.from(codeEl.querySelectorAll('.ace_line')).map(el => (el.innerText || '').replace(/\u00A0/g, ' '));
      code = lines.length ? lines.join('\n').trim() : codeEl.innerText.trim();
    }
  }

  if (!code) {
    console.warn("❌ Could not find code element");
    return null;
  }

  const slug = location.pathname.split('/')[2];
  const fallbackTitle = slug
    .replace(/\d+$/, '') // remove trailing numbers like "4257"
    .replace(/-/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase()); // capitalize each word

  return {
    platform: 'gfg',
    title: fallbackTitle||"No",
    code,
    language: detectLanguageGFG(),
    difficulty: detectDifficultyGFG(),
  };
}

// ------------------------------------------------------------------------------
// SECTION 4: Background Message Dispatcher
// Sends extracted GFG submission data to background.js via chrome.runtime.sendMessage
// ------------------------------------------------------------------------------
function sendSubmissionToBackground(data) {
  try {
    console.log("📤 Sending GFG submission to background:", data);
    chrome.runtime.sendMessage({ action: 'submission', data }, (response) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message?.includes("context invalidated")) {
          console.warn("⚠️ AlgoGit: Extension was reloaded in chrome://extensions. Please refresh (F5) this page to reconnect.");
        } else {
          console.log("✅ AlgoGit GFG background response:", response || "ok");
        }
      } else {
        console.log("✅ GFG Message dispatched to background script successfully");
      }
    });
  } catch (err) {
    if (err.message && err.message.includes("Extension context invalidated")) {
      console.warn("⚠️ AlgoGit: Extension was reloaded in chrome://extensions. Please refresh (F5) this page to reconnect.");
    } else {
      console.error("❌ AlgoGit GFG send error:", err);
    }
  }
}

// ------------------------------------------------------------------------------
// SECTION 5: MutationObserver for Submission Results / Verdicts
// Observes DOM changes after GFG Submit click until verdict appears
// ------------------------------------------------------------------------------
let activeGFGResultObserver = null;

function waitForResultWithObserverGFG() {
  if (activeGFGResultObserver) {
    activeGFGResultObserver.disconnect();
    activeGFGResultObserver = null;
  }

  let handled = false;

  activeGFGResultObserver = new MutationObserver((mutations) => {
    if (handled) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const text = node.innerText || '';
        const match = text.match(/(Correct Answer|Wrong Answer|Compilation Error|Time Limit Exceeded|Run Time Error)/i);

        if (match) {
          handled = true;
          const status = match[0];
          console.log(`✅ GFG Final Result Detected: ${status}`);

          if (activeGFGResultObserver) {
            activeGFGResultObserver.disconnect();
            activeGFGResultObserver = null;
          }

          // Request latest code snapshot from Ace editor main world
          window.postMessage({ type: 'ALGOGIT_GET_GFG_CODE' }, '*');

          setTimeout(() => {
            const submission = getGFGSubmissionData();
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

  activeGFGResultObserver.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    if (activeGFGResultObserver && !handled) {
      activeGFGResultObserver.disconnect();
      activeGFGResultObserver = null;
    }
  }, 60000);
}

// ------------------------------------------------------------------------------
// SECTION 6: Submit Button Click Event Listener (Event Delegation)
// Listens for clicks on the GFG Submit button and triggers result observer
// ------------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn && /submit/i.test(btn.innerText || '')) {
    console.log("🟡 GFG Submit button clicked!");
    window.postMessage({ type: 'ALGOGIT_GET_GFG_CODE' }, '*');
    waitForResultWithObserverGFG();
  }
}, true);

