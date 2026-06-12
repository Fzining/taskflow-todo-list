const STORAGE_KEY = "taskflow.tasks.v1";
const SYNC_META_KEY = "taskflow.sync-meta.v1";
const SYNC_INTERVAL_MS = 5000;
const API_ORIGIN = window.location.hostname.endsWith("github.io") ? "https://taskflow-todo-list-omega.vercel.app" : "";
const TASKS_API_URL = `${API_ORIGIN}/api/tasks`;
const createId = () =>
  crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const priorityRank = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const defaultTasks = [
  {
    id: createId(),
    title: "Review Q3 Marketing Strategy",
    details: "Analyze the latest metrics from the Q2 campaign and prepare the slide deck for the executive meeting.",
    time: "10:00",
    endTime: "",
    priority: "High",
    category: "today",
    files: 2,
    team: "",
    completed: false,
    createdAt: Date.now() - 80000,
  },
  {
    id: createId(),
    title: "Design System Update",
    details: "Incorporate the new neumorphic shadow tokens into the global CSS variables and update the documentation.",
    time: "13:30",
    endTime: "",
    priority: "Medium",
    category: "today",
    files: 0,
    team: "Team Sync",
    completed: false,
    createdAt: Date.now() - 70000,
  },
  {
    id: createId(),
    title: "Approve Weekly Timesheets",
    details: "Review and approve pending hours for the design team.",
    time: "09:15",
    endTime: "",
    priority: "Low",
    category: "today",
    files: 0,
    team: "",
    completed: true,
    completedAt: "9:15 AM",
    createdAt: Date.now() - 60000,
  },
  {
    id: createId(),
    title: "Client Presentation",
    details: "Walk the client through final product flows and collect launch feedback.",
    time: "14:00",
    endTime: "15:00",
    priority: "Medium",
    category: "today",
    files: 0,
    team: "2 members",
    completed: false,
    createdAt: Date.now() - 50000,
  },
  {
    id: createId(),
    title: "Morning Standup",
    details: "Quick update with the product team.",
    time: "09:00",
    endTime: "09:30",
    priority: "Low",
    category: "today",
    files: 0,
    team: "",
    completed: true,
    completedAt: "9:30 AM",
    createdAt: Date.now() - 40000,
  },
  {
    id: createId(),
    title: "Capture Inbox Ideas",
    details: "Sort uncategorized notes and turn promising ideas into actionable tasks.",
    time: "16:00",
    endTime: "",
    priority: "Medium",
    category: "inbox",
    files: 0,
    team: "",
    completed: false,
    createdAt: Date.now() - 30000,
  },
  {
    id: createId(),
    title: "Plan Friday Roadmap Review",
    details: "Prepare agenda and collect open questions before the roadmap review.",
    time: "11:00",
    endTime: "",
    priority: "High",
    category: "upcoming",
    files: 1,
    team: "Team Sync",
    completed: false,
    createdAt: Date.now() - 20000,
  },
];

const icons = {
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path><path d="M8 14h3v3H8z"></path></svg>',
  inbox: '<svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
  "check-circle": '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="m9 12 2 2 4-5"></path></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>',
  "add-task": '<svg viewBox="0 0 24 24"><path d="M12 5v8M8 9h8"></path><path d="M17 19h4"></path><path d="m19 17 2 2-2 2"></path><rect x="3" y="4" width="14" height="16" rx="4"></rect></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"></path></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path><path d="M14 2v5h5"></path></svg>',
  group: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"></path></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path></svg>',
};

const state = {
  tasks: loadTasks(),
  hasStoredTasks: Boolean(localStorage.getItem(STORAGE_KEY)),
  filter: "today",
  view: "list",
  sync: loadSyncMeta(),
  syncTimer: null,
  syncSaveTimer: null,
  isApplyingRemote: false,
};

