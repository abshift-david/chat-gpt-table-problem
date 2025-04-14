//
chrome.commands.onCommand.addListener((command) => {
  if (command === "trigger-update") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: updateDivClasses,
      });
    });
  }
});

function updateDivClasses() {
  const newClass =
    "pointer-events-none flex justify-center *:pointer-events-auto";

  document.querySelectorAll('[class*="w-[100cqw]"]').forEach((el) => {
    if (el.classList.contains("w-[100cqw]")) {
      el.className = newClass;
    }
  });
}
