function getLeetCodeSubmissionData() {
  const acceptedLabel = document.querySelector('.success__3Ai7');
  if (!acceptedLabel) return null;

  const titleEl = document.querySelector('.question-title h3');
  const codeEl = document.querySelector('.view-lines');

  if (!titleEl || !codeEl) return null;

  return {
    platform: 'leetcode',
    title: titleEl.textContent.trim(),
    code: codeEl.innerText.trim()
  };
}

function sendSubmissionToBackground(data) {
  chrome.runtime.sendMessage({ action: 'submission', data });
}

let lastSentTitle = null;

setInterval(() => {
  const submission = getLeetCodeSubmissionData();
  if (submission && submission.title !== lastSentTitle) {
    sendSubmissionToBackground(submission);
    lastSentTitle = submission.title;
  }
}, 3000);
