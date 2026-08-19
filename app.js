"use strict";

const STORAGE_KEY = "branchway-project-v4";
const $ = selector => document.querySelector(selector);

function createId(prefix) {
  return (
    prefix +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

function createDefaultProject() {
  return {
    version: 4,
    title: "Lost in London",
    startSceneId: "scene-1",

    theme: {
      font: "Arial, sans-serif",
      background: "#10172d",
      accent: "#9bf6b0",
      shape: "soft",
      backgroundImage: "",
      transparent: false
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
            text: "Play again",
            icon: "✦",
            nextSceneId: "scene-1",

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
        task: "This street is a dead end. Go back.",

        media: {
          type: "none",
          url: ""
        },

        answers: [
          {
            id: "answer-4",
            text: "Go back",
            icon: "↩",
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

  project.startSceneId =
    project.startSceneId || project.scenes[0].id;

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
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createDefaultProject();
    }

    return normalizeProject(JSON.parse(saved));
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
  mediaType: $("#mediaType"),
  mediaUrl: $("#mediaUrl"),
  answerList: $("#answerList"),
  miniPlayer: $("#miniPlayer"),
  fullPlayer: $("#fullPlayer"),
  modal: $("#modal"),
  startButton: $("#startBtn"),
  font: $("#font"),
  shape: $("#shape"),
  background: $("#bgColor"),
  accent: $("#accentColor"),
  backgroundImage: $("#bgImage"),
  transparent: $("#transparentBg"),
  toast: $("#toast")
};

function getActiveScene() {
  return (
    project.scenes.find(
      scene => scene.id === activeSceneId
    ) || project.scenes[0]
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

function safeCssUrl(value) {
  return String(value || "").replace(
    /["\\()]/g,
    character => encodeURIComponent(character)
  );
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2000);
}

function slugify(value) {
  return (
    String(value || "game")
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "") || "game"
  );
}

function render() {
  const scene = getActiveScene();

  const sceneIndex = project.scenes.findIndex(
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
  elements.mediaType.value = scene.media.type;
  elements.mediaUrl.value = scene.media.url;

  elements.startButton.textContent =
    scene.id === project.startSceneId
      ? "★ Стартовая сцена"
      : "☆ Сделать стартовой";

  elements.font.value = project.theme.font;
  elements.shape.value = project.theme.shape;
  elements.background.value = project.theme.background;
  elements.accent.value = project.theme.accent;

  elements.backgroundImage.value =
    project.theme.backgroundImage;

  elements.transparent.checked =
    project.theme.transparent;

  renderSceneList();
  renderAnswers();

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
    const button = document.createElement("button");

    button.className =
      "scene-card" +
      (scene.id === activeSceneId ? " active" : "");

    button.innerHTML = `
      <span class="number">
        ${String(index + 1).padStart(2, "0")}
      </span>

      <span>
        <b>${escapeHtml(scene.title)}</b>
        <small>${scene.answers.length} вариант(а)</small>
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

function renderAnswers() {
  const scene = getActiveScene();

  elements.answerList.innerHTML = "";

  scene.answers.forEach((answer, index) => {
    const card = document.createElement("article");
    card.className = "answer-card";

    const sceneOptions = project.scenes
      .map(targetScene => {
        const selected =
          targetScene.id === answer.nextSceneId
            ? "selected"
            : "";

        return `
          <option
            value="${escapeHtml(targetScene.id)}"
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

        <button data-delete>Удалить</button>
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
          ТЕКСТ

          <input
            data-text
            value="${escapeHtml(answer.text)}"
          >
        </label>
      </div>

      <label>
        ПЕРЕХОД К СЦЕНЕ

        <select data-next>
          ${sceneOptions}
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
            placeholder="https://..."
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
      .querySelector("[data-next]")
      .addEventListener("change", event => {
        answer.nextSceneId = event.target.value;
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

        scene.answers = scene.answers.filter(
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

function renderPlayer(container, scene, interactive) {
  container.innerHTML = "";

  const player = document.createElement("section");

  const hasSceneMedia = Boolean(
    (
      scene.media.type === "image" ||
      scene.media.type === "video"
    ) &&
    scene.media.url
  );

  player.className =
    "player" +
    (project.theme.transparent
      ? " transparent"
      : "") +
    (hasSceneMedia
      ? " has-media"
      : "");

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
    imageUrl = scene.media.url;
  } else if (
    !project.theme.transparent &&
    project.theme.backgroundImage
  ) {
    imageUrl = project.theme.backgroundImage;
  }

  if (imageUrl) {
    player.style.backgroundImage =
      `url("${safeCssUrl(imageUrl)}")`;
  }

  if (
    scene.media.type === "video" &&
    scene.media.url
  ) {
    const video = document.createElement("video");

    video.src = scene.media.url;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    player.appendChild(video);
  }

  const sceneIndex = project.scenes.findIndex(
    item => item.id === scene.id
  );

  const overlay = document.createElement("div");
  overlay.className = "player-overlay";

  overlay.innerHTML = `
    <div class="player-top">
      <span>✦ ${escapeHtml(project.title)}</span>

      <span>
        ${sceneIndex + 1} / ${project.scenes.length}
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

  const answersContainer =
    overlay.querySelector(".player-answers");

  scene.answers.forEach(answer => {
    const button = document.createElement("button");

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

    answersContainer.appendChild(button);
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
    (project.theme.transparent
      ? " transparent"
      : "");

  if (media.type === "image") {
    transitionPlayer.classList.add("has-media");

    transitionPlayer.style.backgroundImage =
      `url("${safeCssUrl(media.url)}")`;

    elements.fullPlayer.appendChild(
      transitionPlayer
    );

    setTimeout(() => {
      openNextScene(answer);
    }, 1800);
  }

  if (media.type === "video") {
    const video = document.createElement("video");

    video.src = media.url;
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
  playingSceneId =
    answer.nextSceneId ||
    project.startSceneId;

  const nextScene =
    project.scenes.find(
      scene => scene.id === playingSceneId
    ) || project.scenes[0];

  renderPlayer(
    elements.fullPlayer,
    nextScene,
    true
  );
}

function addScene() {
  const newScene = {
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
        nextSceneId: project.startSceneId,

        transition: {
          type: "none",
          url: ""
        }
      }
    ]
  };

  project.scenes.push(newScene);
  activeSceneId = newScene.id;

  render();
}

function deleteScene() {
  if (project.scenes.length === 1) {
    showToast(
      "Нельзя удалить единственную сцену"
    );

    return;
  }

  const deletedId = activeSceneId;

  project.scenes = project.scenes.filter(
    scene => scene.id !== deletedId
  );

  const fallbackScene = project.scenes[0];

  project.scenes.forEach(scene => {
    scene.answers.forEach(answer => {
      if (
        answer.nextSceneId === deletedId
      ) {
        answer.nextSceneId =
          fallbackScene.id;
      }
    });
  });

  if (
    project.startSceneId === deletedId
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
  contentType
) {
  const blob = new Blob(
    [content],
    { type: contentType }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 500);
}

/*
  Создание автономной HTML-игры.
  Данные проекта кодируются в Base64,
  чтобы пользовательский текст не ломал script.
*/

function exportGame() {
  const encodedProject = btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify(project)
      )
    )
  );

  const exportedHtml = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>${escapeHtml(project.title)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background: ${
        project.theme.transparent
          ? "transparent"
          : project.theme.background
      };
    }

    body {
      color: #fff;
      font-family: ${project.theme.font};
    }

    button {
      font: inherit;
      cursor: pointer;
    }

    #app {
      min-height: 100vh;
      padding: 16px;

      display: grid;
      place-items: center;
    }

    .card {
      width: min(900px, 100%);
      min-height: calc(100vh - 32px);
      position: relative;
      overflow: hidden;

      border-radius: 20px;
      background-size: cover;
      background-position: center;
    }

    .video {
      width: 100%;
      height: 100%;

      position: absolute;
      inset: 0;

      object-fit: cover;
    }

    .overlay {
      position: absolute;
      inset: 0;
      padding: clamp(22px, 5vw, 48px);

      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .shade {
      background:
        linear-gradient(
          180deg,
          rgba(7, 16, 29, 0.09),
          rgba(7, 16, 29, 0.93) 84%
        );
    }

    .top {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: bold;
    }

    .label {
      color: ${project.theme.accent};
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    h1 {
      font-size: clamp(30px, 6vw, 60px);
      line-height: 1.05;
    }

    .answers {
      display: grid;
      gap: 9px;
    }

    .answer {
      padding: 15px;

      display: flex;
      gap: 12px;

      border: 1px solid rgba(255, 255, 255, 0.21);

      color: #fff;
      background: rgba(17, 24, 39, 0.74);

      text-align: left;
    }

    .answer:hover {
      color: #101827;
      background: ${project.theme.accent};
    }
  </style>
</head>

<body>
  <div id="app"></div>

  <script>
    const encodedProject = "${encodedProject}";

    const game = JSON.parse(
      decodeURIComponent(
        escape(
          atob(encodedProject)
        )
      )
    );

    let currentSceneId = game.startSceneId;

    function escapeText(value) {
      return String(value || "").replace(
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

    function safeUrl(value) {
      return String(value || "")
        .replace(/"/g, "%22");
    }

    function renderGame() {
      const scene =
        game.scenes.find(
          item => item.id === currentSceneId
        ) || game.scenes[0];

      let image = "";

      if (
        scene.media.type === "image" &&
        scene.media.url
      ) {
        image = scene.media.url;
      } else if (
        !game.theme.transparent &&
        game.theme.backgroundImage
      ) {
        image = game.theme.backgroundImage;
      }

      const hasMedia =
        scene.media.type !== "none" &&
        scene.media.url;

      const shouldUseShade =
        hasMedia ||
        !game.theme.transparent;

      let radius = "12px";

      if (game.theme.shape === "round") {
        radius = "999px";
      }

      if (game.theme.shape === "square") {
        radius = "3px";
      }

      const cardBackground =
        game.theme.transparent
          ? "transparent"
          : game.theme.background;

      document.querySelector("#app").innerHTML =
        '<section class="card" ' +
        'style="background-color:' +
        cardBackground +
        ";" +
        (
          image
            ? "background-image:url(&quot;" +
              safeUrl(image) +
              "&quot;)"
            : ""
        ) +
        '">' +

        (
          scene.media.type === "video" &&
          scene.media.url
            ? '<video class="video" src="' +
              escapeText(scene.media.url) +
              '" autoplay muted loop playsinline></video>'
            : ""
        ) +

        '<div class="overlay ' +
        (shouldUseShade ? "shade" : "") +
        '">' +

          '<div class="top">' +
            "<span>✦ " +
              escapeText(game.title) +
            "</span>" +
          "</div>" +

          "<div>" +
            '<span class="label">' +
              escapeText(scene.title) +
            "</span>" +

            "<h1>" +
              escapeText(scene.task) +
            "</h1>" +

            '<div class="answers">' +
              scene.answers.map(
                (answer, index) => {
                  return (
                    '<button class="answer" ' +
                    'data-answer="' +
                    index +
                    '" ' +
                    'style="border-radius:' +
                    radius +
                    '">' +

                    "<span>" +
                      escapeText(answer.icon) +
                    "</span>" +

                    "<span>" +
                      escapeText(answer.text) +
                    "</span>" +

                    "</button>"
                  );
                }
              ).join("") +
            "</div>" +
          "</div>" +

        "</div>" +
        "</section>";

      document
        .querySelectorAll("[data-answer]")
        .forEach(button => {
          button.addEventListener(
            "click",
            () => {
              const answer =
                scene.answers[
                  Number(
                    button.dataset.answer
                  )
                ];

              playAnswer(answer);
            }
          );
        });
    }

    function openNextScene(answer) {
      currentSceneId =
        answer.nextSceneId ||
        game.startSceneId;

      renderGame();
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

      const card =
        document.querySelector(".card");

      if (media.type === "image") {
        const imageLayer =
          document.createElement("div");

        imageLayer.className = "video";

        imageLayer.style.background =
          'url("' +
          safeUrl(media.url) +
          '") center / cover';

        card.appendChild(imageLayer);

        setTimeout(() => {
          openNextScene(answer);
        }, 1800);
      }

      if (media.type === "video") {
        const video =
          document.createElement("video");

        video.className = "video";
        video.src = media.url;
        video.autoplay = true;
        video.controls = true;
        video.playsInline = true;

        video.addEventListener(
          "ended",
          () => openNextScene(answer)
        );

        card.appendChild(video);
      }
    }

    renderGame();
  <\/script>
</body>
</html>`;

  downloadFile(
    exportedHtml,
    slugify(project.title) + ".html",
    "text/html"
  );
}

/* Основные поля */

elements.gameTitle.addEventListener(
  "input",
  event => {
    project.title = event.target.value;
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
      event.target.value || "Без названия";

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

elements.mediaType.addEventListener(
  "change",
  event => {
    getActiveScene().media.type =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.mediaUrl.addEventListener(
  "input",
  event => {
    getActiveScene().media.url =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

/* Оформление */

elements.font.addEventListener(
  "change",
  event => {
    project.theme.font =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.shape.addEventListener(
  "change",
  event => {
    project.theme.shape =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.background.addEventListener(
  "input",
  event => {
    project.theme.background =
      event.target.value;

    refreshMiniPlayer();
    saveProject();
  }
);

elements.accent.addEventListener(
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

elements.transparent.addEventListener(
  "change",
  event => {
    project.theme.transparent =
      event.target.checked;

    refreshMiniPlayer();
    saveProject();
  }
);

/* Управление сценами */

$("#addSceneBtn").addEventListener(
  "click",
  addScene
);

$("#deleteSceneBtn").addEventListener(
  "click",
  deleteScene
);

$("#addAnswerBtn").addEventListener(
  "click",
  addAnswer
);

elements.startButton.addEventListener(
  "click",
  () => {
    project.startSceneId = activeSceneId;
    render();
  }
);

/* Новый проект */

$("#newBtn").addEventListener(
  "click",
  () => {
    const confirmed = confirm(
      "Создать новый проект?"
    );

    if (!confirmed) {
      return;
    }

    project = createDefaultProject();
    activeSceneId = project.startSceneId;
    playingSceneId = project.startSceneId;

    render();
  }
);

/* JSON */

$("#saveBtn").addEventListener(
  "click",
  () => {
    downloadFile(
      JSON.stringify(project, null, 2),
      slugify(project.title) + ".json",
      "application/json"
    );
  }
);

$("#loadInput").addEventListener(
  "change",
  event => {
    const file = event.target.files[0];

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
          showToast("Ошибка JSON");
        }
      }
    );

    reader.readAsText(file);
    event.target.value = "";
  }
);

/* Предпросмотр */

$("#previewBtn").addEventListener(
  "click",
  () => {
    playingSceneId = project.startSceneId;

    const startScene =
      project.scenes.find(
        scene =>
          scene.id === playingSceneId
      ) || project.scenes[0];

    renderPlayer(
      elements.fullPlayer,
      startScene,
      true
    );

    elements.modal.classList.toggle(
      "transparent-mode",
      project.theme.transparent
    );

    elements.modal.classList.add("open");

    elements.modal.setAttribute(
      "aria-hidden",
      "false"
    );
  }
);

$("#closeBtn").addEventListener(
  "click",
  () => {
    elements.modal.classList.remove("open");

    elements.modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }
);

/* Экспорт игры */

$("#exportBtn").addEventListener(
  "click",
  exportGame
);

/* Первый запуск */

render();
