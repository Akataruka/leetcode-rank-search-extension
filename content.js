(() => {
  // Add a global stop flag
  window.__stopLeetCodeSearch = false;

  async function findUsersInLeetCodeContest() {
    let userIds = [];
    let foundUsers = {};
    let page = 1;
    let running = false;

    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    const existingDialog = document.getElementById("leetcode-search-dialog");
    if (existingDialog) existingDialog.remove();

    const dialog = document.createElement("div");
    dialog.id = "leetcode-search-dialog";
    dialog.style.position = "fixed";
    dialog.style.top = "10px";
    dialog.style.right = "10px";
    dialog.style.padding = "16px";
    dialog.style.backgroundColor = "#f9f9f9";
    dialog.style.border = "1px solid #ccc";
    dialog.style.borderRadius = "8px";
    dialog.style.zIndex = 9999;
    dialog.style.fontSize = "14px";
    dialog.style.width = "270px";
    dialog.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
    dialog.style.color = "black";
    dialog.style.userSelect = "none";

    dialog.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="font-weight: bold; font-size: 16px; color: black;">🔍 Searching Ranks</div>
        <button id="closeBtn" title="Close" style="background: transparent; border: none; font-weight: bold; font-size: 18px; line-height: 1; color: black; cursor: pointer;">×</button>
      </div>
      <div id="user-status-list" style="margin-bottom: 12px; max-height: 200px; overflow-y: auto;"></div>
      <button id="rerunBtn" style="width: 100%; background-color: #27ae60; color: white; font-weight: bold; border: none; padding: 10px 0; border-radius: 4px; cursor: pointer; margin-bottom: 8px;">🔄 Search Again</button>
      <button id="stopBtn" style="width: 100%; background-color: #e74c3c; color: white; font-weight: bold; border: none; padding: 10px 0; border-radius: 4px; cursor: pointer;">🛑 STOP</button>
    `;
    document.body.appendChild(dialog);

    document.getElementById("closeBtn").addEventListener("click", () => {
      dialog.remove();
      window.__stopLeetCodeSearch = true;
    });

    document.getElementById("stopBtn").addEventListener("click", () => {
      window.__stopLeetCodeSearch = true;
    });

    document.getElementById("rerunBtn").addEventListener("click", () => {
      if (running) {
        alert("⚠️ Search already running. Please stop it first.");
        return;
      }
      startSearch();
    });

    async function waitForPageChange(oldHtml) {
      for (let i = 0; i < 20; i++) {
        await delay(200);
        if (document.documentElement.innerHTML !== oldHtml) break;
      }
    }

    async function goToFirstPage() {
      const buttons = Array.from(document.querySelectorAll("button"));
      const firstPageBtn = buttons.find(btn => btn.textContent.trim() === "1");

      if (firstPageBtn && !firstPageBtn.classList.contains("pointer-events-none")) {
        console.log("Going to first page...");
        const oldHtml = document.documentElement.innerHTML;
        firstPageBtn.click();
        await waitForPageChange(oldHtml);
        await delay(1000);
        page = 1;
        console.log("On first page now.");
      } else {
        console.log("Already on first page or button not found.");
        page = 1;
      }
    }

    async function searchAndClickNext() {
      running = true;
      window.__stopLeetCodeSearch = false;

      await goToFirstPage();

      while (!window.__stopLeetCodeSearch) {
        console.log(`🔍 Searching Page ${page}...`);

        const nameDivs = Array.from(
          document.querySelectorAll("a[href^='/u/'] div.truncate")
        );

        for (const id of userIds) {
          if (!foundUsers[id]) {
            const found = nameDivs.some(div =>
              div.textContent.trim().toLowerCase() === id
            );
            if (found) {
              foundUsers[id] = page;
              const el = document.getElementById(`user-${id}`);
              if (el) el.textContent = `${page}`;
              console.log(`✅ Found '${id}' on page ${page}`);
            }
          }
        }

        if (Object.keys(foundUsers).length === userIds.length) {
          alert("✅ All users found!");
          break;
        }

        const nextBtn = document.querySelector('button[aria-label="next"]');
        if (!nextBtn || nextBtn.classList.contains("cursor-not-allowed")) {
          alert("🔍 Search complete. Some users not found.");
          break;
        }

        const oldHtml = document.documentElement.innerHTML;
        nextBtn.click();
        page++;
        await waitForPageChange(oldHtml);
        await delay(1000);
      }

      if (window.__stopLeetCodeSearch) {
        alert("🛑 Search manually stopped.");
      }

      console.log("🔎 Final Results:", foundUsers);
      running = false;
    }

    function startSearch() {
      const input = prompt("Enter LeetCode User IDs (comma-separated):");
      if (!input) return;

      userIds = input
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter((id) => id);

      foundUsers = {};
      page = 1;
      window.__stopLeetCodeSearch = false;

      const listContainer = document.getElementById("user-status-list");
      listContainer.innerHTML = userIds
        .map(
          (id) => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; color: black;">
              <span>${id}</span>
              <div id="user-${id}" style="width: 60px; height: 24px; border: 1px solid #ccc; border-radius: 4px; text-align: center; line-height: 24px; background: #fff; color: black;"></div>
            </div>
          `
        )
        .join("");

      searchAndClickNext();
    }

    // Start immediately
    startSearch();
  }

  // Listen for message from popup.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startSearch") {
      findUsersInLeetCodeContest();
      sendResponse({ status: "started" });
    }
  });
})();
