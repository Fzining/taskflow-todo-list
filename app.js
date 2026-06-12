const STORAGE_KEY = "taskflow.tasks.v1";
const SYNC_META_KEY = "taskflow.sync-meta.v1";
const REMINDER_META_KEY = "taskflow.reminder-meta.v1";
const SYNC_INTERVAL_MS = 5000;
const MAX_TIMEOUT_MS = 2147483647;
const REMINDER_SCAN_INTERVAL_MS = 30000;
const REMINDER_STALE_GRACE_MS = 600000;
const SUPABASE_REST_URL = "https://vzllsenewstwjbnplysm.supabase.co/rest/v1";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_9y_vYoh3zmM_zph31oVj3g_3uw79IsX";
const TASKS_TABLE = "taskflow_state";
const TASKS_RECORD_ID = "default";
const createId = () =>
  crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const priorityRank = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const FILE_STORE_DB = "taskflow-files-v1";
const FILE_STORE_NAME = "files";

function openFileDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FILE_STORE_DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(FILE_STORE_NAME, { keyPath: "id" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeFile(file) {
  const id = createId();
  const buffer = await file.arrayBuffer();
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, "readwrite");
    const meta = { id, name: file.name, type: file.type, size: buffer.byteLength };
    tx.objectStore(FILE_STORE_NAME).put({ id, data: buffer, name: file.name, type: file.type });
    tx.oncomplete = () => { db.close(); resolve(meta); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function storeFiles(fileList) {
  if (!fileList.length) return [];
  // Process each file in its own transaction to avoid size limits
  const results = [];
  for (const file of fileList) {
    try {
      const meta = await storeFile(file);
      results.push(meta);
    } catch { /* skip failures — files too large may hit browser limits */ }
  }
  return results;
}

async function loadFile(id) {
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, "readonly");
    const req = tx.objectStore(FILE_STORE_NAME).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function removeFile(id) {
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, "readwrite");
    tx.objectStore(FILE_STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function removeFiles(ids) {
  const db = await openFileDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE_NAME, "readwrite");
    const store = tx.objectStore(FILE_STORE_NAME);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

const defaultTasks = [
  {
    id: createId(),
    title: "Review Q3 Marketing Strategy",
    details: "Analyze the latest metrics from the Q2 campaign and prepare the slide deck for the executive meeting.",
    date: localDateString(),
    time: "10:00",
    endTime: "",
    startReminderMinutes: null,
    endReminderMinutes: null,
    priority: "High",
    category: "today",
    files: [],
    team: "",
    completed: false,
    createdAt: Date.now() - 80000,
  },
  {
    id: createId(),
    title: "Design System Update",
    details: "Incorporate the new neumorphic shadow tokens into the global CSS variables and update the documentation.",
    date: localDateString(),
    time: "13:30",
    endTime: "",
    startReminderMinutes: null,
    endReminderMinutes: null,
    priority: "Medium",
    category: "today",
    files: [],
    team: "Team Sync",
    completed: false,
    createdAt: Date.now() - 70000,
  },
  {
    id: createId(),
    title: "Approve Weekly Timesheets",
    details: "Review and approve pending hours for the design team.",
    date: localDateString(),
    time: "09:15",
    endTime: "",
    startReminderMinutes: null,
    endReminderMinutes: null,
    priority: "Low",
    category: "today",
    files: [],
    team: "",
    completed: true,
    completedAt: "9:15 AM",
    createdAt: Date.now() - 60000,
  },
  {
    id: createId(),
    title: "Client Presentation",
    details: "Walk the client through final product flows and collect launch feedback.",
    date: localDateString(),
    time: "14:00",
    endTime: "15:00",
    startReminderMinutes: null,
    endReminderMinutes: null,
    priority: "Medium",
    category: "today",
    files: [],
    team: "2 members",
    completed: false,
    createdAt: Date.now() - 50000,
  },
  {
    id: createId(),
    title: "Morning Standup",
    details: "Quick update with the product team.",
    date: localDateString(),
    time: "09:00",
    endTime: "09:30",
    startReminderMinutes: null,
    endReminderMinutes: null,
    priority: "Low",
    category: "today",
    files: [],
    team: "",
    completed: true,
    completedAt: "9:30 AM",
    createdAt: Date.now() - 40000,
  },
  {
    id: createId(),
    title: "Pick up dry cleaning on the way home",
    details: "Corner of 5th and Main, closes at 7pm.",
    date: localDateString(),
    time: "",
    endTime: "",
    startReminderMinutes: null,
    endReminderMinutes: null,
    priority: "Low",
    category: "inbox",
    files: [],
    team: "",
    completed: false,
    createdAt: Date.now() - 30000,
  },
  {
    id: createId(),
    title: "Plan Friday Roadmap Review",
    details: "Prepare agenda and collect open questions before the roadmap review.",
    date: addDays(localDateString(), 1),
    time: "11:00",
    endTime: "",
    startReminderMinutes: null,
    endReminderMinutes: null,
    priority: "High",
    category: "upcoming",
    files: [],
    team: "Team Sync",
    completed: false,
    createdAt: Date.now() - 20000,
  },
];

const icons = {
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path><path d="M8 14h3v3H8z"></path></svg>',
  inbox: '<svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M10 21h4"></path><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path></svg>',
  "check-circle": '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="m9 12 2 2 4-5"></path></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>',
  "add-task": '<svg viewBox="0 0 24 24"><path d="M12 5v8M8 9h8"></path><path d="M17 19h4"></path><path d="m19 17 2 2-2 2"></path><rect x="3" y="4" width="14" height="16" rx="4"></rect></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"></path><path d="M15 3v4a1 1 0 0 0 1 1h4"></path></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"></path></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path><path d="M14 2v5h5"></path></svg>',
  group: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"></path></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path></svg>',
};

const SORT_MODES = ["auto", "priority", "time", "newest"];
const SORT_LABELS = { auto: "Sort: Auto", priority: "Sort: Priority", time: "Sort: Time", newest: "Sort: Newest" };

const state = {
  tasks: loadTasks(),
  hasStoredTasks: Boolean(localStorage.getItem(STORAGE_KEY)),
  filter: "today",
  view: "list",
  sortBy: "auto",
  sync: loadSyncMeta(),
  syncTimer: null,
  syncSaveTimer: null,
  reminderTimers: new Map(),
  reminderScanTimer: null,
  reminders: loadReminderMeta(),
  isApplyingRemote: false,
};

const elements = {
  taskList: document.querySelector("#taskList"),
  sectionTitle: document.querySelector("#sectionTitle"),
  viewSwitch: document.querySelector(".view-switch"),
  sortButton: document.querySelector("#sortButton"),
  pendingCount: document.querySelector("#pendingCount"),
  priorityCount: document.querySelector("#priorityCount"),
  progressLabel: document.querySelector("#progressLabel"),
  mobileProgressLabel: document.querySelector("#mobileProgressLabel"),
  mobileOpenCount: document.querySelector("#mobileOpenCount"),
  completedCount: document.querySelector("#completedCount"),
  overdueCount: document.querySelector("#overdueCount"),
  taskDialog: document.querySelector("#taskDialog"),
  taskDialogTitle: document.querySelector("#taskDialogTitle"),
  taskForm: document.querySelector("#taskForm"),
  taskSubmitButton: document.querySelector("#taskSubmitButton"),
  searchDialog: document.querySelector("#searchDialog"),
  searchInput: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
  taskFileDrop: document.querySelector("#taskFileDrop"),
  taskFileInput: document.querySelector("#taskFileInput"),
  taskFileChips: document.querySelector("#taskFileChips"),
  detailDialog: document.querySelector("#taskDetailDialog"),
  detailTitle: document.querySelector("#detailTitle"),
  detailBody: document.querySelector("#detailBody"),
};

const pendingFiles = [];

document.querySelectorAll(".icon[data-icon]").forEach((node) => {
  node.innerHTML = icons[node.dataset.icon] ?? "";
});

document.querySelector("#newTaskButton").addEventListener("click", () => openTaskDialog());
document.querySelector("#newTaskMobileButton").addEventListener("click", () => openTaskDialog());
document.querySelector("#quickAddDesktop").addEventListener("click", () => openTaskDialog());
document.querySelectorAll("#taskDialog [data-dialog-close]").forEach((button) => {
  button.addEventListener("click", () => {
    resetTaskDialog();
    elements.taskDialog.close();
  });
});
document.querySelector("#detailCloseButton").addEventListener("click", () => elements.detailDialog.close());

document.querySelector("#scheduleButton").addEventListener("click", () => {
  document.querySelector("#tasksSection").scrollIntoView({ behavior: "smooth", block: "start" });
});
elements.sortButton.addEventListener("click", () => {
  const idx = SORT_MODES.indexOf(state.sortBy);
  state.sortBy = SORT_MODES[(idx + 1) % SORT_MODES.length];
  elements.sortButton.textContent = SORT_LABELS[state.sortBy];
  render();
});
document.querySelector("#searchButton").addEventListener("click", openSearch);

// File drop zone in task dialog
elements.taskFileDrop.addEventListener("dragover", (e) => { e.preventDefault(); elements.taskFileDrop.classList.add("drag-over"); });
elements.taskFileDrop.addEventListener("dragleave", () => elements.taskFileDrop.classList.remove("drag-over"));
elements.taskFileDrop.addEventListener("drop", (e) => {
  e.preventDefault();
  elements.taskFileDrop.classList.remove("drag-over");
  handleDialogFiles(Array.from(e.dataTransfer.files));
});
elements.taskFileInput.addEventListener("change", () => {
  handleDialogFiles(Array.from(elements.taskFileInput.files));
  elements.taskFileInput.value = "";
});

async function handleDialogFiles(fileList) {
  elements.taskFileDrop.style.pointerEvents = "none";
  elements.taskFileDrop.style.opacity = "0.5";
  try {
    const results = await storeFiles(fileList);
    pendingFiles.push(...results);
  } catch { /* IndexedDB unavailable */ }
  elements.taskFileDrop.style.pointerEvents = "";
  elements.taskFileDrop.style.opacity = "";
  renderDialogFileChips();
}

function renderDialogFileChips() {
  elements.taskFileChips.innerHTML = pendingFiles.map((f) => `
    <span class="file-chip">
      <span class="file-chip-icon">${isImageType(f.type) ? iconInline("check") : iconInline("file")}</span>
      <span class="file-chip-name" title="${escapeHtml(f.name)}">${escapeHtml(truncate(f.name, 24))}</span>
      <span class="file-chip-size">${formatSize(f.size)}</span>
      <button class="file-chip-remove" data-file-id="${f.id}" type="button" aria-label="Remove file">&times;</button>
    </span>
  `).join("");

  elements.taskFileChips.querySelectorAll(".file-chip-remove").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.fileId;
      await removeFile(id);
      pendingFiles.splice(pendingFiles.findIndex((f) => f.id === id), 1);
      renderDialogFileChips();
    });
  });
}

