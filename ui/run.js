import getTemplatePreviewHtml from "./getTemplatePreviewHtml.mjs";
import createDirNameFromProjectName from "./createDirNameFromProjectName.mjs";
import normalizeProjectPathAppearance from "./normalizeProjectPathAppearance.mjs";
import switchToScreen from "./switchToScreen.mjs";
import getHtmlForStoryTemplateBox from "./getHtmlForStoryTemplateBox.mjs";

window.onload = startApp;

const app = {
  newProjectFilePath: "",
  newProjectName: "",
  totalProjectFilePath: "",
  userSettings: null,
  storyTemplates: null,
  selectedStoryTemplate: null,
  entryFileName: "",
  inkMainFileName: "",
};

window.api.receive("fromMain", (data) => {
  console.log(`Got data from main process`, data);

  if (data.signal === "blockUiWhileOpeningFromFileDialog") {
    showWaitingForProjectToOpenScreen();
  
  } else if (data.signal === "openProjectFail") {
    hideWaitingForProjectToOpenScreen();
  
  } else if (data.signal === "openingProjectUserLog") {
    logToWaitingForProjectToOpenScreen(data.msg);
  
  } else if (data.signal === "convertProjectSelectDir") {
    onConvertProjectFilePathSelected(data.filePaths.filePaths[0], data.autoDetectedData);
  
  } else if (data.signal === "newProjectSelectDir") {
    onNewProjectFilePathSelected(data.filePaths.filePaths[0]);

  } else if (data.signal === "storyTemplateLoadStatus") {
    const msg = data.msg + "<br>" + (data.filePaths.filePaths[0] || "");
    document.getElementById("story-template-load-result").style.display = "block";
    document.getElementById("story-template-load-result").innerHTML = msg;

  } else if (data.signal === "transmitUserSettings") {
    app.userSettings = data.userSettings;
    if (app.userSettings) {
      populateRecentProjectsBox();
      if (app.userSettings?.recentProjects?.length) {
        hideWarning();  
      }
    }

  } else if (data.signal === "onProjectFilesCreated") {
    showWaitingForProjectToOpenScreen();

  } else if (data.signal === "newTemplateVersionFound") {
    newTemplateVersionFound(data.template, data.latestVersion)

  } else if (data.signal === "refreshTemplateViewAfterDownload") {
    alert("Successfully updated template! Realoding app now.");
    window.location.reload();

  } else {
    throw new Error("Invalid signal: " + data.signal);
  }
});


function newTemplateVersionFound(template, latestVersion) {
  const el = document.getElementById("new-template-displayer")
  const child = document.createElement("div")
  child.innerHTML = `
    <div class="new-template-notify">
      Template <b>"${template.package.name}"</b>: a new version of this template is available!<br>
      Your version: ${template.package.version}<br>
      Latest version: ${latestVersion}<br>
    </div>
  `

  const button = document.createElement("button")
  button.innerHTML = "DOWNLOAD AND UPDATE TEMPLATE"

  child.firstElementChild.appendChild(button)

  button.addEventListener("click", () => {
    window.api.send("toMain", {
      signal: "updateTemplate",
      template,
    })
  })

  el.appendChild(child)

}

function hideWarning() {
  document.getElementById("warning").style.display = "none";
}

function updateMainInkFileName() {
  setTimeout(() => {
    app.inkMainFileName = document.getElementById("convert-project-main-ink-file").value.trim();
  }, 50);
}

function updateEntryFileName() {
  setTimeout(() => {
    app.entryFileName = document.getElementById("convert-project-entry-file").value.trim();

    document.getElementById("entry-file-overwrite-warning").style.display = "block";

    document.getElementById("entry-file-overwrite-warning").innerHTML = `
      Warning: If you proceed, the contents of the file "${app.entryFileName}" will be
      permanently overwritten. Make sure that you have the right file.
      (Remember to always back up your data.)
    `;
  }, 50);
}

