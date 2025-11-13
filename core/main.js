const { app } = require("electron");
const path = require("path");
const isDev = !app.isPackaged;

const process = require('process');

// #################################
// ########### CONSTANTS ###########
// #################################

/*

Templates come from three sources:

  1. Already built-in.
    Packaged with the app, least flexible.
    Template can only change when the app gets a new version.

  2. Is inside "Documents/inkberry-templates"
    Most flexible, users can copy any templates to this folder. (And delete them.)
    
  3. From remote: only for remotes hard-coded into the app.
    Medium flexible: remote urls are hard-coded, so they can only change when the app
    gets a new version, but the template's developer can update the template
    and users do not need to download a new version of the app.
  
*/

const REMOTE_TEMPLATES = [
  {
    id: "inchiostro",
    name: "Inchiostro",
    templatePackageUrl: 
      "https://raw.githubusercontent.com/Daniel-Wittgenstein/inchiostro-dist/refs/heads/main/template-package.json",
    zipUrl: 
      "https://raw.githubusercontent.com/Daniel-Wittgenstein/inchiostro-dist/refs/heads/main/inchiostro-latest.zip",
  }
]

const USER_TEMPLATES_DIR = path.join(app.getPath("documents"), "inkberry-templates");

const USER_SETTINGS_JSON = path.join(app.getPath("userData"), "settings.json");

const DEFAULT_PROJECTS_PATH = path.join(app.getPath('documents'), 'inkberry-projects');

const TEMPLATE_PACKAGE_NAME = "template-package.json";
const INK_PACKAGE_NAME = "ink-package.json";

const DEFAULT_ENTRY_FILE = "story.js";
const DEFAULT_INK_MAIN_FILE = "story.ink";

const projectDir = isDev ? path.resolve(__dirname, '..') : process.resourcesPath;

const STORY_TEMPLATES_DIR = path.join(projectDir, 'story-templates');
  
const INK_RUNTIME_PATH = path.join(projectDir, 'ink-js-runtime/ink.js');

const STORY_TEMPLATE_ORDER_DEFAULT_PRIO = 20;

const storyTemplateOrder = {
  // Entries here are completely optional.
  // inkberry can be used with any template,
  // but if it knows ids of common templates,
  // it can show them in a certain order.
  // KEY: id of template defined in "template-package.json"
  // VALUE: priority, where number lower than STORY_TEMPLATE_ORDER_DEFAULT_PRIO
  // means: show earlier in list of templates.
  "standard-inky": 10,
};

const MIN_WATCHER_UPDATE_INTERVAL = 5; // If the user saves changes and then saves changes
// again and the time interval between the two saves is smaller than this, then
// the changes will be ignored and the project will NOT be rebuild.
// This is most likely NOT NECESSARY, chokidar seems
// to work just fine without it. Just left here as a super-paranoid safeguard.
// Please set this to a very low value.

const WEB_PREFERENCES = {
  nodeIntegration: false,
  contextIsolation: true,
  enableRemoteModule: false,
  sandbox: true,
};

// #################################
// ########### IMPORTS #############
// #################################

