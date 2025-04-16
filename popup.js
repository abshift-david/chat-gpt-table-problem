// Popup script for Web Page Enhancer

// Initialize the popup when the DOM is ready
document.addEventListener("DOMContentLoaded", initializePopup);

async function initializePopup() {
  // Set up action buttons
  document.getElementById("runBtn").addEventListener("click", runActiveTool);
  document.getElementById("undoBtn").addEventListener("click", undoActiveTool);

  // Get all available tools and the active tool
  const toolsResponse = await sendMessage({ action: "getTools" });
  const activeToolResponse = await sendMessage({ action: "getActiveTool" });

  if (toolsResponse.success && toolsResponse.tools) {
    populateToolSelector(toolsResponse.tools, activeToolResponse.toolId);
  } else {
    showStatus("Error loading tools", "error");
  }

  // Update the UI based on the active tool
  if (activeToolResponse.success && activeToolResponse.toolId) {
    updateToolUI(activeToolResponse.toolId);
  }

  // Listen for tool changes
  document
    .getElementById("toolSelector")
    .addEventListener("change", function (e) {
      const toolId = e.target.value;
      sendMessage({ action: "setActiveTool", toolId: toolId }).then(() =>
        updateToolUI(toolId)
      );
    });
}

// Helper function to send messages to the background script
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, message: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, message: "No response" });
      }
    });
  });
}

// Populate the tool selector dropdown
function populateToolSelector(tools, activeToolId = "css_fixer") {
  const selector = document.getElementById("toolSelector");

  // Clear existing options
  selector.innerHTML = "";

  // Add all available tools
  tools.forEach((tool) => {
    const option = document.createElement("option");
    option.value = tool.id;
    option.textContent = tool.name;
    option.selected = tool.id === activeToolId;
    selector.appendChild(option);
  });
}

// Update the UI based on the selected tool
async function updateToolUI(toolId) {
  // Get tool information
  const toolsResponse = await sendMessage({ action: "getTools" });
  if (!toolsResponse.success || !toolsResponse.tools) return;

  const tool = toolsResponse.tools.find((t) => t.id === toolId);
  if (!tool) return;

  // Update tool description
  document.getElementById("toolDescription").textContent = tool.description;

  // Update undo button state
  const undoBtn = document.getElementById("undoBtn");
  const hasDataResponse = await sendMessage({
    action: "hasToolData",
    toolId: toolId,
  });

  if (hasDataResponse.success) {
    undoBtn.disabled = !hasDataResponse.hasData;
    undoBtn.classList.toggle("disabled", !hasDataResponse.hasData);
  } else {
    undoBtn.disabled = true;
    undoBtn.classList.add("disabled");
  }

  // Clear any existing status
  document.getElementById("status").textContent = "";
  document.getElementById("status").className = "status";
}

// Run the active tool
async function runActiveTool() {
  try {
    const activeToolResponse = await sendMessage({ action: "getActiveTool" });
    if (!activeToolResponse.success || !activeToolResponse.toolId) {
      showStatus("No active tool selected", "error");
      return;
    }

    const toolId = activeToolResponse.toolId;
    const result = await sendMessage({ action: "runTool", toolId: toolId });

    // Show feedback to user
    if (result.success) {
      showStatus(result.message, result.count > 0 ? "success" : "info");
    } else {
      showStatus(result.message || "Error running tool", "error");
    }

    // Update UI in case undo state changed
    updateToolUI(toolId);
  } catch (error) {
    showStatus(`Error: ${error.message}`, "error");
  }
}

// Undo the active tool's actions
async function undoActiveTool() {
  try {
    const activeToolResponse = await sendMessage({ action: "getActiveTool" });
    if (!activeToolResponse.success || !activeToolResponse.toolId) {
      showStatus("No active tool selected", "error");
      return;
    }

    const toolId = activeToolResponse.toolId;
    const result = await sendMessage({ action: "restoreTool", toolId: toolId });

    // Show feedback to user
    if (result.success) {
      showStatus(result.message, result.count > 0 ? "success" : "info");
    } else {
      showStatus(result.message || "Error undoing changes", "error");
    }

    // Update UI in case undo state changed
    updateToolUI(toolId);
  } catch (error) {
    showStatus(`Error: ${error.message}`, "error");
  }
}

// Show status message to the user
function showStatus(message, type = "info") {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = `status ${type}`;

  // Clear status after 3 seconds
  setTimeout(() => {
    status.textContent = "";
    status.className = "status";
  }, 3000);
}
