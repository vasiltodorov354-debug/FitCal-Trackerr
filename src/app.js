import { SCHEDULE } from "./data.js";

const STORAGE_KEY = "workout-tracker-state";

const scheduleEl = document.querySelector("#schedule");
const resetButton = document.querySelector("#reset-button");
const expandAllButton = document.querySelector("#expand-all");
const collapseAllButton = document.querySelector("#collapse-all");

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

const today = new Date().getDay();
const todayIndex = today >= 1 && today <= 5 ? today - 1 : null;

const createTag = (tag) => {
  const span = document.createElement("span");
  span.className =
    "rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300";
  span.textContent = tag;
  return span;
};

const buildIcon = (path) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("fill", "currentColor");
  svg.classList.add("h-4", "w-4");

  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  svg.appendChild(p);
  return svg;
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
  const percentText = cardEl.querySelector("[data-progress-percent]");

  if (label) {
    label.textContent = `Прогрес: ${completed} от ${total}`;
  }

  if (percentText) {
    percentText.textContent = `${percent}%`;
  }

  if (bar) {
    bar.style.width = `${percent}%`;
  }
};

const setTasksForDay = (dayIndex, checked) => {
  SCHEDULE[dayIndex].blocks.forEach((_, taskIndex) => {
    const id = makeTaskId(dayIndex, taskIndex);
    state[id] = checked;
  });
  saveState(state);
};

const updateDayCheckboxes = (cardEl, dayIndex) => {
  const checkboxes = cardEl.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach((checkbox, taskIndex) => {
    const id = makeTaskId(dayIndex, taskIndex);
    checkbox.checked = Boolean(state[id]);
  });
};

const toggleAccordion = (cardEl, expanded) => {
  const tasksWrapper = cardEl.querySelector("[data-tasks]");
  const icon = cardEl.querySelector("[data-accordion-icon]");
  if (!tasksWrapper || !icon) {
    return;
  }

  const isExpanded = expanded ?? tasksWrapper.classList.contains("hidden") === false;
  if (isExpanded) {
    tasksWrapper.classList.remove("hidden");
    icon.classList.remove("rotate-180");
  } else {
    tasksWrapper.classList.add("hidden");
    icon.classList.add("rotate-180");
  }
};