const { copyDir } = require("./copyDir");
const { normalizeProjectPathAppearance } = require("./utils");
const inkjs = require("inkjs/full");
const { PosixFileHandler } = require("inkjs/compiler/FileHandler/PosixFileHandler");
const { BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const fs = require("fs");
const chokidar = require("chokidar");
const { shell } = require("electron");
const { autoDetectEntryFile } = require("./autoDetect.js");
const adjustWindow = require("./adjustWindow.js");
const buildAssetMap = require("./buildAssetMap.js");
const { startLocalServer, shutdownLocalServer } = require("./localServer.js");
const rebuildSources = require("./rebuildSources.js");
const AdmZip = require('adm-zip');
const https = require('https');
const fsPromiseVersion = require('fs/promises');

const userSettingsManager = require("./userSettingsManager.js");
userSettingsManager.init(USER_SETTINGS_JSON);

// #################################
// ######### GLOBALS ###############
// #################################

let win; // Must be defined in outer scope to prevent garbage-collection:
// https://stackoverflow.com/questions/73071018/electron-cannot-read-properties-of-undefined-reading-minimize

let currentPort = 0;

let menu;

let chokidarWatcher = null;

const store = {
  userSettings: getInitialUserSettings(),
  openedProjectPath: null,
  lastWatcherUpdateTime: 0,
  storyTemplates: [],
  currentProjectInkPackageSettings: {},
};

// #################################
// ### ELECTRON WINDOW MENU ########
// #################################

function menuItemTurnOnOff(id, status) {
  const menuItem = menu.getMenuItemById(id);
  if (!menuItem) {
    throw new Error(`No menu item with id ${id} exists.`)
  }
  menuItem.enabled = status;
}

function enableMenuItem(id) {
  menuItemTurnOnOff(id, true);
}

function disableMenuItem(id) {
  menuItemTurnOnOff(id, false);
}

function setMenu() {
  const template = [
    {
      label: "Project",
      submenu: [
        {
          id: "open-in-file-manager",
          label: "Open in File Manager",
          enabled: false,
          click: () => {
            openInFileManager();
          },
        },
        
        {
          id: "close-project",
          label: "Close Project",
          enabled: false,
          click: () => {
            closeProject();
          },
        },
      ],
    },

    {
      label: "Adjust",
      submenu: [
        {
          label: "Move Window to Left Half of Screen",
          click: () => {
            adjustWindow("left");
          },
        },

        {
          label: "Move Window to Right Half of Screen",
          click: () => {
            adjustWindow("right");
          },
        },
      ],
    },

    {
      label: "Build",
      submenu: [
        {
          label: "Build Asset Map",
          click: () => {
            buildAssetMap(store.openedProjectPath);
          },
        },

      ],
    },


    {
      role: "viewMenu",
    },


    {
      label: "Settings",
      submenu: [
        {
          label: "Reset Inkberry",
          click: () => {
            resetApp();
          },
        },
      ],
    },

    
    {
      role: "windowMenu",
    },


    {
      label: "About",
      submenu: [

        {
          label: "About",
          click: () => {
            showAbout();
          },
        },
      ],
    },


  ];

  menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// #################################
// ######### FUNCTIONS #############
// #################################

function getInitialUserSettings() {
  return {
    recentProjects: [],
  };
}

function resetApp() {
  const response = dialog.showMessageBoxSync(win, {
    type: "question",
    buttons: ["Yes, erase them!", "Cancel"],
    defaultId: 1,
    title: "Confirm",
    message: `This will erase your user preferences.`,
  });
  if (response === 0) {
    userSettingsManager.deleteFile();
    store.userSettings = getInitialUserSettings();
    send({ signal: "transmitUserSettings", userSettings: store.userSettings });
  }
}

function showAbout() {
  const message =
    `inkberry  v${app.getVersion()}\n` +
    `running on ink.js v2.3.1\n` +
    `user templates directory: ${USER_TEMPLATES_DIR}\n` +
    `user settings file: ${USER_SETTINGS_JSON}\n`;
  dialog.showMessageBox({
    type: "info",
    title: "About",
    message,
  });
}

function openDocs() {
  const filePath = path.resolve(__dirname, "../docs/index.html");
  const fileUrl = `file://${filePath.replace(/\\/g, "/")}`; //fix for windows (?)
  shell.openExternal(fileUrl);
}

async function startApp() {

  for (const p of [STORY_TEMPLATES_DIR, INK_RUNTIME_PATH]) {
    if (!fs.existsSync(p)) {
      dialog.showMessageBox({
        message: `path/file: ${p} does not exist. App was not packaged correctly?`,
        type: "error",
      });
    }
  }

  setupIpcCommunication();

  loadStoryTemplates();

  await loadRemoteStoryTemplates();

  sortStoryTemplates();

  setMenu();

  createMainWindow();
}


async function loadRemoteStoryTemplates() {

  for (const remoteTemplDef of REMOTE_TEMPLATES) {

    console.log("checking for remote template ", remoteTemplDef.id)
    if (!remoteTemplDef.templatePackageUrl || !remoteTemplDef.zipUrl || !remoteTemplDef.name
      || !remoteTemplDef.id
    ) {
      console.log("Incorrect configuration. Skipping remote template", template.id)
      return
    }

    let jsonDataPackage;
    try {
      jsonDataPackage = await fetchJSON(remoteTemplDef.templatePackageUrl);
    } catch(err) {
      console.log(`Could not fetch or parse meta file for remote template "${remoteTemplDef.id}":`, 
        err.message, "(Proceeding.)");
      return;
    }

    console.log("Found remote template-package.json for ", remoteTemplDef.id)

    addStoryTemplate(jsonDataPackage, "", "remote", remoteTemplDef.zipUrl);

  }

}


function sortStoryTemplates() {
  store.storyTemplates.sort((a, b) => {
    const prioA = storyTemplateOrder[a.id] ?? STORY_TEMPLATE_ORDER_DEFAULT_PRIO;
    const prioB = storyTemplateOrder[b.id] ?? STORY_TEMPLATE_ORDER_DEFAULT_PRIO;
    return prioA - prioB || a.package.name.localeCompare(b.package.name);
  });
}

function openInFileManager() {
  shell.openPath(store.openedProjectPath); 
}

function closeProject() {
  disableMenuItem("open-in-file-manager");
  disableMenuItem("close-project");
  win.loadFile(path.join(__dirname, "../ui/index.html"));
}


function logForUserOpeningProject(msg) {
  console.log(msg);
  send({ signal: "openingProjectUserLog", msg });
}





function fetchJSON(url) {
  console.log("fetch JSON from url", url)
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code: ${res.statusCode}`));
        res.resume();
        return;
      }

      res.setEncoding('utf8'); 

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Raw data received:', data);
        console.log('Data length:', data.length);
        
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}. Raw data: ${data}`));
        }
      });

    }).on('error', (err) => {
      reject(err);
    });
  });
}


