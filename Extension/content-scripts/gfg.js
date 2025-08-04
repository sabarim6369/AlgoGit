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
  console.log("📤 Sending GFG submission to background:", data);
  chrome.runtime.sendMessage({ action: 'submission', data });
}

function waitForResultWithObserverGFG() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const text = node.innerText || '';
        const match = text.match(/(Correct Answer|Wrong Answer|Compilation Error|Time Limit Exceeded|Run Time Error)/i);

        if (match) {
          const status = match[0];
          console.log(`✅ GFG Final Result Detected: ${status}`);

          const submission = getGFGSubmissionData();
          if (submission) {
            submission.status = status;
            sendSubmissionToBackground(submission);
          }

          observer.disconnect();
          return;
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function monitorGFGSubmitButton() {
  const observer = new MutationObserver(() => {
    const submitBtn = [...document.querySelectorAll('button')]
      .find(btn => /submit/i.test(btn.innerText));

    if (submitBtn) {
      console.log("✅ GFG Submit button found, attaching listener");
      submitBtn.addEventListener('click', () => {
        console.log("🟡 GFG Submit button clicked!");
        waitForResultWithObserverGFG();
      });
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

monitorGFGSubmitButton();