function isImageType(mime) { return mime.startsWith("image/"); }
function truncate(str, max) { return str.length <= max ? str : str.slice(0, max - 3) + "..."; }
function formatSize(bytes) { return bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1048576).toFixed(1)}MB`; }

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

elements.taskList.addEventListener("click", (e) => {
  const card = e.target.closest(".task-card");
  if (!card) return;
  if (e.target.closest("button, a")) return;
  const task = state.tasks.find((item) => item.id === card.dataset.id);
  if (task) openTaskDetail(task);
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(elements.taskForm);
  const taskData = {
    title: formData.get("title").toString().trim(),
    details: formData.get("details").toString().trim() || "No extra details yet.",
    date: formData.get("date").toString(),
    time: formData.get("time").toString(),
    endTime: formData.get("endTime").toString(),
    startReminderMinutes: parseReminderMinutes(formData.get("startReminderMinutes").toString()),
    endReminderMinutes: parseReminderMinutes(formData.get("endReminderMinutes").toString()),
    priority: formData.get("priority").toString(),
    category: formData.get("category").toString(),
  };
  const editingId = elements.taskForm.dataset.editingId;

  if (taskData.endReminderMinutes !== null && !taskData.endTime) {
    window.alert("Please add an end time before setting an end reminder.");
    return;
  }

  const timingError = getTaskTimingError(taskData);
  if (timingError) {
    window.alert(timingError);
    return;
  }

  const reminderError = getReminderTimingError(taskData);
  if (reminderError) {
    window.alert(reminderError);
    return;
  }

  if (editingId) {
    state.tasks = state.tasks.map((task) => (task.id === editingId ? { ...task, ...taskData, files: [...(task.files || []), ...pendingFiles], updatedAt: Date.now() } : task));
  } else {
    state.tasks.unshift({
      id: createId(),
      ...taskData,
      files: [...pendingFiles],
      team: "",
      completed: false,
      createdAt: Date.now(),
    });
  }

  if (taskData.startReminderMinutes !== null || taskData.endReminderMinutes !== null) {
    void requestNotificationAccess();
  }

  saveTasks();
  pendingFiles.length = 0;
  renderDialogFileChips();
  const nextFilter = taskData.category;
  resetTaskDialog();
  elements.taskDialog.close();
  if (editingId) {
    render();
    return;
  }
  setFilter(nextFilter);
});

elements.searchInput.addEventListener("input", () => renderSearch(elements.searchInput.value));
document.querySelector("#taskCategory").addEventListener("change", (event) => {
  if (elements.taskForm.dataset.editingId) return;
  document.querySelector("#taskDate").value =
    event.target.value === "upcoming" ? addDays(localDateString(), 1) : localDateString();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
}

render();
startCloudSync();
startReminderEngine();

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
  if (!stored) return defaultTasks.map(normalizeTask);
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : defaultTasks.map(normalizeTask);
  } catch {
    return defaultTasks.map(normalizeTask);
  }
}

function normalizeTask(task) {
  return {
    ...task,
    date: task.date || localDateString(),
    startReminderMinutes: task.startReminderMinutes ?? null,
    endReminderMinutes: task.endReminderMinutes ?? task.reminderMinutes ?? null,
    files: Array.isArray(task.files) ? task.files : [],
  };
}

function loadSyncMeta() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_META_KEY)) || { updatedAt: 0 };
  } catch {
    return { updatedAt: 0 };
  }
}

function loadReminderMeta() {
  try {
    return JSON.parse(localStorage.getItem(REMINDER_META_KEY)) || {};
  } catch {
    return {};
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

function saveReminderMeta() {
  localStorage.setItem(REMINDER_META_KEY, JSON.stringify(state.reminders));
}

function openTaskDialog(task = null) {
  resetTaskDialog();
  const normalizedTask = task ? normalizeTask(task) : null;
  if (normalizedTask) {
    elements.taskForm.dataset.editingId = normalizedTask.id;
    elements.taskDialogTitle.textContent = "Edit Task";
    elements.taskSubmitButton.textContent = "Save Changes";
    document.querySelector("#taskTitle").value = normalizedTask.title;
    document.querySelector("#taskDetails").value = normalizedTask.details === "No extra details yet." ? "" : normalizedTask.details;
    document.querySelector("#taskDate").value = normalizedTask.date || localDateString();
    document.querySelector("#taskTime").value = normalizedTask.time || "10:00";
    document.querySelector("#taskEndTime").value = normalizedTask.endTime || "";
    document.querySelector("#taskStartReminderMinutes").value = normalizedTask.startReminderMinutes ?? "";
    document.querySelector("#taskEndReminderMinutes").value = normalizedTask.endReminderMinutes ?? "";
    document.querySelector("#taskCategory").value = normalizedTask.category || "today";
    document.querySelector("#taskPriority").value = normalizedTask.priority || "Medium";
    pendingFiles.push(...(normalizedTask.files || []));
    renderDialogFileChips();
  } else {
    const category = state.filter === "completed" || state.filter === "inbox" ? "today" : state.filter;
    document.querySelector("#taskDate").value = category === "upcoming" ? addDays(localDateString(), 1) : localDateString();
    document.querySelector("#taskTime").value = "10:00";
    document.querySelector("#taskCategory").value = category;
  }
  elements.taskDialog.showModal();
  document.querySelector("#taskTitle").focus();
}

function resetTaskDialog() {
  elements.taskForm.reset();
  delete elements.taskForm.dataset.editingId;
  elements.taskDialogTitle.textContent = "New Task";
  elements.taskSubmitButton.textContent = "Create Task";
  pendingFiles.length = 0;
  renderDialogFileChips();
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
  scheduleTaskReminders();
  elements.sectionTitle.textContent = getSectionTitle();
  elements.viewSwitch.style.display = state.filter === "inbox" ? "none" : "";
  elements.sortButton.style.display = state.filter === "completed" || state.filter === "inbox" ? "none" : "";
  if (state.filter === "inbox") {
    renderNotes();
    return;
  }
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
  bindFileActions();
}

function startCloudSync() {
  syncFromCloud({ seedCloudWhenEmpty: true });
  window.addEventListener("online", () => syncFromCloud({ seedCloudWhenEmpty: true }));
  state.syncTimer = window.setInterval(() => syncFromCloud(), SYNC_INTERVAL_MS);
}

async function syncFromCloud(options = {}) {
  try {
    const response = await fetch(
      `${SUPABASE_REST_URL}/${TASKS_TABLE}?id=eq.${TASKS_RECORD_ID}&select=payload,updated_at&limit=1`,
      {
        cache: "no-store",
        headers: supabaseHeaders(),
      },
    );
    if (!response.ok) throw new Error("Sync load failed");

    const rows = await response.json();
    const remote = normalizeRemotePayload(rows[0]?.payload);
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
  state.tasks = tasks.map(normalizeTask);
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
    const payload = {
      tasks: state.tasks,
      updatedAt: state.sync.updatedAt || Date.now(),
    };
    const response = await fetch(`${SUPABASE_REST_URL}/${TASKS_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: supabaseHeaders({
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify({
        id: TASKS_RECORD_ID,
        payload,
        updated_at: new Date(payload.updatedAt).toISOString(),
      }),
    });
    if (!response.ok) throw new Error("Sync save failed");

    const saved = await response.json();
    state.sync.updatedAt = Number(saved[0]?.payload?.updatedAt || state.sync.updatedAt);
    saveSyncMeta();
  } catch {
    // Local changes remain saved and will retry on the next user change/online event.
  }
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    ...extra,
  };
}