const elements = {
  taskList: document.querySelector("#taskList"),
  sectionTitle: document.querySelector("#sectionTitle"),
  pendingCount: document.querySelector("#pendingCount"),
  priorityCount: document.querySelector("#priorityCount"),
  progressLabel: document.querySelector("#progressLabel"),
  mobileProgressLabel: document.querySelector("#mobileProgressLabel"),
  mobileOpenCount: document.querySelector("#mobileOpenCount"),
  completedCount: document.querySelector("#completedCount"),
  overdueCount: document.querySelector("#overdueCount"),
  taskDialog: document.querySelector("#taskDialog"),
  taskForm: document.querySelector("#taskForm"),
  searchDialog: document.querySelector("#searchDialog"),
  searchInput: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
};

document.querySelectorAll(".icon[data-icon]").forEach((node) => {
  node.innerHTML = icons[node.dataset.icon] ?? "";
});

document.querySelector("#newTaskButton").addEventListener("click", openTaskDialog);
document.querySelector("#newTaskMobileButton").addEventListener("click", openTaskDialog);
document.querySelector("#quickAddDesktop").addEventListener("click", openTaskDialog);
document.querySelectorAll("#taskDialog [data-dialog-close]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.taskForm.reset();
    elements.taskDialog.close();
  });
});
document.querySelector("#scheduleButton").addEventListener("click", () => {
  document.querySelector("#tasksSection").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.querySelector("#seeAllButton").addEventListener("click", () => setFilter("today"));
document.querySelector("#searchButton").addEventListener("click", openSearch);

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(elements.taskForm);
  state.tasks.unshift({
    id: createId(),
    title: formData.get("title").toString().trim(),
    details: formData.get("details").toString().trim() || "No extra details yet.",
    time: formData.get("time").toString(),
    endTime: "",
    priority: formData.get("priority").toString(),
    category: "today",
    files: 0,
    team: "",
    completed: false,
    createdAt: Date.now(),
  });
  saveTasks();
  elements.taskForm.reset();
  elements.taskDialog.close();
  setFilter("today");
});

elements.searchInput.addEventListener("input", () => renderSearch(elements.searchInput.value));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
}

render();
startCloudSync();

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register("./sw.js");
    await registration.update();

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (sessionStorage.getItem("taskflow.reloaded-for-update") === "1") return;
      sessionStorage.setItem("taskflow.reloaded-for-update", "1");
      window.location.reload();
    });
  } catch {
    // The app still works without offline support.
  }
}

function loadTasks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultTasks;
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : defaultTasks;
  } catch {
    return defaultTasks;
  }
}

function loadSyncMeta() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_META_KEY)) || { updatedAt: 0 };
  } catch {
    return { updatedAt: 0 };
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  state.hasStoredTasks = true;
  if (!state.isApplyingRemote) {
    state.sync.updatedAt = Date.now();
    saveSyncMeta();
    scheduleCloudSave();
  }
}

function saveSyncMeta() {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(state.sync));
}

function openTaskDialog() {
  elements.taskForm.reset();
  document.querySelector("#taskTime").value = "10:00";
  elements.taskDialog.showModal();
  document.querySelector("#taskTitle").focus();
}

function openSearch() {
  elements.searchInput.value = "";
  renderSearch("");
  elements.searchDialog.showModal();
  elements.searchInput.focus();
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll("[data-filter]").forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === filter);
  });
  render();
}

function render() {
  renderStats();
  elements.sectionTitle.textContent = getSectionTitle();
  elements.taskList.className = `task-list ${state.view}`;
  if (state.view === "board") {
    renderBoard();
    return;
  }
  const tasks = getVisibleTasks();
  elements.taskList.innerHTML = tasks.length
    ? tasks.map((task) => taskTemplate(task)).join("")
    : '<div class="empty-state">No tasks here yet. Create one when you are ready.</div>';
  bindTaskButtons();
}

function startCloudSync() {
  syncFromCloud({ seedCloudWhenEmpty: true });
  window.addEventListener("online", () => syncFromCloud({ seedCloudWhenEmpty: true }));
  state.syncTimer = window.setInterval(() => syncFromCloud(), SYNC_INTERVAL_MS);
}

