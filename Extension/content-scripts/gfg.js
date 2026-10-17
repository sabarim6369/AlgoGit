console.log("🚀 GeeksforGeeks content script loaded");

function detectLanguageGFG() {
  const codeLang = document.querySelector('[id^="languageSelector"] option:checked')?.innerText;
  return codeLang || "Unknown";
}

function detectDifficultyGFG() {
  const difficultyEl = [...document.querySelectorAll('*')]
    .find(el => el.textContent.match(/Difficulty:\s*(Easy|Medium|Hard)/i));
  const match = difficultyEl?.textContent.match(/Difficulty:\s*(Easy|Medium|Hard)/i);
  return match ? match[1] : "Unknown";
}
function getGFGSubmissionData() {
  const codeEl = document.querySelector('.ace_content') || document.querySelector('code');
  if (!codeEl) {
    console.warn("❌ Could not find code element");
    return null;
  }

  const lines = Array.from(codeEl.querySelectorAll('.ace_line')).map(el => el.innerText.trim());
  const code = lines.length ? lines.join('\n').trim() : codeEl.innerText.trim();


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

// Global delegated event listener for GFG Submit button
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn && /submit/i.test(btn.innerText || '')) {
    console.log("🟡 GFG Submit button clicked!");
    waitForResultWithObserverGFG();
  }
}, true);