function fetchZip(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code: ${res.statusCode}`));
        res.resume();
        return;
      }

      res.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

    }).on('error', (err) => {
       // Clean up partial file:
      fs.unlink(outputPath, () => {});
      reject(err);
    });

    file.on('error', (err) => {
      // Clean up partial file:
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}


async function updateTemplate(template) {
  const url = template.package.remote.latest
  if (url !== `https://raw.githubusercontent.com/Daniel-Wittgenstein/inchiostro-dist/refs/heads/main/inchiostro-latest.zip?cb=${Date.now()}`) {
    // Only download from approved Inchiostro source for now because of security.
    // But in theory, different templates could set their own remote URLs
    // and update themselves from there.
    dialog.showMessageBox({
      message: `URL blocked for security reasons! Download manually, please!`,
      type: "error",
    });
    return;
  }

  const zipName = "xTemplateUpdateZipxDownloadxxx.zip"

  const zipPath = path.resolve(USER_TEMPLATES_DIR, zipName)

  try {
    await fetchZip(url, zipPath);
    console.log('Downloaded.');
  } catch (err) {
    dialog.showMessageBox({
      message: `Download failed.`,
      type: "error",
    });
    return;
  }

  const zipsParentDir = path.dirname(zipPath);
  const newDirName = template.package.id + "_" + template.package.version.replaceAll(".", "_");
  const newTemplateDir = path.resolve(zipsParentDir, newDirName);

  console.log(2, newTemplateDir)
  await fsPromiseVersion.mkdir(newTemplateDir, { recursive: true });

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(newTemplateDir, true); // overwrite = true
  } catch (err) {
    dialog.showMessageBox({
      message: `Extracting zip failed.`,
      type: "error",
    });
    return;
  }

  fs.unlinkSync(zipPath);

  store.storyTemplates = []
  loadStoryTemplates()

  send({ signal: "refreshTemplateViewAfterDownload", template });
  
}


