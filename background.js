// background.js
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'https://rizqiahsansetiawan.ct.ws/ext/welcome.html' });
    }
});

// Background Service Worker untuk User-Agent Manager & Switcher
// Handles dynamic rule updates dan User-Agent switching

console.log('[UA Manager] Background service worker started');

// Default User-Agents presets
const DEFAULT_USER_AGENTS = {
  'chrome_latest': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'edge_latest': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'firefox_latest': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'electron_11': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Electron/11.2.0 Safari/537.36',
  'electron_13': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Electron/13.0.0 Safari/537.36',
  'electron_15': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Electron/15.0.0 Safari/537.36'
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[UA Manager] Extension installed/updated:', details.reason);

  // Initialize storage with defaults if first install
  if (details.reason === 'install') {
    await initializeStorage();
  }

  // Load and apply saved User-Agent
  await loadAndApplyUserAgent();
});

// Initialize storage with default values
async function initializeStorage() {
  const defaultData = {
    userAgents: DEFAULT_USER_AGENTS,
    activeUA: 'chrome_latest',
    customUserAgents: {},
    domainRules: {},
    autoApply: true,
    enabled: true
  };

  await chrome.storage.local.set(defaultData);
  console.log('[UA Manager] Storage initialized with defaults');
}

// Load and apply saved User-Agent
async function loadAndApplyUserAgent() {
  try {
    const data = await chrome.storage.local.get(['activeUA', 'userAgents', 'customUserAgents', 'enabled', 'domainRules']);

    if (!data.enabled) {
      console.log('[UA Manager] Extension is disabled');
      await clearAllRules();
      return;
    }

    const allUserAgents = { ...DEFAULT_USER_AGENTS, ...data.userAgents, ...data.customUserAgents };
    const userAgent = allUserAgents[data.activeUA] || DEFAULT_USER_AGENTS.chrome_latest;

    console.log('[UA Manager] Applying User-Agent:', data.activeUA);
    await applyUserAgent(userAgent, data.domainRules || {});

  } catch (error) {
    console.error('[UA Manager] Error loading User-Agent:', error);
  }
}

// Apply User-Agent via declarativeNetRequest
async function applyUserAgent(userAgent, domainRules = {}) {
  try {
    // Remove all existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);

    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }

    // Create new rules
    const newRules = [];
    let ruleId = 1;

    // Rule for all URLs (global)
    newRules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          {
            header: "User-Agent",
            operation: "set",
            value: userAgent
          }
        ]
      },
      condition: {
        urlFilter: "*://*/*",
        resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "script", "image", "stylesheet"]
      }
    });

    // Add domain-specific rules with higher priority
    for (const [domain, uaKey] of Object.entries(domainRules)) {
      const data = await chrome.storage.local.get(['userAgents', 'customUserAgents']);
      const allUserAgents = { ...DEFAULT_USER_AGENTS, ...data.userAgents, ...data.customUserAgents };
      const domainUA = allUserAgents[uaKey] || userAgent;

      newRules.push({
        id: ruleId++,
        priority: 10,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "User-Agent",
              operation: "set",
              value: domainUA
            }
          ]
        },
        condition: {
          urlFilter: `*://${domain}/*`,
          resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "script", "image", "stylesheet"]
        }
      });
    }

    // Apply new rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: newRules
    });

    console.log('[UA Manager] User-Agent rules applied successfully. Total rules:', newRules.length);

  } catch (error) {
    console.error('[UA Manager] Error applying User-Agent:', error);
    throw error;
  }
}

// Clear all User-Agent rules
async function clearAllRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);

    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
      console.log('[UA Manager] All rules cleared');
    }
  } catch (error) {
    console.error('[UA Manager] Error clearing rules:', error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[UA Manager] Message received:', message.action);

  if (message.action === 'applyUserAgent') {
    handleApplyUserAgent(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'disable') {
    clearAllRules()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'enable') {
    loadAndApplyUserAgent()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'getCurrentUA') {
    handleGetCurrentUA()
      .then(ua => sendResponse({ success: true, userAgent: ua }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle apply User-Agent message
async function handleApplyUserAgent(data) {
  try {
    const { uaKey, userAgent, domainRules } = data;

    // Update storage
    await chrome.storage.local.set({
      activeUA: uaKey,
      enabled: true
    });

    // Apply User-Agent
    await applyUserAgent(userAgent, domainRules || {});

    console.log('[UA Manager] User-Agent applied:', uaKey);
  } catch (error) {
    console.error('[UA Manager] Error in handleApplyUserAgent:', error);
    throw error;
  }
}

// Get current User-Agent
async function handleGetCurrentUA() {
  try {
    const data = await chrome.storage.local.get(['activeUA', 'userAgents', 'customUserAgents']);
    const allUserAgents = { ...DEFAULT_USER_AGENTS, ...data.userAgents, ...data.customUserAgents };
    return allUserAgents[data.activeUA] || DEFAULT_USER_AGENTS.chrome_latest;
  } catch (error) {
    console.error('[UA Manager] Error getting current UA:', error);
    throw error;
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    console.log('[UA Manager] Storage changed:', Object.keys(changes));

    // Reload and apply if relevant settings changed
    if (changes.activeUA || changes.enabled || changes.domainRules) {
      loadAndApplyUserAgent();
    }
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('[UA Manager] Browser started, loading User-Agent');
  loadAndApplyUserAgent();
});

// Export for testing (optional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    applyUserAgent,
    clearAllRules,
    DEFAULT_USER_AGENTS
  };
}