async function syncFromCloud(options = {}) {
  try {
    const response = await fetch(TASKS_API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Sync load failed");

    const remote = await response.json();
    const remoteUpdatedAt = Number(remote.updatedAt || 0);
    const remoteTasks = Array.isArray(remote.tasks) ? remote.tasks : [];

    if (!remoteUpdatedAt && options.seedCloudWhenEmpty && state.tasks.length) {
      scheduleCloudSave(0);
      return;
    }

    if (remoteUpdatedAt > Number(state.sync.updatedAt || 0) && state.hasStoredTasks && !state.sync.updatedAt) {
      const mergedTasks = mergeTasks(remoteTasks, state.tasks);
      applyRemoteTasks(mergedTasks, remoteUpdatedAt);
      scheduleCloudSave(0);
      return;
    }

    if (remoteUpdatedAt > Number(state.sync.updatedAt || 0)) {
      applyRemoteTasks(remoteTasks, remoteUpdatedAt);
    }
  } catch {
    // Keep the local app usable; the next interval or online event will retry.
  }
}

function applyRemoteTasks(tasks, updatedAt) {
  state.isApplyingRemote = true;
  state.tasks = tasks;
  state.sync.updatedAt = updatedAt;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  state.hasStoredTasks = true;
  saveSyncMeta();
  state.isApplyingRemote = false;
  render();
}

function scheduleCloudSave(delay = 350) {
  window.clearTimeout(state.syncSaveTimer);
  state.syncSaveTimer = window.setTimeout(pushTasksToCloud, delay);
}

async function pushTasksToCloud() {
  try {
    const response = await fetch(TASKS_API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: state.tasks, updatedAt: state.sync.updatedAt }),
    });
    if (!response.ok) throw new Error("Sync save failed");

    const saved = await response.json();
    state.sync.updatedAt = Number(saved.updatedAt || state.sync.updatedAt);
    saveSyncMeta();
  } catch {
    // Local changes remain saved and will retry on the next user change/online event.
  }
}

function mergeTasks(remoteTasks, localTasks) {
  const byId = new Map();
  [...remoteTasks, ...localTasks].forEach((task) => {
    if (!task?.id) return;
    byId.set(task.id, { ...byId.get(task.id), ...task });
  });
  return [...byId.values()];
}

function renderBoard() {
  const groups = [
    ["High", "High"],
    ["Medium", "Medium"],
    ["Done", "Completed"],
  ];
  elements.taskList.innerHTML = groups
    .map(([label, match]) => {
      const tasks = getVisibleTasks().filter((task) => (match === "Completed" ? task.completed : task.priority === match && !task.completed));
      const cards = tasks.map((task) => taskTemplate(task)).join("") || '<div class="empty-state">Nothing yet.</div>';
      return `<section class="board-column"><h3>${label}</h3>${cards}</section>`;
    })
    .join("");
  bindTaskButtons();
}

function renderStats() {
  const today = state.tasks.filter((task) => task.category === "today");
  const pending = state.tasks.filter((task) => !task.completed).length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const openToday = today.filter((task) => !task.completed).length;
  const highToday = today.filter((task) => !task.completed && task.priority === "High").length;
  const overdue = state.tasks.filter((task) => !task.completed && isOverdue(task)).length;
  const progress = today.length ? Math.round((today.filter((task) => task.completed).length / today.length) * 100) : 0;

  elements.pendingCount.textContent = pending;
  elements.priorityCount.textContent = `${highToday} high priority`;
  elements.progressLabel.textContent = `${progress}%`;
  elements.mobileProgressLabel.textContent = `${progress}%`;
  elements.mobileOpenCount.textContent = openToday;
  elements.completedCount.textContent = completed;
  elements.overdueCount.textContent = overdue;
  document.querySelectorAll(".progress-ring,.small-ring").forEach((ring) => ring.style.setProperty("--progress", progress));
}