function normalizeRemotePayload(payload) {
  return {
    tasks: Array.isArray(payload?.tasks) ? payload.tasks : [],
    updatedAt: Number(payload?.updatedAt || 0),
  };
}

function mergeTasks(remoteTasks, localTasks) {
  const byId = new Map();
  [...remoteTasks, ...localTasks].forEach((task) => {
    if (!task?.id) return;
    byId.set(task.id, normalizeTask({ ...byId.get(task.id), ...task }));
  });
  return [...byId.values()];
}

function renderBoard() {
  const groups = [
    "High",
    "Medium",
    "Low",
  ];
  elements.taskList.innerHTML = groups
    .map((priority) => {
      const tasks = getVisibleTasks().filter((task) => task.priority === priority);
      const cards = tasks.map((task) => taskTemplate(task)).join("") || '<div class="empty-state">Nothing yet.</div>';
      return `<section class="board-column"><h3>${priority}</h3>${cards}</section>`;
    })
    .join("");
  bindTaskButtons();
  bindFileActions();
}

function renderNotes() {
  const notes = state.tasks.filter((t) => t.category === "inbox").sort((a, b) => b.createdAt - a.createdAt);
  const listHtml = notes.length
    ? notes
        .map(
          (note) => `
            <article class="note-card" data-id="${note.id}">
              <p class="note-title">${escapeHtml(note.title)}</p>
              ${note.details && note.details !== "No extra details yet." ? `<p class="note-detail">${escapeHtml(note.details)}</p>` : ""}
              <div class="note-meta">
                <span>${formatTimeAgo(note.createdAt)}</span>
                <button class="text-action" data-note-action="delete" data-id="${note.id}" type="button">Delete</button>
              </div>
            </article>
          `,
        )
        .join("")
    : '<div class="empty-state note-empty">No notes yet. Jot something down below.</div>';

  elements.taskList.className = "note-list";
  elements.taskList.innerHTML = `
    <div class="note-composer inset">
      <textarea id="noteInput" placeholder="Write a quick note..." rows="3" maxlength="300"></textarea>
      <div class="note-composer-footer">
        <span class="field-hint" id="noteCharCount">0 / 300</span>
        <button class="primary-button" id="saveNoteButton" type="button">Save Note</button>
      </div>
    </div>
    ${listHtml}
  `;

  const noteInput = document.querySelector("#noteInput");
  const saveBtn = document.querySelector("#saveNoteButton");
  const charCount = document.querySelector("#noteCharCount");

  noteInput.addEventListener("input", () => {
    charCount.textContent = `${noteInput.value.length} / 300`;
  });

  saveBtn.addEventListener("click", () => {
    const text = noteInput.value.trim();
    if (!text) return;
    state.tasks.unshift({
      id: createId(),
      title: text.slice(0, 80),
      details: text.length > 80 ? text : "",
      date: localDateString(),
      time: "",
      endTime: "",
      startReminderMinutes: null,
      endReminderMinutes: null,
      priority: "Low",
      category: "inbox",
      files: [],
      team: "",
      completed: false,
      createdAt: Date.now(),
    });
    saveTasks();
    render();
  });

  noteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveBtn.click();
    }
  });

  document.querySelectorAll("[data-note-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.tasks = state.tasks.filter((t) => t.id !== btn.dataset.id);
      saveTasks();
      render();
    });
  });
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function renderStats() {
  const today = state.tasks.filter((task) => task.category === "today");
  const pending = state.tasks.filter((task) => !task.completed && task.category !== "inbox").length;
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
  if (state.sortBy === "priority") {
    return (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99) || b.createdAt - a.createdAt;
  }
  if (state.sortBy === "time") {
    return minutesFromTime(a.time) - minutesFromTime(b.time) || b.createdAt - a.createdAt;
  }
  if (state.sortBy === "newest") {
    return b.createdAt - a.createdAt;
  }
  // auto: completed last → date → priority → time → created
  return (
    Number(a.completed) - Number(b.completed) ||
    dateRank(a.date) - dateRank(b.date) ||
    (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99) ||
    minutesFromTime(a.time) - minutesFromTime(b.time) ||
    b.createdAt - a.createdAt
  );
}

