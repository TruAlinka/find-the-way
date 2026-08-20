"use strict";

const STORAGE_KEY = "branchway-project-v9";

const $ = s => document.querySelector(s);
const createId = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;

function createDefaultProject() {
  return {
    version: 9,
    title: "Lost in London",
    language: "ru",
    startSceneId: "scene-1",
    theme: {
      headingFont: "Rye",
      bodyFont: "Courier Prime",
      cardStyle: "vintage",
      answerStyle: "vintage",
      shape: "soft",
      borderColor: "#d8ae7b",
      background: "#10172d",
      accent: "#9bf6b0",
      backgroundImage: "",
      transparent: false,
      showProgress: true,
      reduceMotion: false
    },
    feedback: {
      title: "Great work!",
      text: "You completed the adventure successfully.",
      restartText: "Play again",
      image: ""
    },
    // Новая структура: роль у сцен
    scenes: [
      {
        id: "scene-1",
        role: "main", // основное задание
        title: "At the crossroads",
        task: "You are lost in London. Which way should you go?",
        media: { type: "image", url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80" },
        atmosphere: { type: "none", intensity: "medium", duration: 1800 },
        answers: [
          { id: "answer-1", text: "Turn left", icon: "←", action: "scene", nextSceneId: "scene-2", transition: { type: "none", url: "" } },
          { id: "answer-2", text: "Turn right", icon: "→", action: "scene", nextSceneId: "scene-3", transition: { type: "none", url: "" } }
        ]
      },
      {
        id: "scene-2",
        role: "main",
        title: "The station",
        task: "Great! You found the station.",
        media: { type: "none", url: "" },
        atmosphere: { type: "none", intensity: "medium", duration: 1800 },
        answers: [
          { id: "answer-3", text: "Finish", icon: "✓", action: "finish", nextSceneId: "__finish__", transition: { type: "none", url: "" } }
        ]
      },
      {
        id: "scene-3",
        role: "support", // вспомогательная сцена
        title: "Wrong answer",
        task: "No, that is not the right way. Go back and try again.",
        media: { type: "none", url: "" },
        atmosphere: { type: "fog", intensity: "medium", duration: 0 },
        answers: [
          { id: "answer-4", text: "Go back", icon: "↩", action: "scene", nextSceneId: "scene-1", transition: { type: "none", url: "" } }
        ]
      }
    ]
  };
}

// Нормализация и совместимость со старыми проектами
function normalizeProject(p) {
  const d = createDefaultProject();
  if (!p || !Array.isArray(p.scenes) || p.scenes.length === 0) {
    throw new Error("Некорректный проект");
  }
  p.theme = { ...d.theme, ...(p.theme || {}) };
  p.feedback = { ...d.feedback, ...(p.feedback || {}) };
  p.language = p.language || "ru";
  p.startSceneId = p.startSceneId || p.scenes[0].id;
  p.scenes.forEach(s => {
    s.media = s.media || { type: "none", url: "" };
    s.atmosphere = { type: "none", intensity: "medium", duration: 1800, ...(s.atmosphere || {}) };
    if (!Array.isArray(s.answers) || s.answers.length === 0) {
      s.answers = [{ id: createId("answer"), text: "Продолжить", icon: "→", action: "scene", nextSceneId: p.startSceneId, transition: { type: "none", url: "" } }];
    }
    s.answers.forEach(a => {
      a.nextSceneId = a.nextSceneId || a.next || p.startSceneId;
      a.action = a.action || (a.nextSceneId === "__finish__" ? "finish" : "scene");
      a.transition = a.transition || a.transitionMedia || { type: "none", url: "" };
      // новый флаг: если переход на "__finish__", итог
      if (a.nextSceneId === "__finish__") a.action = "finish";
    });
    if (!("role" in s)) s.role = s.role || "main"; // совместимость
  });
  return p;
}

function loadProject() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeProject(JSON.parse(saved)) : createDefaultProject();
  } catch (e) {
    console.warn(e);
    return createDefaultProject();
  }
}

// переменные редактора
let project = loadProject();
let activeSceneId = project.startSceneId;

// прогресс по основным сценам
let lastMainIndex = 0;
function getMainScenes() {
  return project.scenes.filter(s => s.role !== "support");
}
function currentMainIndex() {
  const mains = getMainScenes();
  return mains.findIndex(s => s.id === activeSceneId);
}
function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}
function escapeHtml(v) {
  return String(v ?? "")
    .replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
}
function showToast(m) {
  const t = document.getElementById("toast");
  t.textContent = m;
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 1500);
}
function slugify(v) {
  return String(v || "game").toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-|-$/g, "");
}

function renderProgressPercent() {
  const mains = getMainScenes();
  const total = mains.length;
  if (total <= 1) return 100;
  // текущий основной индекс
  let idx = lastMainIndex;
  // если текущий активен и является main, обновим
  const curMain = mains.findIndex(m => m.id === activeSceneId);
  if (curMain >= 0) {
    idx = curMain;
    lastMainIndex = curMain;
  }
  const pct = Math.round((idx / (total - 1)) * 100);
  return Math.max(0, Math.min(100, pct));
}

