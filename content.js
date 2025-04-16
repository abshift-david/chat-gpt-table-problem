// This is a content script that runs in the context of web pages
// It helps bridge communication between the extension and the page

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "runTool" && message.toolId) {
    // Implement the CSS fixer directly
    if (message.toolId === "css_fixer") {
      const newClass =
        "pointer-events-none flex justify-center *:pointer-events-auto";

      // Find elements with w-[100cqw] class
      const elements = Array.from(
        document.querySelectorAll("div[class]")
      ).filter((el) => {
        return (
          el.classList.contains("w-[100cqw]") ||
          el.className.includes("w-[100cqw]")
        );
      });

      // Store original classes for potential restoration
      const originalClasses = {};
      elements.forEach((el, index) => {
        originalClasses[`el-${index}`] = el.className;
      });

      // Apply the new class to each element
      elements.forEach((el) => {
        el.className = newClass;
      });

      // Send response back with results
      sendResponse({
        success: true,
        count: elements.length,
        originalClasses: originalClasses,
        message:
          elements.length > 0
            ? `Fixed ${elements.length} table element${
                elements.length !== 1 ? "s" : ""
              }!`
            : "No matching elements found on this page.",
      });

      return true; // Keep the message channel open for the async response
    }

    // Handle restore operation
    if (message.action === "restoreTool" && message.toolId === "css_fixer") {
      const originalClasses = message.originalClasses || {};
      let restoredCount = 0;

      if (Object.keys(originalClasses).length > 0) {
        const newClass =
          "pointer-events-none flex justify-center *:pointer-events-auto";
        const selector = `div.${newClass.split(" ").join(".")}`;
        const elements = document.querySelectorAll(selector);

        Object.values(originalClasses).forEach((className, index) => {
          if (elements[index]) {
            elements[index].className = className;
            restoredCount++;
          }
        });
      }

      sendResponse({
        success: true,
        count: restoredCount,
        message:
          restoredCount > 0
            ? `Restored ${restoredCount} element${
                restoredCount !== 1 ? "s" : ""
              }!`
            : "No elements to restore.",
      });

      return true; // Keep the message channel open for the async response
    }
  }
});
