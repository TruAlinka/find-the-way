"use strict";

const STORAGE_KEY = "branchway-project-v7";
const $ = selector => document.querySelector(selector);

function createId(prefix) {
  return (
    prefix +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

function createDefaultProject() {
  return {
    version: 7,
    title: "Lost in London",
    language: "ru",
    startSceneId: "scene-1",

    theme: {
      font: "Arial, sans-serif",
      background: "#10172d",
      accent: "#9bf6b0",
      shape: "soft",
      backgroundImage: "",
      transparent: false,
      showProgress: true
    },

    feedback: {
      title: "Great work!",
      text:
        "You completed the adventure successfully.",
      restartText: "Play again",
      image: ""
    },

    scenes: [
      {
        id: "scene-1",
        title: "At the crossroads",

        task:
          "You are lost in London. Which way should you go?",

        media: {
          type: "image",
          url:
            "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80"
        },

        answers: [
          {
            id: "answer-1",
            text: "Turn left",
            icon: "←",
            action: "scene",
            nextSceneId: "scene-2",

            transition: {
              type: "none",
              url: ""
            }
          },

          {
            id: "answer-2",
            text: "Turn right",
            icon: "→",
            action: "scene",
            nextSceneId: "scene-3",

            transition: {
              type: "none",
              url: ""
            }
          }
        ]
      },

      {
        id: "scene-2",
        title: "The station",
        task: "Great! You found the station.",

        media: {
          type: "none",
          url: ""
        },

        answers: [
          {
            id: "answer-3",
            text: "Finish",
            icon: "✓",
            action: "finish",
            nextSceneId: "__finish__",

            transition: {
              type: "none",
              url: ""
            }
          }
        ]
      },

      {
        id: "scene-3",
        title: "A wrong turn",

        task:
          "This street is a dead end. Go back.",

        media: {
          type: "none",
          url: ""
        },

        answers: [
          {
            id: "answer-4",
            text: "Go back",
            icon: "↩",
            action: "scene",
            nextSceneId: "scene-1",

            transition: {
              type: "none",
              url: ""
            }
          }
        ]
      }
    ]
  };
}

function normalizeProject(project) {
  const defaults = createDefaultProject();

  if (
    !project ||
    !Array.isArray(project.scenes) ||
    project.scenes.length === 0
  ) {
    throw new Error("Некорректный проект");
  }

  project.theme = {
    ...defaults.theme,
    ...(project.theme || {})
  };

  project.feedback = {
    ...defaults.feedback,
    ...(project.feedback || {})
  };

  project.language =
    project.language || "ru";

  project.startSceneId =
    project.startSceneId ||
    project.scenes[0].id;

  project.scenes.forEach(scene => {
    scene.media = scene.media || {
      type: "none",
      url: ""
    };

    if (
      !Array.isArray(scene.answers) ||
      scene.answers.length === 0
    ) {
      scene.answers = [
        {
          id: createId("answer"),
          text: "Продолжить",
          icon: "→",
          action: "scene",
          nextSceneId: project.startSceneId,

          transition: {
            type: "none",
            url: ""
          }
        }
      ];
    }

    scene.answers.forEach(answer => {
      answer.nextSceneId =
        answer.nextSceneId ||
        answer.next ||
        project.startSceneId;

      answer.action =
        answer.action ||
        (
          answer.nextSceneId === "__finish__"
            ? "finish"
            : "scene"
        );

      answer.transition =
        answer.transition ||
        answer.transitionMedia || {
          type: "none",
          url: ""
        };
    });
  });

  return project;
}

function loadProject() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    return saved
      ? normalizeProject(JSON.parse(saved))
      : createDefaultProject();
  } catch (error) {
    console.warn(error);
    return createDefaultProject();
  }
}

let project = loadProject();
let activeSceneId = project.startSceneId;
let playingSceneId = project.startSceneId;

let previewVisitedScenes =
  new Set([project.startSceneId]);