async function startApp() {

  document.getElementById('button-close-warning').addEventListener("click", () => {
    hideWarning();
  });

  document.body.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      switchToScreen("start-screen");
      event.preventDefault();
    }
  });

  document
    .getElementById("convert-project-entry-file")
    .addEventListener("change", updateEntryFileName);
  document
    .getElementById("convert-project-entry-file")
    .addEventListener("keydown", updateEntryFileName);

  document
    .getElementById("convert-project-main-ink-file")
    .addEventListener("change", updateMainInkFileName);
  document
    .getElementById("convert-project-main-ink-file")
    .addEventListener("keydown", updateMainInkFileName);

  document
    .getElementById("button-convert-project")
    .addEventListener("click", () => switchToScreen("convert-project-screen"));

  document.getElementById("button-convert-project-select-dir").addEventListener("click", () =>
    window.api.send("toMain", {
      signal: "convertProjectSelectDir",
    }),
  );

  document
    .getElementById("convert-project-name")
    .addEventListener("change", updateConvertProjectName);
  
  document
    .getElementById("convert-project-name")
    .addEventListener("keydown", updateConvertProjectName);

  document.getElementById("button-convert-project-done").addEventListener("click", () => {
    showWaitingForProjectToOpenScreen();
    window.api.send("toMain", {
      signal: "convertProjectDone",
      projectName: app.newProjectName,
      filePath: app.totalProjectFilePath,
      entryFile: app.entryFileName,
      inkFile: app.inkMainFileName,
    });
  });

  document
    .getElementById("button-convert-project-abort")
    .addEventListener("click", () => switchToScreen("start-screen"));

  document
    .getElementById("button-load-story-template")
    .addEventListener("click", () => switchToScreen("load-story-template"));

  document
    .getElementById("button-load-story-template-abort")
    .addEventListener("click", () => switchToScreen("start-screen"));

  document
    .getElementById("button-load-story-template-select")
    .addEventListener("click", () => {
      window.api.send("toMain", {
        signal: "loadStoryTemplate",
      });
    });

  document
    .getElementById("button-new-project")
    .addEventListener("click", () => {
      switchToScreen("new-project-screen");
      document.getElementById("new-project-name").focus();
    });

  document.getElementById("button-open-project").addEventListener("click", () => {
    window.api.send("toMain", {
      signal: "selectProjectToOpen",
    });
  });


  document.getElementById("button-new-project-select-dir").addEventListener("click", () => {
    window.api.send("toMain", {
      signal: "newProjectSelectDir",
    });
  });

  document.getElementById("new-project-name").addEventListener("change", updateNewProjectName);
  document.getElementById("new-project-name").addEventListener("keydown", updateNewProjectName);

  document.getElementById("button-new-project-done").addEventListener("click", () => {
    window.api.send("toMain", {
      signal: "newProjectDone",
      projectName: app.newProjectName,
      filePath: app.totalProjectFilePath,
      selectedStoryTemplate: app.selectedStoryTemplate,
    });
  });

  document
    .getElementById("button-new-project-abort")
    .addEventListener("click", () => switchToScreen("start-screen"));

  window.api.send("toMain", {
    signal: "requestUserSettings",
  });

  const result = await window.api.invoke("startUpRequestData");
  app.newProjectFilePath = result.defaultProjectsPath;
  updateNewProjectFilePath();

  app.storyTemplates = result.storyTemplates;
  populateStoryTemplateSelector();

  switchToScreen("start-screen");
}

function selectTemplateByIndex(templateIndex) {
  document.getElementById("sts-right").innerHTML = getTemplatePreviewHtml(
    app.storyTemplates[templateIndex],
  );
  document.getElementById(`story-templ${templateIndex}`).checked = true;
  app.selectedStoryTemplate = app.storyTemplates[templateIndex];
}

function populateStoryTemplateSelector(checkRemote = true) {
  const el = document.getElementById("story-template-selector");

  if (!app.storyTemplates) {
    el.innerHTML = "No story templates found.";
    return;
  }

  document.addEventListener("click", (event) => {
    if (event.target.matches('input[name="story-templates"]')) {
      const templateIndex = event.target.value;
      selectTemplateByIndex(templateIndex);
    }
  });

  el.innerHTML = `
    <div id="sts-left"></div>
    <div id="sts-right"></div>
  `;

  const stsLeft = document.getElementById("sts-left");

  let html = `<div>`;
  let index = -1;
  for (const template of app.storyTemplates) {
    index++;
    html += getHtmlForStoryTemplateBox(template, index);
    if (template.package.remote && checkRemote) {
      window.api.send("toMain", {
        signal: "checkIfNewTemplateVersionExists",
        template,
      });
    }
  }
  html += `</div>`;
  stsLeft.innerHTML = html;
  selectTemplateByIndex(0); //select first entry
}

function showWaitingForProjectToOpenScreen() {
  const el = document.getElementById("opening-project-overlay");
  el.style.display = "block";
  el.innerHTML = "";
  logToWaitingForProjectToOpenScreen(`Please wait ...`);
}

function logToWaitingForProjectToOpenScreen(msg) {
  const el = document.getElementById("opening-project-overlay");
  el.innerHTML += `<p>${msg}</p>`;
}

function hideWaitingForProjectToOpenScreen() {
  const el = document.getElementById("opening-project-overlay");
  el.style.display = "none";
}