const renderSchedule = () => {
  scheduleEl.innerHTML = "";

  SCHEDULE.forEach((day, dayIndex) => {
    const card = document.createElement("article");
    const isToday = todayIndex === dayIndex;
    card.className =
      "relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl transition hover:border-slate-700";

    if (isToday) {
      card.classList.add("ring-1", "ring-emerald-400/40");
    }

    const gradient = document.createElement("div");
    gradient.className =
      "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-emerald-500/10 via-sky-500/5 to-transparent";

    const header = document.createElement("div");
    header.className = "relative px-6 pb-5 pt-6";

    const titleRow = document.createElement("div");
    titleRow.className = "flex flex-wrap items-start justify-between gap-4";

    const titleBlock = document.createElement("div");

    const title = document.createElement("h2");
    title.className = "text-xl font-semibold text-white";
    title.textContent = `Ден ${day.day}: ${day.title}`;

    const subtitle = document.createElement("p");
    subtitle.className = "mt-1 text-sm text-slate-400";
    subtitle.textContent = `Времетраене: ${day.duration}`;

    titleBlock.append(title, subtitle);

    const metaBlock = document.createElement("div");
    metaBlock.className = "flex flex-col items-end gap-2 text-right";

    const percentText = document.createElement("span");
    percentText.className = "text-sm font-semibold text-emerald-300";
    percentText.dataset.progressPercent = "true";

    const progressText = document.createElement("span");
    progressText.className = "text-xs text-slate-400";
    progressText.dataset.progressLabel = "true";

    const progressBarTrack = document.createElement("div");
    progressBarTrack.className = "h-2 w-32 overflow-hidden rounded-full bg-slate-800";

    const progressBar = document.createElement("div");
    progressBar.className = "h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-sky-400 transition-all";
    progressBar.dataset.progressBar = "true";

    progressBarTrack.appendChild(progressBar);
    metaBlock.append(percentText, progressText, progressBarTrack);

    titleRow.append(titleBlock, metaBlock);

    const tagRow = document.createElement("div");
    tagRow.className = "mt-4 flex flex-wrap items-center gap-2";
    day.tags.forEach((tag) => tagRow.appendChild(createTag(tag)));

    if (isToday) {
      const todayBadge = document.createElement("span");
      todayBadge.className =
        "rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200";
      todayBadge.textContent = "Днес";
      tagRow.appendChild(todayBadge);
    }

    const actionsRow = document.createElement("div");
    actionsRow.className = "mt-5 flex flex-wrap gap-3";

    const markAllButton = document.createElement("button");
    markAllButton.type = "button";
    markAllButton.className =
      "inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20";
    markAllButton.append(
      buildIcon(
        "M16.704 5.29a1 1 0 0 1 .006 1.414l-7.374 7.44a1 1 0 0 1-1.43.012L3.3 9.59a1 1 0 1 1 1.4-1.428l4.01 3.932 6.666-6.714a1 1 0 0 1 1.328-.09Z"
      )
    );
    markAllButton.append("Маркирай всички");

    const clearDayButton = document.createElement("button");
    clearDayButton.type = "button";
    clearDayButton.className =
      "inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-rose-300/60 hover:text-white";
    clearDayButton.append(
      buildIcon(
        "M6 7a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm2-4a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Zm-1 8a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0v-4Zm5 0a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0v-4Z"
      )
    );
    clearDayButton.append("Изчисти деня");

    actionsRow.append(markAllButton, clearDayButton);

    const accordionButton = document.createElement("button");
    accordionButton.type = "button";
    accordionButton.className =
      "ml-auto inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500";

    const accordionIcon = document.createElement("span");
    accordionIcon.className =
      "inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-transform";
    accordionIcon.dataset.accordionIcon = "true";
    accordionIcon.append(
      buildIcon(
        "M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
      )
    );

    const accordionText = document.createElement("span");
    accordionText.textContent = "Детайли";

    accordionButton.append(accordionText, accordionIcon);

    const headerFooter = document.createElement("div");
    headerFooter.className = "mt-5 flex flex-wrap items-center gap-3";
    headerFooter.append(actionsRow, accordionButton);

    header.append(titleRow, tagRow, headerFooter);

    const tasksWrapper = document.createElement("div");
    tasksWrapper.className = "border-t border-slate-800/80 px-6 pb-6";
    tasksWrapper.dataset.tasks = "true";

    const tasksList = document.createElement("ul");
    tasksList.className = "mt-5 grid gap-3";

    day.blocks.forEach((task, taskIndex) => {
      const id = makeTaskId(dayIndex, taskIndex);
      const li = document.createElement("li");
      li.className =
        "flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 transition hover:border-slate-700";

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

      li.append(checkbox, text);
      tasksList.appendChild(li);
    });

    tasksWrapper.appendChild(tasksList);

    card.append(gradient, header, tasksWrapper);
    scheduleEl.appendChild(card);

    markAllButton.addEventListener("click", () => {
      setTasksForDay(dayIndex, true);
      updateDayCheckboxes(card, dayIndex);
      updateProgress(card, dayIndex);
    });

    clearDayButton.addEventListener("click", () => {
      setTasksForDay(dayIndex, false);
      updateDayCheckboxes(card, dayIndex);
      updateProgress(card, dayIndex);
    });

    accordionButton.addEventListener("click", () => {
      const isCollapsed = tasksWrapper.classList.contains("hidden");
      toggleAccordion(card, isCollapsed);
    });

    updateProgress(card, dayIndex);
  });
};

const setAllAccordions = (expanded) => {
  const cards = scheduleEl.querySelectorAll("article");
  cards.forEach((card) => toggleAccordion(card, expanded));
};

resetButton.addEventListener("click", () => {
  state = {};
  saveState(state);
  renderSchedule();
});

expandAllButton.addEventListener("click", () => {
  setAllAccordions(true);
});

collapseAllButton.addEventListener("click", () => {
  setAllAccordions(false);
});

renderSchedule();
