chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'submission') {
    chrome.storage.local.get(['repoInfo'], ({ repoInfo,userEmail  }) => {
      if (!repoInfo || !repoInfo.repoUrl) {
        console.warn('GitHub repo not configured');
        return;
      }

      const submissionData = {
        ...message.data,
        repoUrl: repoInfo.repoUrl,
        repoName: repoInfo.repoName || '',
        email: userEmail || repoInfo.email || '' 
      };

      fetch('http://localhost:8080/submission/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })
        .then(res => res.json())
        .then(response => {
          console.log('Backend response:', response);
          chrome.storage.local.set({ lastSubmission: response });
          // Optionally notify user on successful push
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'LeetSync+',
            message: `Solution "${submissionData.title}" synced successfully!`,
            priority: 2
          });
        })
        .catch(err => console.error('Error sending submission:', err));
    });
  }
});