async function checkIfNewTemplateVersionExists(template) {
  return
  const currentVersion = template.package.version;
  const remote = template.package.remote;

  if (remote.meta !== `https://raw.githubusercontent.com/Daniel-Wittgenstein/inchiostro-dist/refs/heads/main/meta.json?cb=${Date.now()}`) {
    // Only download from approved Inchiostro source for now because of security.
    // But in theory, different templates could set their own remote URLs
    // and update themselves from there.
    return
  }

  console.log("template " + template.package.id + ": check remote")
  console.log("url", remote.meta)

  let jsonData;
  try {
    jsonData = await fetchJSON(remote.meta);
  } catch(err) {
    console.log('Could not fetch or parse meta file for this template:', err.message, "(Okay.)");
    return;
  }

  const latestVersion = jsonData.latestVersion;

  if (!latestVersion || typeof latestVersion !== 'string' || getDotAmount(latestVersion) !== 2) {
    // invalid version string
    console.log("meta JSON file fetched but contains wrong latestVersion format (Okay.)");
    return
  }

  console.log(`currentVersion: ${currentVersion}, latestVersion: ${latestVersion}`);

  if (!aIsHigherVersionThanB(latestVersion, currentVersion)) {
    console.log("No new version of this template available.");
    return
  }

  console.log('template ' + template.package.id + ': a more current version is available!');

  send({ signal: "newTemplateVersionFound", template, latestVersion });
}



function getDotAmount (str) {
  return (str.match(/\./g) || []).length
}


function aIsHigherVersionThanB(a, b) {
  const [a1, a2, a3] = a.split('.').map(Number);
  const [b1, b2, b3] = b.split('.').map(Number);
  if (a1 > b1) return true
  if (a1 < b1) return false
  if (a2 > b2) return true
  if (a2 < b2) return false
  if (a3 > b3) return true
  return false
}

function setupIpcCommunication() {
  ipcMain.handle("startUpRequestData", async (event, data) => {
    return {
      storyTemplates: store.storyTemplates,
      defaultProjectsPath: DEFAULT_PROJECTS_PATH,
    };
  });

  ipcMain.on("toMain", (event, msg) => {
    console.log("received message from renderer", msg);

    if (msg.signal === "openDocs") {
      openDocs();

    } else if (msg.signal === "toolBarAction") {
      onToolBarAction(msg.action);

    } else if (msg.signal === "convertProjectDone") {
      onConvertProjectDone(msg.projectName, msg.filePath, msg.entryFile, msg.inkFile);

    } else if (msg.signal === "convertProjectSelectDir") {
      onConvertProjectSelectDir();

    } else if (msg.signal === "newProjectSelectDir") {
      onNewProjectSelectDir();

    } else if (msg.signal === "newProjectDone") {
      if (!msg.projectName || msg.projectName.trim() === "") {
        dialog.showMessageBox({
          message: `Please give your project a name!`,
          type: "error",
        });
        return;
      }
      if (!msg.selectedStoryTemplate) {
        dialog.showMessageBox({
          message: `No story template selected!`,
          type: "error",
        });
        return;
      }
      const templatePath = msg.selectedStoryTemplate.templatePath;

      const createFromRemote = (msg.selectedStoryTemplate.templateType === "remote")

      if (createFromRemote) {
        createNewProjectFromRemote(msg.filePath, msg.projectName, 
          msg.selectedStoryTemplate.remoteUrl);
      } else {
        createNewProject(templatePath, msg.filePath, msg.projectName);
      }
    
    } else if (msg.signal === "requestUserSettings") {
      store.userSettings = userSettingsManager.loadSettings() || store.userSettings;
      send({ signal: "transmitUserSettings", userSettings: store.userSettings });
    
    } else if (msg.signal === "selectProjectToOpen") {
      onSelectProjectToOpen();
    
    } else if (msg.signal === "loadStoryTemplate") {
      dialog
        .showOpenDialog({
          properties: ["openFile"],
        })
        .then((filePaths) => {
          const errMsg = loadNewStoryTemplate(filePaths.filePaths[0]);
          if (errMsg === "abort") {
            return;
          } else if (errMsg === "success") {
            send({ signal: "storyTemplateLoadStatus", filePaths, msg: "Success! Loaded template." });
          } else {
            dialog.showMessageBox({
              message: errMsg,
              type: "error",
            });
          }
        });

    } else if (msg.signal === "directlyOpenProject") {
      openProject(msg.path);
    
    } else if (msg.signal === "checkIfNewTemplateVersionExists") {
      checkIfNewTemplateVersionExists(msg.template);

    } else if (msg.signal === "updateTemplate") {
      updateTemplate(msg.template);

    } else {
      throw new Error(`Invalid signal.`);
    }
  });
}

