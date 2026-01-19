import { SCHEDULE } from "./data.js";

const STORAGE_KEYS = {
  sessions: "fitcal_sessions_v1",
  activeSession: "fitcal_active_session_v1",
  prs: "fitcal_prs_v1",
  skills: "fitcal_skills_v1",
};

const appEl = document.querySelector("#app");
const resetButton = document.querySelector("#reset-button");
const navTabs = Array.from(document.querySelectorAll(".nav-tab"));

const CARDIO_PRESETS = ["Стълби", "Бягане", "Вело", "Друго"];
const TIMER_PRESETS = [30, 60, 90, 120, 180];

const loadJSON = (key, fallback) => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const todayIndex = (() => {
  const day = new Date().getDay();
  return day >= 1 && day <= 5 ? day - 1 : 0;
})();

const state = {
  view: "workout",
  programDayIndex: todayIndex,
  workoutDayIndex: todayIndex,
  activeSession: loadJSON(STORAGE_KEYS.activeSession, null),
  sessions: loadJSON(STORAGE_KEYS.sessions, []),
  prs: loadJSON(STORAGE_KEYS.prs, []),
  skills: loadJSON(STORAGE_KEYS.skills, []),
};

const persistAll = () => {
  saveJSON(STORAGE_KEYS.activeSession, state.activeSession);
  saveJSON(STORAGE_KEYS.sessions, state.sessions);
  saveJSON(STORAGE_KEYS.prs, state.prs);
  saveJSON(STORAGE_KEYS.skills, state.skills);
};

const createSession = (dayIndex) => {
  const day = SCHEDULE[dayIndex];
  const categories = day.recovery
    ? {}
    : {
        skill: { label: "Скил", entries: [], completed: false },
        strength: { label: "Сила", entries: [], completed: false },
        volume: { label: "Обем", entries: [], completed: false },
        cardio: {
          label: "Кардио",
          entries: [],
          completed: false,
          cardioType: CARDIO_PRESETS[0],
          minutes: day.categories.cardio.minutes ?? 30,
          pulse: "",
        },
      };

  return {
    id: crypto.randomUUID(),
    dayIndex,
    startTime: new Date().toISOString(),
    endTime: null,
    categories,
    timer: {
      duration: 60,
      remaining: 60,
      running: false,
      lastTick: null,
    },
  };
};

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString("bg-BG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatDuration = (start, end) => {
  if (!start || !end) return "--";
  const diff = new Date(end) - new Date(start);
  const minutes = Math.max(0, Math.round(diff / 60000));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  return `${hours} ч ${mins} мин`;
};

const getSessionExerciseCount = (session) =>
  Object.values(session.categories || {}).reduce(
    (sum, cat) => sum + (cat.entries?.length ?? 0),
    0
  );

const getCompletedCategories = (session) =>
  Object.values(session.categories || {}).filter((cat) => cat.completed).length;

const updateNav = () => {
  navTabs.forEach((tab) => {
    const isActive = tab.dataset.view === state.view;
    tab.className =
      "nav-tab inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition" +
      (isActive
        ? " border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
        : " border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white");
  });
};

