
// ==============================================================================
// AlgoGit - Background Service Worker
// Description: Listens for submission events from content scripts, merges user
//              repository details from storage, sends data to the backend API,
//              and triggers desktop notifications.
// ==============================================================================

// ------------------------------------------------------------------------------
// SECTION 1: Message Listener for Incoming Submissions
// ------------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🔔 Message received in **background** script ✅✅✅", message);
console.log(chrome.identity.getRedirectURL());

  // Check if message is a problem submission
  if (message.action === 'submission') {

    // --------------------------------------------------------------------------
    // SECTION 2: Retrieve User & Repo Configuration from Local Storage
    // --------------------------------------------------------------------------
    chrome.storage.local.get(['repoInfo', 'userEmail'], ({ repoInfo, userEmail }) => {
      // Validate that the user has configured their GitHub repository
      if (!repoInfo || !repoInfo.githuburl) {
        console.warn('❌ GitHub repo not configured');
        return;
      }

      // Merge submission details with repo & user account info
      const submissionData = {
        ...message.data,
        repoUrl: repoInfo.githuburl,
        repoName: repoInfo.name || '',
        email: userEmail || repoInfo.email || ''
      };
      console.log('📝 Submission data:', submissionData);

      // ------------------------------------------------------------------------
      // SECTION 3: Send Submission Payload to Backend Server
      // ------------------------------------------------------------------------
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
          // --------------------------------------------------------------------
          // SECTION 4: Handle Backend Response & Show Desktop Notification
          // --------------------------------------------------------------------
          console.log('✅ Backend response:', response);
          chrome.storage.local.set({ lastSubmission: response });

          // Save to recentSubmissions list in chrome.storage.local for instant activity feed
          chrome.storage.local.get(['recentSubmissions'], ({ recentSubmissions }) => {
            const list = Array.isArray(recentSubmissions) ? recentSubmissions : [];
            const cleanBaseUrl = (repoInfo.githuburl || '').replace(/\.git$/, '');
            const directUrl = response.fileUrl || response.githubUrl || (cleanBaseUrl ? `${cleanBaseUrl}/tree/main/${submissionData.platform}` : '#');

            const newRecord = {
              title: response.title || submissionData.title,
              platform: response.platform || submissionData.platform,
              difficulty: response.difficulty || submissionData.difficulty || 'Unknown',
              language: response.language || submissionData.language || '',
              concept: response.concept || '',
              githubUrl: directUrl,
              timestamp: Date.now()
            };

            // Prepend new solution and de-duplicate by title + platform (keep latest 20)
            const updatedList = [
              newRecord,
              ...list.filter(item => !(item.title === newRecord.title && item.platform === newRecord.platform))
            ].slice(0, 20);

            chrome.storage.local.set({ recentSubmissions: updatedList });
          });

          // Display native Chrome notification for user confirmation
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
    return true; // Keep message port open for async response
  }
});