function loadNewStoryTemplate(inputPath) {

  function getUniqueTargetPath(baseName) {
    const baseDir = path.join(app.getPath("documents"), "inkberry-templates");
    let targetPath = path.join(baseDir, baseName);
    let counter = 1;
    while (fs.existsSync(targetPath)) {
      targetPath = path.join(baseDir, `${baseName}_${counter}`);
      counter++;
    }
    return targetPath;
  }

  try {
    if (!inputPath) return "abort";
    const stats = fs.statSync(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    const baseName = path.basename(inputPath, ext);
    const targetPath = getUniqueTargetPath(baseName);

    if (stats.isFile() && ext === '.zip') {
      const zip = new AdmZip(inputPath);
      const exists = zip.getEntries().some(entry => entry.entryName === 'template-package.json');
      if (!exists) {
        return `This does not seem to be a valid story template. There is no "template-package.json" file.`;
      }
      zip.extractAllTo(targetPath, true);
      console.log("extracted to", targetPath);
      store.storyTemplates = [];
      loadStoryTemplates();
      return "success";
    } else {
      return 'Error: Provided path is not a .zip file.';
    }
  } catch (err) {
    return `Error: ${err.message}`;
  }

}

function loadTemplatesFromDir(dirToLoadFrom, templateType) {
  const dirs = fs.readdirSync(dirToLoadFrom);
  dirs.forEach((dir) => {
    const templatePath = path.join(dirToLoadFrom, dir);
    if (!fs.statSync(templatePath).isDirectory()) {
      console.log(
        `Directory "${dirToLoadFrom}" contains a file. ` +
          `Harmless, but should not be the case. This directory should ` +
          `contain sub-directories, only.`,
      );
      return;
    }
    const packagePath = path.join(dirToLoadFrom, dir, TEMPLATE_PACKAGE_NAME);
    try {
      const data = fs.readFileSync(packagePath, "utf8");
      const package = JSON.parse(data);
      addStoryTemplate(package, templatePath, templateType);
    } catch {
      dialog.showMessageBox({
        message:
          `The template directory "${templatePath}" does not seem to contain ` +
          `a file named "${TEMPLATE_PACKAGE_NAME}". Or the file does not contain valid JSON? ` +
          `I could not load this template.`,
        type: "error",
      });
    }
  });
}

function loadStoryTemplates() {
  try {
    loadTemplatesFromDir(STORY_TEMPLATES_DIR, "built-in-template");
  } catch {
    dialog.showMessageBox({
      message:
        `Could not load default templates. ` + `Directory "${STORY_TEMPLATES_DIR}" does not exist?`,
      type: "error",
    });
  }

  const userTemplatesDir = USER_TEMPLATES_DIR;

  if (fs.existsSync(userTemplatesDir) && fs.statSync(userTemplatesDir).isDirectory()) {
    console.log("Found user template directory.");
    loadTemplatesFromDir(userTemplatesDir, "user-template");
  } else {
    console.log("No user template directory found. Harmless.");
  }

}

function addStoryTemplate(package, templatePath, templateType, remoteUrl = "") {
  store.storyTemplates.push({ package, templatePath, templateType, remoteUrl });
}

function createMainWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      ...WEB_PREFERENCES,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "logo", "logo-128.png"),
  });
  win.loadFile(path.join(__dirname, "../ui/index.html"));
}

