/**
 * Day 3: JavaScript Fundamentals - Notes Toolkit
 * Lead Engineer: Jesse Vincent
 * Repository: web-foundations-days/day3
 */

// Starting Dataset
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

/**
 * 1. searchNotes(word)
 * Returns an array of notes whose text contains word, case-insensitive.
 */
function searchNotes(word) {
  if (typeof word !== "string" || word.trim() === "") {
    return [];
  }
  const query = word.trim().toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(query));
}

/**
 * 2. longestNote()
 * Returns the note object with the most characters in text, or null if empty.
 */
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  return notes.reduce((longest, current) => {
    return current.text.length > longest.text.length ? current : longest;
  }, notes[0]);
}

/**
 * 3. countByCategory()
 * Returns an object counting total notes grouped by category.
 */
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    const cat = note.category;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

/**
 * 4. getSummary()
 * Returns a formatted summary string with singular/plural noun agreement.
 */
function getSummary() {
  const total = notes.length;
  if (total === 0) {
    return "0 notes: 0 personal, 0 work, 0 study.";
  }
  const noun = total === 1 ? "note" : "notes";
  const counts = countByCategory();
  const personalCount = counts.personal || 0;
  const workCount = counts.work || 0;
  const studyCount = counts.study || 0;

  return `${total} ${noun}: ${personalCount} personal, ${workCount} work, ${studyCount} study.`;
}

/**
 * 5. isDuplicate(text, notesList)
 * Returns true if a note with identical text exists (ignoring case and whitespace).
 * Accepts an optional target collection to maintain function isolation.
 */
function isDuplicate(text, notesList = notes) {
  if (typeof text !== "string" || !Array.isArray(notesList)) {
    return false;
  }
  const cleaned = text.trim().toLowerCase();
  return notesList.some((note) => note.text.trim().toLowerCase() === cleaned);
}

/**
 * 6. addNote(config)
 * Configuration Object Pattern:
 * Accepts a config object: { text, category, targetArray }
 * Gracefully supports positional fallback: (text, category)
 * Returns true on success, false on validation failure.
 */
function addNote(config, categoryFallback) {
  let text;
  let category;
  let notesList;

  if (typeof config === "object" && config !== null) {
    // Primary Configuration Object Pattern
    text = config.text;
    category = config.category;
    notesList = Array.isArray(config.targetArray) ? config.targetArray : notes;
  } else {
    // Positional fallback for backward compatibility
    text = config;
    category = categoryFallback;
    notesList = notes;
  }

  const validCategories = ["personal", "work", "study"];

  if (typeof text !== "string") {
    console.log("Rejection: Text input must be a string.");
    return false;
  }

  const cleanedText = text.trim();

  if (cleanedText.length < 1 || cleanedText.length > 200) {
    console.log("Rejection: Note length must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(cleanedText, notesList)) {
    console.log(`Rejection: Duplicate note detected ("${cleanedText}").`);
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log(`Rejection: Invalid category "${category}". Allowed: personal, work, study.`);
    return false;
  }

  const nextId = notesList.length > 0 ? Math.max(...notesList.map((n) => n.id)) + 1 : 1;
  const newNote = {
    id: nextId,
    text: cleanedText,
    category: category,
  };

  notesList.push(newNote);
  console.log(`Success: Added note [ID ${newNote.id}] to "${category}".`);
  return true;
}

// ==========================================
// TEST SUITE & CONSOLE VERIFICATION
// ==========================================

console.log("=== 1. Testing searchNotes ===");
// Normal case: search for "report"
console.log(searchNotes("report"));
// Expected output: Array of 1 note (id 3: "Email the project report to Grace")

// Edge case: word not present
console.log(searchNotes("kubernetes"));
// Expected output: [] (empty array)


console.log("=== 2. Testing longestNote ===");
// Normal case: longest in initial dataset
console.log(longestNote());
// Expected output: Object with id 3 ("Email the project report to Grace", length 33)

// Edge case: empty dataset test
const originalNotes = [...notes];
notes = [];
console.log(longestNote());
// Expected output: null
notes = [...originalNotes]; // Restore state


console.log("=== 3. Testing countByCategory ===");
// Normal case: distribution across active categories
console.log(countByCategory());
// Expected output: { personal: 2, study: 2, work: 1 }

// Edge case: single note category distribution
notes = [{ id: 99, text: "Solo task", category: "work" }];
console.log(countByCategory());
// Expected output: { work: 1 }
notes = [...originalNotes]; // Restore state


console.log("=== 4. Testing getSummary ===");
// Normal case: full dataset summary
console.log(getSummary());
// Expected output: "5 notes: 2 personal, 1 work, 2 study."

// Edge case: single note pluralisation test
notes = [{ id: 10, text: "Single item", category: "personal" }];
console.log(getSummary());
// Expected output: "1 note: 1 personal, 0 work, 0 study."
notes = [...originalNotes]; // Restore state


console.log("=== 5. Testing isDuplicate ===");
// Normal case: existing text with alternate casing and spacing
console.log(isDuplicate("  CALL MUM  "));
// Expected output: true

// Edge case: non-existent text
console.log(isDuplicate("Configure Nginx reverse proxy"));
// Expected output: false


console.log("=== 6. Testing addNote (Configuration Object Pattern) ===");
// Normal case: valid note addition using configuration object
console.log(addNote({ text: "Review system design trade-offs", category: "study" }));
// Expected output: Success log, returns true

// Isolation test: passing custom targetArray via configuration object
const isolatedCollection = [];
console.log(
  addNote({
    text: "Isolated task for sandbox",
    category: "work",
    targetArray: isolatedCollection,
  })
);
// Expected output: Success log with ID 1 in isolatedCollection, returns true

// Edge case A: duplicate rejection
console.log(addNote({ text: "Call mum", category: "personal" }));
// Expected output: Rejection: Duplicate note detected, returns false

// Edge case B: whitespace-only input
console.log(addNote({ text: "    ", category: "personal" }));
// Expected output: Rejection: Note length must be between 1 and 200 characters, returns false

// Edge case C: invalid category rejection
console.log(addNote({ text: "Book flight to Nairobi", category: "travel" }));
// Expected output: Rejection: Invalid category "travel", returns false

console.log("=== Final Notes State ===");
console.table(notes);