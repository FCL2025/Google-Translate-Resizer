const STORAGE_KEY = "gtrSettings";
const DEFAULT_SETTINGS = {
  enabled: true,
  linked: true,
  linkedWidth: 640,
  leftWidth: 640,
  rightWidth: 640
};

const elements = {
  enabled: document.getElementById("enabled"),
  linkedMode: document.getElementById("linkedMode"),
  splitMode: document.getElementById("splitMode"),
  linkedControls: document.getElementById("linkedControls"),
  splitControls: document.getElementById("splitControls"),
  linkedWidth: document.getElementById("linkedWidth"),
  leftWidth: document.getElementById("leftWidth"),
  rightWidth: document.getElementById("rightWidth"),
  linkedValue: document.getElementById("linkedValue"),
  leftValue: document.getElementById("leftValue"),
  rightValue: document.getElementById("rightValue"),
  reset: document.getElementById("reset"),
  statusText: document.getElementById("statusText")
};

let settings = { ...DEFAULT_SETTINGS };
let saveTimer = null;
let applyTimer = null;

function msg(name) {
  return chrome.i18n.getMessage(name) || name;
}

function applyLocalization() {
  const uiLanguage = chrome.i18n.getUILanguage();
  document.documentElement.lang = uiLanguage.toLowerCase().startsWith("zh") ? "zh-Hant" : "en";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = msg(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.title = msg(element.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", msg(element.dataset.i18nAriaLabel));
  });
}

function clampWidth(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return DEFAULT_SETTINGS.linkedWidth;
  }
  return Math.min(1200, Math.max(320, Math.round(number)));
}

function normalizeSettings(value = {}) {
  return {
    enabled: value.enabled !== false,
    linked: value.linked !== false,
    linkedWidth: clampWidth(value.linkedWidth ?? DEFAULT_SETTINGS.linkedWidth),
    leftWidth: clampWidth(value.leftWidth ?? value.linkedWidth ?? DEFAULT_SETTINGS.leftWidth),
    rightWidth: clampWidth(value.rightWidth ?? value.linkedWidth ?? DEFAULT_SETTINGS.rightWidth)
  };
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function render() {
  elements.enabled.checked = settings.enabled;

  elements.linkedMode.setAttribute("aria-pressed", String(settings.linked));
  elements.splitMode.setAttribute("aria-pressed", String(!settings.linked));
  elements.linkedControls.hidden = !settings.linked;
  elements.splitControls.hidden = settings.linked;

  elements.linkedWidth.value = settings.linkedWidth;
  elements.leftWidth.value = settings.leftWidth;
  elements.rightWidth.value = settings.rightWidth;

  elements.linkedValue.textContent = `${settings.linkedWidth} px`;
  elements.leftValue.textContent = `${settings.leftWidth} px`;
  elements.rightValue.textContent = `${settings.rightWidth} px`;
}

async function getActiveTab() {
  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, resolve);
  });
  return tabs[0];
}

async function sendSettingsToTab() {
  const tab = await getActiveTab();
  if (!tab?.id || !/^https:\/\/translate\.google\./.test(tab.url ?? "")) {
    setStatus(msg("statusUseTranslateTab"));
    return;
  }

  chrome.tabs.sendMessage(
    tab.id,
    { type: "GTR_APPLY_SETTINGS", settings },
    (response) => {
      if (chrome.runtime.lastError) {
        setStatus(msg("statusRefreshTranslateTab"));
        return;
      }

      setStatus(response?.found ? msg("statusApplied") : msg("statusPanelsMissing"));
    }
  );
}

async function saveSettings() {
  await new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: settings }, resolve);
  });
}

function scheduleSave(immediate = false) {
  window.clearTimeout(saveTimer);

  if (immediate) {
    void saveSettings();
    return;
  }

  saveTimer = window.setTimeout(() => void saveSettings(), 500);
}

function scheduleApply(immediate = false) {
  window.clearTimeout(applyTimer);

  if (immediate) {
    void sendSettingsToTab();
    return;
  }

  applyTimer = window.setTimeout(() => void sendSettingsToTab(), 60);
}

function saveAndApply(immediate = false) {
  scheduleSave(immediate);
  scheduleApply(immediate);
}

function setLinkedMode(linked) {
  settings = normalizeSettings({ ...settings, linked });
  render();
  saveAndApply(true);
}

function bindEvents() {
  elements.enabled.addEventListener("change", () => {
    settings = normalizeSettings({ ...settings, enabled: elements.enabled.checked });
    render();
    saveAndApply(true);
  });

  elements.linkedMode.addEventListener("click", () => setLinkedMode(true));
  elements.splitMode.addEventListener("click", () => setLinkedMode(false));

  elements.linkedWidth.addEventListener("input", () => {
    const linkedWidth = clampWidth(elements.linkedWidth.value);
    settings = normalizeSettings({
      ...settings,
      linkedWidth,
      leftWidth: linkedWidth,
      rightWidth: linkedWidth
    });
    render();
    saveAndApply();
  });

  elements.linkedWidth.addEventListener("change", () => saveAndApply(true));

  elements.leftWidth.addEventListener("input", () => {
    settings = normalizeSettings({ ...settings, leftWidth: elements.leftWidth.value });
    render();
    saveAndApply();
  });

  elements.leftWidth.addEventListener("change", () => saveAndApply(true));

  elements.rightWidth.addEventListener("input", () => {
    settings = normalizeSettings({ ...settings, rightWidth: elements.rightWidth.value });
    render();
    saveAndApply();
  });

  elements.rightWidth.addEventListener("change", () => saveAndApply(true));

  elements.reset.addEventListener("click", () => {
    settings = { ...DEFAULT_SETTINGS };
    render();
    saveAndApply(true);
  });
}

async function init() {
  applyLocalization();

  const result = await new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, resolve);
  });
  settings = normalizeSettings(result[STORAGE_KEY]);
  render();
  bindEvents();
  await sendSettingsToTab();
}

void init();
