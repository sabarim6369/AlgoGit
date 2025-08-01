chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🔔 Message received in **background** script ✅✅✅", message);

  if (message.action === 'submission') {
    chrome.storage.local.get(['repoInfo', 'userEmail'], ({ repoInfo, userEmail }) => {
      if (!repoInfo || !repoInfo.githuburl) {
        console.warn('❌ GitHub repo not configured');
        return;
      }

      const submissionData = {
        ...message.data,
        repoUrl: repoInfo.githuburl,
        repoName: repoInfo.name || '',
        email: userEmail || repoInfo.email || ''
      };
      console.log('📝 Submission data:', submissionData);

      fetch('http://localhost:8080/submission/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })
        .then(res => res.json())
        .then(response => {
          console.log('✅ Backend response:', response);
          chrome.storage.local.set({ lastSubmission: response });

          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'LeetSync+',
            message: `Solution "${submissionData.title}" synced successfully!`,
            priority: 2
          });
        })
        .catch(err => console.error('❌ Error sending submission:', err));
    });
  }
});
