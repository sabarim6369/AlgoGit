
console.log("🚀 LeetCode content script loaded");
function detectLanguage() {
  const raw = [...document.querySelectorAll('*')]
    .find(el => /^(C\+\+|Java|Python|Go|Rust|JavaScript)/.test(el.innerText))?.innerText.trim();

  const match = raw?.match(/^(C\+\+|Java|Python|Go|Rust|JavaScript)/);
  return match ? match[1] : "Unknown";
}
function detectDifficulty() {
  const el = Array.from(document.querySelectorAll('*'))
    .find(el => el.textContent.trim().match(/^(Easy|Medium|Hard)$/i));
  return el ? el.textContent.trim() : 'Unknown';
}

function getLeetCodeSubmissionData() {
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

    



  return {
    platform: 'leetcode',
    title,
    code,
    language:detectLanguage(),
    difficulty: detectDifficulty()


  };
}



function sendSubmissionToBackground(data) {
  console.log("📤 Sending submission to background:", data);
  chrome.runtime.sendMessage({ action: 'submission', data });
}

function waitForResultWithObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const text = node.innerText || '';
        const match = text.match(/(Accepted|Wrong Answer|Runtime Error|Time Limit Exceeded|Compilation Error)/i);

        if (match) {
          const status = match[0];
          console.log(`✅ Final Result Detected: ${status}`);

          const submission = getLeetCodeSubmissionData();
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

function monitorSubmitButton() {
  const observer = new MutationObserver(() => {
    const submitBtn = [...document.querySelectorAll('button')]
      .find(btn => btn.textContent.trim() === 'Submit');

    if (submitBtn) {
      console.log("✅ Submit button found, attaching listener");
      submitBtn.addEventListener('click', () => {
        console.log("🟡 Submit button clicked!");
        waitForResultWithObserver();
      });
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

monitorSubmitButton();
