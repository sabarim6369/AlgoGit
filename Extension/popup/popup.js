// document.addEventListener('DOMContentLoaded', () => {
//   const repoSetupDiv = document.getElementById('repoSetup');
//   const repoInfoDiv = document.getElementById('repoInfo');
//   // const lastSubmissionDiv = document.getElementById('lastSubmission'); // commented out

//   const repoSetupForm = document.getElementById('repoSetupForm');
//   const repoUrlInput = document.getElementById('repoUrl');
//   const repoDisplayNameInput = document.getElementById('username'); // changed from repoNameInput
//   const repoEmailInput = document.getElementById('Email');

//   const repoLink = document.getElementById('repoLink');
//   const repoDisplayName = document.getElementById('repoDisplayName'); // make sure this element exists in HTML

//   const syncNowBtn = document.getElementById('syncNowBtn');
// //   const syncStatus = document.getElementById('syncStatus');

//   // const lastPlatform = document.getElementById('lastPlatform'); // commented out
//   // const lastTitle = document.getElementById('lastTitle');       // commented out
//   // const lastCommitMsg = document.getElementById('lastCommitMsg'); // commented out

//   chrome.storage.local.get(['repoInfo'/*, 'lastSubmission'*/], ({ repoInfo /*, lastSubmission*/ }) => {
//     if (!repoInfo || !repoInfo.githuburl) {
//       repoSetupDiv.classList.remove('hidden');
//       repoInfoDiv.classList.add('hidden');
//       // lastSubmissionDiv.classList.add('hidden'); // commented out
//     } else {
//       showRepoInfo(repoInfo);
//       // showLastSubmission(lastSubmission); // commented out
//     }
//   });

// //   repoSetupForm.addEventListener('submit', async (e) => {
// //     e.preventDefault();
// //     const url = repoUrlInput.value.trim();
// //     if (!url) {
// //       alert('Please enter a valid GitHub repository URL.');
// //       return;
// //     }
// //     const name = repoDisplayNameInput.value.trim() || url;

// //     const email = repoEmailInput.value.trim();
// //     if (!email) {
// //       alert('Please enter your email.');
// //       return;
// //     }

// //     const payload = {
// //       githuburl: url,
// //       name: name,
// //       email: email
// //     };

// //     try {
// //       const res = await fetch('http://localhost:8080/auth/register', {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(payload)
// //       });
// //       if (!res.ok) throw new Error('Failed to save repo info');
// //       const data = await res.json();

// //     chrome.storage.local.set({
// //   repoInfo: data,
// //   userId: data.id
// // }, () => {
// //   console.log("✅ repoInfo stored in chrome.storage:", data);
// //   showRepoInfo(data);
// // });

// //     } catch (err) {
// //       console.error(err);
// //       alert('Failed to save repository info. Check console.');
// //     }
// //   });

//   function showRepoInfo(repoInfo) {
//     repoSetupDiv.classList.add('hidden');
//     repoInfoDiv.classList.remove('hidden');
//     // lastSubmissionDiv.classList.remove('hidden'); // commented out

//     if (repoDisplayName) repoDisplayName.textContent = repoInfo.name || 'No Display Name';
//     if (repoLink) repoLink.href = repoInfo.githuburl;

//     // syncStatus.textContent = 'Last sync: --';
//   }

//   // function showLastSubmission(submission) { // commented out
//   //   if (!submission) {
//   //     lastSubmissionDiv.style.display = 'none';
//   //     return;
//   //   }
//   //   lastSubmissionDiv.style.display = 'block';
//   //   lastPlatform.textContent = submission.platform || '--';
//   //   lastTitle.textContent = submission.title || '--';
//   //   lastCommitMsg.textContent = submission.commitMessage || '--';
//   // }

//   if(syncNowBtn){
//     syncNowBtn.addEventListener('click', () => {
//       chrome.storage.local.get(['repoInfo'], ({ repoInfo }) => {
//         if (!repoInfo || !repoInfo.githuburl) {
//           alert('Please configure your GitHub repository first.');
//           return;
//         }

//         fetch('http://localhost:8080/api/sync', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ repoUrl: repoInfo.githuburl })
//         })
//           .then(res => res.json())
//           .then(data => {
//             // syncStatus.textContent = 'Last sync: ' + new Date().toLocaleString();
//             alert('Sync triggered successfully!');
//           })
//           .catch(err => {
//             console.error(err);
//             alert('Sync failed. See console for details.');
//           });
//       });
//     });
//   }
// });
// const CLIENT_ID = 'Ov23liMfOlf2emj68SBT';
// const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

// document.addEventListener('DOMContentLoaded', () => {
//   const githubLoginBtn = document.getElementById("githubLogin");
//   const repoSetupForm = document.getElementById("repoSetupForm");

//   const repoUrlInput = document.getElementById("repoUrl");
//   const repoEmailInput = document.getElementById("Email");
//   const repoDisplayNameInput = document.getElementById("username");

//   const CLIENT_ID = 'Ov23liMfOlf2emj68SBT';
//   const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

//   // Step 1: Enable GitHub button after form validation
//   repoSetupForm.addEventListener('submit', (e) => {
//     e.preventDefault();