function getSectionTitle() {
  const titles = {
    today: window.matchMedia("(max-width: 880px)").matches ? "Today" : "Today's Focus",
    inbox: "Notes",
    upcoming: "Upcoming",
    completed: "Completed",
  };
  return titles[state.filter] ?? "Tasks";
}

function taskTemplate(task) {
  const normalizedTask = normalizeTask(task);
  const completed = normalizedTask.completed ? " completed" : "";
  const priority = normalizedTask.priority.toLowerCase();
  const reminderLabel = formatReminderSummary(normalizedTask);
  const meta = normalizedTask.completed
    ? `<span>${iconInline("check-circle")} Completed${task.completedAt ? ` at ${task.completedAt}` : ""}</span>`
    : `
      <span>${iconInline("clock")} ${formatTimeRange(normalizedTask)}</span>
      ${reminderLabel ? `<span>${iconInline("bell")} ${escapeHtml(reminderLabel)}</span>` : ""}
      ${normalizedTask.files && normalizedTask.files.length ? renderTaskFileChips(normalizedTask.files) : ""}
      ${normalizedTask.team ? `<span class="team-meta">${iconInline("group")} ${escapeHtml(normalizedTask.team)}</span>` : ""}
    `;

  return `
    <article class="task-card${completed}" data-id="${normalizedTask.id}">
      <button class="task-toggle" data-action="toggle" type="button" aria-label="${normalizedTask.completed ? "Mark incomplete" : "Mark complete"}">
        ${normalizedTask.completed ? iconInline("check") : ""}
      </button>
      <div class="task-main">
        <div class="task-top">
          <h3 class="task-title">${escapeHtml(normalizedTask.title)}</h3>
          <span class="priority ${priority}">${escapeHtml(normalizedTask.priority)}</span>
        </div>
        <p class="task-detail">${escapeHtml(normalizedTask.details)}</p>
        <div class="task-meta">
          ${meta}
          <span class="task-menu">
            <button class="text-action" data-action="edit" type="button">Edit</button>
            <button class="text-action duplicate-action" data-action="duplicate" type="button">Duplicate</button>
            <button class="text-action" data-action="delete" type="button">Delete</button>
          </span>
        </div>
      </div>
    </article>
  `;
}

