// ==============================================================================
// AlgoGit - GeeksforGeeks Main World Hook
// Runs in the webpage context (MAIN world) to access Ace Editor API directly.
// Ace editor virtualizes DOM lines, so window.ace.edit(...) is the ONLY way
// to get 100% full, non-truncated code with all lines.
// ==============================================================================

(function() {
  console.log("🚀 AlgoGit GFG Main World Hook initialized");

  function getAceCode() {
    try {
      if (window.ace) {
        const editorEl = document.querySelector('.ace_editor');
        if (editorEl) {
          const editor = window.ace.edit(editorEl);
          if (editor && typeof editor.getValue === 'function') {
            return editor.getValue();
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ AlgoGit: Error accessing Ace editor:", e);
    }
    return '';
  }

  function syncCodeToBridge() {
    try {
      const code = getAceCode();
      if (!code) return;

      let bridge = document.getElementById('algogit-gfg-bridge');
      if (!bridge) {
        bridge = document.createElement('div');
        bridge.id = 'algogit-gfg-bridge';
        bridge.style.display = 'none';
        document.documentElement.appendChild(bridge);
      }

      bridge.textContent = code;
    } catch (err) {
      console.warn("⚠️ AlgoGit: Failed to sync GFG code to bridge:", err);
    }
  }

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ALGOGIT_GET_GFG_CODE') {
      syncCodeToBridge();
      const code = getAceCode();
      window.postMessage({
        type: 'ALGOGIT_GFG_CODE_RESPONSE',
        code
      }, '*');
    }
  });

  setInterval(syncCodeToBridge, 1500);

  document.addEventListener('click', () => {
    setTimeout(syncCodeToBridge, 50);
  }, true);

  setTimeout(syncCodeToBridge, 1500);
})();
