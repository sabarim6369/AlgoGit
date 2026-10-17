// ==============================================================================
// AlgoGit - Popup UI Controller
// Description: Manages the popup interface for the AlgoGit Chrome extension:
//              - GitHub OAuth login and access token management
//              - Displaying problem statistics across platforms (LeetCode, GFG, etc.)
//              - Displaying current & longest coding streaks and daily active days
//              - Updating repository configuration and handling user logout
// ==============================================================================

// ------------------------------------------------------------------------------
// SECTION 1: API Configuration & Global State
// ------------------------------------------------------------------------------
// const apiurl="https://algogitbackend.onrender.com"
const apiurl = "http://localhost:8080"

let globalProblemStats = null;

// ------------------------------------------------------------------------------
// SECTION 2: Problem Statistics UI & Platform Filtering
// Updates total count, easy, medium, and hard stats based on selected platform
// ------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------
// SECTION 3: API Service - Fetch Problem Counts from Backend
// Calls POST /problems/getcounts using user email
// ------------------------------------------------------------------------------
async function fetchAndDisplayProblemStats() {
  const { repoInfo } = await chrome.storage.local.get(['repoInfo']);
  if (!repoInfo || !repoInfo.email) return;

  try {
    console.log("🙏🙏🙏🙏🙏", repoInfo.email)
    const response = await fetch(`${apiurl}/problems/getcounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: repoInfo.email })
    });

    const data = await response.json();
    console.log('✅ Problem Stats:', data);
    updateProblemStatsUI(data);
  } catch (err) {
    console.error('❌ Error fetching problem stats:', err);
  }
}

// ------------------------------------------------------------------------------
// SECTION 4: API Service - Fetch Streaks & Activity from Backend
// Calls POST /streak/getstreak to retrieve current, longest streak & active days
// ------------------------------------------------------------------------------
async function getstreaks() {
  const { repoInfo } = await chrome.storage.local.get(['repoInfo']);
  if (!repoInfo || !repoInfo.email) return;

  try {
    const response = await fetch(`${apiurl}/streak/getstreak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: repoInfo.email })
    });

    const data = await response.json();
    console.log('✅ Streaks:', data);

    document.querySelector('.streak-current-value').textContent = data.currentStreak;
    document.querySelector('.streak-longest-value').textContent = data.longestStreak;

    // Optional: update daily streak boxes
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const el = document.querySelector(`.day-box[data-day="${day}"]`);
      if (el) {
        if (data[day]) {
          el.classList.add('filled');  // 🔥 mark active
        } else {
          el.classList.remove('filled');
        }
      }
    });

  } catch (err) {
    console.error('❌ Error fetching streaks:', err);
  }
}

