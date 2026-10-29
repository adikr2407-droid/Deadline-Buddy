/**
 * DEADLINE BUDDY — Assignment Tracker
 * Pure Vanilla JavaScript implementation.
 * Designed to be clean, educational, and easy to understand for college students.
 */

// =============================================================================
// 1. GLOBAL STATE & CONSTANTS
// =============================================================================

// LocalStorage key used to save assignment data
const STORAGE_KEY = "deadline_buddy_assignments";
const INIT_KEY = "deadline_buddy_initialized";

// In-memory array of assignments
let assignments = [];

// Current active filter tab: 'all' | 'pending' | 'completed' | 'overdue'
let currentFilter = "all";

// DOM Elements
const assignmentForm = document.getElementById("assignmentForm");
const titleInput = document.getElementById("titleInput");
const subjectInput = document.getElementById("subjectInput");
const dateInput = document.getElementById("dateInput");
const priorityInput = document.getElementById("priorityInput");

const titleError = document.getElementById("titleError");
const subjectError = document.getElementById("subjectError");
const dateError = document.getElementById("dateError");

const assignmentsList = document.getElementById("assignmentsList");
const emptyState = document.getElementById("emptyState");
const emptyIcon = document.getElementById("emptyIcon");
const emptyTitle = document.getElementById("emptyTitle");
const emptySubtitle = document.getElementById("emptySubtitle");

const totalCountEl = document.getElementById("totalCount");
const pendingCountEl = document.getElementById("pendingCount");
const completedCountEl = document.getElementById("completedCount");
const overdueCountEl = document.getElementById("overdueCount");
const activeFilterCountEl = document.getElementById("activeFilterCount");
const currentDateBadge = document.getElementById("currentDateBadge");
const filterButtons = document.querySelectorAll(".filter-btn");

// =============================================================================
// 2. HELPER FUNCTIONS: DATES & STATUS
// =============================================================================

/**
 * Parses a 'YYYY-MM-DD' date string into a local midnight Date object.
 * This avoids UTC timezone offsets that can cause "off-by-one day" bugs.
 */