function openTaskDetail(task) {
  const t = normalizeTask(task);
  elements.detailTitle.textContent = t.title;
  const files = Array.isArray(t.files) ? t.files : [];

  elements.detailBody.innerHTML = `
    <div class="detail-section">
      <div class="detail-meta">
        <span class="detail-badge ${t.priority.toLowerCase()}">${escapeHtml(t.priority)}</span>
        <span>${iconInline("clock")} ${formatTimeRange(t)}</span>
        <span>${iconInline("calendar")} ${t.category === "today" ? "Today" : t.category === "upcoming" ? "Upcoming" : "Inbox"}</span>
        ${t.completed ? `<span>${iconInline("check-circle")} Completed${t.completedAt ? " · " + t.completedAt : ""}</span>` : ""}
      </div>
      <p class="detail-description">${escapeHtml(t.details)}</p>
    </div>
    ${files.length ? `
      <div class="detail-section">
        <h3>Attachments (${files.length})</h3>
        <div class="detail-files">
          ${files.map((f) => `
            <div class="detail-file-card" data-file-id="${f.id}">
              ${isImageType(f.type)
                ? `<img class="detail-file-preview" src="" data-file-id="${f.id}" alt="${escapeHtml(f.name)}" />`
                : `<div class="detail-file-icon">${iconInline("file")}</div>`}
              <div class="detail-file-info">
                <span class="detail-file-name">${escapeHtml(f.name)}</span>
                <span class="detail-file-size">${formatSize(f.size)}</span>
              </div>
              <button class="soft-button detail-file-download" data-file-id="${f.id}" type="button">Download</button>
            </div>
          `).join("")}
        </div>
      </div>
    ` : '<p class="detail-no-files">No attachments.</p>'}
    <menu class="detail-actions">
      <button class="soft-button" id="detailEditButton" type="button">Edit</button>
      <button class="primary-button" id="detailCloseBottom" type="button">Close</button>
    </menu>
  `;

  // Load image previews
  elements.detailBody.querySelectorAll(".detail-file-preview[data-file-id]").forEach((img) => {
    const id = img.dataset.fileId;
    loadFile(id).then((record) => {
      if (record) {
        const blob = new Blob([record.data], { type: record.type });
        img.src = URL.createObjectURL(blob);
      }
    });
  });

  // Download buttons
  elements.detailBody.querySelectorAll(".detail-file-download[data-file-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const record = await loadFile(btn.dataset.fileId);
      if (!record) return;
      const blob = new Blob([record.data], { type: record.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  document.querySelector("#detailEditButton").addEventListener("click", () => {
    elements.detailDialog.close();
    openTaskDialog(task);
  });

  document.querySelector("#detailCloseBottom").addEventListener("click", () => {
    elements.detailDialog.close();
  });

  elements.detailDialog.showModal();
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
      if (button.dataset.action === "edit") {
        openTaskDialog(task);
        return;
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
        const task = state.tasks.find((item) => item.id === id);
        if (task && Array.isArray(task.files) && task.files.length) {
          removeFiles(task.files.map((f) => f.id));
        }
        state.tasks = state.tasks.filter((item) => item.id !== id);
      }
      saveTasks();
      render();
    });
  });
}