//     const email = repoEmailInput.value.trim();
//     const repoUrl = repoUrlInput.value.trim();
//     const name = repoDisplayNameInput.value.trim();

//     if (!email || !repoUrl || !name) {
//       alert("Please fill in all required fields.");
//       return;
//     }

//     githubLoginBtn.disabled = false;
//     alert("Details saved. Now you can authenticate with GitHub.");
//   });

//   // Step 2: On GitHub login button click
//   githubLoginBtn.addEventListener("click", () => {
//     const email = repoEmailInput.value.trim();
//     const githuburl = repoUrlInput.value.trim();
//     const name = repoDisplayNameInput.value.trim();

//     if (!email || !githuburl || !name) {
//       alert("Missing details. Please fill the form first.");
//       return;
//     }

//     const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo`;

//     chrome.identity.launchWebAuthFlow({
//       url: authUrl,
//       interactive: true
//     }, (redirectUrl) => {
//       if (chrome.runtime.lastError) {
//         console.error("OAuth failed", chrome.runtime.lastError);
//         return;
//       }

//       const url = new URL(redirectUrl);
//       const code = url.searchParams.get("code");
//       console.log("GitHub code received:", code);

//       fetch("http://localhost:8080/auth/github/exchange-code", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ code, email, name, githuburl }),
//       }).then((res) => res.json())
//         .then((data) => {
//           console.log("✅ GitHub access token:", data.access_token);

//           // Store everything in local Chrome storage
//           chrome.storage.local.set({
//             repoInfo: {
//               email: email,
//               name: name,
//               githuburl: githuburl,
//               githubAccessToken: data.access_token
//             },
//             userId: email  // Optional: if you want to use email as ID
//           }, () => {
//             alert("✅ Authentication complete! Your GitHub is now connected.");
//           });
//         }).catch(err => {
//           console.error("❌ Error during GitHub token exchange", err);
//           alert("GitHub authentication failed.");
//         });
//     });
//   });
// });
document.addEventListener('DOMContentLoaded', () => {
  const githubLoginBtn = document.getElementById("githubLogin");
  const repoSetupDiv = document.getElementById('repoSetup');
  const repoInfoDiv = document.getElementById('repoInfo');

  const repoUrlInput = document.getElementById("repoUrl");
  const repoEmailInput = document.getElementById("Email");
  const repoDisplayNameInput = document.getElementById("username");

  const repoLink = document.getElementById('repoLink');
  const repoDisplayName = document.getElementById('repoDisplayName');
  const logoutBtn = document.getElementById("logoutBtn"); // optional button you can add

  const CLIENT_ID = 'Ov23liMfOlf2emj68SBT';
  const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

  // 🔄 Check if already authenticated
  chrome.storage.local.get(['repoInfo'], ({ repoInfo }) => {
    if (repoInfo && repoInfo.githubAccessToken) {
      showRepoInfo(repoInfo);
    } else {
      repoSetupDiv.classList.remove('hidden');
      repoInfoDiv.classList.add('hidden');
    }
  });

  githubLoginBtn.addEventListener("click", () => {
    const email = repoEmailInput.value.trim();
    const githuburl = repoUrlInput.value.trim();
    const name = repoDisplayNameInput.value.trim();

    if (!email || !githuburl || !name) {
      showToast("Please fill all fields before login.");
      return;
    }

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo`;

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        console.error("OAuth failed", chrome.runtime.lastError);
        return;
      }

      const url = new URL(redirectUrl);
      const code = url.searchParams.get("code");
      console.log("GitHub code received:", code);

      fetch("http://localhost:8080/auth/github/exchange-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email, name, githuburl }),
      }).then((res) => res.json())
        .then((data) => {
          console.log("✅ GitHub access token:", data.access_token);

          const repoInfo = {
            email,
            name,
            githuburl,
            githubAccessToken: data.access_token
          };

          chrome.storage.local.set({ repoInfo }, () => {
            showToast("✅ Authentication complete! Redirecting...");
            showRepoInfo(repoInfo);
          });
        }).catch(err => {
          console.error("❌ GitHub token exchange failed", err);
          showToast("Authentication failed.");
        });
    });
  });

  function showRepoInfo(repoInfo) {
    repoSetupDiv.classList.add('hidden');
    repoInfoDiv.classList.remove('hidden');

    if (repoDisplayName) repoDisplayName.textContent = repoInfo.name || 'No Display Name';
    if (repoLink) repoLink.href = repoInfo.githuburl;
  }

  // Optional logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      chrome.storage.local.clear(() => {
        showToast("Logged out.");
        repoSetupDiv.classList.remove('hidden');
        repoInfoDiv.classList.add('hidden');
      });
    });
  }
});
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Add message text
  toast.textContent = message;

  // Create and add close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.className = 'close-btn';
  closeBtn.onclick = () => toast.remove();

  toast.appendChild(closeBtn);
  toastContainer.appendChild(toast);

  // Auto-remove after 4s if not manually closed
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    showToast("Logged out.");
    document.getElementById("repoInfo").classList.add("hidden");
    document.getElementById("repoSetup").classList.remove("hidden");
  });
});