const renderDayChips = (selectedIndex, onSelect) => {
  const container = document.createElement("div");
  container.className = "flex flex-wrap gap-2";

  SCHEDULE.forEach((day, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Ден ${day.day}`;
    button.className =
      "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition" +
      (selectedIndex === index
        ? " border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
        : " border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white");
    button.addEventListener("click", () => onSelect(index));
    container.appendChild(button);
  });

  return container;
};

const renderProgramView = () => {
  const day = SCHEDULE[state.programDayIndex];
  const wrapper = document.createElement("section");
  wrapper.className = "grid gap-6";

  const pickerCard = document.createElement("div");
  pickerCard.className = "rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg";
  const pickerTitle = document.createElement("h2");
  pickerTitle.className = "text-lg font-semibold text-white";
  pickerTitle.textContent = "Програма";
  pickerCard.append(pickerTitle, renderDayChips(state.programDayIndex, (index) => {
    state.programDayIndex = index;
    renderApp();
  }));

  const dayCard = document.createElement("div");
  dayCard.className =
    "relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-6 shadow-xl";

  const dayHeader = document.createElement("div");
  dayHeader.className = "flex flex-wrap items-center justify-between gap-4";
  const dayInfo = document.createElement("div");
  const dayTitle = document.createElement("h3");
  dayTitle.className = "text-2xl font-semibold text-white";
  dayTitle.textContent = `Ден ${day.day}: ${day.title}`;
  const tagRow = document.createElement("div");
  tagRow.className = "mt-2 flex flex-wrap gap-2";
  day.tags.forEach((tag) => {
    const tagEl = document.createElement("span");
    tagEl.className =
      "rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300";
    tagEl.textContent = tag;
    tagRow.appendChild(tagEl);
  });
  dayInfo.append(dayTitle, tagRow);

  const dayMeta = document.createElement("div");
  dayMeta.className = "text-sm text-slate-300";
  dayMeta.textContent = day.recovery ? "Лек ден" : "Фокус върху форма и прогрес.";

  dayHeader.append(dayInfo, dayMeta);
  dayCard.appendChild(dayHeader);

  const content = document.createElement("div");
  content.className = "mt-6 grid gap-4";

  if (day.recovery) {
    const recoveryCard = document.createElement("div");
    recoveryCard.className =
      "rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-slate-200";
    recoveryCard.textContent = day.recovery;
    content.appendChild(recoveryCard);
  } else {
    const categories = [
      { key: "skill", label: "Скил" },
      { key: "strength", label: "Сила" },
      { key: "volume", label: "Обем" },
      { key: "cardio", label: "Кардио" },
    ];

    categories.forEach((category) => {
      const card = document.createElement("div");
      card.className =
        "rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm";
      const title = document.createElement("div");
      title.className = "text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300";
      title.textContent = category.label;
      const desc = document.createElement("p");
      desc.className = "mt-2 text-slate-200";
      if (category.key === "cardio") {
        desc.textContent = "Кардио с акцент върху издръжливост.";
      } else {
        desc.textContent = day.categories[category.key];
      }
      card.append(title, desc);
      content.appendChild(card);
    });
  }

  wrapper.append(pickerCard, dayCard, content);
  return wrapper;
};

const renderWorkoutView = () => {
  const day = SCHEDULE[state.workoutDayIndex];
  const wrapper = document.createElement("section");
  wrapper.className = "grid gap-6";

  const headerCard = document.createElement("div");
  headerCard.className =
    "rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 shadow-lg";

  const headerTop = document.createElement("div");
  headerTop.className = "flex flex-wrap items-center justify-between gap-4";

  const headerTitle = document.createElement("div");
  const title = document.createElement("h2");
  title.className = "text-2xl font-semibold text-white";
  title.textContent = "Тренировка";
  const subtitle = document.createElement("p");
  subtitle.className = "mt-2 text-slate-300";
  subtitle.textContent = day.recovery
    ? "Възстановителен ден със спокоен темп."
    : "Фокусирай се върху качеството на изпълнение.";
  headerTitle.append(title, subtitle);

  headerTop.append(headerTitle, renderDayChips(state.workoutDayIndex, (index) => {
    state.workoutDayIndex = index;
    if (!state.activeSession) {
      renderApp();
    }
  }));

  headerCard.appendChild(headerTop);
  wrapper.appendChild(headerCard);

  if (!state.activeSession) {
    const startCard = document.createElement("div");
    startCard.className = "rounded-3xl border border-slate-800 bg-slate-900/60 p-6";
    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className =
      "inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-400/20 px-6 py-4 text-lg font-semibold text-emerald-100 ring-1 ring-emerald-300/30 transition hover:bg-emerald-400/30";
    startButton.innerHTML =
      "<span>Започни тренировка</span>" +
      "<svg aria-hidden='true' class='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'><path d='M7.5 4.5a1 1 0 0 1 1.5-.87l6 3.5a1 1 0 0 1 0 1.74l-6 3.5A1 1 0 0 1 7.5 12V4.5Z'/></svg>";
    startButton.addEventListener("click", () => {
      state.activeSession = createSession(state.workoutDayIndex);
      persistAll();
      renderApp();
    });
    startCard.appendChild(startButton);
    wrapper.appendChild(startCard);
    return wrapper;
  }

  const session = state.activeSession;
  const sessionInfo = document.createElement("div");
  sessionInfo.className = "rounded-3xl border border-slate-800 bg-slate-900/60 p-6";
  const sessionTitle = document.createElement("h3");
  sessionTitle.className = "text-xl font-semibold text-white";
  sessionTitle.textContent = `Активна сесия - Ден ${SCHEDULE[session.dayIndex].day}`;
  const sessionMeta = document.createElement("p");
  sessionMeta.className = "mt-2 text-slate-400";
  sessionMeta.textContent = `Старт: ${formatDate(session.startTime)}`;
  sessionInfo.append(sessionTitle, sessionMeta);

  const categoryContainer = document.createElement("div");
  categoryContainer.className = "mt-6 grid gap-4";

  if (SCHEDULE[session.dayIndex].recovery) {
    const recovery = document.createElement("div");
    recovery.className = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";
    recovery.textContent = SCHEDULE[session.dayIndex].recovery;
    categoryContainer.appendChild(recovery);
  } else {
    Object.entries(session.categories).forEach(([key, category]) => {
      const card = document.createElement("div");
      card.className = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";

      const header = document.createElement("div");
      header.className = "flex flex-wrap items-center justify-between gap-3";
      const title = document.createElement("h4");
      title.className = "text-lg font-semibold text-white";
      title.textContent = category.label;
      const status = document.createElement("span");
      status.className =
        "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]" +
        (category.completed
          ? " border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
          : " border-slate-700 text-slate-300");
      status.textContent = category.completed ? "Готово" : "В процес";
      header.append(title, status);

      const inputs = document.createElement("div");
      inputs.className = "mt-4 grid gap-3 md:grid-cols-2";

      const makeInput = (labelText, placeholder = "") => {
        const wrapper = document.createElement("label");
        wrapper.className = "grid gap-2 text-sm text-slate-300";
        const label = document.createElement("span");
        label.textContent = labelText;
        const input = document.createElement("input");
        input.className =
          "w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none";
        input.placeholder = placeholder;
        wrapper.append(label, input);
        return { wrapper, input };
      };

      const exerciseInput = makeInput("Упражнение", "Напр. набирания");
      const setsInput = makeInput("Серии", "3");
      const repsInput = makeInput("Повторения", "8");
      const weightInput = makeInput("Тежест (кг)", "по желание");
      const notesInput = makeInput("Бележки", "по желание");

      inputs.append(
        exerciseInput.wrapper,
        setsInput.wrapper,
        repsInput.wrapper,
        weightInput.wrapper,
        notesInput.wrapper
      );

      if (key === "cardio") {
        const cardioRow = document.createElement("div");
        cardioRow.className = "mt-4 grid gap-3 md:grid-cols-2";

        const presetWrapper = document.createElement("label");
        presetWrapper.className = "grid gap-2 text-sm text-slate-300";
        const presetLabel = document.createElement("span");
        presetLabel.textContent = "Кардио тип";
        const presetSelect = document.createElement("select");
        presetSelect.className =
          "w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none";
        CARDIO_PRESETS.forEach((preset) => {
          const option = document.createElement("option");
          option.value = preset;
          option.textContent = preset;
          presetSelect.appendChild(option);
        });
        presetSelect.value = category.cardioType;
        presetSelect.addEventListener("change", () => {
          category.cardioType = presetSelect.value;
          persistAll();
        });

        presetWrapper.append(presetLabel, presetSelect);

        const minutesInput = makeInput("Минути", "30");
        minutesInput.input.value = category.minutes;
        minutesInput.input.type = "number";
        minutesInput.input.addEventListener("change", () => {
          category.minutes = Number(minutesInput.input.value || 0);
          persistAll();
        });

        const pulseInput = makeInput("Пулс (по желание)", "120");
        pulseInput.input.value = category.pulse;
        pulseInput.input.addEventListener("change", () => {
          category.pulse = pulseInput.input.value;
          persistAll();
        });

        cardioRow.append(presetWrapper, minutesInput.wrapper, pulseInput.wrapper);
        inputs.appendChild(cardioRow);
      }

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className =
        "mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 transition hover:bg-emerald-400/30";
      addButton.textContent = "Добави";

      const list = document.createElement("div");
      list.className = "mt-4 grid gap-2";

      const renderEntries = () => {
        list.innerHTML = "";
        category.entries.forEach((entry, entryIndex) => {
          const item = document.createElement("div");
          item.className = "flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm";
          const info = document.createElement("div");
          info.className = "text-slate-200";
          info.textContent = `${entry.exercise} · ${entry.sets}x${entry.reps}${entry.weight ? ` · ${entry.weight} кг` : ""}`;
          const notes = document.createElement("p");
          notes.className = "text-xs text-slate-400";
          notes.textContent = entry.notes || "";
          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "text-xs font-semibold text-rose-300 hover:text-rose-200";
          deleteButton.textContent = "Изтрий";
          deleteButton.addEventListener("click", () => {
            category.entries.splice(entryIndex, 1);
            persistAll();
            renderEntries();
          });
          item.append(info, notes, deleteButton);
          list.appendChild(item);
        });
      };

      addButton.addEventListener("click", () => {
        if (!exerciseInput.input.value.trim()) {
          exerciseInput.input.focus();
          return;
        }
        category.entries.push({
          exercise: exerciseInput.input.value.trim(),
          sets: setsInput.input.value.trim() || "-",
          reps: repsInput.input.value.trim() || "-",
          weight: weightInput.input.value.trim(),
          notes: notesInput.input.value.trim(),
        });
        exerciseInput.input.value = "";
        setsInput.input.value = "";
        repsInput.input.value = "";
        weightInput.input.value = "";
        notesInput.input.value = "";
        persistAll();
        renderEntries();
      });

      const completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.className =
        "mt-4 inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300/60 hover:text-white";
      completeButton.textContent = "Маркирай като завършено";
      completeButton.addEventListener("click", () => {
        category.completed = !category.completed;
        persistAll();
        renderApp();
      });

      renderEntries();

      card.append(header, inputs, addButton, list, completeButton);
      categoryContainer.appendChild(card);
    });
  }

  const finishButton = document.createElement("button");
  finishButton.type = "button";
  finishButton.className =
    "mt-6 inline-flex items-center justify-center rounded-2xl bg-emerald-400/20 px-6 py-3 text-base font-semibold text-emerald-100 ring-1 ring-emerald-300/30 transition hover:bg-emerald-400/30";
  finishButton.textContent = "Приключи тренировка";
  finishButton.addEventListener("click", () => {
    session.endTime = new Date().toISOString();
    state.sessions.unshift(session);
    state.activeSession = null;
    persistAll();
    renderApp();
  });

  sessionInfo.append(categoryContainer, finishButton);
  wrapper.append(sessionInfo);

  return wrapper;
};

const renderHistoryView = () => {
  const wrapper = document.createElement("section");
  wrapper.className = "grid gap-6";

  const filterRow = document.createElement("div");
  filterRow.className = "flex flex-wrap gap-2";
  const filters = [
    { key: "week", label: "Тази седмица" },
    { key: "month", label: "Този месец" },
  ];
  const activeFilter = { key: "week" };

  const list = document.createElement("div");
  list.className = "grid gap-4";

  const filterSessions = (key) => {
    const now = new Date();
    return state.sessions.filter((session) => {
      if (!session.endTime) return false;
      const sessionDate = new Date(session.endTime);
      if (key === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return sessionDate >= start;
      }
      if (key === "month") {
        return (
          sessionDate.getMonth() === now.getMonth() &&
          sessionDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  };

  const renderList = (filterKey) => {
    list.innerHTML = "";
    const sessions = filterSessions(filterKey);
    if (sessions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-slate-400";
      empty.textContent = "Няма запазени тренировки за периода.";
      list.appendChild(empty);
      return;
    }

    sessions.forEach((session) => {
      const card = document.createElement("div");
      card.className = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";
      const dayName = SCHEDULE[session.dayIndex]?.title ?? "Ден";
      const title = document.createElement("div");
      title.className = "text-lg font-semibold text-white";
      title.textContent = `${formatDate(session.endTime)} · ${dayName}`;

      const meta = document.createElement("p");
      meta.className = "mt-2 text-sm text-slate-400";
      meta.textContent = `Време: ${formatDuration(session.startTime, session.endTime)} · Завършени категории: ${getCompletedCategories(session)} · Упражнения: ${getSessionExerciseCount(session)}`;

      const details = document.createElement("details");
      details.className = "mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4";
      const summary = document.createElement("summary");
      summary.className = "cursor-pointer text-sm font-semibold text-emerald-200";
      summary.textContent = "Детайли";
      details.appendChild(summary);

      const detailList = document.createElement("ul");
      detailList.className = "mt-3 grid gap-2 text-sm text-slate-300";
      Object.values(session.categories || {}).forEach((category) => {
        const item = document.createElement("li");
        item.textContent = `${category.label}: ${category.entries.length} записи`;
        detailList.appendChild(item);
      });
      details.appendChild(detailList);

      card.append(title, meta, details);
      list.appendChild(card);
    });
  };

  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition" +
      (activeFilter.key === filter.key
        ? " border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
        : " border-slate-700 text-slate-300");
    button.textContent = filter.label;
    button.addEventListener("click", () => {
      activeFilter.key = filter.key;
      renderList(filter.key);
      Array.from(filterRow.children).forEach((child) => {
        child.className =
          "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition" +
          (child.textContent === filter.label
            ? " border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
            : " border-slate-700 text-slate-300");
      });
    });
    filterRow.appendChild(button);
  });

  renderList(activeFilter.key);
  wrapper.append(filterRow, list);
  return wrapper;
};

const renderStatsView = () => {
  const wrapper = document.createElement("section");
  wrapper.className = "grid gap-6";

  const statCards = document.createElement("div");
  statCards.className = "grid gap-4 md:grid-cols-3";

  const workoutsWeek = state.sessions.filter((session) => {
    if (!session.endTime) return false;
    const diff = new Date() - new Date(session.endTime);
    return diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const workoutsMonth = state.sessions.filter((session) => {
    if (!session.endTime) return false;
    const now = new Date();
    const sessionDate = new Date(session.endTime);
    return (
      sessionDate.getMonth() === now.getMonth() &&
      sessionDate.getFullYear() === now.getFullYear()
    );
  }).length;
  const totalExercises = state.sessions.reduce(
    (sum, session) => sum + getSessionExerciseCount(session),
    0
  );

  const stats = [
    { label: "Тренировки/седмица", value: workoutsWeek },
    { label: "Тренировки/месец", value: workoutsMonth },
    { label: "Общо упражнения", value: totalExercises },
  ];

  stats.forEach((stat) => {
    const card = document.createElement("div");
    card.className = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";
    const value = document.createElement("div");
    value.className = "text-2xl font-semibold text-white";
    value.textContent = stat.value;
    const label = document.createElement("div");
    label.className = "mt-1 text-sm text-slate-400";
    label.textContent = stat.label;
    card.append(value, label);
    statCards.appendChild(card);
  });

  const prsCard = document.createElement("div");
  prsCard.className = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";
  const prsTitle = document.createElement("h3");
  prsTitle.className = "text-lg font-semibold text-white";
  prsTitle.textContent = "PRs";

  const prsForm = document.createElement("form");
  prsForm.className = "mt-4 grid gap-3 md:grid-cols-3";

  const makeInput = (placeholder) => {
    const input = document.createElement("input");
    input.className =
      "w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none";
    input.placeholder = placeholder;
    return input;
  };

  const prExercise = makeInput("Упражнение");
  const prValue = makeInput("Стойност");
  const prDate = makeInput("Дата");
  prDate.type = "date";

  prsForm.append(prExercise, prValue, prDate);

  const prButton = document.createElement("button");
  prButton.type = "button";
  prButton.className =
    "mt-3 inline-flex items-center justify-center rounded-xl bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 transition hover:bg-emerald-400/30";
  prButton.textContent = "Добави PR";

  const prsList = document.createElement("div");
  prsList.className = "mt-4 grid gap-2";

  const renderPRs = () => {
    prsList.innerHTML = "";
    state.prs.forEach((pr, index) => {
      const item = document.createElement("div");
      item.className = "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm";
      const text = document.createElement("span");
      text.textContent = `${pr.exercise} · ${pr.value} · ${pr.date}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "text-xs font-semibold text-rose-300";
      remove.textContent = "Изтрий";
      remove.addEventListener("click", () => {
        state.prs.splice(index, 1);
        persistAll();
        renderPRs();
      });
      item.append(text, remove);
      prsList.appendChild(item);
    });
  };

  prButton.addEventListener("click", () => {
    if (!prExercise.value.trim() || !prValue.value.trim()) {
      return;
    }
    state.prs.unshift({
      exercise: prExercise.value.trim(),
      value: prValue.value.trim(),
      date: prDate.value || new Date().toISOString().split("T")[0],
    });
    prExercise.value = "";
    prValue.value = "";
    prDate.value = "";
    persistAll();
    renderPRs();
  });

  renderPRs();
  prsCard.append(prsTitle, prsForm, prButton, prsList);

  const skillsCard = document.createElement("div");
  skillsCard.className = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";
  const skillsTitle = document.createElement("h3");
  skillsTitle.className = "text-lg font-semibold text-white";
  skillsTitle.textContent = "Скилс";

  const skillsForm = document.createElement("form");
  skillsForm.className = "mt-4 grid gap-3 md:grid-cols-3";

  const skillName = makeInput("Умение");
  const skillNotes = makeInput("Бележки/статус");
  const skillDate = makeInput("Дата");
  skillDate.type = "date";

  skillsForm.append(skillName, skillNotes, skillDate);

  const skillButton = document.createElement("button");
  skillButton.type = "button";
  skillButton.className =
    "mt-3 inline-flex items-center justify-center rounded-xl bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 transition hover:bg-emerald-400/30";
  skillButton.textContent = "Добави умение";

  const skillsList = document.createElement("div");
  skillsList.className = "mt-4 grid gap-2";

  const renderSkills = () => {
    skillsList.innerHTML = "";
    state.skills.forEach((skill, index) => {
      const item = document.createElement("div");
      item.className = "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm";
      const text = document.createElement("span");
      text.textContent = `${skill.name} · ${skill.notes} · ${skill.date}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "text-xs font-semibold text-rose-300";
      remove.textContent = "Изтрий";
      remove.addEventListener("click", () => {
        state.skills.splice(index, 1);
        persistAll();
        renderSkills();
      });
      item.append(text, remove);
      skillsList.appendChild(item);
    });
  };

  skillButton.addEventListener("click", () => {
    if (!skillName.value.trim()) {
      return;
    }
    state.skills.unshift({
      name: skillName.value.trim(),
      notes: skillNotes.value.trim() || "-",
      date: skillDate.value || new Date().toISOString().split("T")[0],
    });
    skillName.value = "";
    skillNotes.value = "";
    skillDate.value = "";
    persistAll();
    renderSkills();
  });

  renderSkills();
  skillsCard.append(skillsTitle, skillsForm, skillButton, skillsList);

  wrapper.append(statCards, prsCard, skillsCard);
  return wrapper;
};

const renderCoachView = () => {
  const wrapper = document.createElement("section");
  wrapper.className = "grid gap-6";

  const card = document.createElement("div");
  card.className = "rounded-3xl border border-slate-800 bg-slate-900/60 p-6";
  const title = document.createElement("h2");
  title.className = "text-xl font-semibold text-white";
  title.textContent = "AI треньор";
  const prompt = document.createElement("p");
  prompt.className = "mt-2 text-slate-300";
  prompt.textContent = "Как се чувстваш тази седмица?";

  const input = document.createElement("textarea");
  input.className =
    "mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none";
  input.rows = 4;

  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 transition hover:bg-emerald-400/30";
  button.textContent = "Генерирай съвет";

  const output = document.createElement("div");
  output.className = "mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200";

  const generateAdvice = () => {
    const workoutsWeek = state.sessions.filter((session) => {
      if (!session.endTime) return false;
      const diff = new Date() - new Date(session.endTime);
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const prsRemembered = state.prs.length;
    const skillsLogged = state.skills.length;
    const mood = input.value.trim();

    const tips = [];
    if (workoutsWeek < 2) {
      tips.push("Добави поне още една сесия тази седмица за по-добър ритъм.");
    } else {
      tips.push("Страхотна последователност! Поддържай текущия темп.");
    }

    if (prsRemembered === 0) {
      tips.push("Запиши PR за мотивация – това ще ти даде ясна цел.");
    } else {
      tips.push("Супер, имаш активни PR записи. Опитай да подобриш поне един тази седмица.");
    }

    if (skillsLogged === 0) {
      tips.push("Добави умение, по което работиш, за да следиш прогреса си.");
    } else {
      tips.push("Виж напредъка си по уменията и планирай кратки сесии за техника.");
    }

    if (mood) {
      tips.push(`Съобразихме се с това, че се чувстваш: "${mood}".`);
    }

    output.innerHTML = tips.map((tip) => `<p class="mb-2">${tip}</p>`).join("");
  };

  button.addEventListener("click", generateAdvice);

  card.append(title, prompt, input, button, output);
  wrapper.appendChild(card);
  return wrapper;
};

const renderTimerWidget = () => {
  if (!state.activeSession) {
    return null;
  }

  const timer = state.activeSession.timer;
  const wrapper = document.createElement("div");
  wrapper.className =
    "fixed bottom-4 left-1/2 z-50 w-[min(90vw,420px)] -translate-x-1/2 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 shadow-2xl";

  const header = document.createElement("div");
  header.className = "flex items-center justify-between";
  const title = document.createElement("span");
  title.className = "text-sm font-semibold text-white";
  title.textContent = "Таймер почивка";
  const time = document.createElement("span");
  time.className = "text-lg font-semibold text-emerald-200";

  const updateTimeLabel = () => {
    const minutes = Math.floor(timer.remaining / 60);
    const seconds = timer.remaining % 60;
    time.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  updateTimeLabel();
  header.append(title, time);

  const presetRow = document.createElement("div");
  presetRow.className = "mt-3 flex flex-wrap gap-2";
  TIMER_PRESETS.forEach((seconds) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300";
    button.textContent = seconds >= 60 ? `${seconds / 60}м` : `${seconds}с`;
    button.addEventListener("click", () => {
      timer.duration = seconds;
      timer.remaining = seconds;
      timer.running = false;
      timer.lastTick = null;
      persistAll();
      renderApp();
    });
    presetRow.appendChild(button);
  });

  const controls = document.createElement("div");
  controls.className = "mt-3 grid grid-cols-3 gap-2";

  const controlButton = (label, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-300/50";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  };

  const startButton = controlButton(timer.running ? "Пауза" : "Старт", () => {
    timer.running = !timer.running;
    timer.lastTick = new Date().toISOString();
    persistAll();
    renderApp();
  });

  const resetButton = controlButton("Нулирай", () => {
    timer.running = false;
    timer.remaining = timer.duration;
    timer.lastTick = null;
    persistAll();
    renderApp();
  });

  const customButton = controlButton("+30с", () => {
    timer.remaining += 30;
    timer.duration = timer.remaining;
    persistAll();
    renderApp();
  });

  controls.append(startButton, resetButton, customButton);

  wrapper.append(header, presetRow, controls);
  return wrapper;
};

const tickTimer = () => {
  const session = state.activeSession;
  if (!session || !session.timer.running) {
    return;
  }

  const now = Date.now();
  const lastTick = session.timer.lastTick ? Date.parse(session.timer.lastTick) : now;
  const diff = Math.floor((now - lastTick) / 1000);
  if (diff > 0) {
    session.timer.remaining = Math.max(0, session.timer.remaining - diff);
    session.timer.lastTick = new Date().toISOString();
    if (session.timer.remaining === 0) {
      session.timer.running = false;
      playBeep();
    }
    persistAll();
    renderApp();
  }
};

const playBeep = () => {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.2;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.2);
};

const renderApp = () => {
  updateNav();
  appEl.innerHTML = "";

  let viewContent = null;
  if (state.view === "program") {
    viewContent = renderProgramView();
  }
  if (state.view === "history") {
    viewContent = renderHistoryView();
  }
  if (state.view === "stats") {
    viewContent = renderStatsView();
  }
  if (state.view === "coach") {
    viewContent = renderCoachView();
  }
  if (state.view === "workout") {
    viewContent = renderWorkoutView();
  }

  if (viewContent) {
    appEl.appendChild(viewContent);
  }

  const existingTimer = document.querySelector("#timer-widget");
  if (existingTimer) {
    existingTimer.remove();
  }

  const timerWidget = renderTimerWidget();
  if (timerWidget) {
    timerWidget.id = "timer-widget";
    document.body.appendChild(timerWidget);
  }
};

navTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.view = tab.dataset.view;
    renderApp();
  });
});

resetButton.addEventListener("click", () => {
  state.sessions = [];
  state.activeSession = null;
  state.prs = [];
  state.skills = [];
  persistAll();
  renderApp();
});

renderApp();
setInterval(tickTimer, 1000);