function parseDateParts(dateStr) {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JS
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Calculates the difference in calendar days between a due date and today.
 * Negative number = Overdue
 * 0 = Due today
 * 1 = Due tomorrow
 * Positive number = Due in X days
 */
function getDaysDifference(dateStr) {
  const targetDate = parseDateParts(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to local midnight

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines the human-readable deadline status and CSS class name.
 */
function getDeadlineStatus(dueDateStr, isCompleted) {
  if (isCompleted) {
    return {
      label: "Completed",
      className: "status-completed",
      icon: "✓"
    };
  }

  const diffDays = getDaysDifference(dueDateStr);

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      label: daysOverdue === 1 ? "Overdue by 1 day" : `Overdue by ${daysOverdue} days`,
      className: "status-overdue",
      icon: "⚠️"
    };
  } else if (diffDays === 0) {
    return {
      label: "Due Today",
      className: "status-today",
      icon: "🔥"
    };
  } else if (diffDays === 1) {
    return {
      label: "Due Tomorrow",
      className: "status-tomorrow",
      icon: "⏰"
    };
  } else {
    return {
      label: `Due in ${diffDays} days`,
      className: "status-upcoming",
      icon: "📅"
    };
  }
}

/**
 * Formats a 'YYYY-MM-DD' string into a friendly readable date (e.g. "Oct 25, 2026").
 */
function formatDisplayDate(dateStr) {
  const dateObj = parseDateParts(dateStr);
  return dateObj.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

/**
 * Helper to produce a YYYY-MM-DD string offset by a given number of days from today.
 * Used for dynamic initial sample assignments.
 */
function getDateStringOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// =============================================================================
// 3. STORAGE & SAMPLE DATA
// =============================================================================

/**
 * Loads assignments from the browser's localStorage.
 * Seeds initial demo sample data if this is the user's first visit.
 */
function loadAssignmentsFromStorage() {
  const hasInitialized = localStorage.getItem(INIT_KEY);

  if (!hasInitialized) {
    // Initial demo assignments with dates relative to today
    assignments = [
      {
        id: "sample-1",
        title: "Data Structures Lab Report",
        subject: "CS 201 - Data Structures",
        dueDate: getDateStringOffset(0), // Due Today
        priority: "High",
        completed: false
      },
      {
        id: "sample-2",
        title: "Calculus Problem Set 4",
        subject: "MATH 102 - Calculus II",
        dueDate: getDateStringOffset(1), // Due Tomorrow
        priority: "Medium",
        completed: false
      },
      {
        id: "sample-3",
        title: "Computer Networks Case Study",
        subject: "CS 305 - Computer Networks",
        dueDate: getDateStringOffset(4), // Due in 4 days
        priority: "Low",
        completed: false
      },
      {
        id: "sample-4",
        title: "Web Tech Responsive Design Mockup",
        subject: "WEB 101 - Web Development",
        dueDate: getDateStringOffset(-2), // Overdue
        priority: "High",
        completed: false
      },
      {
        id: "sample-5",
        title: "Ethics in Engineering Summary",
        subject: "ENGR 100 - Intro to Engineering",
        dueDate: getDateStringOffset(-3),
        priority: "Low",
        completed: true // Completed assignment
      }
    ];

    saveAssignmentsToStorage();
    localStorage.setItem(INIT_KEY, "true");
  } else {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      assignments = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Could not parse assignments from localStorage", e);
      assignments = [];
    }
  }
}

/**
 * Saves the current assignments array into browser localStorage.
 */
function saveAssignmentsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

// =============================================================================
// 4. RENDERING & UI UPDATES
// =============================================================================

/**
 * Updates statistics counts in the top header cards.
 */
function updateStats() {
  const total = assignments.length;
  const completed = assignments.filter(item => item.completed).length;
  const pending = assignments.filter(item => !item.completed).length;
  
  // Overdue assignments are pending and their due date is in the past
  const overdue = assignments.filter(item => !item.completed && getDaysDifference(item.dueDate) < 0).length;

  totalCountEl.textContent = total;
  pendingCountEl.textContent = pending;
  completedCountEl.textContent = completed;
  overdueCountEl.textContent = overdue;
}

/**
 * Filters the assignments based on the current active filter tab.
 */
function getFilteredAssignments() {
  return assignments.filter(item => {
    if (currentFilter === "all") return true;
    if (currentFilter === "pending") return !item.completed;
    if (currentFilter === "completed") return item.completed;
    if (currentFilter === "overdue") {
      return !item.completed && getDaysDifference(item.dueDate) < 0;
    }
    return true;
  });
}

/**
 * Renders the empty state box with appropriate message depending on active filter.
 */
function renderEmptyState(filteredCount) {
  if (filteredCount > 0) {
    emptyState.style.display = "none";
    return;
  }

  emptyState.style.display = "block";

  if (assignments.length === 0) {
    emptyIcon.textContent = "📝";
    emptyTitle.textContent = "No assignments yet";
    emptySubtitle.textContent = "Add your first assignment using the form on the left to stay ahead of deadlines!";
  } else if (currentFilter === "pending") {
    emptyIcon.textContent = "🎉";
    emptyTitle.textContent = "All caught up!";
    emptySubtitle.textContent = "You don't have any pending assignments. Time to relax or study ahead!";
  } else if (currentFilter === "completed") {
    emptyIcon.textContent = "⏳";
    emptyTitle.textContent = "No completed assignments";
    emptySubtitle.textContent = "Finish an assignment and check it off to see it in your completed archive.";
  } else if (currentFilter === "overdue") {
    emptyIcon.textContent = "✨";
    emptyTitle.textContent = "Zero overdue assignments!";
    emptySubtitle.textContent = "Great job! None of your pending assignments are past their due dates.";
  }
}

/**
 * Creates an assignment card DOM element safely using document.createElement.
 */
function createAssignmentCardElement(assignment) {
  const card = document.createElement("article");
  card.className = `assignment-card ${assignment.completed ? "is-completed" : ""}`;
  card.dataset.id = assignment.id;
  card.dataset.priority = assignment.priority;

  // Calculate status
  const statusInfo = getDeadlineStatus(assignment.dueDate, assignment.completed);
  const formattedDate = formatDisplayDate(assignment.dueDate);

  // Priority CSS class
  const priorityClass = `badge-${assignment.priority.toLowerCase()}`;

  // Card Left: Check button & Details
  const cardLeft = document.createElement("div");
  cardLeft.className = "card-left";

  // Checkbox button
  const completeBtn = document.createElement("button");
  completeBtn.type = "button";
  completeBtn.className = `complete-btn ${assignment.completed ? "checked" : ""}`;
  completeBtn.setAttribute("aria-label", assignment.completed ? "Mark as pending" : "Mark as completed");
  completeBtn.title = assignment.completed ? "Mark as pending" : "Mark as completed";
  completeBtn.textContent = "✓";
  completeBtn.addEventListener("click", () => toggleAssignmentComplete(assignment.id));

  // Details
  const details = document.createElement("div");
  details.className = "card-details";

  const titleEl = document.createElement("h3");
  titleEl.className = "card-title";
  titleEl.textContent = assignment.title;

  const metaEl = document.createElement("div");
  metaEl.className = "card-meta";

  const subjectSpan = document.createElement("span");
  subjectSpan.className = "meta-subject";
  subjectSpan.innerHTML = `📖 <strong>${escapeHTML(assignment.subject)}</strong>`;

  const dateSpan = document.createElement("span");
  dateSpan.className = "meta-date";
  dateSpan.innerHTML = `🗓️ ${formattedDate}`;

  metaEl.appendChild(subjectSpan);
  metaEl.appendChild(dateSpan);

  // Badges container
  const badgeGroup = document.createElement("div");
  badgeGroup.className = "badge-group";

  // Priority badge
  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge ${priorityClass}`;
  priorityBadge.textContent = `${assignment.priority} Priority`;

  // Status badge
  const statusBadge = document.createElement("span");
  statusBadge.className = `status-badge ${statusInfo.className}`;
  statusBadge.innerHTML = `${statusInfo.icon} ${statusInfo.label}`;

  badgeGroup.appendChild(priorityBadge);
  badgeGroup.appendChild(statusBadge);

  details.appendChild(titleEl);
  details.appendChild(metaEl);
  details.appendChild(badgeGroup);

  cardLeft.appendChild(completeBtn);
  cardLeft.appendChild(details);

  // Card Right: Delete button
  const cardRight = document.createElement("div");
  cardRight.className = "card-right";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.setAttribute("aria-label", `Delete assignment: ${assignment.title}`);
  deleteBtn.title = "Delete assignment";
  deleteBtn.innerHTML = "🗑️";
  deleteBtn.addEventListener("click", () => deleteAssignment(assignment.id));

  cardRight.appendChild(deleteBtn);

  // Assemble Card
  card.appendChild(cardLeft);
  card.appendChild(cardRight);

  return card;
}

/**
 * Basic HTML sanitizer to prevent XSS issues when rendering text.
 */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Main render function: updates stats and re-draws assignment cards according to active filter.
 */
function render() {
  updateStats();

  const filtered = getFilteredAssignments();
  activeFilterCountEl.textContent = `${filtered.length} shown`;

  // Clear current list
  assignmentsList.innerHTML = "";

  if (filtered.length === 0) {
    renderEmptyState(0);
  } else {
    renderEmptyState(filtered.length);
    filtered.forEach(assignment => {
      const cardEl = createAssignmentCardElement(assignment);
      assignmentsList.appendChild(cardEl);
    });
  }
}

// =============================================================================
// 5. CRUD OPERATIONS (CREATE, TOGGLE, DELETE)
// =============================================================================

/**
 * Validates the form inputs before adding an assignment.
 * Returns true if valid, false otherwise.
 */
function validateForm() {
  let isValid = true;

  // Clear previous errors
  titleError.textContent = "";
  subjectError.textContent = "";
  dateError.textContent = "";
  titleInput.classList.remove("input-invalid");
  subjectInput.classList.remove("input-invalid");
  dateInput.classList.remove("input-invalid");

  // Title validation
  const titleVal = titleInput.value.trim();
  if (!titleVal) {
    titleError.textContent = "Please enter an assignment title.";
    titleInput.classList.add("input-invalid");
    isValid = false;
  }

  // Subject validation
  const subjectVal = subjectInput.value.trim();
  if (!subjectVal) {
    subjectError.textContent = "Please enter the course or subject name.";
    subjectInput.classList.add("input-invalid");
    isValid = false;
  }

  // Due Date validation
  const dateVal = dateInput.value;
  if (!dateVal) {
    dateError.textContent = "Please select a due date.";
    dateInput.classList.add("input-invalid");
    isValid = false;
  }

  return isValid;
}

/**
 * Handles form submission: validates, creates new assignment object,
 * appends to list, saves to localStorage, resets form, and re-renders.
 */
function handleAddAssignment(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  // Create new assignment object
  const newAssignment = {
    id: "assign-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    title: titleInput.value.trim(),
    subject: subjectInput.value.trim(),
    dueDate: dateInput.value,
    priority: priorityInput.value,
    completed: false
  };

  // Prepend to show most recently added assignment at the top
  assignments.unshift(newAssignment);
  saveAssignmentsToStorage();

  // Reset form inputs
  assignmentForm.reset();
  priorityInput.value = "Medium";

  // Re-render UI
  render();

  // Focus title input for rapid entry
  titleInput.focus();
}

/**
 * Toggles an assignment between completed and pending states.
 */
function toggleAssignmentComplete(id) {
  const index = assignments.findIndex(item => item.id === id);
  if (index !== -1) {
    assignments[index].completed = !assignments[index].completed;
    saveAssignmentsToStorage();
    render();
  }
}

/**
 * Deletes an assignment with a gentle confirmation prompt.
 */
function deleteAssignment(id) {
  const target = assignments.find(item => item.id === id);
  if (!target) return;

  const confirmed = confirm(`Are you sure you want to delete "${target.title}"?`);
  if (confirmed) {
    assignments = assignments.filter(item => item.id !== id);
    saveAssignmentsToStorage();
    render();
  }
}

// =============================================================================
// 6. EVENT LISTENERS & INITIALIZATION
// =============================================================================

/**
 * Set up user interactions and event listeners.
 */
function setupEventListeners() {
  // Form submission
  assignmentForm.addEventListener("submit", handleAddAssignment);

  // Clear validation error when user begins typing
  titleInput.addEventListener("input", () => {
    if (titleInput.value.trim()) {
      titleError.textContent = "";
      titleInput.classList.remove("input-invalid");
    }
  });

  subjectInput.addEventListener("input", () => {
    if (subjectInput.value.trim()) {
      subjectError.textContent = "";
      subjectInput.classList.remove("input-invalid");
    }
  });

  dateInput.addEventListener("change", () => {
    if (dateInput.value) {
      dateError.textContent = "";
      dateInput.classList.remove("input-invalid");
    }
  });

  // Filter button clicks
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Remove active class from all buttons
      filterButtons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });

      // Set active on clicked button
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      // Update current filter state and re-render
      currentFilter = btn.dataset.filter;
      render();
    });
  });
}

/**
 * Displays today's formatted date in the header badge.
 */
function displayCurrentDateHeader() {
  const today = new Date();
  const options = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
  currentDateBadge.textContent = `📅 Today: ${today.toLocaleDateString(undefined, options)}`;
}

/**
 * Sets a sensible default due date in the date picker (tomorrow's date).
 */
function setDefaultFormDueDate() {
  dateInput.value = getDateStringOffset(1);
}

/**
 * Application Bootstrap
 */
function init() {
  displayCurrentDateHeader();
  setDefaultFormDueDate();
  loadAssignmentsFromStorage();
  setupEventListeners();
  render();
}

// Run init when DOM is fully parsed
document.addEventListener("DOMContentLoaded", init);
