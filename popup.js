document.getElementById("removeBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: updateDivClasses,
  });
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