function onConvertProjectFilePathSelected(filePath, autoDetectedData) {
  if (!filePath) return;
  app.newProjectFilePath = filePath;
  updateNewProjectFilePathForConvert();
  console.log("autoDetectedData", autoDetectedData);

  app.inkMainFileName = autoDetectedData.inkMainFile;

  if (app.inkMainFileName) {
    document.getElementById("convert-project-main-ink-file").value = autoDetectedData.inkMainFile;
    updateMainInkFileName();
    showMainInkFileInfo(
      `Auto-detected main ink file! ` +
        `I think "${app.inkMainFileName}" is your main ink file. ` +
        `If you think this is wrong, you can still change the file name manually.`,
    );
  } else {
    showMainInkFileInfo(
      `I could not auto-detect your story's main ".ink" file. ` +
        `You will have to type the file name out manually.`,
    );
  }

  if (autoDetectedData.entryFile) {
    app.entryFileName = autoDetectedData.entryFile;
    document.getElementById("convert-project-entry-file").value = autoDetectedData.entryFile;
    updateEntryFileName();
    showEntryFileInfo(
      `Auto-detected js file! ` +
        `I think "${autoDetectedData.entryFile}" is where your story content resides ` +
        `because the file starts with <i>"var storyContent = "</i> ` +
        `If you think this is wrong, you can still change the file name manually.`,
    );
  } else {
    showEntryFileInfo(
      `I could not auto-detect your story's entry ".js" file. ` +
        `You will have to type the file name out manually.This should be a file starting ` +
        `with "var storyContent = ".`,
    );
  }
  document.getElementById("main-ink-file-name-box").style.display = "block";
  document.getElementById("entry-file-name-box").style.display = "block";
}

function showEntryFileInfo(html) {
  document.getElementById("entry-file-info").innerHTML = html;
}

function showMainInkFileInfo(html) {
  document.getElementById("main-ink-file-info").innerHTML = html;
}

function onNewProjectFilePathSelected(filePath) {
  if (!filePath) {
    throw "no file path " + filePath;
  }
  app.newProjectFilePath = filePath;
  updateNewProjectFilePath();
}

function updateNewProjectName() {
  setTimeout(() => {
    app.newProjectName = document.getElementById("new-project-name").value;
    updateNewProjectFilePath();
    refreshProjectFilePathDisplay("new-project-selected-dir-label");
  }, 50);
}

function updateConvertProjectName() {
  setTimeout(() => {
    app.newProjectName = document.getElementById("convert-project-name").value;
    updateNewProjectFilePathForConvert();
    refreshProjectFilePathDisplay("convert-project-selected-dir-label");
  }, 50);
}

function refreshProjectFilePathDisplay(elId) {
  document.getElementById(elId).innerText = normalizeProjectPathAppearance(
    app.totalProjectFilePath,
  );
}

function updateNewProjectFilePath() {
  // Yes, the path is created with a slash here. This should work
  // on Windows, too, because the path is normalized in the main process anyway.
  app.totalProjectFilePath =
    app.newProjectFilePath + "/" + createDirNameFromProjectName(app.newProjectName);

  refreshProjectFilePathDisplay("new-project-selected-dir-label");
}

function updateNewProjectFilePathForConvert() {
  app.totalProjectFilePath = app.newProjectFilePath;
  refreshProjectFilePathDisplay("convert-project-selected-dir-label");
}

function populateRecentProjectsBox() {
  function sanitizePath(path) {
    return path.replaceAll('"', '\\"');
  }

  const box = document.getElementById("recent-projects-box");
  box.innerHTML = "";
  if (!app.userSettings?.recentProjects?.length) return;

  let out = "<br><p><b>Recent Projects:</b></p>";
  let index = 0;
  for (const project of app.userSettings.recentProjects.reverse()) {
    const id = "x-btn-open-project-" + index;
    index++;
    let dateText = "unknown date";
    if (project.date) {
      const date = new Date(project.date);
      dateText = date.toLocaleString();
    }
    out += `
    <div class="recent-projects-item">
      <div>
          <span><b>${project.name}</b></span>
          <span class="recent-projects-info">${normalizeProjectPathAppearance(project.path)}</span>
          <span class="recent-projects-info">last opened: ${dateText}</span>
      </div>
      <div>
        <button id="${id}" data-project="${sanitizePath(project.path)}">Open</button>
      </div>
    </div>`;
  }
  box.innerHTML = out;
  setTimeout(() => {
    for (let i = 0; i < index; i++) {
      document.getElementById("x-btn-open-project-" + i).addEventListener("click", (ev) => {
        showWaitingForProjectToOpenScreen();
        window.api.send("toMain", {
          signal: "directlyOpenProject",
          path: ev.target.dataset.project,
        });
      });
    }
  }, 200);
}
