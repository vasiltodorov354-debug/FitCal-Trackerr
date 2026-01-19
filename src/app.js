import { SCHEDULE } from "./data.js";

const STORAGE_KEY = "workout-tracker-state";

const scheduleEl = document.querySelector("#schedule");
const resetButton = document.querySelector("#reset-button");

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const makeTaskId = (dayIndex, taskIndex) => `day-${dayIndex}-task-${taskIndex}`;

let state = loadState();

const createTag = (tag) => {
  const span = document.createElement("span");
  span.className =
    "rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300";
  span.textContent = tag;
  return span;
};

const updateProgress = (cardEl, dayIndex) => {
  const total = SCHEDULE[dayIndex].blocks.length;
  const completed = SCHEDULE[dayIndex].blocks.reduce((count, _, taskIndex) => {
    const id = makeTaskId(dayIndex, taskIndex);
    return count + (state[id] ? 1 : 0);
  }, 0);

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const label = cardEl.querySelector("[data-progress-label]");
  const bar = cardEl.querySelector("[data-progress-bar]");

  if (label) {
    label.textContent = `${percent}% (${completed}/${total})`;
  }

  if (bar) {
    bar.style.width = `${percent}%`;
  }
};

const renderSchedule = () => {
  scheduleEl.innerHTML = "";

  SCHEDULE.forEach((day, dayIndex) => {
    const card = document.createElement("article");
    card.className = "rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg";

    const headerButton = document.createElement("button");
    headerButton.type = "button";
    headerButton.className =
      "flex w-full items-start justify-between gap-4 rounded-2xl px-6 py-5 text-left transition hover:bg-slate-900";

    const headerContent = document.createElement("div");

    const title = document.createElement("h2");
    title.className = "text-xl font-semibold";
    title.textContent = `Day ${day.day}: ${day.title}`;

    const tags = document.createElement("div");
    tags.className = "mt-2 flex flex-wrap gap-2";
    day.tags.forEach((tag) => tags.appendChild(createTag(tag)));

    headerContent.append(title, tags);

    const meta = document.createElement("div");
    meta.className = "flex flex-col items-end gap-2 text-right";

    const duration = document.createElement("span");
    duration.className = "text-sm text-slate-400";
    duration.textContent = day.duration;

    const progressText = document.createElement("span");
    progressText.className = "text-sm font-semibold text-emerald-300";
    progressText.dataset.progressLabel = "true";

    const progressBarTrack = document.createElement("div");
    progressBarTrack.className = "h-2 w-32 overflow-hidden rounded-full bg-slate-800";

    const progressBar = document.createElement("div");
    progressBar.className = "h-full rounded-full bg-emerald-400 transition-all";
    progressBar.dataset.progressBar = "true";

    progressBarTrack.appendChild(progressBar);
    meta.append(duration, progressText, progressBarTrack);

    headerButton.append(headerContent, meta);

    const tasksWrapper = document.createElement("div");
    tasksWrapper.className = "px-6 pb-6";

    const tasksList = document.createElement("ul");
    tasksList.className = "mt-2 grid gap-3";

    day.blocks.forEach((task, taskIndex) => {
      const id = makeTaskId(dayIndex, taskIndex);
      const li = document.createElement("li");
      li.className = "rounded-xl border border-slate-800 bg-slate-900/40 p-4";

      const label = document.createElement("label");
      label.className = "flex items-start gap-3";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className =
        "mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-400";
      checkbox.checked = Boolean(state[id]);
      checkbox.addEventListener("change", () => {
        state[id] = checkbox.checked;
        saveState(state);
        updateProgress(card, dayIndex);
      });

      const text = document.createElement("span");
      text.className = "text-slate-200";
      text.textContent = task;

      label.append(checkbox, text);
      li.appendChild(label);
      tasksList.appendChild(li);
    });

    tasksWrapper.appendChild(tasksList);

    const accordionIcon = document.createElement("span");
    accordionIcon.className =
      "ml-4 mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-300";
    accordionIcon.textContent = "−";

    headerButton.appendChild(accordionIcon);

    headerButton.addEventListener("click", () => {
      const isHidden = tasksWrapper.classList.toggle("hidden");
      accordionIcon.textContent = isHidden ? "+" : "−";
    });

    card.append(headerButton, tasksWrapper);
    scheduleEl.appendChild(card);

    updateProgress(card, dayIndex);
  });
};

resetButton.addEventListener("click", () => {
  state = {};
  saveState(state);
  renderSchedule();
});

renderSchedule();
