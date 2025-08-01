// console.log("🚀 LeetCode content script loaded");

// function getLeetCodeSubmissionData() {
//   const codeBlock = document.querySelector('pre');
//   if (!codeBlock) {
//     console.log("❌ Code block not found");
//     return null;
//   }

//   const code = codeBlock.innerText.trim();

//   // Extract title from URL
//   const slug = location.pathname.split('/')[2]; // e.g., "two-sum"
//   const title = slug
//     .split('-')
//     .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(' '); // → "Two Sum"

//   return {
//     platform: 'leetcode',
//     title: title,
//     code: code
//   };
// }

// function sendSubmissionToBackground(data) {
//     console.log("📤 Sending submission to background:🤣🤣🤣🤣🤣", data);
//   chrome.runtime.sendMessage({ action: 'submission', data });
// }

// let lastSentTitle = null;

// setInterval(async() => {
//   const submission =await getLeetCodeSubmissionData();
//   console.log('🔄 Checking submission:', submission);

//   if (submission && submission.title !== lastSentTitle) {
//     sendSubmissionToBackground(submission);
//     lastSentTitle = submission.title;
//   }
// }, 3000);console.log("🚀 LeetCode content script loaded");
console.log("🚀 LeetCode content script loaded");

function getLeetCodeSubmissionData() {
  const codeBlock = document.querySelector('pre');
  if (!codeBlock) return null;
console.log("✅ Code block found:", codeBlock);
  const code = codeBlock.innerText.trim();
  console.log("📄 Code block found:", code);
  const slug = location.pathname.split('/')[2];
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    platform: 'leetcode',
    title,
    code
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