const elements = {
  gameTitle: $("#gameTitle"),

  sceneList: $("#sceneList"),
  sceneNumber: $("#sceneNumber"),
  sceneHeading: $("#sceneHeading"),
  sceneTitle: $("#sceneTitle"),
  sceneTask: $("#sceneTask"),

  sceneMediaType: $("#sceneMediaType"),
  sceneMediaUrl: $("#sceneMediaUrl"),
  sceneMediaStatus: $("#sceneMediaStatus"),
  sceneMediaPreview: $("#sceneMediaPreview"),

  answerList: $("#answerList"),

  feedbackTitle: $("#feedbackTitle"),
  feedbackText: $("#feedbackText"),
  restartText: $("#restartText"),
  feedbackImage: $("#feedbackImage"),

  fontFamily: $("#fontFamily"),
  buttonShape: $("#buttonShape"),
  backgroundColor: $("#backgroundColor"),
  accentColor: $("#accentColor"),
  backgroundImage: $("#backgroundImage"),

  transparentBackground:
    $("#transparentBackground"),

  makeStartButton: $("#makeStartButton"),

  miniPlayer: $("#miniPlayer"),
  fullPlayer: $("#fullPlayer"),
  previewModal: $("#previewModal"),

  iframeCode: $("#iframeCode"),
  iframeStatus: $("#iframeStatus"),

  toast: $("#toast")
};

/*
  Настройка прогресс-бара автоматически
  добавляется в раздел оформления.
  Поэтому index.html менять не нужно.
*/

function installProgressControls() {
  const transparentOption =
    elements.transparentBackground
      ?.closest("label");

  if (
    !transparentOption ||
    $("#showProgressBar")
  ) {
    return;
  }

  const progressOption =
    document.createElement("label");

  progressOption.className =
    "checkbox-label wide";

  progressOption.innerHTML = `
    <input
      id="showProgressBar"
      type="checkbox"
    >

    <span>
      Показывать прогресс-бар в игре
    </span>
  `;

  transparentOption.insertAdjacentElement(
    "afterend",
    progressOption
  );

  elements.showProgress =
    $("#showProgressBar");

  elements.showProgress.addEventListener(
    "change",
    event => {
      project.theme.showProgress =
        event.target.checked;

      refreshMiniPlayer();
      saveProject();
    }
  );

  /*
    Стили прогресс-бара добавляются
    автоматически в редактор.
  */

  const style =
    document.createElement("style");

  style.textContent = `
    .player-progress {
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 14px;
      z-index: 5;
    }

    .player-progress-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;

      color: #eef2ff;

      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;

      text-shadow: 0 1px 4px #000;
    }

    .player-progress-track {
      height: 7px;
      overflow: hidden;

      border: 1px solid
        rgba(255, 255, 255, 0.22);

      border-radius: 999px;

      background:
        rgba(5, 9, 20, 0.5);

      backdrop-filter: blur(4px);
    }

    .player-progress-fill {
      height: 100%;

      border-radius: 999px;

      background:
        var(
          --player-accent,
          var(--accent)
        );

      box-shadow:
        0 0 12px
        var(
          --player-accent,
          var(--accent)
        );

      transition: width 0.45s ease;
    }

    .player.has-progress
    .player-overlay {
      padding-bottom: 58px;
    }
  `;

  document.head.appendChild(style);
}

installProgressControls();

function getActiveScene() {
  return (
    project.scenes.find(
      scene =>
        scene.id === activeSceneId
    ) ||
    project.scenes[0]
  );
}

function saveProject() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(project)
  );
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return replacements[character];
    }
  );
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2200);
}