function onConvertProjectDone(projectName, filePath, entryFile, inkFile) {
  //user clicked done inside convert project dialog.
  //let's start converting the project:
  const hasInkPackageJson = fs.existsSync(path.join(filePath, INK_PACKAGE_NAME));
  if (hasInkPackageJson) {
    dialog.showMessageBox({
      message: `Failure: this directory already contains a file called "${INK_PACKAGE_NAME}".`,
      type: "error",
    });
    return;
  }
  try {
    createInkPackageJson(filePath, projectName, entryFile, inkFile);
  } catch (err) {
    dialog.showMessageBox({
      message: `Failure: Could not create ${INK_PACKAGE_NAME}`,
      type: "error",
    });
    return;
  }
  dialog.showMessageBox({
    message:
      `Converted project successfully. If you just see a blank screen, ` +
      `you might have set the js entry file incorrectly.`,
    type: "info",
  });
  openProject(filePath);
}

function createInkPackageJson(projectPath, projectName, entryFile, inkFile) {
  const package = {
    projectName,
    entryFile,
    inkFile,
  };
  const json = JSON.stringify(package, null, 2);
  fs.writeFileSync(path.join(projectPath, INK_PACKAGE_NAME), json);
}

function onSelectProjectToOpen() {
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then((filePaths) => {
      if (!filePaths.filePaths[0]) return;

      send({
        signal: "blockUiWhileOpeningFromFileDialog",
      });

      openProject(filePaths.filePaths[0]);
    });
}

function removeProject(projectPath) {
  store.userSettings.recentProjects = store.userSettings.recentProjects.filter(
    (project) => project.path !== projectPath,
  );
  saveSettings();
}

function checkIfProjectIsValid(projectPath) {
  if (!fs.existsSync(projectPath)) {
    dialog.showMessageBox({
      message: `Directory ${normalizeProjectPathAppearance(projectPath)} does not exist.`,
      type: "error",
    });
    removeProject(projectPath);
    return false;
  }
  if (!fs.existsSync(path.join(projectPath, INK_PACKAGE_NAME))) {
    dialog.showMessageBox({
      message:
        `Could not find "${INK_PACKAGE_NAME}". ` +
        ` This does not seem to be a valid inkberry project.`,
      type: "error",
    });
    removeProject(projectPath);
    return false;
  }
  return true;
}

function loadPackageJson(projectPath) {
  try {
    const content = fs.readFileSync(path.join(projectPath, INK_PACKAGE_NAME), {
      encoding: "utf8",
    });
    return JSON.parse(content);
  } catch {
    dialog.showMessageBox({
      message:
        `Could not read/deserialize "${INK_PACKAGE_NAME}" file. ` +
        `Is the JSON inside the file invalid?`,
      type: "error",
    });
    removeProject(projectPath);
    return null;
  }
}

function watchProjectDirectory(projectPath) {
  if (chokidarWatcher) {
    chokidarWatcher.close();
  }

  const entryFile = store.currentProjectInkPackageSettings.entryFile || DEFAULT_ENTRY_FILE;

  const options = {
    ignored: [path.join(projectPath, entryFile)],
    ignoreInitial: true,
  };

  chokidarWatcher = chokidar.watch(projectPath, options).on("change", (event, projectPath) => {
    const timeNow = performance.now();
    const diff = timeNow - store.lastWatcherUpdateTime;
    if (diff < MIN_WATCHER_UPDATE_INTERVAL) {
      console.log(
        "project changed, but ignoring because the last update " +
          `just happened. Time difference was only ${diff} ms`,
        new Date(),
      );
      return;
    }
    store.lastWatcherUpdateTime = timeNow;
    rebuildAndRefresh();
  });
}

function sendOpenProjectFail() {
  send({ signal: "openProjectFail" });
}