// ------------------------------------------------------------------------------
// SECTION 5: DOM Initialization & Event Handlers
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const githubLoginBtn = document.getElementById("githubLogin");
  const welcomePage = document.getElementById("welcomePage");
  const repoSetupDiv = document.getElementById('repoSetup');
  const repoInfoDiv = document.getElementById('repoInfo');

  // SUB-SECTION 5.1: Check if user is already authenticated
  chrome.storage.local.get(['repoInfo'], ({ repoInfo }) => {
    if (repoInfo && repoInfo.githubAccessToken) {
      showRepoInfo(repoInfo);
      welcomePage.style.display = "none";

    } else {
      welcomePage.style.display = "block";
      repoSetupDiv.style.display = "none";
    }
  });


  welcomePage.style.display = "block";
  repoSetupDiv.style.display = "none";

  // SUB-SECTION 5.2: Welcome Page Navigation
  const enterAppBtn = document.getElementById("enterAppBtn");
  enterAppBtn.addEventListener('click', () => {
    welcomePage.style.display = "none";
    repoSetupDiv.style.display = "block";


  })
  const repoUrlInput = document.getElementById("repoUrl");
  const repoEmailInput = document.getElementById("Email");
  const repoDisplayNameInput = document.getElementById("username");

  const repoLink = document.getElementById('repoLink');
  const repoDisplayName = document.getElementById('repoDisplayName');
  const logoutBtn = document.getElementById("logoutBtn");

  // SUB-SECTION 5.3: Edit GitHub Repository URL Modal & Update API
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
  getstreaks()
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

        try {
          // http://localhost:8080 ->local
          const response = await fetch(`${apiurl}/auth/update-url`, {
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

  // SUB-SECTION 5.4: Initialize Problem Stats & Filter Event Listener
  fetchAndDisplayProblemStats();
  document.getElementById('platformSelect').addEventListener('change', (e) => {
    applyPlatformFilter(e.target.value);
  });

  // SUB-SECTION 5.5: GitHub OAuth2 Login & Authorization Code Exchange
  const CLIENT_ID = 'Ov23liCr0aoMWOhjQht2';
  const REDIRECT_URI = chrome.identity.getRedirectURL();

  chrome.storage.local.get(['repoInfo'], ({ repoInfo }) => {
    if (repoInfo && repoInfo.githubAccessToken) {
      showRepoInfo(repoInfo);
    } else {
      repoSetupDiv.classList.remove('hidden');
      repoInfoDiv.classList.add('hidden');
    }
  });

  let isAuthenticating = false;

  githubLoginBtn.addEventListener("click", () => {
    if (isAuthenticating) {
      showToast("Authentication already in progress...");
      return;
    }

    const email = repoEmailInput.value.trim();
    const githuburl = repoUrlInput.value.trim();
    const name = repoDisplayNameInput.value.trim();
    if (!email || !githuburl || !name) {
      showToast("Please fill all fields before login.");
      return;
    }

    isAuthenticating = true;
    githubLoginBtn.disabled = true;

    const state = Math.random().toString(36).substring(2);
const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo&state=${state}&prompt=consent`;

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (redirectUrl) => {
      isAuthenticating = false;
      githubLoginBtn.disabled = false;

      if (chrome.runtime.lastError) {
        console.error("OAuth failed", chrome.runtime.lastError);
        showToast(chrome.runtime.lastError.message || "OAuth failed", "error");
        return;
      }

      const url = new URL(redirectUrl);
      const code = url.searchParams.get("code");
      console.log("GitHub code received:", code);

      fetch(`${apiurl}/auth/github/exchange-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email, name, githuburl, redirect_uri: REDIRECT_URI }),
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
            repoSetupDiv.style.display = "none";
            showRepoInfo(repoInfo);
          });
        }).catch(err => {
          console.error("❌ GitHub token exchange failed", err);
          showToast("Authentication failed.");
        });
    });
  });

  // SUB-SECTION 5.6: Switch View to Connected Repo Details
  function showRepoInfo(repoInfo) {
    repoSetupDiv.classList.add('hidden');
    repoInfoDiv.classList.remove('hidden');

    if (repoDisplayName) repoDisplayName.textContent = repoInfo.name || 'No Display Name';
    if (repoLink) repoLink.href = repoInfo.githuburl;
  }

  // SUB-SECTION 5.7: Logout Button Listener inside DOMContentLoaded
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      chrome.storage.local.clear(() => {
        showToast("Logged out.");
        repoSetupDiv.classList.remove('hidden');
        repoInfoDiv.classList.add('hidden');
        welcomePage.style.display = "block";
      });
    });
  }
});

// ------------------------------------------------------------------------------
// SECTION 6: UI Toast Notification Helper
// Renders dynamic toast alerts in the bottom popup container
// ------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------
// SECTION 7: Logout Action Handler
// Clears local Chrome extension storage and resets UI views
// ------------------------------------------------------------------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    showToast("Logged out.");
    document.getElementById("repoInfo").classList.add("hidden");
    document.getElementById("repoSetup").classList.remove("hidden");
  });
});
