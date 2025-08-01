document.addEventListener('DOMContentLoaded', () => {
  const repoSetupDiv = document.getElementById('repoSetup');
  const repoInfoDiv = document.getElementById('repoInfo');
  // const lastSubmissionDiv = document.getElementById('lastSubmission'); // commented out

  const repoSetupForm = document.getElementById('repoSetupForm');
  const repoUrlInput = document.getElementById('repoUrl');
  const repoDisplayNameInput = document.getElementById('username'); // changed from repoNameInput
  const repoEmailInput = document.getElementById('Email');

  const repoLink = document.getElementById('repoLink');
  const repoDisplayName = document.getElementById('repoDisplayName'); // make sure this element exists in HTML

  const syncNowBtn = document.getElementById('syncNowBtn');
//   const syncStatus = document.getElementById('syncStatus');

  // const lastPlatform = document.getElementById('lastPlatform'); // commented out
  // const lastTitle = document.getElementById('lastTitle');       // commented out
  // const lastCommitMsg = document.getElementById('lastCommitMsg'); // commented out

  chrome.storage.local.get(['repoInfo'/*, 'lastSubmission'*/], ({ repoInfo /*, lastSubmission*/ }) => {
    if (!repoInfo || !repoInfo.githuburl) {
      repoSetupDiv.classList.remove('hidden');
      repoInfoDiv.classList.add('hidden');
      // lastSubmissionDiv.classList.add('hidden'); // commented out
    } else {
      showRepoInfo(repoInfo);
      // showLastSubmission(lastSubmission); // commented out
    }
  });

  repoSetupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = repoUrlInput.value.trim();
    if (!url) {
      alert('Please enter a valid GitHub repository URL.');
      return;
    }
    const name = repoDisplayNameInput.value.trim() || url;

    const email = repoEmailInput.value.trim();
    if (!email) {
      alert('Please enter your email.');
      return;
    }

    const payload = {
      githuburl: url,
      name: name,
      email: email
    };

    try {
      const res = await fetch('http://localhost:8080/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save repo info');
      const data = await res.json();

      chrome.storage.local.set({
        repoInfo: data,
        userId: data.id
      }, () => {
        showRepoInfo(data);
      });
    } catch (err) {
      console.error(err);
      alert('Failed to save repository info. Check console.');
    }
  });

  function showRepoInfo(repoInfo) {
    repoSetupDiv.classList.add('hidden');
    repoInfoDiv.classList.remove('hidden');
    // lastSubmissionDiv.classList.remove('hidden'); // commented out

    if (repoDisplayName) repoDisplayName.textContent = repoInfo.name || 'No Display Name';
    if (repoLink) repoLink.href = repoInfo.githuburl;

    // syncStatus.textContent = 'Last sync: --';
  }

  // function showLastSubmission(submission) { // commented out
  //   if (!submission) {
  //     lastSubmissionDiv.style.display = 'none';
  //     return;
  //   }
  //   lastSubmissionDiv.style.display = 'block';
  //   lastPlatform.textContent = submission.platform || '--';
  //   lastTitle.textContent = submission.title || '--';
  //   lastCommitMsg.textContent = submission.commitMessage || '--';
  // }

  if(syncNowBtn){
    syncNowBtn.addEventListener('click', () => {
      chrome.storage.local.get(['repoInfo'], ({ repoInfo }) => {
        if (!repoInfo || !repoInfo.githuburl) {
          alert('Please configure your GitHub repository first.');
          return;
        }

        fetch('http://localhost:8080/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: repoInfo.githuburl })
        })
          .then(res => res.json())
          .then(data => {
            // syncStatus.textContent = 'Last sync: ' + new Date().toLocaleString();
            alert('Sync triggered successfully!');
          })
          .catch(err => {
            console.error(err);
            alert('Sync failed. See console for details.');
          });
      });
    });
  }
});
