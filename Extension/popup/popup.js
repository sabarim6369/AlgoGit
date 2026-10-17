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
let cachedRecentSubmissions = [];

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

  // Filter the recent submissions list to match selected platform
  filterRecentSubmissions(platform);
}

// ------------------------------------------------------------------------------
// SECTION 2B: Recent Submissions Activity Feed Renderer
// ------------------------------------------------------------------------------
function getRelativeTime(timestamp) {
  if (!timestamp) return 'Recently';
  const now = Date.now();
  const diffMs = now - new Date(timestamp).getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function filterRecentSubmissions(platform) {
  renderRecentSubmissions(cachedRecentSubmissions, platform);
}

function renderRecentSubmissions(items, currentFilter = 'All Platforms') {
  const container = document.getElementById('recentList');
  const countBadge = document.getElementById('recentCountBadge');
  if (!container) return;

  const list = Array.isArray(items) ? items : [];
  cachedRecentSubmissions = list;

  const filtered = list.filter(item => {
    if (!currentFilter || currentFilter.toLowerCase() === 'all platforms') return true;
    const p = (item.platform || '').toLowerCase();
    const filterKey = currentFilter.toLowerCase();
    if (filterKey === 'leetcode') return p.includes('leetcode');
    if (filterKey === 'geeksforgeeks') return p.includes('gfg') || p.includes('geek');
    if (filterKey === 'codeforces') return p.includes('codeforces');
    if (filterKey === 'codechef') return p.includes('codechef');
    return true;
  });

  if (countBadge) {
    countBadge.textContent = `${list.length} synced`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="recent-empty">
        <span class="empty-icon">📁</span>
        <p>No solutions synced ${currentFilter !== 'All Platforms' ? `for ${currentFilter}` : 'yet'}</p>
        <small>Solve a problem on LeetCode or GFG to see it sync here!</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const platform = (item.platform || '').toLowerCase();
    const isLC = platform.includes('leetcode');
    const isGFG = platform.includes('gfg') || platform.includes('geek');
    const badgeClass = isLC ? 'badge-lc' : (isGFG ? 'badge-gfg' : 'badge-default');
    const badgeText = isLC ? 'LC' : (isGFG ? 'GFG' : 'CODE');

    const diff = (item.difficulty || 'Easy').toLowerCase();
    const diffClass = diff === 'hard' ? 'diff-hard' : (diff === 'medium' ? 'diff-medium' : 'diff-easy');

    const timeAgo = getRelativeTime(item.timestamp);
    const safeTitle = (item.title || 'Untitled Solution').replace(/"/g, '&quot;');
    const ghUrl = item.githubUrl || '#';

    return `
      <div class="recent-card">
        <div class="recent-card-top">
          <div class="recent-meta-left">
            <span class="recent-platform-badge ${badgeClass}">${badgeText}</span>
            <span class="recent-problem-title" title="${safeTitle}">${safeTitle}</span>
          </div>
          <a href="${ghUrl}" target="_blank" rel="noopener noreferrer" class="recent-gh-btn" title="View solution on GitHub">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>Code ↗</span>
          </a>
        </div>
        <div class="recent-card-bottom">
          <div class="recent-tags">
            <span class="recent-pill ${diffClass}">${item.difficulty || 'Easy'}</span>
            ${item.language ? `<span class="recent-pill pill-lang">${item.language}</span>` : ''}
            ${item.concept ? `<span class="recent-pill pill-concept">${item.concept}</span>` : ''}
          </div>
          <span class="recent-time">${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function fetchAndDisplayRecentSubmissions() {
  // Step 1: Immediately render cached submissions from chrome.storage.local
  const { recentSubmissions } = await chrome.storage.local.get(['recentSubmissions']);
  if (recentSubmissions && Array.isArray(recentSubmissions)) {
    cachedRecentSubmissions = recentSubmissions;
    renderRecentSubmissions(recentSubmissions);
  }

  // Step 2: Sync with backend database
  const { repoInfo } = await chrome.storage.local.get(['repoInfo']);
  if (!repoInfo || !repoInfo.email) return;

  try {
    const res = await fetch(`${apiurl}/submission/recent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: repoInfo.email })
    });

    if (res.ok) {
      const records = await res.json();
      if (Array.isArray(records) && records.length > 0) {
        const backendFormatted = records.map(r => ({
          title: r.title,
          platform: r.platform,
          difficulty: r.difficulty,
          language: r.language,
          concept: r.concept,
          githubUrl: r.fileUrl || r.githubUrl,
          timestamp: r.submittedAt ? new Date(r.submittedAt).getTime() : Date.now()
        }));

        // Merge backend records with local storage records
        const localList = cachedRecentSubmissions || [];
        const mergedMap = new Map();
        [...backendFormatted, ...localList].forEach(item => {
          const key = `${(item.title || '').trim().toLowerCase()}_${(item.platform || '').trim().toLowerCase()}`;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, item);
          }
        });
        const mergedList = Array.from(mergedMap.values()).slice(0, 20);

        chrome.storage.local.set({ recentSubmissions: mergedList });
        cachedRecentSubmissions = mergedList;
        const currentFilter = document.getElementById('platformSelect')?.value || 'All Platforms';
        renderRecentSubmissions(mergedList, currentFilter);
      }
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch remote recent submissions:", err);
  }
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
  fetchAndDisplayRecentSubmissions();
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