function renderSearch(query) {
  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? state.tasks.filter((task) => `${task.title} ${task.details}`.toLowerCase().includes(normalized))
    : state.tasks.slice(0, 5);
  elements.searchResults.innerHTML = matches.length
    ? matches
        .map(
          (task) => `
            <article class="search-result">
              <h3>${escapeHtml(task.title)}</h3>
              <p>${formatTimeRange(task)} · ${task.completed ? "Completed" : task.priority}</p>
            </article>
          `,
        )
        .join("")
    : '<div class="empty-state">No matching tasks.</div>';
}

function getVisibleTasks() {
  const tasks = state.tasks.filter((task) => {
    if (state.filter === "completed") return task.completed;
    if (state.filter === "today") return task.category === "today";
    return task.category === state.filter && !task.completed;
  });
  return tasks.sort(compareTasks);
}

function compareTasks(a, b) {
  return (
    Number(a.completed) - Number(b.completed) ||
    (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99) ||
    minutesFromTime(a.time) - minutesFromTime(b.time) ||
    b.createdAt - a.createdAt
  );
}

function getSectionTitle() {
  const titles = {
    today: window.matchMedia("(max-width: 880px)").matches ? "Today" : "Today's Focus",
    inbox: "Inbox",
    upcoming: "Upcoming",
    completed: "Completed",
  };
  return titles[state.filter] ?? "Tasks";
}

function taskTemplate(task) {
  const completed = task.completed ? " completed" : "";
  const priority = task.priority.toLowerCase();
  const meta = task.completed
    ? `<span>${iconInline("check-circle")} Completed${task.completedAt ? ` at ${task.completedAt}` : ""}</span>`
    : `
      <span>${iconInline("clock")} ${formatTimeRange(task)}</span>
      ${task.files ? `<span>${iconInline("file")} ${task.files} Files</span>` : ""}
      ${task.team ? `<span class="team-meta">${iconInline("group")} ${escapeHtml(task.team)}</span>` : ""}
    `;

  return `
    <article class="task-card${completed}" data-id="${task.id}">
      <button class="task-toggle" data-action="toggle" type="button" aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}">
        ${task.completed ? iconInline("check") : ""}
      </button>
      <div class="task-main">
        <div class="task-top">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <span class="priority ${priority}">${escapeHtml(task.priority)}</span>
        </div>
        <p class="task-detail">${escapeHtml(task.details)}</p>
        <div class="task-meta">
          ${meta}
          <span class="task-menu">
            <button class="text-action" data-action="duplicate" type="button">Duplicate</button>
            <button class="text-action" data-action="delete" type="button">Delete</button>
          </span>
        </div>
      </div>
    </article>
  `;
}

function bindTaskButtons() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".task-card");
      const id = card?.dataset.id;
      const task = state.tasks.find((item) => item.id === id);
      if (!task) return;
      if (button.dataset.action === "toggle") {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
      }
      if (button.dataset.action === "duplicate") {
        state.tasks.unshift({
          ...task,
          id: createId(),
          title: `${task.title} Copy`,
          completed: false,
          completedAt: "",
          createdAt: Date.now(),
        });
      }
      if (button.dataset.action === "delete") {
        state.tasks = state.tasks.filter((item) => item.id !== id);
      }
      saveTasks();
      render();
    });
  });
}

function formatTimeRange(task) {
  const start = formatTime(task.time);
  return task.endTime ? `${start} - ${formatTime(task.endTime)}` : start;
}

function formatTime(value) {
  if (!value) return "Anytime";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function minutesFromTime(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isOverdue(task) {
  if (task.category !== "today" || !task.time) return false;
  const [hour, minute] = task.time.split(":").map(Number);
  const due = new Date();
  due.setHours(hour, minute, 0, 0);
  return due.getTime() < Date.now();
}

function iconInline(name) {
  return `<span class="icon">${icons[name] ?? ""}</span>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[character];
  });
}