function formatTimeRange(task) {
  const start = formatTime(task.time);
  const range = task.endTime ? `${start} - ${formatTime(task.endTime)}` : start;
  return task.date && task.date !== localDateString() ? `${formatDate(task.date)} · ${range}` : range;
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
  const dueAt = getTaskDueAt(task) || getTaskStartAt(task);
  return Boolean(dueAt && dueAt.getTime() < Date.now());
}

function scheduleTaskReminders() {
  state.reminderTimers.forEach((timer) => window.clearTimeout(timer));
  state.reminderTimers.clear();

  checkDueReminders();

  getPendingReminderEvents().forEach((reminder) => {
    const delay = reminder.reminderAt - Date.now();
    if (delay <= 0 || delay > MAX_TIMEOUT_MS) return;

    const timer = window.setTimeout(() => {
      checkDueReminders();
    }, delay);
    state.reminderTimers.set(reminder.key, timer);
  });
}

function startReminderEngine() {
  checkDueReminders();
  window.clearInterval(state.reminderScanTimer);
  state.reminderScanTimer = window.setInterval(checkDueReminders, REMINDER_SCAN_INTERVAL_MS);
  window.addEventListener("focus", checkDueReminders);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDueReminders();
  });
}

function checkDueReminders() {
  const now = Date.now();
  getPendingReminderEvents()
    .filter((reminder) => reminder.reminderAt <= now)
    .filter((reminder) => !expireStaleReminder(reminder, now))
    .forEach((reminder) => {
      void notifyTaskReminder(reminder);
    });
}

