// User-Agent Manager & Switcher - Popup Script
// Handles all UI interactions and storage management

console.log("[UA Manager Popup] Script loaded");

// DOM Elements
const elements = {
  // Toggle
  extensionToggle: document.getElementById("extensionToggle"),
  statusBadge: document.getElementById("statusBadge"),

  // Status
  status: document.getElementById("status"),

  // Tabs
  tabs: document.querySelectorAll(".tab"),
  tabContents: document.querySelectorAll(".tab-content"),

  // Switcher Tab
  userAgentSelect: document.getElementById("userAgentSelect"),
  applyBtn: document.getElementById("applyBtn"),
  resetBtn: document.getElementById("resetBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  currentUAName: document.getElementById("currentUAName"),
  currentUAValue: document.getElementById("currentUAValue"),
  copyCurrentBtn: document.getElementById("copyCurrentBtn"),
  refreshBtn: document.getElementById("refreshBtn"),

  // Manager Tab
  customUAName: document.getElementById("customUAName"),
  customUAValue: document.getElementById("customUAValue"),
  addCustomUABtn: document.getElementById("addCustomUABtn"),
  userAgentList: document.getElementById("userAgentList"),

  // Settings Tab
  domainRules: document.getElementById("domainRules"),
  addDomainRuleBtn: document.getElementById("addDomainRuleBtn"),
  autoApplyToggle: document.getElementById("autoApplyToggle"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  resetAllBtn: document.getElementById("resetAllBtn"),
};

// Default User-Agents
const DEFAULT_USER_AGENTS = {
  chrome_latest: {
    name: "🌐 Chrome Latest",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  edge_latest: {
    name: "🌐 Edge Latest",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  },
  firefox_latest: {
    name: "🦊 Firefox Latest",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  },
  electron_11: {
    name: "⚡ Electron 11",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Electron/11.2.0 Safari/537.36",
  },
  electron_13: {
    name: "⚡ Electron 13",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Electron/13.0.0 Safari/537.36",
  },
  electron_15: {
    name: "⚡ Electron 15",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Electron/15.0.0 Safari/537.36",
  },
};

// Initialize popup
async function init() {
  console.log("[UA Manager Popup] Initializing...");

  try {
    await loadSettings();
    await populateUserAgentSelect();
    await loadUserAgentList();
    await loadDomainRules();
    setupEventListeners();

    console.log("[UA Manager Popup] Initialized successfully");
  } catch (error) {
    console.error("[UA Manager Popup] Initialization error:", error);
    showStatus("Error initializing extension: " + error.message, "error");
  }
}

// Load settings from storage
async function loadSettings() {
  const data = await chrome.storage.local.get([
    "enabled",
    "activeUA",
    "userAgents",
    "customUserAgents",
    "autoApply",
    "domainRules",
  ]);

  // Set extension toggle
  elements.extensionToggle.checked = data.enabled !== false;
  updateStatusBadge(data.enabled !== false);

  // Set auto-apply toggle
  elements.autoApplyToggle.checked = data.autoApply !== false;

  // Update current UA display
  await updateCurrentUADisplay();
}

// Update current UA display
async function updateCurrentUADisplay() {
  const data = await chrome.storage.local.get([
    "activeUA",
    "userAgents",
    "customUserAgents",
  ]);

  const uaKey = data.activeUA || "chrome_latest";
  const allUAs = { ...DEFAULT_USER_AGENTS, ...data.customUserAgents };

  if (allUAs[uaKey]) {
    elements.currentUAName.textContent = allUAs[uaKey].name || uaKey;
    elements.currentUAValue.textContent = allUAs[uaKey].value || allUAs[uaKey];
  } else {
    elements.currentUAName.textContent = "Unknown";
    elements.currentUAValue.textContent = "No User-Agent set";
  }
}

// Populate User-Agent select dropdown
async function populateUserAgentSelect() {
  const data = await chrome.storage.local.get(["customUserAgents", "activeUA"]);
  const allUAs = { ...DEFAULT_USER_AGENTS, ...data.customUserAgents };

  elements.userAgentSelect.innerHTML =
    '<option value="">-- Select User-Agent --</option>';

  for (const [key, ua] of Object.entries(allUAs)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = ua.name || key;

    if (key === data.activeUA) {
      option.selected = true;
    }

    elements.userAgentSelect.appendChild(option);
  }
}

// Load User-Agent list in Manager tab
async function loadUserAgentList() {
  const data = await chrome.storage.local.get(["customUserAgents", "activeUA"]);
  const allUAs = { ...DEFAULT_USER_AGENTS, ...data.customUserAgents };

  if (Object.keys(allUAs).length === 0) {
    elements.userAgentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-text">No User-Agents saved yet</div>
      </div>
    `;
    return;
  }

  elements.userAgentList.innerHTML = "";

  for (const [key, ua] of Object.entries(allUAs)) {
    const item = createUserAgentItem(key, ua, data.activeUA === key);
    elements.userAgentList.appendChild(item);
  }
}

// Create User-Agent item element
function createUserAgentItem(key, ua, isActive) {
  const item = document.createElement("div");
  item.className = "ua-item" + (isActive ? " active" : "");

  const isDefault = DEFAULT_USER_AGENTS.hasOwnProperty(key);
  const uaName = ua.name || key;
  const uaValue = ua.value || ua;

  item.innerHTML = `
    <div class="ua-item-info">
      <div class="ua-item-name">
        ${uaName}
        ${isActive ? '<span class="badge badge-success">Active</span>' : ""}
        ${isDefault ? '<span class="badge badge-primary">Preset</span>' : ""}
      </div>
      <div class="ua-item-value">${truncateString(uaValue, 80)}</div>
    </div>
    <div class="ua-item-actions">
      <button class="btn-small ${isActive ? "active" : "inactive"}" data-action="activate" data-key="${key}">
        ${isActive ? "✓" : "Use"}
      </button>
      ${!isDefault ? `<button class="btn-small delete" data-action="delete" data-key="${key}">🗑️</button>` : ""}
    </div>
  `;

  // Add event listeners
  item.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", handleUserAgentAction);
  });

  return item;
}

// Handle User-Agent item actions
async function handleUserAgentAction(e) {
  const action = e.target.dataset.action;
  const key = e.target.dataset.key;

  if (action === "activate") {
    await activateUserAgent(key);
  } else if (action === "delete") {
    await deleteUserAgent(key);
  }
}

// Activate User-Agent
async function activateUserAgent(key) {
  try {
    const data = await chrome.storage.local.get([
      "customUserAgents",
      "domainRules",
    ]);
    const allUAs = { ...DEFAULT_USER_AGENTS, ...data.customUserAgents };

    if (!allUAs[key]) {
      throw new Error("User-Agent not found");
    }

    const ua = allUAs[key];
    const userAgent = ua.value || ua;

    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: "applyUserAgent",
      data: {
        uaKey: key,
        userAgent: userAgent,
        domainRules: data.domainRules || {},
      },
    });

    if (response.success) {
      await chrome.storage.local.set({ activeUA: key });
      await updateCurrentUADisplay();
      await loadUserAgentList();
      await populateUserAgentSelect();
      showStatus("✓ User-Agent activated successfully!", "success");
    } else {
      throw new Error(response.error || "Unknown error");
    }
  } catch (error) {
    console.error("[UA Manager Popup] Error activating UA:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Delete User-Agent
async function deleteUserAgent(key) {
  if (!confirm(`Delete User-Agent "${key}"?`)) {
    return;
  }

  try {
    const data = await chrome.storage.local.get([
      "customUserAgents",
      "activeUA",
    ]);

    if (data.customUserAgents && data.customUserAgents[key]) {
      delete data.customUserAgents[key];
      await chrome.storage.local.set({
        customUserAgents: data.customUserAgents,
      });

      // If deleted UA was active, switch to default
      if (data.activeUA === key) {
        await activateUserAgent("chrome_latest");
      }

      await loadUserAgentList();
      await populateUserAgentSelect();
      showStatus("✓ User-Agent deleted successfully!", "success");
    }
  } catch (error) {
    console.error("[UA Manager Popup] Error deleting UA:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Load domain rules
async function loadDomainRules() {
  const data = await chrome.storage.local.get([
    "domainRules",
    "customUserAgents",
  ]);
  const rules = data.domainRules || {};
  const allUAs = { ...DEFAULT_USER_AGENTS, ...data.customUserAgents };

  elements.domainRules.innerHTML = "";

  for (const [domain, uaKey] of Object.entries(rules)) {
    const ruleItem = createDomainRuleItem(domain, uaKey, allUAs);
    elements.domainRules.appendChild(ruleItem);
  }

  if (Object.keys(rules).length === 0) {
    elements.domainRules.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌐</div>
        <div class="empty-state-text">No domain rules set</div>
      </div>
    `;
  }
}

// Create domain rule item
function createDomainRuleItem(domain, uaKey, allUAs) {
  const item = document.createElement("div");
  item.className = "domain-rule-item";

  item.innerHTML = `
    <input type="text" value="${domain}" placeholder="domain.com" data-domain="${domain}" />
    <select data-domain="${domain}">
      ${Object.entries(allUAs)
        .map(
          ([key, ua]) =>
            `<option value="${key}" ${key === uaKey ? "selected" : ""}>${ua.name || key}</option>`,
        )
        .join("")}
    </select>
    <button class="btn btn-danger btn-icon" data-action="remove-rule" data-domain="${domain}">🗑️</button>
  `;

  // Add event listeners
  item
    .querySelector("input")
    .addEventListener("change", handleDomainRuleChange);
  item
    .querySelector("select")
    .addEventListener("change", handleDomainRuleChange);
  item
    .querySelector("button")
    .addEventListener("click", handleRemoveDomainRule);

  return item;
}

// Handle domain rule change
async function handleDomainRuleChange(e) {
  try {
    const oldDomain = e.target.dataset.domain;
    const parent = e.target.parentElement;
    const newDomain = parent.querySelector("input").value.trim();
    const newUAKey = parent.querySelector("select").value;

    if (!newDomain) {
      showStatus("Domain cannot be empty", "error");
      return;
    }

    const data = await chrome.storage.local.get(["domainRules"]);
    const rules = data.domainRules || {};

    // Remove old domain if changed
    if (oldDomain !== newDomain && rules[oldDomain]) {
      delete rules[oldDomain];
    }

    // Add/update new domain
    rules[newDomain] = newUAKey;

    await chrome.storage.local.set({ domainRules: rules });

    // Update data-domain attribute
    parent.querySelectorAll("[data-domain]").forEach((el) => {
      el.dataset.domain = newDomain;
    });

    showStatus("✓ Domain rule updated!", "success");

    // Reapply User-Agent
    await reapplyUserAgent();
  } catch (error) {
    console.error("[UA Manager Popup] Error updating domain rule:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Handle remove domain rule
async function handleRemoveDomainRule(e) {
  const domain = e.target.dataset.domain;

  if (!confirm(`Remove domain rule for "${domain}"?`)) {
    return;
  }

  try {
    const data = await chrome.storage.local.get(["domainRules"]);
    const rules = data.domainRules || {};

    if (rules[domain]) {
      delete rules[domain];
      await chrome.storage.local.set({ domainRules: rules });
      await loadDomainRules();
      showStatus("✓ Domain rule removed!", "success");

      // Reapply User-Agent
      await reapplyUserAgent();
    }
  } catch (error) {
    console.error("[UA Manager Popup] Error removing domain rule:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Reapply current User-Agent
async function reapplyUserAgent() {
  const data = await chrome.storage.local.get(["activeUA"]);
  if (data.activeUA) {
    await activateUserAgent(data.activeUA);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Extension toggle
  elements.extensionToggle.addEventListener("change", handleExtensionToggle);

  // Apply button
  elements.applyBtn.addEventListener("click", handleApplyButton);

  // Reset button
  elements.resetBtn.addEventListener("click", handleResetButton);

  // Fullscreen button
  elements.fullscreenBtn.addEventListener("click", handleFullscreenButton);

  // Copy current UA
  elements.copyCurrentBtn.addEventListener("click", handleCopyCurrentUA);

  // Refresh button
  elements.refreshBtn.addEventListener("click", handleRefreshRules);

  // Add custom UA
  elements.addCustomUABtn.addEventListener("click", handleAddCustomUA);

  // Add domain rule
  elements.addDomainRuleBtn.addEventListener("click", handleAddDomainRule);

  // Auto-apply toggle
  elements.autoApplyToggle.addEventListener("change", handleAutoApplyToggle);

  // Export
  elements.exportBtn.addEventListener("click", handleExport);

  // Import
  elements.importBtn.addEventListener("click", () =>
    elements.importFile.click(),
  );
  elements.importFile.addEventListener("change", handleImport);

  // Reset all
  elements.resetAllBtn.addEventListener("click", handleResetAll);
}

// Switch tab
function switchTab(tabName) {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  elements.tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === tabName);
  });
}

// Handle extension toggle
async function handleExtensionToggle(e) {
  const enabled = e.target.checked;

  try {
    await chrome.storage.local.set({ enabled });
    updateStatusBadge(enabled);

    if (enabled) {
      await chrome.runtime.sendMessage({ action: "enable" });
      showStatus("✓ Extension enabled!", "success");
    } else {
      await chrome.runtime.sendMessage({ action: "disable" });
      showStatus("Extension disabled", "info");
    }
  } catch (error) {
    console.error("[UA Manager Popup] Error toggling extension:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Update status badge
function updateStatusBadge(enabled) {
  if (enabled) {
    elements.statusBadge.textContent = "ENABLED";
    elements.statusBadge.className = "badge badge-success";
  } else {
    elements.statusBadge.textContent = "DISABLED";
    elements.statusBadge.className = "badge badge-warning";
  }
}

// Handle apply button
async function handleApplyButton() {
  const selectedUA = elements.userAgentSelect.value;

  if (!selectedUA) {
    showStatus("Please select a User-Agent first!", "error");
    return;
  }

  await activateUserAgent(selectedUA);
}

// Handle reset button
async function handleResetButton() {
  await activateUserAgent("chrome_latest");
}

// Handle Fullscreen button
async function handleFullscreenButton() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.windowId) {
      await chrome.windows.update(activeTab.windowId, { state: "fullscreen" });
      showStatus("✓ Entered fullscreen mode!", "success");
    } else {
      throw new Error("Could not find active tab or window ID.");
    }
  } catch (error) {
    console.error("[UA Manager Popup] Error entering fullscreen:", error);
    showStatus("Error entering fullscreen: " + error.message, "error");
  }
}

// Handle copy current UA
async function handleCopyCurrentUA() {
  try {
    const uaValue = elements.currentUAValue.textContent;
    await navigator.clipboard.writeText(uaValue);
    showStatus("✓ User-Agent copied to clipboard!", "success");
  } catch (error) {
    console.error("[UA Manager Popup] Error copying UA:", error);
    showStatus("Error copying: " + error.message, "error");
  }
}

// Handle refresh rules
async function handleRefreshRules() {
  try {
    await reapplyUserAgent();
    showStatus("✓ Rules refreshed!", "success");
  } catch (error) {
    console.error("[UA Manager Popup] Error refreshing rules:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Handle add custom UA
async function handleAddCustomUA() {
  const name = elements.customUAName.value.trim();
  const value = elements.customUAValue.value.trim();

  if (!name || !value) {
    showStatus("Please fill in both name and User-Agent string!", "error");
    return;
  }

  try {
    const data = await chrome.storage.local.get(["customUserAgents"]);
    const customUAs = data.customUserAgents || {};

    // Generate key from name
    const key = "custom_" + name.toLowerCase().replace(/\s+/g, "_");

    customUAs[key] = { name, value };

    await chrome.storage.local.set({ customUserAgents: customUAs });

    // Clear inputs
    elements.customUAName.value = "";
    elements.customUAValue.value = "";

    // Reload lists
    await loadUserAgentList();
    await populateUserAgentSelect();

    showStatus("✓ Custom User-Agent added successfully!", "success");
  } catch (error) {
    console.error("[UA Manager Popup] Error adding custom UA:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Handle add domain rule
async function handleAddDomainRule() {
  try {
    const data = await chrome.storage.local.get(["domainRules"]);
    const rules = data.domainRules || {};

    // Add empty rule
    rules["example.com"] = "chrome_latest";

    await chrome.storage.local.set({ domainRules: rules });
    await loadDomainRules();

    showStatus("✓ Domain rule added! Edit the domain and UA.", "info");
  } catch (error) {
    console.error("[UA Manager Popup] Error adding domain rule:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Handle auto-apply toggle
async function handleAutoApplyToggle(e) {
  try {
    await chrome.storage.local.set({ autoApply: e.target.checked });
    showStatus("✓ Auto-apply setting saved!", "success");
  } catch (error) {
    console.error("[UA Manager Popup] Error saving auto-apply:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Handle export
async function handleExport() {
  try {
    const data = await chrome.storage.local.get(null);
    const exportData = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      data: data,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `ua-manager-settings-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showStatus("✓ Settings exported successfully!", "success");
  } catch (error) {
    console.error("[UA Manager Popup] Error exporting:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Handle import
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const importData = JSON.parse(text);

    if (!importData.data) {
      throw new Error("Invalid import file format");
    }

    if (!confirm("Import settings? This will overwrite current settings.")) {
      return;
    }

    await chrome.storage.local.set(importData.data);

    // Reload UI
    await init();

    showStatus("✓ Settings imported successfully!", "success");
  } catch (error) {
    console.error("[UA Manager Popup] Error importing:", error);
    showStatus("Error: " + error.message, "error");
  }

  // Reset file input
  e.target.value = "";
}

// Handle reset all
async function handleResetAll() {
  if (!confirm("Reset ALL settings to default? This cannot be undone!")) {
    return;
  }

  try {
    await chrome.storage.local.clear();
    await chrome.runtime.sendMessage({ action: "disable" });

    // Reinitialize
    await init();

    showStatus("✓ All settings reset to default!", "success");
  } catch (error) {
    console.error("[UA Manager Popup] Error resetting:", error);
    showStatus("Error: " + error.message, "error");
  }
}

// Show status message
function showStatus(message, type = "info") {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  elements.status.style.display = "block";

  setTimeout(() => {
    elements.status.style.display = "none";
  }, 5000);
}

// Utility: Truncate string
function truncateString(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

// Initialize on load
document.addEventListener("DOMContentLoaded", init);
