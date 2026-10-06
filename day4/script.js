/**
 * Day 4: DOM, Events & Browser Storage
 * Deliverable: Live Character Counter and Dark Mode
 * Engineer: Jesse Vincent
 * Repository: web-foundations-days/day4
 */

// 1. Element Selections
const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

// 2. Storage Keys
const STORAGE_DRAFT_KEY = "quicknotes_day4_draft";
const STORAGE_THEME_KEY = "quicknotes_day4_theme";

/**
 * 3. updateCounts()
 * Calculates character and word metrics, applies status classes (.warning, .over)
 * and reflects real-time totals in the UI.
 */
function updateCounts() {
  const content = noteText.value;
  const numChars = content.length;

  // Word count: splits across sequences of whitespace
  const trimmed = content.trim();
  const numWords = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

  // Update text representation
  charCount.textContent = `${numChars} / 200 characters`;
  wordCount.textContent = `${numWords} words`;

  // Apply state classes based on boundaries
  if (numChars > 200) {
    charCount.classList.remove("warning");
    charCount.classList.add("over");
  } else if (numChars > 180) {
    charCount.classList.remove("over");
    charCount.classList.add("warning");
  } else {
    charCount.classList.remove("warning", "over");
  }
}

/**
 * 4. clearDraft()
 * Resets editor content, cleans local storage, resets counters and returns focus.
 */
function clearDraft() {
  noteText.value = "";
  localStorage.removeItem(STORAGE_DRAFT_KEY);
  updateCounts();
  noteText.focus();
}

/**
 * 5. toggleTheme()
 * Toggles the 'dark' class on <body>, flips button text, and persists state.
 */
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  const activeTheme = isDark ? "dark" : "light";

  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem(STORAGE_THEME_KEY, activeTheme);
}

/**
 * 6. restoreState()
 * Hydrates stored draft and theme selection from localStorage upon page load.
 */
function restoreState() {
  // Theme hydration
  const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark");
    themeToggle.textContent = "Dark mode";
  }

  // Draft text hydration
  const savedDraft = localStorage.getItem(STORAGE_DRAFT_KEY);
  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }

  // Synchronise metrics
  updateCounts();
}

// ==========================================
// EVENT LISTENERS & BINDINGS
// ==========================================

// Real-time keystroke input listener
noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem(STORAGE_DRAFT_KEY, noteText.value);
});

// Clear button trigger
clearBtn.addEventListener("click", clearDraft);

// Keyboard shortcut: Escape key clears the textarea
noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearDraft();
  }
});

// Theme switcher button
themeToggle.addEventListener("click", toggleTheme);

// Initialize application state on DOM ready
restoreState();