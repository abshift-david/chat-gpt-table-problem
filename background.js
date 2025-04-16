// Background service worker for the Web Page Enhancer extension

// Store tool information and state
const WebEnhancer = {
  // Constants
  STORAGE_KEY: "enhancer_data",

  // Available tools
  tools: {
    css_fixer: {
      id: "css_fixer",
      name: "CSS Table Fixer",
      description: "Fixes table layout issues by updating class attributes",
    },
    // Additional tools can be added here
  },

  // Get the active tool ID from storage
  getActiveTool: async function () {
    return new Promise((resolve) => {
      chrome.storage.local.get(["active_tool"], (result) => {
        resolve(result.active_tool || "css_fixer"); // Default to css_fixer
      });
    });
  },

  // Set the active tool
  setActiveTool: function (toolId) {
    return chrome.storage.local.set({ active_tool: toolId });
  },

  // Run a tool on the active tab
  runTool: async function (toolId) {
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0)
      return { success: false, message: "No active tab" };

    // Get saved data for potential restoration
    const data = await chrome.storage.local.get([this.STORAGE_KEY]);
    const enhancerData = data[this.STORAGE_KEY] || {};

    // Send message to content script
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: "runTool",
          toolId: toolId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              message:
                "Could not connect to page: " +
                chrome.runtime.lastError.message,
            });
            return;
          }

          // If we got original classes back, save them
          if (response && response.success && response.originalClasses) {
            const toolData = {
              timestamp: Date.now(),
              originalClasses: response.originalClasses,
            };

            enhancerData[toolId] = toolData;
            chrome.storage.local.set({ [this.STORAGE_KEY]: enhancerData });
          }

          resolve(
            response || { success: false, message: "No response from page" }
          );
        }
      );
    });
  },

  // Restore previous state for a tool
  restoreTool: async function (toolId) {
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0)
      return { success: false, message: "No active tab" };

    // Get saved data for restoration
    const data = await chrome.storage.local.get([this.STORAGE_KEY]);
    const enhancerData = data[this.STORAGE_KEY] || {};
    const toolData = enhancerData[toolId] || {};

    if (!toolData.originalClasses) {
      return { success: false, message: "No data to restore" };
    }

    // Send message to content script with the original classes
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: "restoreTool",
          toolId: toolId,
          originalClasses: toolData.originalClasses,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              message:
                "Could not connect to page: " +
                chrome.runtime.lastError.message,
            });
            return;
          }

          // Clear stored data if restoration was successful
          if (response && response.success && response.count > 0) {
            delete enhancerData[toolId];
            chrome.storage.local.set({ [this.STORAGE_KEY]: enhancerData });
          }

          resolve(
            response || { success: false, message: "No response from page" }
          );
        }
      );
    });
  },

  // Check if a tool has stored data
  hasToolData: async function (toolId) {
    const data = await chrome.storage.local.get([this.STORAGE_KEY]);
    const enhancerData = data[this.STORAGE_KEY] || {};
    const toolData = enhancerData[toolId] || {};

    return !!(
      toolData.originalClasses &&
      Object.keys(toolData.originalClasses).length > 0
    );
  },
};

// Listen for keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "run-active-tool") {
    try {
      const activeToolId = await WebEnhancer.getActiveTool();
      const result = await WebEnhancer.runTool(activeToolId);

      console.log("Tool execution result:", result);

      // Could add notification here
    } catch (error) {
      console.error("Error executing tool:", error);
    }
  }
});

// Optional: Listen for installation to set up initial state
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set default active tool
    WebEnhancer.setActiveTool("css_fixer");

    // Initialize storage structure
    chrome.storage.local.set({ [WebEnhancer.STORAGE_KEY]: {} });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getTools") {
    sendResponse({
      tools: Object.values(WebEnhancer.tools),
      success: true,
    });
    return true;
  }

  if (message.action === "getActiveTool") {
    WebEnhancer.getActiveTool().then((toolId) => {
      sendResponse({
        toolId: toolId,
        success: true,
      });
    });
    return true; // Keep the message channel open for the async response
  }

  if (message.action === "setActiveTool" && message.toolId) {
    WebEnhancer.setActiveTool(message.toolId).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === "runTool" && message.toolId) {
    WebEnhancer.runTool(message.toolId).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === "restoreTool" && message.toolId) {
    WebEnhancer.restoreTool(message.toolId).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === "hasToolData" && message.toolId) {
    WebEnhancer.hasToolData(message.toolId).then((hasData) => {
      sendResponse({
        hasData: hasData,
        success: true,
      });
    });
    return true;
  }
});
