(() => {
  // Add a global stop flag
  window.__stopLeetCodeSearch = false;

  async function findUsersInLeetCodeContest() {
    let userNamesToSearch = []; // Changed from userIds to userNamesToSearch
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
        <div style="font-weight: bold; font-size: 16px; color: black;">🔍 Searching Ranks by Name</div>
        <button id="closeBtn" title="Close" style="background: transparent; border: none; font-weight: bold; font-size: 18px; line-height: 1; color: black; cursor: pointer;">×</button>
      </div>
      <div id="loading-status" style="margin-bottom: 12px; color: #666; font-style: italic;"></div>
      <div id="user-status-list" style="margin-bottom: 12px; max-height: 200px; overflow-y: auto;"></div>
      <button id="rerunBtn" style="width: 100%; background-color: #27ae60; color: white; font-weight: bold; border: none; padding: 10px 0; border-radius: 4px; cursor: pointer; margin-bottom: 8px;">🔄 Search Again</button>
      <button id="stopBtn" style="width: 100%; background-color: #e74c3c; color: white; font-weight: bold; border: none; padding: 10px 0; border-radius: 4px; cursor: pointer;">🛑 STOP</button>
    `;
    document.body.appendChild(dialog);

    const loadingStatus = document.getElementById("loading-status");

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

    async function waitForPageToLoad(pageNumber, timeout = 15000) {
      loadingStatus.textContent = `⏳ Loading page ${pageNumber}...`;
      
      const minExpectedUsersPerPage = 10; // Reduced threshold for more flexibility
      const checkInterval = 300; // Check every 300ms
      const maxAttempts = Math.floor(timeout / checkInterval);
      
      let stableCount = 0;
      let lastCount = 0;
      const requiredStableChecks = 3; // Number of consecutive stable checks required

      for (let i = 0; i < maxAttempts; i++) {
        if (window.__stopLeetCodeSearch) {
          loadingStatus.textContent = "🛑 Stopped";
          return false;
        }

        await delay(checkInterval);
        
        // Check for multiple indicators that the page has loaded
        const nameDivs = document.querySelectorAll('a[href*="/u/"] .truncate');
        const currentCount = nameDivs.length;
        
        // Also check for loading indicators or spinners that might indicate page is still loading
        const isLoading = document.querySelector('.loading, .spinner, [data-loading="true"]') !== null;
        
        console.log(`Page ${pageNumber} check ${i + 1}: Found ${currentCount} users, loading indicator: ${isLoading}`);
        
        // Consider page loaded if:
        // 1. We have enough users AND
        // 2. No loading indicators AND
        // 3. User count has been stable for a few checks
        if (currentCount >= minExpectedUsersPerPage && !isLoading) {
          if (currentCount === lastCount) {
            stableCount++;
            if (stableCount >= requiredStableChecks) {
              console.log(`✅ Page ${pageNumber} fully loaded with ${currentCount} users`);
              loadingStatus.textContent = `✅ Page ${pageNumber} loaded (${currentCount} users)`;
              await delay(500); // Small buffer delay
              return true;
            }
          } else {
            stableCount = 0; // Reset if count changed
          }
          lastCount = currentCount;
        } else {
          stableCount = 0;
          lastCount = currentCount;
        }
        
        // Update loading status periodically
        if (i % 5 === 0) {
          loadingStatus.textContent = `⏳ Loading page ${pageNumber}... (${currentCount} users found)`;
        }
      }
      
      // Final check - if we have some users, proceed anyway
      const finalCount = document.querySelectorAll('a[href*="/u/"] .truncate').length;
      if (finalCount > 0) {
        console.warn(`⚠️ Page ${pageNumber} load timeout, but found ${finalCount} users. Proceeding...`);
        loadingStatus.textContent = `⚠️ Page ${pageNumber} partially loaded (${finalCount} users)`;
        return true;
      }
      
      console.error(`❌ Failed to load page ${pageNumber} after ${timeout/1000} seconds`);
      loadingStatus.textContent = `❌ Failed to load page ${pageNumber}`;
      return false;
    }

    async function goToFirstPage() {
      loadingStatus.textContent = "🔄 Navigating to first page...";
      
      const buttons = Array.from(document.querySelectorAll("button"));
      const firstPageBtn = buttons.find(btn => btn.textContent.trim() === "1");

      if (firstPageBtn && !firstPageBtn.classList.contains("pointer-events-none")) {
        console.log("Clicking first page button...");
        firstPageBtn.click();
        page = 1;
        
        // Wait for the page navigation to complete
        await delay(1000);
        
        const loaded = await waitForPageToLoad(1);
        if (!loaded) {
          console.error("Failed to load first page after navigation. Stopping.");
          loadingStatus.textContent = "❌ Failed to load first page";
          window.__stopLeetCodeSearch = true;
          return false;
        }
      } else {
        console.log("Already on first page or first page button not found.");
        page = 1;
        
        const loaded = await waitForPageToLoad(1);
        if (!loaded) {
          console.error("Failed to load first page (already there). Stopping.");
          loadingStatus.textContent = "❌ Failed to load first page";
          window.__stopLeetCodeSearch = true;
          return false;
        }
      }
      
      return true;
    }

    async function searchAndClickNext() {
      running = true;
      window.__stopLeetCodeSearch = false;

      // Ensure first page is fully loaded before starting search
      const firstPageLoaded = await goToFirstPage();
      
      if (!firstPageLoaded || window.__stopLeetCodeSearch) {
        alert("🛑 Search stopped - could not load first page.");
        running = false;
        return;
      }

      loadingStatus.textContent = "🔍 Starting search...";

      while (!window.__stopLeetCodeSearch) {
        console.log(`🔍 Searching Page ${page}...`);
        loadingStatus.textContent = `🔍 Searching page ${page}...`;

        // Hardcoded selector based on the HTML structure provided
        const nameDivs = Array.from(
          document.querySelectorAll('a[href*="/u/"] .truncate')
        );

        console.log(`Found ${nameDivs.length} name elements on page ${page}`);

        for (const nameToSearch of userNamesToSearch) {
          if (!foundUsers[nameToSearch]) {
            const found = nameDivs.some(div => {
              const displayedName = div.textContent.trim().toLowerCase();
              //Debug console printing
              // console.log(`Comparing displayed name '${displayedName}' with search name '${nameToSearch}'`);
              return displayedName === nameToSearch;
            });
            if (found) {
              foundUsers[nameToSearch] = page;
              const el = document.getElementById(`user-${nameToSearch}`);
              if (el) el.textContent = `${page}`;
              console.log(`✅ Found '${nameToSearch}' on page ${page}`);
            }
          }
        }

        if (Object.keys(foundUsers).length === userNamesToSearch.length) {
          loadingStatus.textContent = "✅ All users found!";
          alert("✅ All users found!");
          break;
        }

        const nextBtn = document.querySelector('button[aria-label="next"]');
        if (!nextBtn || nextBtn.classList.contains("cursor-not-allowed")) {
          loadingStatus.textContent = "🔍 Search complete";
          alert("🔍 Search complete. Some users not found or no more pages.");
          break;
        }

        console.log(`Navigating to page ${page + 1}...`);
        nextBtn.click();
        page++;

        // Wait for the next page to load completely
        const nextPageLoaded = await waitForPageToLoad(page);
        if (!nextPageLoaded && !window.__stopLeetCodeSearch) {
          alert(`⚠️ Could not load page ${page}. Stopping search.`);
          window.__stopLeetCodeSearch = true;
          break;
        }
      }

      if (window.__stopLeetCodeSearch) {
        loadingStatus.textContent = "🛑 Search stopped";
        alert("🛑 Search manually stopped.");
      }

      console.log("🔎 Final Results:", foundUsers);
      running = false;
    }

    function startSearch() {
      const input = prompt("Enter LeetCode User Names (comma-separated):");
      if (!input) return;

      userNamesToSearch = input
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name);

      if (userNamesToSearch.length === 0) {
        alert("⚠️ No valid usernames entered.");
        return;
      }

      foundUsers = {};
      page = 1;
      window.__stopLeetCodeSearch = false;

      const listContainer = document.getElementById("user-status-list");
      listContainer.innerHTML = userNamesToSearch
        .map(
          (name) => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; color: black;">
              <span>${name}</span>
              <div id="user-${name}" style="width: 60px; height: 24px; border: 1px solid #ccc; border-radius: 4px; text-align: center; line-height: 24px; background: #fff; color: black;"></div>
            </div>
          `
        )
        .join("");

      searchAndClickNext();
    }

    startSearch();
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startSearch") {
      findUsersInLeetCodeContest();
      sendResponse({ status: "started" });
    }
  });
})();