/**
 * Day 5: Client-Server, HTTP & APIs
 * Deliverable: User Directory Asynchronous Client
 * Engineer: Jesse Vincent
 * Repository: web-foundations-days/day5
 */

// 1. API Endpoint and State Configuration
const API_URL = "https://jsonplaceholder.typicode.com/users";
let users = [];

// 2. DOM Element References
const loadUsersBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

/**
 * 3. renderUsers()
 * Programmatically constructs user cards using safe DOM methods.
 * Strictly avoids innerHTML on remote data to eliminate XSS risks.
 *
 * @param {Array<Object>} listToRender - Array of user records to display
 */
function renderUsers(listToRender) {
  // Clear previous list nodes safely
  usersList.replaceChildren();

  // Handle empty search results
  if (listToRender.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-message";
    emptyItem.textContent = "No users match your filter.";
    usersList.appendChild(emptyItem);
    statusText.textContent = "No users match your filter.";
    statusText.className = "";
    return;
  }

  // Populate user cards
  listToRender.forEach((user) => {
    const card = document.createElement("li");
    card.className = "user-card";

    // User full name heading
    const nameHeading = document.createElement("h3");
    nameHeading.className = "user-name";
    nameHeading.textContent = user.name;
    card.appendChild(nameHeading);

    // Metadata container
    const infoContainer = document.createElement("div");
    infoContainer.className = "user-info-list";

    // Helper to generate key-value metadata rows
    const createInfoRow = (labelText, valueText, isEmail = false) => {
      const row = document.createElement("div");
      row.className = "info-item";

      const label = document.createElement("span");
      label.className = "info-label";
      label.textContent = labelText;

      const value = document.createElement("span");
      value.className = isEmail ? "info-value email-value" : "info-value";
      value.textContent = valueText;

      row.appendChild(label);
      row.appendChild(value);
      return row;
    };

    // Safely extract nested properties
    const emailValue = user.email || "N/A";
    const cityValue = user.address && user.address.city ? user.address.city : "N/A";
    const companyValue = user.company && user.company.name ? user.company.name : "N/A";

    infoContainer.appendChild(createInfoRow("Email:", emailValue, true));
    infoContainer.appendChild(createInfoRow("City:", cityValue));
    infoContainer.appendChild(createInfoRow("Company:", companyValue));

    card.appendChild(infoContainer);
    usersList.appendChild(card);
  });
}

/**
 * 4. loadUsers()
 * Fetches user records from JSONPlaceholder with try / catch / finally error handling.
 * Updates UI status and disables the load button during transit.
 */
async function loadUsers() {
  statusText.textContent = "Loading users...";
  statusText.className = "loading";
  loadUsersBtn.disabled = true;

  try {
    const response = await fetch(API_URL);

    // Native fetch does not throw on HTTP 4xx or 5xx status codes
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    users = data;
    filterInput.value = "";
    renderUsers(users);
    statusText.textContent = `Loaded ${users.length} users.`;
    statusText.className = "success";
  } catch (error) {
    statusText.textContent = "Could not load users. Please try again.";
    statusText.className = "error";
    console.error("loadUsers network error:", error);
  } finally {
    // Guarantees button re-activation regardless of success or failure
    loadUsersBtn.disabled = false;
  }
}

/**
 * 5. Event Listeners
 * Binds load button clicks and live keyboard filtering.
 */
loadUsersBtn.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  const searchTerm = filterInput.value.trim().toLowerCase();

  // If data has not yet been fetched from the server
  if (users.length === 0) {
    statusText.textContent = "Please load users before filtering.";
    statusText.className = "";
    return;
  }

  // Filter stored in-memory array without triggering new network requests
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );

  renderUsers(filteredUsers);

  if (filteredUsers.length > 0) {
    if (searchTerm === "") {
      statusText.textContent = `Loaded ${users.length} users.`;
    } else {
      statusText.textContent = `Showing ${filteredUsers.length} of ${users.length} users.`;
    }
    statusText.className = "success";
  }
});
