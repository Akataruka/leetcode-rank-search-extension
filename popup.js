document.getElementById("startSearchBtn").addEventListener("click", () => {
  // Send message to content script in current active tab
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "startSearch"}, response => {
      if (response && response.status === "started") {
        alert("LeetCode user search started!");
      } else {
        alert("Failed to start search. Make sure you are on the LeetCode contest page.");
      }
    });
  });
});