function directMediaUrl(
  value,
  mediaType = "image"
) {
  const originalUrl =
    String(value || "").trim();

  if (!originalUrl) {
    return "";
  }

  try {
    const url = new URL(originalUrl);

    if (
      url.hostname.includes(
        "drive.google.com"
      )
    ) {
      let fileId = "";

      const pathMatch =
        url.pathname.match(
          /\/file\/d\/([^/]+)/
        );

      if (pathMatch) {
        fileId = pathMatch[1];
      }

      if (!fileId) {
        fileId =
          url.searchParams.get("id") || "";
      }

      if (fileId) {
        if (mediaType === "image") {
          return (
            "https://lh3.googleusercontent.com/d/" +
            encodeURIComponent(fileId)
          );
        }

        return (
          "https://drive.google.com/uc" +
          "?export=download&id=" +
          encodeURIComponent(fileId)
        );
      }
    }

    if (
      url.hostname.includes(
        "dropbox.com"
      )
    ) {
      url.searchParams.delete("dl");
      url.searchParams.set("raw", "1");

      return url.toString();
    }

    if (
      url.hostname === "1drv.ms" ||
      url.hostname.includes(
        "onedrive.live.com"
      )
    ) {
      const encodedShareUrl = btoa(
        unescape(
          encodeURIComponent(originalUrl)
        )
      )
        .replace(/\//g, "_")
        .replace(/\+/g, "-")
        .replace(/=+$/, "");

      return (
        "https://api.onedrive.com/v1.0" +
        "/shares/u!" +
        encodedShareUrl +
        "/root/content"
      );
    }

    return originalUrl;
  } catch (error) {
    return originalUrl;
  }
}

/*
  Поиск кратчайшего оставшегося пути
  от текущей сцены до финала.
*/

function getDistanceToFinish(
  startSceneId
) {
  const queue = [
    [startSceneId, 0]
  ];

  const checkedScenes = new Set();

  while (queue.length > 0) {
    const [
      sceneId,
      distance
    ] = queue.shift();

    if (
      checkedScenes.has(sceneId)
    ) {
      continue;
    }

    checkedScenes.add(sceneId);

    const scene =
      project.scenes.find(
        item => item.id === sceneId
      );

    if (!scene) {
      continue;
    }

    const hasFinishAnswer =
      scene.answers.some(
        answer =>
          answer.action === "finish" ||
          answer.nextSceneId ===
            "__finish__"
      );

    if (hasFinishAnswer) {
      return distance + 1;
    }

    scene.answers.forEach(answer => {
      if (
        answer.action !== "finish" &&
        answer.nextSceneId &&
        !checkedScenes.has(
          answer.nextSceneId
        )
      ) {
        queue.push([
          answer.nextSceneId,
          distance + 1
        ]);
      }
    });
  }

  return Math.max(
    1,
    project.scenes.length
  );
}

function calculateProgress(
  sceneId,
  visitedScenes =
    previewVisitedScenes,
  finished = false
) {
  if (finished) {
    return 100;
  }

  const completedSteps =
    Math.max(
      0,
      visitedScenes.size - 1
    );

  const remainingSteps =
    getDistanceToFinish(sceneId);

  if (completedSteps === 0) {
    return 0;
  }

  const progress = Math.round(
    completedSteps /
    (
      completedSteps +
      remainingSteps
    ) *
    100
  );

  return Math.max(
    5,
    Math.min(95, progress)
  );
}

function createProgressMarkup(value) {
  if (!project.theme.showProgress) {
    return "";
  }

  return `
    <div
      class="player-progress"
      role="progressbar"
      aria-label="Progress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="${value}"
    >
      <div class="player-progress-row">
        <span>Progress</span>
        <span>${value}%</span>
      </div>

      <div class="player-progress-track">
        <div
          class="player-progress-fill"
          style="width:${value}%"
        ></div>
      </div>
    </div>
  `;
}

function render() {
  const scene = getActiveScene();

  const sceneIndex =
    project.scenes.findIndex(
      item => item.id === scene.id
    );

  document.documentElement.style.setProperty(
    "--accent",
    project.theme.accent
  );

  elements.gameTitle.value =
    project.title;

  elements.sceneNumber.textContent =
    "СЦЕНА " +
    String(sceneIndex + 1).padStart(
      2,
      "0"
    );

  elements.sceneHeading.textContent =
    scene.title || "Без названия";

  elements.sceneTitle.value =
    scene.title;

  elements.sceneTask.value =
    scene.task;

  elements.sceneMediaType.value =
    scene.media.type;

  elements.sceneMediaUrl.value =
    scene.media.url;

  elements.makeStartButton.textContent =
    scene.id === project.startSceneId
      ? "★ Стартовая сцена"
      : "☆ Сделать стартовой";

  elements.feedbackTitle.value =
    project.feedback.title;

  elements.feedbackText.value =
    project.feedback.text;

  elements.restartText.value =
    project.feedback.restartText;

  elements.feedbackImage.value =
    project.feedback.image;

  elements.fontFamily.value =
    project.theme.font;

  elements.buttonShape.value =
    project.theme.shape;

  elements.backgroundColor.value =
    project.theme.background;

  elements.accentColor.value =
    project.theme.accent;

  elements.backgroundImage.value =
    project.theme.backgroundImage;

  elements.transparentBackground.checked =
    project.theme.transparent;

  if (elements.showProgress) {
    elements.showProgress.checked =
      project.theme.showProgress;
  }

  renderSceneList();
  renderAnswers();
  renderMediaPreview();

  renderPlayer(
    elements.miniPlayer,
    scene,
    false,
    new Set([project.startSceneId])
  );

  saveProject();
}

function renderSceneList() {
  elements.sceneList.innerHTML = "";

  project.scenes.forEach(
    (scene, index) => {
      const button =
        document.createElement("button");

      button.className =
        "scene-card" +
        (
          scene.id === activeSceneId
            ? " active"
            : ""
        );

      button.innerHTML = `
        <span class="number">
          ${String(index + 1).padStart(
            2,
            "0"
          )}
        </span>

        <span>
          <b>
            ${escapeHtml(scene.title)}
          </b>

          <small>
            ${scene.answers.length}
            вариант(а)
          </small>
        </span>

        ${
          scene.id ===
          project.startSceneId
            ? '<span class="star">★</span>'
            : "<span></span>"
        }
      `;

      button.addEventListener(
        "click",
        () => {
          activeSceneId = scene.id;
          render();
        }
      );

      elements.sceneList.appendChild(
        button
      );
    }
  );
}

function renderMediaPreview() {
  const media =
    getActiveScene().media;

  const mediaUrl = directMediaUrl(
    media.url,
    media.type
  );

  elements.sceneMediaPreview.innerHTML =
    "";

  elements.sceneMediaStatus.textContent =
    "";

  elements.sceneMediaStatus.className =
    "media-status";

  if (
    media.type === "none" ||
    !mediaUrl
  ) {
    return;
  }

  elements.sceneMediaStatus.textContent =
    mediaUrl !== media.url
      ? "Облачная ссылка преобразована в прямую."
      : "Проверяем загрузку медиа…";

  const mediaElement =
    document.createElement(
      media.type === "video"
        ? "video"
        : "img"
    );

  mediaElement.src = mediaUrl;

  if (media.type === "video") {
    mediaElement.controls = true;
    mediaElement.muted = true;
  }

  const handleLoaded = () => {
    elements.sceneMediaStatus.textContent =
      "Медиа успешно загружено.";

    elements.sceneMediaStatus.className =
      "media-status success";
  };

  mediaElement.addEventListener(
    "load",
    handleLoaded
  );

  mediaElement.addEventListener(
    "loadeddata",
    handleLoaded
  );

  mediaElement.addEventListener(
    "error",
    () => {
      elements.sceneMediaStatus.textContent =
        "Не удалось загрузить медиа. " +
        "Проверьте публичный доступ.";

      elements.sceneMediaStatus.className =
        "media-status error";
    }
  );

  elements.sceneMediaPreview.appendChild(
    mediaElement
  );
}

function renderAnswers() {
  const scene = getActiveScene();

  elements.answerList.innerHTML = "";

  scene.answers.forEach(
    (answer, index) => {
      const card =
        document.createElement("article");

      card.className = "answer-card";

      const sceneOptions =
        project.scenes
          .map(targetScene => {
            const selected =
              answer.action !== "finish" &&
              targetScene.id ===
                answer.nextSceneId
                ? "selected"
                : "";

            return `
              <option
                value="${escapeHtml(
                  targetScene.id
                )}"
                ${selected}
              >
                ${escapeHtml(
                  targetScene.title
                )}
              </option>
            `;
          })
          .join("");

      card.innerHTML = `
        <div class="answer-top">
          <b>
            ВАРИАНТ
            ${String(index + 1).padStart(
              2,
              "0"
            )}
          </b>

          <button data-delete>
            Удалить
          </button>
        </div>

        <div class="answer-grid">
          <label>
            ИКОНКА

            <input
              data-icon
              value="${escapeHtml(
                answer.icon
              )}"
            >
          </label>

          <label>
            ТЕКСТ ОТВЕТА

            <input
              data-text
              value="${escapeHtml(
                answer.text
              )}"
            >
          </label>
        </div>

        <label>
          ДЕЙСТВИЕ

          <select data-next>
            ${sceneOptions}

            <option
              value="__finish__"
              ${
                answer.action === "finish"
                  ? "selected"
                  : ""
              }
            >
              ★ Завершить игру
            </option>
          </select>
        </label>

        <div class="transition-grid">
          <label>
            МЕДИА ПЕРЕХОДА

            <select data-transition-type>
              <option
                value="none"
                ${
                  answer.transition.type ===
                  "none"
                    ? "selected"
                    : ""
                }
              >
                Без медиа
              </option>

              <option
                value="image"
                ${
                  answer.transition.type ===
                  "image"
                    ? "selected"
                    : ""
                }
              >
                Изображение
              </option>

              <option
                value="video"
                ${
                  answer.transition.type ===
                  "video"
                    ? "selected"
                    : ""
                }
              >
                Видео
              </option>
            </select>
          </label>

          <label>
            ССЫЛКА

            <input
              data-transition-url
              value="${escapeHtml(
                answer.transition.url
              )}"
              placeholder="Прямая или облачная ссылка"
            >
          </label>
        </div>
      `;

      card
        .querySelector("[data-icon]")
        .addEventListener(
          "input",
          event => {
            answer.icon =
              event.target.value;

            refreshMiniPlayer();
            saveProject();
          }
        );

      card
        .querySelector("[data-text]")
        .addEventListener(
          "input",
          event => {
            answer.text =
              event.target.value;

            refreshMiniPlayer();
            saveProject();
          }
        );

      card
        .querySelector("[data-next]")
        .addEventListener(
          "change",
          event => {
            const value =
              event.target.value;

            answer.action =
              value === "__finish__"
                ? "finish"
                : "scene";

            answer.nextSceneId = value;

            saveProject();
          }
        );

      card
        .querySelector(
          "[data-transition-type]"
        )
        .addEventListener(
          "change",
          event => {
            answer.transition.type =
              event.target.value;

            saveProject();
          }
        );

      card
        .querySelector(
          "[data-transition-url]"
        )
        .addEventListener(
          "input",
          event => {
            answer.transition.url =
              event.target.value;

            saveProject();
          }
        );

      card
        .querySelector("[data-delete]")
        .addEventListener(
          "click",
          () => {
            if (
              scene.answers.length === 1
            ) {
              showToast(
                "Нужен хотя бы один вариант ответа"
              );

              return;
            }

            scene.answers =
              scene.answers.filter(
                item =>
                  item.id !== answer.id
              );

            render();
          }
        );

      elements.answerList.appendChild(
        card
      );
    }
  );
}

function refreshMiniPlayer() {
  renderPlayer(
    elements.miniPlayer,
    getActiveScene(),
    false,
    new Set([project.startSceneId])
  );
}

function renderPlayer(
  container,
  scene,
  interactive,
  visitedScenes = previewVisitedScenes
) {
  container.innerHTML = "";

  const player =
    document.createElement("section");

  const hasMedia = Boolean(
    (
      scene.media.type === "image" ||
      scene.media.type === "video"
    ) &&
    scene.media.url
  );

  player.className =
    "player" +
    (
      project.theme.transparent
        ? " transparent"
        : ""
    ) +
    (
      hasMedia
        ? " has-media"
        : ""
    ) +
    (
      project.theme.showProgress
        ? " has-progress"
        : ""
    );

  player.style.setProperty(
    "--player-background",
    project.theme.transparent
      ? "transparent"
      : project.theme.background
  );

  player.style.setProperty(
    "--player-accent",
    project.theme.accent
  );

  player.style.setProperty(
    "--player-font",
    project.theme.font
  );

  let backgroundImage = "";

  if (
    scene.media.type === "image" &&
    scene.media.url
  ) {
    backgroundImage =
      directMediaUrl(
        scene.media.url,
        "image"
      );
  } else if (
    !project.theme.transparent &&
    project.theme.backgroundImage
  ) {
    backgroundImage =
      directMediaUrl(
        project.theme.backgroundImage,
        "image"
      );
  }

  if (backgroundImage) {
    player.style.backgroundImage =
      `url("${backgroundImage.replace(
        /"/g,
        "%22"
      )}")`;
  }

  if (
    scene.media.type === "video" &&
    scene.media.url
  ) {
    const video =
      document.createElement("video");

    video.src = directMediaUrl(
      scene.media.url,
      "video"
    );

    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    player.appendChild(video);
  }

  const sceneIndex =
    project.scenes.findIndex(
      item => item.id === scene.id
    );

  const overlay =
    document.createElement("div");

  overlay.className = "player-overlay";

  overlay.innerHTML = `
    <div class="player-top">
      <span>
        ${escapeHtml(project.title)}
      </span>

      <span>
        ${sceneIndex + 1}
        /
        ${project.scenes.length}
      </span>
    </div>

    <div>
      <span class="scene-label">
        ${escapeHtml(scene.title)}
      </span>

      <h3>
        ${escapeHtml(scene.task)}
      </h3>

      <div class="player-answers"></div>
    </div>
  `;

  const answerContainer =
    overlay.querySelector(
      ".player-answers"
    );

  scene.answers.forEach(answer => {
    const button =
      document.createElement("button");

    button.className =
      "player-answer shape-" +
      project.theme.shape;

    button.innerHTML = `
      <span>
        ${escapeHtml(answer.icon)}
      </span>

      <span>
        ${escapeHtml(answer.text)}
      </span>
    `;

    if (interactive) {
      button.addEventListener(
        "click",
        () => {
          playAnswer(answer);
        }
      );
    }

    answerContainer.appendChild(button);
  });

  player.appendChild(overlay);

  const progress =
    calculateProgress(
      scene.id,
      visitedScenes
    );

  player.insertAdjacentHTML(
    "beforeend",
    createProgressMarkup(progress)
  );

  container.appendChild(player);
}

function playAnswer(answer) {
  const media = answer.transition;

  if (
    !media ||
    media.type === "none" ||
    !media.url
  ) {
    openNextScene(answer);
    return;
  }

  elements.fullPlayer.innerHTML = "";

  const transitionPlayer =
    document.createElement("section");

  transitionPlayer.className =
    "player" +
    (
      project.theme.transparent
        ? " transparent"
        : ""
    );

  if (media.type === "image") {
    const imageUrl = directMediaUrl(
      media.url,
      "image"
    );

    transitionPlayer.style.backgroundImage =
      `url("${imageUrl.replace(
        /"/g,
        "%22"
      )}")`;

    elements.fullPlayer.appendChild(
      transitionPlayer
    );

    setTimeout(() => {
      openNextScene(answer);
    }, 1800);
  }

  if (media.type === "video") {
    const video =
      document.createElement("video");

    video.src = directMediaUrl(
      media.url,
      "video"
    );

    video.autoplay = true;
    video.controls = true;
    video.playsInline = true;

    video.addEventListener(
      "ended",
      () => {
        openNextScene(answer);
      }
    );

    transitionPlayer.appendChild(video);

    elements.fullPlayer.appendChild(
      transitionPlayer
    );
  }
}

function openNextScene(answer) {
  if (
    answer.action === "finish" ||
    answer.nextSceneId === "__finish__"
  ) {
    showFinalFeedback();
    return;
  }

  playingSceneId =
    answer.nextSceneId ||
    project.startSceneId;

  previewVisitedScenes.add(
    playingSceneId
  );

  const scene =
    project.scenes.find(
      item => item.id === playingSceneId
    ) ||
    project.scenes[0];

  renderPlayer(
    elements.fullPlayer,
    scene,
    true,
    previewVisitedScenes
  );
}

function showFinalFeedback() {
  const feedback = project.feedback;

  const player =
    document.createElement("section");

  const imageUrl =
    directMediaUrl(
      feedback.image,
      "image"
    );

  elements.fullPlayer.innerHTML = "";

  player.className =
    "player" +
    (
      project.theme.transparent
        ? " transparent"
        : ""
    ) +
    (
      imageUrl
        ? " has-media"
        : ""
    ) +
    (
      project.theme.showProgress
        ? " has-progress"
        : ""
    );

  player.style.setProperty(
    "--player-background",
    project.theme.transparent
      ? "transparent"
      : project.theme.background
  );

  player.style.setProperty(
    "--player-accent",
    project.theme.accent
  );

  player.style.setProperty(
    "--player-font",
    project.theme.font
  );

  if (imageUrl) {
    player.style.backgroundImage =
      `url("${imageUrl.replace(
        /"/g,
        "%22"
      )}")`;
  }

  player.innerHTML = `
    <div class="player-overlay">
      <div></div>

      <div>
        <span class="scene-label">
          FINISH
        </span>

        <h3>
          ${escapeHtml(feedback.title)}
        </h3>

        <p>
          ${escapeHtml(feedback.text)}
        </p>

        <button
          id="restartGameButton"
          class="
            player-answer
            shape-${project.theme.shape}
          "
        >
          ${escapeHtml(
            feedback.restartText
          )}
        </button>
      </div>
    </div>

    ${createProgressMarkup(100)}
  `;

  elements.fullPlayer.appendChild(player);

  $("#restartGameButton")
    .addEventListener(
      "click",
      () => {
        playingSceneId =
          project.startSceneId;

        previewVisitedScenes =
          new Set([playingSceneId]);

        const startScene =
          project.scenes.find(
            item =>
              item.id === playingSceneId
          ) ||
          project.scenes[0];

        renderPlayer(
          elements.fullPlayer,
          startScene,
          true,
          previewVisitedScenes
        );
      }
    );
}

function addScene() {
  const scene = {
    id: createId("scene"),
    title: "Новая сцена",
    task: "Введите задание.",

    media: {
      type: "none",
      url: ""
    },

    answers: [
      {
        id: createId("answer"),
        text: "Продолжить",
        icon: "→",
        action: "scene",
        nextSceneId:
          project.startSceneId,

        transition: {
          type: "none",
          url: ""
        }
      }
    ]
  };

  project.scenes.push(scene);
  activeSceneId = scene.id;

  render();
}

function deleteScene() {
  if (project.scenes.length === 1) {
    showToast(
      "Нельзя удалить единственную сцену"
    );

    return;
  }

  const deletedSceneId =
    activeSceneId;

  project.scenes =
    project.scenes.filter(
      scene =>
        scene.id !== deletedSceneId
    );

  const fallbackScene =
    project.scenes[0];

  project.scenes.forEach(scene => {
    scene.answers.forEach(answer => {
      if (
        answer.nextSceneId ===
        deletedSceneId
      ) {
        answer.nextSceneId =
          fallbackScene.id;

        answer.action = "scene";
      }
    });
  });

  if (
    project.startSceneId ===
    deletedSceneId
  ) {
    project.startSceneId =
      fallbackScene.id;
  }

  activeSceneId = fallbackScene.id;

  render();
}

function encodeProject() {
  const json =
    JSON.stringify(project);

  return btoa(
    unescape(
      encodeURIComponent(json)
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createPlayerUrl() {
  if (location.protocol === "file:") {
    return "";
  }

  const playerUrl =
    new URL(
      "player.html",
      location.href
    );

  playerUrl.hash = encodeProject();

  return playerUrl.href;
}

function generateIframe() {
  const playerUrl =
    createPlayerUrl();

  if (!playerUrl) {
    elements.iframeStatus.textContent =
      "Сначала опубликуйте проект через GitHub Pages.";

    elements.iframeStatus.className =
      "media-status error";

    return "";
  }

  const iframeCode =
`<iframe
  src="${playerUrl}"
  width="100%"
  height="700"
  title="${escapeHtml(project.title)}"
  allow="autoplay; fullscreen"
  allowfullscreen
  loading="lazy"
  style="display:block;width:100%;border:0;background:transparent;"
></iframe>`;

  elements.iframeCode.value =
    iframeCode;

  elements.iframeStatus.textContent =
    "iframe готов. Внутри будет только игра.";

  elements.iframeStatus.className =
    "media-status success";

  return iframeCode;
}

function downloadFile(
  content,
  fileName,
  type
) {
  const blob = new Blob(
    [content],
    { type }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 500);
}

function slugify(value) {
  return (
    String(value || "game")
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "") ||
    "game"
  );
}

/* Основные поля */

elements.gameTitle.addEventListener(
  "input",
  event => {
    project.title =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.sceneTitle.addEventListener(
  "input",
  event => {
    getActiveScene().title =
      event.target.value;

    elements.sceneHeading.textContent =
      event.target.value ||
      "Без названия";

    renderSceneList();
    refreshMiniPlayer();
    saveProject();
  }
);

elements.sceneTask.addEventListener(
  "input",
  event => {
    getActiveScene().task =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.sceneMediaType.addEventListener(
  "change",
  event => {
    getActiveScene().media.type =
      event.target.value;

    renderMediaPreview();
    refreshMiniPlayer();
    saveProject();
  }
);

elements.sceneMediaUrl.addEventListener(
  "input",
  event => {
    getActiveScene().media.url =
      event.target.value;

    renderMediaPreview();
    refreshMiniPlayer();
    saveProject();
  }
);

/* Финальный фидбек */

elements.feedbackTitle.addEventListener(
  "input",
  event => {
    project.feedback.title =
      event.target.value;

    saveProject();
  }
);

elements.feedbackText.addEventListener(
  "input",
  event => {
    project.feedback.text =
      event.target.value;

    saveProject();
  }
);

elements.restartText.addEventListener(
  "input",
  event => {
    project.feedback.restartText =
      event.target.value;

    saveProject();
  }
);

elements.feedbackImage.addEventListener(
  "input",
  event => {
    project.feedback.image =
      event.target.value;

    saveProject();
  }
);

/* Оформление */

elements.fontFamily.addEventListener(
  "change",
  event => {
    project.theme.font =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.buttonShape.addEventListener(
  "change",
  event => {
    project.theme.shape =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.backgroundColor.addEventListener(
  "input",
  event => {
    project.theme.background =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.accentColor.addEventListener(
  "input",
  event => {
    project.theme.accent =
      event.target.value;

    render();
  }
);

elements.backgroundImage.addEventListener(
  "input",
  event => {
    project.theme.backgroundImage =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.transparentBackground
  .addEventListener(
    "change",
    event => {
      project.theme.transparent =
        event.target.checked;

      refreshMiniPlayer();
      saveProject();
    }
  );

/* Сцены */

$("#addSceneButton").addEventListener(
  "click",
  addScene
);

$("#deleteSceneButton").addEventListener(
  "click",
  deleteScene
);

$("#addAnswerButton").addEventListener(
  "click",
  () => {
    getActiveScene().answers.push({
      id: createId("answer"),
      text: "Новый вариант",
      icon: "→",
      action: "scene",
      nextSceneId:
        project.startSceneId,

      transition: {
        type: "none",
        url: ""
      }
    });

    render();
  }
);

elements.makeStartButton.addEventListener(
  "click",
  () => {
    project.startSceneId =
      activeSceneId;

    render();
  }
);

/* Новый проект */

$("#newProjectButton").addEventListener(
  "click",
  () => {
    if (
      !confirm("Создать новый проект?")
    ) {
      return;
    }

    project = createDefaultProject();

    activeSceneId =
      project.startSceneId;

    playingSceneId =
      project.startSceneId;

    previewVisitedScenes =
      new Set([playingSceneId]);

    elements.iframeCode.value = "";

    render();
  }
);

/* JSON */

$("#saveJsonButton").addEventListener(
  "click",
  () => {
    downloadFile(
      JSON.stringify(project, null, 2),
      slugify(project.title) + ".json",
      "application/json"
    );
  }
);

$("#loadJsonInput").addEventListener(
  "change",
  event => {
    const file =
      event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.addEventListener(
      "load",
      () => {
        try {
          project = normalizeProject(
            JSON.parse(reader.result)
          );

          activeSceneId =
            project.startSceneId;

          playingSceneId =
            project.startSceneId;

          previewVisitedScenes =
            new Set([playingSceneId]);

          render();

          showToast(
            "Проект загружен"
          );
        } catch (error) {
          console.error(error);

          showToast(
            "Ошибка JSON-файла"
          );
        }
      }
    );

    reader.readAsText(file);
    event.target.value = "";
  }
);

/* Предпросмотр */

$("#previewButton").addEventListener(
  "click",
  () => {
    playingSceneId =
      project.startSceneId;

    previewVisitedScenes =
      new Set([playingSceneId]);

    const startScene =
      project.scenes.find(
        scene =>
          scene.id === playingSceneId
      ) ||
      project.scenes[0];

    renderPlayer(
      elements.fullPlayer,
      startScene,
      true,
      previewVisitedScenes
    );

    elements.previewModal.classList.toggle(
      "transparent-mode",
      project.theme.transparent
    );

    elements.previewModal.classList.add(
      "open"
    );
  }
);

$("#closePreviewButton").addEventListener(
  "click",
  () => {
    elements.previewModal.classList.remove(
      "open"
    );
  }
);

/* iframe */

$("#generateIframeButton")
  .addEventListener(
    "click",
    generateIframe
  );

$("#copyIframeButton")
  .addEventListener(
    "click",
    async () => {
      const iframeCode =
        elements.iframeCode.value.trim() ||
        generateIframe();

      if (!iframeCode) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          iframeCode
        );

        showToast("iframe скопирован");
      } catch (error) {
        elements.iframeCode.select();
        document.execCommand("copy");

        showToast("iframe скопирован");
      }
    }
  );

$("#openPlayerButton").addEventListener(
  "click",
  () => {
    const playerUrl =
      createPlayerUrl();

    if (!playerUrl) {
      showToast(
        "Сначала опубликуйте проект через GitHub Pages"
      );

      return;
    }

    window.open(
      playerUrl,
      "_blank",
      "noopener"
    );
  }
);

render();
