// ==============================================================================
// AlgoGit - LeetCode Main World Hook
// Runs in the webpage context (MAIN world) to access Monaco Editor API directly.
// Monaco editor virtualizes DOM lines, so window.monaco.editor.getModels() is the
// ONLY way to get 100% full, non-truncated code with all lines, braces, and logic.
// ==============================================================================

(function() {
  console.log("🚀 AlgoGit LeetCode Main World Hook initialized");

  function getMonacoModel() {
    try {
      if (window.monaco && window.monaco.editor) {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          // Select model with the largest code content (the solution code)
          let bestModel = models[0];
          for (const m of models) {
            if (m.getValue().length > bestModel.getValue().length) {
              bestModel = m;
            }
          }
          return bestModel;
        }
      }
    } catch (e) {
      console.warn("⚠️ AlgoGit: Error accessing Monaco models:", e);
    }
    return null;
  }

  function syncCodeToBridge() {
    try {
      const model = getMonacoModel();
      if (!model) return;

      const code = model.getValue();
      const language = model.getLanguageId() || '';

      let bridge = document.getElementById('algogit-code-bridge');
      if (!bridge) {
        bridge = document.createElement('div');
        bridge.id = 'algogit-code-bridge';
        bridge.style.display = 'none';
        document.documentElement.appendChild(bridge);
      }

      bridge.setAttribute('data-language', language);
      bridge.textContent = code;
    } catch (err) {
      console.warn("⚠️ AlgoGit: Failed to sync code to bridge:", err);
    }
  }

  // Listen for explicit code requests from the isolated content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ALGOGIT_GET_LEETCODE_CODE') {
      syncCodeToBridge();
      const model = getMonacoModel();
      const code = model ? model.getValue() : '';
      const language = model ? model.getLanguageId() : '';

      window.postMessage({
        type: 'ALGOGIT_LEETCODE_CODE_RESPONSE',
        code,
        language
      }, '*');
    }
  });

  // Periodically check and attach change listener once Monaco is available
  let attached = false;
  setInterval(() => {
    const model = getMonacoModel();
    if (model) {
      syncCodeToBridge();
      if (!attached && typeof model.onDidChangeContent === 'function') {
        model.onDidChangeContent(() => syncCodeToBridge());
        attached = true;
      }
    }
  }, 1000);

  // Sync immediately when user clicks (e.g. on Submit button)
  document.addEventListener('click', () => {
    setTimeout(syncCodeToBridge, 50);
  }, true);

  setTimeout(syncCodeToBridge, 1500);
})();
