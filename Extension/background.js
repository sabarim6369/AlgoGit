
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🔔 Message received in **background** script ✅✅✅", message);
console.log(chrome.identity.getRedirectURL());
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

      fetch(`http://localhost:8080/submission/submit`, {
      // fetch(`https://algogitbackend.onrender.com/submission/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })
        .then(async res => {
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch {
            return { message: text };
          }
        })
        .then(response => {
          console.log('✅ Backend response:', response);
          chrome.storage.local.set({ lastSubmission: response });

          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/AlgoGit.png',
            title: 'AlgoGit',
            message: `Solution "${submissionData.title}" synced successfully!`,
            priority: 2
          });
        })
        .catch(err => console.error('❌ Error sending submission:', err));
    });
  }
});
