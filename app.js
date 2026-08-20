"use strict";

/*
  Версия редактора v9 (рабочая исходная база).
  Здесь сохранены базовые функции: предпросмотр, iframe, экспорт,
  прозрачный фон, прогресс по основным задачам и т.д.
  Новые доработки можно аккуратно добавлять по шагам.
*/

const STORAGE_KEY = "branchway-editor-v9-full";
const $ = s => document.querySelector(s);

function uid(prefix){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`; }

function createDefaultProject(){
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
    scenes: [
      { id: "scene-1", role: "main", title: "At the crossroads",
        task: "You are lost in London. Which way should you go?",
        media: { type: "image", url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80" },
        atmosphere: { type: "none", intensity: "medium", duration: 1800 },
        answers: [
          { id: "answer-1", text: "Turn left", icon: "←", action: "scene", nextSceneId: "scene-2", transition: { type: "none", url: "" } },
          { id: "answer-2", text: "Turn right", icon: "→", action: "scene", nextSceneId: "scene-3", transition: { type: "none", url: "" } }
        ]
      },
      { id: "scene-2", role: "main", title: "The station",
        task: "Great! You found the station.",
        media: { type: "none", url: "" },
        atmosphere: { type: "none", intensity: "medium", duration: 1800 },
        answers: [
          { id: "answer-3", text: "Finish", icon: "✓", action: "finish", nextSceneId: "__finish__", transition: { type: "none", url: "" } }
        ]
      },
      { id: "scene-3", role: "support", title: "Wrong answer",
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

function normalizeProject(p){
  const d = createDefaultProject();
  if(!p || !Array.isArray(p.scenes) || p.scenes.length === 0){
    throw new Error("Некорректный проект");
  }
  p.theme = { ...d.theme, ...(p.theme || {}) };
  p.feedback = { ...d.feedback, ...(p.feedback || {}) };
  p.language = p.language || "ru";
  p.startSceneId = p.startSceneId || p.scenes[0].id;

  p.scenes.forEach(s => {
    s.media = s.media || { type: "none", url: "" };
    s.atmosphere = { type: "none", intensity: "medium", duration: 1800, ...(s.atmosphere || {}) };
    s.role = s.role || (s.id === p.startSceneId ? "main" : "main");
    if(!Array.isArray(s.answers) || s.answers.length === 0){
      s.answers = [{ id: uid("answer"), text: "Продолжить", icon: "→", action: "scene", nextSceneId: p.startSceneId, transition: { type: "none", url: "" } }];
    }
    s.answers.forEach(a => {
      a.nextSceneId = a.nextSceneId || a.next || p.startSceneId;
      a.action = a.action || (a.nextSceneId === "__finish__" ? "finish" : "scene");
      a.transition = a.transition || a.transitionMedia || { type: "none", url: "" };
    });
  });

  return p;
}

function loadProject(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeProject(JSON.parse(saved)) : createDefaultProject();
  } catch(e){
    console.warn(e);
    return createDefaultProject();
  }
}
let project = loadProject();
let activeSceneId = project.startSceneId;

/* UI элементы */
function el(id){ return document.getElementById(id); }

const els = {
  gameTitle: el("gameTitle"),
  sceneList: el("sceneList"),
  sceneNumber: el("sceneNumber"),
  sceneHeading: el("sceneHeading"),
  sceneTitle: el("sceneTitle"),
  sceneTask: el("sceneTask"),
  sceneMediaType: el("sceneMediaType"),
  sceneMediaUrl: el("sceneMediaUrl"),
  sceneMediaStatus: el("sceneMediaStatus"),
  sceneMediaPreview: el("sceneMediaPreview"),

  sceneEffect: el("sceneEffect"),
  effectIntensity: el("effectIntensity"),
  effectDuration: el("effectDuration"),

  answerList: el("answerList"),

  feedbackTitle: el("feedbackTitle"),
  feedbackText: el("feedbackText"),
  restartText: el("restartText"),
  feedbackImage: el("feedbackImage"),

  headingFont: el("headingFont"),
  bodyFont: el("bodyFont"),
  cardStyle: el("cardStyle"),
  answerStyle: el("answerStyle"),
  buttonShape: el("buttonShape"),
  borderColor: el("borderColor"),

  backgroundColor: el("backgroundColor"),
  accentColor: el("accentColor"),
  backgroundImage: el("backgroundImage"),

  transparentBackground: el("transparentBackground"),
  showProgressBar: el("showProgressBar"),
  reduceMotion: el("reduceMotion"),

  makeStartButton: el("makeStartButton"),

  previewPanel: el("previewPanel"),

  miniPlayer: el("miniPlayer"),
  fullPlayer: el("fullPlayer"),
  iframeCode: el("iframeCode"),
  iframeStatus: el("iframeStatus"),
  previewModal: el("previewModal"),
  openPlayerButton: el("openPlayerButton"),
};

// Прогресс по основным сценам
let lastMainIndex = -1;
function getMainScenes(){
  return project.scenes.filter(s => s.role !== "support");
}
function getMainIndexById(id){
  const mains = getMainScenes();
  return mains.findIndex(s => s.id === id);
}
function ensureVisitedMain(scene){
  if(!scene || scene.role === "support") return;
  const idx = getMainIndexById(scene.id);
  if(idx > lastMainIndex) lastMainIndex = idx;
}
function progressPercent(){
  const mains = getMainScenes();
  const total = mains.length;
  if(total <= 1) return 100;
  const idx = lastMainIndex;
  const pct = Math.round((idx) / (total - 1) * 100);
  return Math.max(0, Math.min(100, pct));
}
function progressHTML(){
  const pct = progressPercent();
  return `
    <div class="player-progress" aria-label="Progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="player-progress-row">
        <span>Progress</span>
        <span>${pct}%</span>
      </div>
      <div class="player-progress-track">
        <div class="player-progress-fill" style="width:${pct}%;"></div>
      </div>
    </div>
  `;
}

/* Рендер редактора (упрощённо) */
function renderEditor(){
  const scene = project.scenes.find(s => s.id === activeSceneId) || project.scenes[0];
  ensureVisitedMain(scene);

  // номер по основным
  const mains = getMainScenes();
  const mainIndex = mains.findIndex(s => s.id === scene.id);
  const displayIndex = (scene.role !== "support" && mainIndex >= 0) ? mainIndex + 1 : (lastMainIndex >= 0 ? lastMainIndex + 1 : 1);
  if (els.sceneNumber) els.sceneNumber.textContent = `СЦЕНА ${String(displayIndex).padStart(2, '0')}`;

  // заполнение полей
  if (els.gameTitle) els.gameTitle.value = project.title;
  if (els.sceneTitle) els.sceneTitle.value = scene.title;
  if (els.sceneTask) els.sceneTask.value = scene.task;
  if (els.sceneMediaType) els.sceneMediaType.value = scene.media.type;
  if (els.sceneMediaUrl) els.sceneMediaUrl.value = scene.media.url;
  if (els.sceneRole) els.sceneRole.value = scene.role;

  // финал
  if (els.feedbackTitle) els.feedbackTitle.value = project.feedback.title;
  if (els.feedbackText) els.feedbackText.value = project.feedback.text;
  if (els.restartText) els.restartText.value = project.feedback.restartText;
  if (els.feedbackImage) els.feedbackImage.value = project.feedback.image;

  // оформление
  if (els.headingFont) els.headingFont.value = project.theme.headingFont;
  if (els.bodyFont) els.bodyFont.value = project.theme.bodyFont;
  if (els.cardStyle) els.cardStyle.value = project.theme.cardStyle;
  if (els.answerStyle) els.answerStyle.value = project.theme.answerStyle;
  if (els.buttonShape) els.buttonShape.value = project.theme.shape;
  if (els.borderColor) els.borderColor.value = project.theme.borderColor;
  if (els.backgroundColor) els.backgroundColor.value = project.theme.background;
  if (els.accentColor) els.accentColor.value = project.theme.accent;
  if (els.backgroundImage) els.backgroundImage.value = project.theme.backgroundImage;
  if (els.transparentBackground) els.transparentBackground.checked = !!project.theme.transparent;
  if (els.showProgressBar) els.showProgressBar.checked = !!project.theme.showProgress;
  if (els.reduceMotion) els.reduceMotion.checked = !!project.theme.reduceMotion;

  // scene role UI
  if (els.sceneRole) els.sceneRole.value = scene.role;

  // прогресс-подсказка
  // (прогресс рассчитывается на проигрывателе)
}

// Сохранение и загрузка
function saveProject(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}
function loadProject(){
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeProject(JSON.parse(saved)) : createDefaultProject();
  } catch(e){
    console.warn(e);
    return createDefaultProject();
  }
}
function normalize(p){
  return p;
}
function exportIframe(){
  const base = window.location.origin + window.location.pathname;
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(project))));
  const playerUrl = base.replace(/\/$/, "") + "/player.html#" + data;
  return `<iframe src="${playerUrl}" width="100%" height="700" title="${project.title}" allow="autoplay; fullscreen" allowfullscreen style="border:0;width:100%;"></iframe>`;
}

// Инициализация
(function init(){
  project = loadProject();
  activeSceneId = project.startSceneId;

  renderEditor();
  renderSceneList();

  // кнопки
  const addBtn = document.getElementById("addSceneButton");
  if (addBtn) addBtn.addEventListener("click", () => {
    const s = { id: uid("scene"), title: "Новая сцена", task: "Введите задание.", media: { type:"none", url:"" }, role: "main", atmosphere: { type:"none", intensity:"medium", duration:1800 }, answers: [{ id: uid("answer"), text: "Продолжить", icon: "→", action:"scene", nextSceneId: project.startSceneId, transition: { type:"none", url:"" } }] };
    project.scenes.push(s);
    activeSceneId = s.id;
    renderEditor();
    renderSceneList();
  });

  const delBtn = document.getElementById("deleteSceneButton");
  if (delBtn) delBtn.addEventListener("click", () => {
    if (project.scenes.length <= 1) return;
    const id = activeSceneId;
    project.scenes = project.scenes.filter(sc => sc.id !== id);
    activeSceneId = project.scenes[0].id;
    renderEditor();
    renderSceneList();
  });

  const roleEl = document.getElementById("sceneRole");
  if (roleEl){
    roleEl.addEventListener("change", e => {
      const sc = project.scenes.find(s => s.id === activeSceneId);
      if (sc) sc.role = e.target.value;
      renderEditor(); renderSceneList(); saveProject();
    });
  }

  // iframe / preview
  const iframeBtn = document.getElementById("exportIframeBtn");
  if (iframeBtn){
    iframeBtn.addEventListener("click", () => {
      const code = exportIframe();
      navigator.clipboard.writeText(code).then(()=> {
        alert("Iframe скопирован в буфер обмена");
      }).catch(()=>{});
    });
  }

  // загрузка JSON
  const loadInput = document.getElementById("loadJsonInput");
  if (loadInput){
    loadInput.addEventListener("change", e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          project = normalizeProject(JSON.parse(r.result));
          activeSceneId = project.startSceneId;
          renderEditor();
          renderSceneList();
          saveProject();
        } catch(err){
          console.error(err);
        }
      };
      r.readAsText(f);
      e.target.value = "";
    });
  }

  // preview
  const previewBtn = document.getElementById("previewButton");
  if (previewBtn){
    previewBtn.addEventListener("click", () => {
      // простой предпросмотр: можно заменить на модальный просмотр
      const scene = project.scenes.find(s => s.id === activeSceneId) || project.scenes[0];
      alert("Предпросмотр: откройте iframe из Genially, чтобы увидеть полную версию.");
    });
  }

  // сохранить
  window.addEventListener("beforeunload", () => saveProject());

  // старт
  renderEditor();
})();