async function notifyTaskReminder(reminder) {
  const task = state.tasks.find((item) => item.id === reminder.taskId);
  if (!task || task.completed || getReminderKey(task, reminder.type) !== reminder.key) return;

  const didShow = await showTaskNotification(task, reminder.type);
  if (!didShow) return;
  state.reminders[reminder.key] = Date.now();
  saveReminderMeta();
}

async function showTaskNotification(task, type) {
  const title = "TaskFlow reminder";
  const targetTime = type === "start" ? task.time : task.endTime;
  const body =
    type === "start"
      ? `${task.title} starts at ${formatTime(targetTime)}.`
      : `${task.title} is due at ${formatTime(targetTime)}.`;

  if (!("Notification" in window)) {
    window.alert(`${title}\n${body}`);
    return true;
  }

  if (Notification.permission === "default") {
    await requestNotificationAccess();
  }

  if (Notification.permission !== "granted") {
    window.alert(`${title}\n${body}`);
    return true;
  }

  const options = {
    body,
    icon: "assets/icon-192.png",
    badge: "assets/icon-192.png",
    tag: `taskflow-${task.id}-${type}`,
  };

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    } catch {
      new Notification(title, options);
      return true;
    }
  }

  new Notification(title, options);
  return true;
}

async function requestNotificationAccess() {
  if (!("Notification" in window) || Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // Permission can still be granted later from browser settings.
  }
}

function getPendingReminderEvents() {
  return state.tasks.flatMap(getTaskReminderEvents).filter((reminder) => !state.reminders[reminder.key]);
}

function getTaskReminderEvents(task) {
  const normalizedTask = normalizeTask(task);
  if (normalizedTask.completed) return [];
  const reminders = [];
  const startAt = getTaskStartAt(normalizedTask);
  const dueAt = getTaskDueAt(normalizedTask);

  if (normalizedTask.startReminderMinutes !== null && startAt) {
    reminders.push(createReminderEvent(normalizedTask, "start", startAt, normalizedTask.startReminderMinutes));
  }

  if (normalizedTask.endReminderMinutes !== null && dueAt) {
    reminders.push(createReminderEvent(normalizedTask, "end", dueAt, normalizedTask.endReminderMinutes));
  }

  return reminders.filter(Boolean);
}

function createReminderEvent(task, type, targetAt, minutes) {
  if (minutes === null || minutes === undefined) return null;
  return {
    taskId: task.id,
    type,
    key: getReminderKey(task, type),
    reminderAt: targetAt.getTime() - Number(minutes) * 60000,
  };
}