// Основной рендер
function render() {
  const scene = project.scenes.find(s => s.id === activeSceneId) || project.scenes[0];
  const mains = getMainScenes();
  const mainIndex = mains.findIndex(m => m.id === scene.id);
  if (scene.role !== "support" && mainIndex >= 0) {
    lastMainIndex = mainIndex;
  }

  // прокрутка и лейблы
  const sceneIndex = project.scenes.findIndex(s => s.id === scene.id);
  document.title = project.title;
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="card" style="background-color:${project.theme.background};">
      ${scene.media.type === "video" && scene.media.url ? `<video class="video" src="${scene.media.url}" autoplay muted loop playsinline></video>` : ""}
      <div class="overlay ${scene.media.type !== "image" && project.theme.transparent ? "" : "shade"}">
        <div class="top">
          <span>✦ ${escapeHtml(project.title)}</span>
          <span>${sceneIndex + 1} / ${project.scenes.length}</span>
        </div>
        <div>
          <span class="label" style="color:${project.theme.accent}">${escapeHtml(scene.title)}</span>
          <h1>${escapeHtml(scene.task)}</h1>
          <div class="answers">
            ${scene.answers.map((a, i) => `
              <button class="answer" data-answer="${i}" style="border-radius:${sceneRoleBadge(scene)}">
                <span>${escapeHtml(a.icon)}</span>
                <span>${escapeHtml(a.text)}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
      ${renderProgressPercentHTML()}
    </div>
  `;

  // кнопки ответов
  root.querySelectorAll(".answer").forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      const answer = scene.answers[btn.dataset.answer];
      openNextScene(answer);
    });
  });
  // прогресс внутри карточки доступен
  // остальные части editor остаются под управлением отдельных функций
}

function sceneRoleBadge(scene) {
  // для визуса в редакторе можно отобразить badge, но здесь нужен реальный стиль в CSS
  // вернём стиль по значению: основное — main; вспомогательное — small
  return scene.role === "main" ? "12px" : "20px";
}

function renderProgressMarkup(value) {
  return `
    <div class="player-progress">
      <div class="player-progress-row">
        <span>Progress</span>
        <span>${value}%</span>
      </div>
      <div class="player-progress-track">
        <div class="player-progress-fill" style="width:${value}%;"></div>
      </div>
    </div>
  `;
}
function renderProgressPercentHTML() {
  const value = renderProgressPercent();
  if (!project.theme.showProgress) return "";
  return renderProgressMarkup(value);
}

function renderMediaPreview() {
  // упрощённый пример: можно расширить по аналогии
}
function openNextScene(answer) {
  // если завершение
  if (answer.action === "finish" || answer.nextSceneId === "__finish__") {
    showToast("Завершение игры"); // можно заменить на финальный экран
    return;
  }
  const next = answer.nextSceneId || project.startSceneId;
  activeSceneId = next;
  render();
}
function addScene() {
  const s = {
    id: createId("scene"),
    title: "Новая сцена",
    task: "Введите задание для ученика.",
    media: { type: "none", url: "" },
    role: "main",
    atmosphere: { type: "none", intensity: "medium", duration: 1800 },
    answers: [
      { id: createId("answer"), text: "Продолжить", icon: "→", action: "scene", nextSceneId: project.startSceneId, transition: { type: "none", url: "" } }
    ]
  };
  project.scenes.push(s);
  activeSceneId = s.id;
  render();
}
function deleteScene() {
  if (project.scenes.length === 1) return;
  const del = activeSceneId;
  project.scenes = project.scenes.filter(s => s.id !== del);
  activeSceneId = project.scenes[0].id;
  render();
}
function renderSceneList() {
  const list = document.getElementById("sceneList");
  list.innerHTML = "";
  project.scenes.forEach((scene, index) => {
    const btn = document.createElement("button");
    btn.className = "scene-card" + (scene.id === activeSceneId ? " active" : "");
    const badge = scene.role === "main" ? '<span class="scene-role-badge scene-role-main">Основное</span>' : '<span class="scene-role-badge scene-role-support">Вспомогательное</span>';
    btn.innerHTML = `
      <span class="number">${String(index + 1).padStart(2, '0')}</span>
      <span><b>${escapeHtml(scene.title)}</b><span>${scene.answers.length} ответов</span></span>
      ${badge}
    `;
    btn.addEventListener("click", () => { activeSceneId = scene.id; render(); });
    list.appendChild(btn);
  });
}
function renderAnswers() {
  // аналогично, здесь остаётся редакторский функционал
}
function renderMediaOverride() {}

/* Инициализация и экспорт */
(function init() {
  // базовая загрузка
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    project = createDefaultProject();
  } else {
    project = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  }
  // инициализация элементов и событий editors
  // ...
  render();
})();
