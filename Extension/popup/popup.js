
let globalProblemStats = null;

function updateProblemStatsUI(data) {
  globalProblemStats = data;
  applyPlatformFilter('All Platforms');
}
function applyPlatformFilter(platform) {
  const data = globalProblemStats;
  if (!data) return;

  let easy = 0, medium = 0, hard = 0, total = 0;

  switch (platform.toLowerCase()) {
    case 'leetcode':
      total = data.leetcodecount || 0;
      easy = data.leetcodeEasy || 0;
      medium = data.leetcodeMedium || 0;
      hard = data.leetcodeHard || 0;
      break;
    case 'geeksforgeeks':
      total = data.gfgcount || 0;
      easy = data.gfgEasy || 0;
      medium = data.gfgMedium || 0;
      hard = data.gfgHard || 0;
      break;
    case 'codeforces':
    case 'codechef':
      total = data.codechefcount || 0;
      easy = data.codechefEasy || 0;
      medium = data.codechefMedium || 0;
      hard = data.codechefHard || 0;
      break;
    case 'hackerrank':
      total = data.hackerrankcount || 0;
      easy = data.hackerrankEasy || 0;
      medium = data.hackerrankMedium || 0;
      hard = data.hackerrankHard || 0;
      break;
    default: 
      total = (data.leetcodecount || 0) + (data.gfgcount || 0) + (data.codechefcount || 0) + (data.hackerrankcount || 0);
      easy = (data.leetcodeEasy || 0) + (data.gfgEasy || 0) + (data.codechefEasy || 0) + (data.hackerrankEasy || 0);
      medium = (data.leetcodeMedium || 0) + (data.gfgMedium || 0) + (data.codechefMedium || 0) + (data.hackerrankMedium || 0);
      hard = (data.leetcodeHard || 0) + (data.gfgHard || 0) + (data.codechefHard || 0) + (data.hackerrankHard || 0);
  }

  document.querySelector('.total-count').textContent = total;
  document.querySelector('.summary-box.easy .count').textContent = easy;
  document.querySelector('.summary-box.medium .count').textContent = medium;
  document.querySelector('.summary-box.hard .count').textContent = hard;
}



async function fetchAndDisplayProblemStats() {
  const { repoInfo } = await chrome.storage.local.get(['repoInfo']);
  if (!repoInfo || !repoInfo.email) return;

  try {
    console.log("🙏🙏🙏🙏🙏",repoInfo.email)
    const response = await fetch('http://localhost:8080/problems/getcounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({email:repoInfo.email})
    });

    const data = await response.json();
    console.log('✅ Problem Stats:', data);
    updateProblemStatsUI(data);
  } catch (err) {
    console.error('❌ Error fetching problem stats:', err);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const githubLoginBtn = document.getElementById("githubLogin");
  const repoSetupDiv = document.getElementById('repoSetup');
  const repoInfoDiv = document.getElementById('repoInfo');

  const repoUrlInput = document.getElementById("repoUrl");
  const repoEmailInput = document.getElementById("Email");
  const repoDisplayNameInput = document.getElementById("username");

  const repoLink = document.getElementById('repoLink');
  const repoDisplayName = document.getElementById('repoDisplayName');
  const logoutBtn = document.getElementById("logoutBtn"); 

    const githubIcon = document.querySelector('.gitimg1');
  const githubPopup = document.getElementById('githubPopup');
  const githubUrlInput = document.getElementById('editGithubUrl');
  const saveBtn = document.getElementById('saveGithubUrl');
    githubIcon.addEventListener('click', async () => {
    const { repoInfo } = await chrome.storage.local.get(['repoInfo']);
    if (repoInfo && repoInfo.githuburl) {
      githubUrlInput.value = repoInfo.githuburl;
    }
    githubPopup.classList.remove('hidden');
  });

 saveBtn.addEventListener('click', async () => {
  const newUrl = githubUrlInput.value.trim();
  if (!newUrl) {
    alert("URL cannot be empty.");
    return;
  }

  chrome.storage.local.get(['repoInfo'], async ({ repoInfo }) => {
    if (repoInfo) {
      // Update locally
      repoInfo.githuburl = newUrl;

      // Call backend API to update
      try {
        const response = await fetch('http://localhost:8080/auth/update-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: repoInfo.email,
            githuburl: newUrl
          })
        });

        if (response.ok) {
          chrome.storage.local.set({ repoInfo }, () => {
            showToast("GitHub URL updated ✅");
            githubPopup.classList.add('hidden');
          });
        } else {
          showToast("❌ Server rejected the update");
          console.error("Server error:", await response.text());
        }
      } catch (err) {
        console.error("❌ Error updating GitHub URL:", err);
        showToast("Failed to update. Try again.");
      }
    }
  });
});


  
  document.addEventListener('click', function (event) {
    if (!githubPopup.contains(event.target) && !githubIcon.contains(event.target)) {
      githubPopup.classList.add('hidden');
    }
  });

  fetchAndDisplayProblemStats();
document.getElementById('platformSelect').addEventListener('change', (e) => {
  applyPlatformFilter(e.target.value);
});

  const CLIENT_ID = 'Ov23liMfOlf2emj68SBT';
  const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

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