function expireStaleReminder(reminder, now) {
  if (now - reminder.reminderAt <= REMINDER_STALE_GRACE_MS) return false;
  state.reminders[reminder.key] = now;
  saveReminderMeta();
  return true;
}

function getTaskTimingError(task) {
  const startAt = getTaskStartAt(task);
  const dueAt = getTaskDueAt(task);
  if (!startAt) return "Please choose a valid start time.";
  if (dueAt && dueAt.getTime() <= startAt.getTime()) {
    return "End time must be later than start time.";
  }
  if (task.startReminderMinutes !== null && startAt.getTime() <= Date.now()) {
    return "Start time must be in the future when a start reminder is enabled.";
  }
  if (task.endReminderMinutes !== null && dueAt && dueAt.getTime() <= Date.now()) {
    return "End time must be in the future when an end reminder is enabled.";
  }
  return "";
}

function getReminderTimingError(task) {
  const events = getTaskReminderEvents({
    id: "draft",
    completed: false,
    ...task,
  });
  const now = Date.now();
  const invalid = events.find((reminder) => reminder.reminderAt <= now);
  if (!invalid) return "";

  const label = invalid.type === "start" ? "Start reminder" : "End reminder";
  return `${label} time has already passed. Please choose a later task time or fewer reminder minutes.`;
}

function getReminderKey(task, type) {
  const normalizedTask = normalizeTask(task);
  const targetTime = type === "start" ? normalizedTask.time : normalizedTask.endTime;
  const minutes = type === "start" ? normalizedTask.startReminderMinutes : normalizedTask.endReminderMinutes;
  return [normalizedTask.id, type, normalizedTask.date || localDateString(), targetTime || "", minutes ?? "", normalizedTask.title || ""].join("|");
}

function getTaskDueAt(task) {
  if (!task.endTime) return null;
  return dateTimeFromParts(task.date || localDateString(), task.endTime);
}

function getTaskStartAt(task) {
  if (!task.time) return null;
  return dateTimeFromParts(task.date || localDateString(), task.time);
}

function dateTimeFromParts(date, time) {
  if (!date || !time) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function parseReminderMinutes(value) {
  if (value === "") return null;
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return null;
  return Math.max(0, Math.min(1440, Math.round(minutes)));
}

function formatReminderSummary(task) {
  const labels = [];
  if (task.startReminderMinutes !== null && task.startReminderMinutes !== undefined) {
    labels.push(`Start: ${formatReminderOffset(task.startReminderMinutes)}`);
  }
  if (task.endReminderMinutes !== null && task.endReminderMinutes !== undefined) {
    labels.push(`End: ${formatReminderOffset(task.endReminderMinutes)}`);
  }
  return labels.join(" / ");
}

function formatReminderOffset(minutes) {
  const value = Number(minutes);
  return value === 0 ? "At time" : `${value} min before`;
}

function formatDate(value) {
  const date = dateTimeFromParts(value, "00:00");
  if (!date) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function dateRank(value) {
  const date = dateTimeFromParts(value || localDateString(), "00:00");
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value, days) {
  const date = dateTimeFromParts(value, "00:00") || new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function iconInline(name) {
  return `<span class="icon">${icons[name] ?? ""}</span>`;
}

function renderTaskFileChips(files) {
  if (!files || !files.length) return "";
  const shown = files.slice(0, 3);
  const overflow = files.length > 3 ? `<span class="file-overflow">+${files.length - 3} more</span>` : "";
  return shown.map((f) => `
    <span class="task-file-chip" data-file-id="${f.id}">
      ${isImageType(f.type) ? `<img class="task-file-thumb" src="" data-file-id="${f.id}" alt="${escapeHtml(f.name)}" />` : iconInline("file")}
      <a class="file-download-link" href="#" data-file-id="${f.id}" title="${escapeHtml(f.name)}">${escapeHtml(truncate(f.name, 16))}</a>
    </span>
  `).join("") + overflow;
}

function bindFileActions() {
  document.querySelectorAll(".task-file-thumb[data-file-id]").forEach((img) => {
    const id = img.dataset.fileId;
    if (img.src) return;
    loadFile(id).then((record) => {
      if (record) {
        const blob = new Blob([record.data], { type: record.type });
        img.src = URL.createObjectURL(blob);
      }
    });
  });

  document.querySelectorAll(".file-download-link[data-file-id]").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const record = await loadFile(link.dataset.fileId);
      if (!record) return;
      const blob = new Blob([record.data], { type: record.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[character];
  });
}
