"use strict";

const STORAGE_KEY = "branchway-project-v6";

const $ = selector =>
  document.querySelector(selector);

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
    version: 6,
    title: "Lost in London",
    language: "ru",
    startSceneId: "scene-1",

    theme: {
      font: "Arial, sans-serif",
      background: "#10172d",
      accent: "#9bf6b0",
      shape: "soft",
      backgroundImage: "",
      transparent: false
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

        task:
          "Great! You found the station.",

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

function getActiveScene() {
  return (
    project.scenes.find(
      scene => scene.id === activeSceneId
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

/*
  Преобразование облачных ссылок.

  Google Drive:
  ссылка вида /file/d/FILE_ID/view
  преобразуется в адрес изображения.

  Dropbox:
  dl=0 заменяется на raw=1.

  OneDrive:
  используется публичный content endpoint.
*/

function directMediaUrl(value, mediaType = "image") {
  const originalUrl =
    String(value || "").trim();

  if (!originalUrl) {
    return "";
  }

  try {
    const url = new URL(originalUrl);

    if (
      url.hostname.includes("drive.google.com")
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
      url.hostname.includes("dropbox.com")
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

  elements.gameTitle.value = project.title;

  elements.sceneNumber.textContent =
    "СЦЕНА " +
    String(sceneIndex + 1).padStart(2, "0");

  elements.sceneHeading.textContent =
    scene.title || "Без названия";

  elements.sceneTitle.value = scene.title;
  elements.sceneTask.value = scene.task;

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

  renderSceneList();
  renderAnswers();
  renderMediaPreview();

  renderPlayer(
    elements.miniPlayer,
    scene,
    false
  );

  saveProject();
}

function renderSceneList() {
  elements.sceneList.innerHTML = "";

  project.scenes.forEach((scene, index) => {
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
        ${String(index + 1).padStart(2, "0")}
      </span>

      <span>
        <b>${escapeHtml(scene.title)}</b>

        <small>
          ${scene.answers.length} вариант(а)
        </small>
      </span>

      ${
        scene.id === project.startSceneId
          ? '<span class="star">★</span>'
          : "<span></span>"
      }
    `;

    button.addEventListener("click", () => {
      activeSceneId = scene.id;
      render();
    });

    elements.sceneList.appendChild(button);
  });
}

function renderMediaPreview() {
  const scene = getActiveScene();
  const media = scene.media;

  const directUrl = directMediaUrl(
    media.url,
    media.type
  );

  elements.sceneMediaPreview.innerHTML = "";

  elements.sceneMediaStatus.textContent = "";

  elements.sceneMediaStatus.className =
    "media-status";

  if (
    media.type === "none" ||
    !directUrl
  ) {
    return;
  }

  if (directUrl !== media.url) {
    elements.sceneMediaStatus.textContent =
      "Облачная ссылка преобразована в прямую.";
  } else {
    elements.sceneMediaStatus.textContent =
      "Проверяем загрузку медиа…";
  }

  const mediaElement =
    document.createElement(
      media.type === "video"
        ? "video"
        : "img"
    );

  mediaElement.src = directUrl;

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
        "Проверьте публичный доступ к файлу.";

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

  scene.answers.forEach((answer, index) => {
    const card =
      document.createElement("article");

    card.className = "answer-card";

    const sceneOptions = project.scenes
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
            ${escapeHtml(targetScene.title)}
          </option>
        `;
      })
      .join("");

    card.innerHTML = `
      <div class="answer-top">
        <b>
          ВАРИАНТ ${String(index + 1).padStart(2, "0")}
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
            value="${escapeHtml(answer.icon)}"
          >
        </label>

        <label>
          ТЕКСТ ОТВЕТА

          <input
            data-text
            value="${escapeHtml(answer.text)}"
          >
        </label>
      </div>

      <label>
        ДЕЙСТВИЕ

        <select data-next-scene>
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
                answer.transition.type === "none"
                  ? "selected"
                  : ""
              }
            >
              Без медиа
            </option>

            <option
              value="image"
              ${
                answer.transition.type === "image"
                  ? "selected"
                  : ""
              }
            >
              Изображение
            </option>

            <option
              value="video"
              ${
                answer.transition.type === "video"
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
            type="url"
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
      .addEventListener("input", event => {
        answer.icon = event.target.value;

        refreshMiniPlayer();
        saveProject();
      });

    card
      .querySelector("[data-text]")
      .addEventListener("input", event => {
        answer.text = event.target.value;

        refreshMiniPlayer();
        saveProject();
      });

    card
      .querySelector("[data-next-scene]")
      .addEventListener("change", event => {
        const value = event.target.value;

        if (value === "__finish__") {
          answer.action = "finish";
          answer.nextSceneId = "__finish__";
        } else {
          answer.action = "scene";
          answer.nextSceneId = value;
        }

        saveProject();
      });

    card
      .querySelector("[data-transition-type]")
      .addEventListener("change", event => {
        answer.transition.type =
          event.target.value;

        saveProject();
      });

    card
      .querySelector("[data-transition-url]")
      .addEventListener("input", event => {
        answer.transition.url =
          event.target.value;

        saveProject();
      });

    card
      .querySelector("[data-delete]")
      .addEventListener("click", () => {
        if (scene.answers.length === 1) {
          showToast(
            "Нужен хотя бы один вариант ответа"
          );

          return;
        }

        scene.answers =
          scene.answers.filter(
            item => item.id !== answer.id
          );

        render();
      });

    elements.answerList.appendChild(card);
  });
}

function refreshMiniPlayer() {
  renderPlayer(
    elements.miniPlayer,
    getActiveScene(),
    false
  );
}

function renderPlayer(
  container,
  scene,
  interactive
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

  let imageUrl = "";

  if (
    scene.media.type === "image" &&
    scene.media.url
  ) {
    imageUrl = directMediaUrl(
      scene.media.url,
      "image"
    );
  } else if (
    !project.theme.transparent &&
    project.theme.backgroundImage
  ) {
    imageUrl = directMediaUrl(
      project.theme.backgroundImage,
      "image"
    );
  }

  if (imageUrl) {
    player.style.backgroundImage =
      `url("${imageUrl.replace(
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
      <span>${escapeHtml(project.title)}</span>

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

      <h3>${escapeHtml(scene.task)}</h3>

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
      <span>${escapeHtml(answer.icon)}</span>
      <span>${escapeHtml(answer.text)}</span>
    `;

    if (interactive) {
      button.addEventListener("click", () => {
        playAnswer(answer);
      });
    }

    answerContainer.appendChild(button);
  });

  player.appendChild(overlay);
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

    transitionPlayer.classList.add(
      "has-media"
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

    video.addEventListener("ended", () => {
      openNextScene(answer);
    });

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

  const scene =
    project.scenes.find(
      item => item.id === playingSceneId
    ) ||
    project.scenes[0];

  renderPlayer(
    elements.fullPlayer,
    scene,
    true
  );
}

function showFinalFeedback() {
  const feedback = project.feedback;

  const player =
    document.createElement("section");

  const imageUrl = directMediaUrl(
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
  `;

  elements.fullPlayer.appendChild(player);

  $("#restartGameButton")
    .addEventListener("click", () => {
      playingSceneId =
        project.startSceneId;

      const startScene =
        project.scenes.find(
          item =>
            item.id === playingSceneId
        ) ||
        project.scenes[0];

      renderPlayer(
        elements.fullPlayer,
        startScene,
        true
      );
    });
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
        nextSceneId: project.startSceneId,

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

  const deletedSceneId = activeSceneId;

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

function addAnswer() {
  const scene = getActiveScene();

  scene.answers.push({
    id: createId("answer"),
    text: "Новый вариант",
    icon: "→",
    action: "scene",
    nextSceneId: project.startSceneId,

    transition: {
      type: "none",
      url: ""
    }
  });

  render();
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

/*
  Кодирование проекта для передачи
  в player.html после символа #.
*/

function encodeProject() {
  const json = JSON.stringify(project);

  const base64 = btoa(
    unescape(
      encodeURIComponent(json)
    )
  );

  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createPlayerUrl() {
  if (location.protocol === "file:") {
    return "";
  }

  const playerUrl = new URL(
    "player.html",
    location.href
  );

  playerUrl.hash = encodeProject();

  return playerUrl.href;
}

function generateIframe() {
  const playerUrl = createPlayerUrl();

  if (!playerUrl) {
    elements.iframeStatus.textContent =
      "Сначала опубликуйте index.html, " +
      "styles.css, app.js и player.html " +
      "через GitHub Pages.";

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
    "iframe готов. Внутри будет только игра, без редактора.";

  elements.iframeStatus.className =
    "media-status success";

  return iframeCode;
}

/* Поля проекта */

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

/* Сцены и ответы */

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
  addAnswer
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
    const confirmed = confirm(
      "Создать новый проект?"
    );

    if (!confirmed) {
      return;
    }

    project = createDefaultProject();

    activeSceneId =
      project.startSceneId;

    playingSceneId =
      project.startSceneId;

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

          render();
          showToast("Проект загружен");
        } catch (error) {
          console.error(error);
          showToast("Ошибка JSON-файла");
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

    const startScene =
      project.scenes.find(
        scene =>
          scene.id === playingSceneId
      ) ||
      project.scenes[0];

    renderPlayer(
      elements.fullPlayer,
      startScene,
      true
    );

    elements.previewModal.classList.toggle(
      "transparent-mode",
      project.theme.transparent
    );

    elements.previewModal.classList.add(
      "open"
    );

    elements.previewModal.setAttribute(
      "aria-hidden",
      "false"
    );
  }
);

$("#closePreviewButton").addEventListener(
  "click",
  () => {
    elements.previewModal.classList.remove(
      "open"
    );

    elements.previewModal.setAttribute(
      "aria-hidden",
      "true"
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
      let iframeCode =
        elements.iframeCode.value.trim();

      if (!iframeCode) {
        iframeCode = generateIframe();
      }

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
    const playerUrl = createPlayerUrl();

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

/* Первый запуск */

render();