function openProject(projectPath) {
  console.log("opening", projectPath);

  logForUserOpeningProject("opening project: " + projectPath);

  const result = checkIfProjectIsValid(projectPath);
  if (!result) {
    console.log("invalid project");
    sendOpenProjectFail();
    return;
  }

  let json = loadPackageJson(projectPath);
  if (!json) {
    console.log("open project fail");
    sendOpenProjectFail();
    return;
  }

  store.openedProjectPath = projectPath;
  store.currentProjectInkPackageSettings = json;

  addToListOfRecentProjects(store.currentProjectInkPackageSettings.projectName, projectPath);

  logForUserOpeningProject("Starting the local server ...");

  startLocalServer(
    projectPath,
    (didStart, chosenPort) => {
      if (!didStart) {
        dialog.showMessageBox({
          message: `Could not start the local server.`,
          type: "error",
        });
        return;
      }
      logForUserOpeningProject("Started the local server!");

      logForUserOpeningProject("Starting file watcher ...");
      watchProjectDirectory(projectPath);
      logForUserOpeningProject("File watcher started!");

      logForUserOpeningProject("Building project for the first time ...");
      rebuildAndRefresh();
      logForUserOpeningProject("Built project!");

      logForUserOpeningProject("Creating the game preview ...");

      setTimeout(
        () => {
          currentPort = chosenPort;
          clearLocalStorage();
          win.loadURL(`http://localhost:${chosenPort}`);
          enableMenuItem("open-in-file-manager");
          enableMenuItem("close-project");
        },
        0 //bump up if you want to take a peek at the user console output.
      );
    },
    logForUserOpeningProject,
  );
}

function clearLocalStorage() {
  if (!currentPort) {
    return;
  }
  win.webContents.session.clearStorageData({
    origin: `http://localhost:${currentPort}`,
    storages: ['localstorage']
  });
}

function rebuildAndRefresh(options = { retry: false }) {
  clearLocalStorage();
  if (!rebuildInkStory(options)) {
    console.log("Building ink story FAILED!!!");
    return;
  }
  const start = performance.now();
  rebuildSources(store.openedProjectPath);
  const diff = performance.now() - start;
  console.log("elapsed:", diff);
  console.log("rebuild ink story. success!");
  
  reloadPage();
}

function reloadPage() {
  win.webContents.reloadIgnoringCache();
}

function rebuildInkStory(options) {
  console.log("start compilation");

  // For PosixFileHandler explanation, see:
  // https://github.com/y-lohse/inkjs/blob/master/docs/compiler-differences.md
  const pathToStoryFolder = store.openedProjectPath;

  let inkFileContent;

  let mainInkFileName = store.currentProjectInkPackageSettings.inkFile || DEFAULT_INK_MAIN_FILE;

  const pathToMainFile = `${pathToStoryFolder}/${mainInkFileName}`;

  try {
    inkFileContent = fs.readFileSync(pathToMainFile, "UTF-8");
  } catch (err) {
    dialog.showMessageBox({
      message:
        `Cannot read ink file "${pathToMainFile}". ` + `Was the main ink file moved or deleted?`,
      type: "error",
    });
    return false;
  }

  //remove BOM (byte order mark):
  inkFileContent = inkFileContent.replace(/^\uFEFF/, "");

  if (inkFileContent === "") {
    // Can happen.
    // Probably chokidar registering a file change, but inky has just created
    // the file, not filled it yet, so the file is still empty. (Or something similar.)
    // Leads to annoying bug where you get an empty ink story and just see a blank page,
    // So we wait a bit and retry:
    if (!options.retry) {
      console.log("empty file content. trying again soon");
      setTimeout(
        () => {
          console.log("empty file content. trying again now!");
          rebuildAndRefresh({ retry: true });
        },
        500 //try again after ...
      );
      return false;
    } else {
      onInkCompilationError("Your main ink file seems to be empty.", "empty");
      return false;
    }
  }

  const fileHandler = new PosixFileHandler(`${pathToStoryFolder}/`);
  const errorHandler = (message, errorType) => {
    onInkCompilationError(message, "from-error-handler");
  };

  let story;
  try {
    story = new inkjs.Compiler(inkFileContent, {
      fileHandler,
      errorHandler,
    }).Compile();
  } catch (err) {
    // Displaying the error is handled in the errorHandler callback,
    // but apparently the "Compile" method still throws an actual error,
    // which we have to catch and ignore (???) here.
    console.log("ink compilation error happened:", err);
    onInkCompilationError(err, "from-try-catch");

    return false;
  }

  const jsonStory = story.ToJson();

  // There is no special magic in converting from JSON to JS, we just prepend a string.
  // If you look at Inky's code for the web export, it does the exact same thing:
  const jsStory = `var storyContent = ${jsonStory};`;

  const outputfile = path.join(
    store.openedProjectPath,
    store.currentProjectInkPackageSettings.entryFile,
  );

  fs.writeFileSync(outputfile, jsStory);

  return true;
}

