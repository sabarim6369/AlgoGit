document.addEventListener('DOMContentLoaded', () => {
  const repoSetupDiv = document.getElementById('repoSetup');
  const repoInfoDiv = document.getElementById('repoInfo');
  const lastSubmissionDiv = document.getElementById('lastSubmission');

  const repoSetupForm = document.getElementById('repoSetupForm');
  const repoUrlInput = document.getElementById('repoUrl');
  const repoNameInput = document.getElementById('repoName');
  const repoDisplayName = document.getElementById('repoDisplayName');
  const repoLink = document.getElementById('repoLink');
  const syncNowBtn = document.getElementById('syncNowBtn');
  const syncStatus = document.getElementById('syncStatus');

  const lastPlatform = document.getElementById('lastPlatform');
  const lastTitle = document.getElementById('lastTitle');
  const lastCommitMsg = document.getElementById('lastCommitMsg');

  // Load saved repo info
  chrome.storage.local.get(['repoInfo', 'lastSubmission'], ({ repoInfo, lastSubmission }) => {
    if (!repoInfo || !repoInfo.repoUrl) {
      repoSetupDiv.classList.remove('hidden');
      repoInfoDiv.classList.add('hidden');
      lastSubmissionDiv.classList.add('hidden');
    } else {
      showRepoInfo(repoInfo);
      showLastSubmission(lastSubmission);
    }
  });

  repoSetupForm.addEventListener('submit', e => {
    e.preventDefault();
    const url = repoUrlInput.value.trim();
    if (!url) {
      alert('Please enter a valid GitHub repository URL.');
      return;
    }
    const name = repoNameInput.value.trim() || url;

    const repoInfo = { repoUrl: url, repoName: name };
    chrome.storage.local.set({ repoInfo }, () => {
      showRepoInfo(repoInfo);
    });
  });

  function showRepoInfo(repoInfo) {
    repoSetupDiv.classList.add('hidden');
    repoInfoDiv.classList.remove('hidden');
    lastSubmissionDiv.classList.remove('hidden');

    repoDisplayName.textContent = repoInfo.repoName;
    repoLink.href = repoInfo.repoUrl;

    syncStatus.textContent = 'Last sync: --';
  }

  function showLastSubmission(submission) {
    if (!submission) {
      lastSubmissionDiv.style.display = 'none';
      return;
    }
    lastSubmissionDiv.style.display = 'block';
    lastPlatform.textContent = submission.platform || '--';
    lastTitle.textContent = submission.title || '--';
    lastCommitMsg.textContent = submission.commitMessage || '--';
  }

  syncNowBtn.addEventListener('click', () => {
    chrome.storage.local.get(['repoInfo'], ({ repoInfo }) => {
      if (!repoInfo || !repoInfo.repoUrl) {
        alert('Please configure your GitHub repository first.');
        return;
      }

      fetch('http://localhost:8080/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoInfo.repoUrl })
      })
        .then(res => res.json())
        .then(data => {
          syncStatus.textContent = 'Last sync: ' + new Date().toLocaleString();
          alert('Sync triggered successfully!');
        })
        .catch(err => {
          console.error(err);
          alert('Sync failed. See console for details.');
        });
    });
  });
});