function onInkCompilationError(message, source) {
  //todo
}

function autoDetectData(filePath) {
  if (!filePath) return;

  const autoDetectedData = {};

  const entryFile = autoDetectEntryFile(filePath);

  if (entryFile) {
    autoDetectedData.entryFile = entryFile;
    autoDetectedData.inkMainFile = entryFile.replace(".js", ".ink");
  }

  return autoDetectedData;
}

function onConvertProjectSelectDir() {
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then((filePaths) => {
      const autoDetectedData = autoDetectData(filePaths.filePaths[0]);
      const hasInkPackageJson = fs.existsSync(path.join(filePaths.filePaths[0], INK_PACKAGE_NAME));
      if (hasInkPackageJson) {
        dialog.showMessageBox({
          message:
            `This directory contains a file called "${INK_PACKAGE_NAME}", ` +
            `so I am assuming it already is an inkberry project directory. ` +
            `There is no need to convert this. ` +
            `To open the project, go back to the main menu and choose "Open an Inkberry Project"!`,
          type: "error",
        });
        return;
      }
      send({ signal: "convertProjectSelectDir", filePaths, autoDetectedData });
    });
}

function onNewProjectSelectDir() {
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then((filePaths) => {
      send({ signal: "newProjectSelectDir", filePaths });
    });
}

function createNewProjectFromRemote(targetFilePath, projectName, 
  remoteUrl) {
  console.log(`create new project from remote url: `, targetFilePath, projectName, remoteUrl)
}

function createNewProject(templatePath, path, projectName) {
  createNewProjectFiles(projectName, templatePath, path, () => {

    send({ signal: "onProjectFilesCreated" });

    openProject(path);
  });
}

function createNewProjectFiles(projectName, templatePath, newProjectPath, onFinished) {
  if (fs.existsSync(newProjectPath)) {
    dialog.showMessageBox({
      message: `Directory ${newProjectPath} exists already.`,
      type: "error",
    });
    return;
  }
  const directoryPath = newProjectPath;
  fs.mkdir(directoryPath, { recursive: true }, async (err) => {
    if (err) {
      dialog.showMessageBox({
        message: `Error creating directory ${newProjectPath}`,
        type: "error",
      });
      return;
    } else {
      console.log("starting to copy", templatePath, "to", newProjectPath);
      await copyDir(templatePath, newProjectPath);
      console.log("starting to write ink.js file")
      fs.writeFileSync(path.join(newProjectPath, "ink.js"), fs.readFileSync(INK_RUNTIME_PATH));
      createInkPackageJson(newProjectPath, projectName, DEFAULT_ENTRY_FILE, DEFAULT_INK_MAIN_FILE);
      onFinished();
    }
  });
}

function addToListOfRecentProjects(name, path) {
  if (!store.userSettings.recentProjects) {
    store.userSettings.recentProjects = [];
  }

  store.userSettings.recentProjects = store.userSettings.recentProjects.filter(
    (project) => project.path !== path,
  );

  store.userSettings.recentProjects.push({
    path,
    name,
    date: +new Date(),
  });

  saveSettings();
}

function saveSettings() {
  userSettingsManager.saveSettings(store.userSettings);
}

function send(obj) {
  win.webContents.send("fromMain", obj);
}

function cleanUpTempFiles() {

}

//##########################
//#  app handlers:         #
//##########################

app.on("will-quit", () => {
  shutdownLocalServer();

  cleanUpTempFiles();
});

app.on("ready", startApp);
