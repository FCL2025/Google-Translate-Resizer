(() => {
  if (window.__gtrResizerLoaded) {
    return;
  }
  window.__gtrResizerLoaded = true;

  const STYLE_ID = "gtr-resizer-style";
  const STORAGE_KEY = "gtrSettings";
  const DEFAULT_SETTINGS = {
    enabled: true,
    linked: true,
    linkedWidth: 640,
    leftWidth: 640,
    rightWidth: 640
  };
  const LIMITS = {
    min: 320,
    max: 1200
  };
  const GAP_PX = 8;

  let currentSettings = { ...DEFAULT_SETTINGS };
  let observer = null;
  let pendingApply = null;

  function getStyleText() {
    return `
      body.gtr-resizer-enabled [data-gtr-resizer-container="true"] {
        display: grid !important;
        grid-template-columns: var(--gtr-left-width) var(--gtr-right-width) !important;
        column-gap: ${GAP_PX}px !important;
        align-items: stretch !important;
        justify-content: start !important;
        inline-size: auto !important;
        width: auto !important;
        max-inline-size: none !important;
        max-width: none !important;
        overflow: visible !important;
      }

      body.gtr-resizer-enabled [data-gtr-resizer-left="true"] {
        grid-column: 1 !important;
        inline-size: var(--gtr-left-width) !important;
        width: var(--gtr-left-width) !important;
        max-inline-size: none !important;
        max-width: none !important;
        min-inline-size: 0 !important;
        min-width: 0 !important;
        margin-inline: 0 !important;
        box-sizing: border-box !important;
      }

      body.gtr-resizer-enabled [data-gtr-resizer-right="true"] {
        grid-column: 2 !important;
        inline-size: var(--gtr-right-width) !important;
        width: var(--gtr-right-width) !important;
        max-inline-size: none !important;
        max-width: none !important;
        min-inline-size: 0 !important;
        min-width: 0 !important;
        margin-inline: 0 !important;
        box-sizing: border-box !important;
      }

      body.gtr-resizer-enabled [data-gtr-resizer-left="true"] > c-wiz {
        inline-size: 100% !important;
        width: 100% !important;
        max-inline-size: none !important;
        max-width: none !important;
        box-sizing: border-box !important;
      }

      body.gtr-resizer-enabled [data-gtr-resizer-left="true"] textarea.er8xn {
        max-inline-size: none !important;
        max-width: none !important;
      }

      @media (max-width: 720px) {
        body.gtr-resizer-enabled [data-gtr-resizer-container="true"] {
          display: block !important;
          inline-size: auto !important;
          width: auto !important;
        }

        body.gtr-resizer-enabled [data-gtr-resizer-left="true"],
        body.gtr-resizer-enabled [data-gtr-resizer-right="true"] {
          inline-size: 100% !important;
          width: 100% !important;
        }
      }
    `;
  }

  function clampWidth(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return DEFAULT_SETTINGS.linkedWidth;
    }
    return Math.min(LIMITS.max, Math.max(LIMITS.min, Math.round(number)));
  }

  function normalizeSettings(settings = {}) {
    return {
      enabled: settings.enabled !== false,
      linked: settings.linked !== false,
      linkedWidth: clampWidth(settings.linkedWidth ?? DEFAULT_SETTINGS.linkedWidth),
      leftWidth: clampWidth(settings.leftWidth ?? settings.linkedWidth ?? DEFAULT_SETTINGS.leftWidth),
      rightWidth: clampWidth(settings.rightWidth ?? settings.linkedWidth ?? DEFAULT_SETTINGS.rightWidth)
    };
  }

  function getEffectiveWidths(settings) {
    if (settings.linked) {
      return {
        left: settings.linkedWidth,
        right: settings.linkedWidth
      };
    }

    return {
      left: settings.leftWidth,
      right: settings.rightWidth
    };
  }

  function ensureStyle() {
    const existingStyle = document.getElementById(STYLE_ID);
    const style = existingStyle ?? document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = getStyleText();

    if (!existingStyle) {
      (document.head ?? document.documentElement).append(style);
    }
  }

  function clearMarkers() {
    document.querySelectorAll("[data-gtr-resizer-container], [data-gtr-resizer-left], [data-gtr-resizer-right]").forEach((element) => {
      element.removeAttribute("data-gtr-resizer-container");
      element.removeAttribute("data-gtr-resizer-left");
      element.removeAttribute("data-gtr-resizer-right");
    });
  }

  function findPanels() {
    const rightPanel = document.querySelector(".OPPzxe > .sciAJc, c-wiz.sciAJc, .sciAJc[role='region']");
    const leftPanel = rightPanel?.parentElement?.querySelector(":scope > .n4sEPd")
      ?? document.querySelector(".OPPzxe > .n4sEPd, div.n4sEPd");
    const container = rightPanel?.parentElement
      ?? leftPanel?.parentElement
      ?? document.querySelector(".OPPzxe");

    clearMarkers();

    if (container && leftPanel && rightPanel) {
      container.setAttribute("data-gtr-resizer-container", "true");
      leftPanel.setAttribute("data-gtr-resizer-left", "true");
      rightPanel.setAttribute("data-gtr-resizer-right", "true");
    }

    return {
      container,
      leftPanel,
      rightPanel,
      found: Boolean(container && leftPanel && rightPanel)
    };
  }

  function setPageVariables(settings) {
    const widths = getEffectiveWidths(settings);

    document.documentElement.style.setProperty("--gtr-left-width", `${widths.left}px`);
    document.documentElement.style.setProperty("--gtr-right-width", `${widths.right}px`);
  }

  function applySettings(settings = currentSettings) {
    currentSettings = normalizeSettings(settings);
    ensureStyle();
    setPageVariables(currentSettings);

    const panels = findPanels();
    document.body.classList.toggle("gtr-resizer-enabled", currentSettings.enabled && panels.found);

    return {
      ok: true,
      enabled: currentSettings.enabled,
      found: panels.found,
      leftWidth: getEffectiveWidths(currentSettings).left,
      rightWidth: getEffectiveWidths(currentSettings).right
    };
  }

  function scheduleApply() {
    window.clearTimeout(pendingApply);
    pendingApply = window.setTimeout(() => applySettings(), 80);
  }

  function startObserver() {
    if (observer) {
      return;
    }

    observer = new MutationObserver(scheduleApply);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
    currentSettings = normalizeSettings(result[STORAGE_KEY]);
    applySettings(currentSettings);
    startObserver();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[STORAGE_KEY]) {
      return;
    }
    applySettings(changes[STORAGE_KEY].newValue);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GTR_APPLY_SETTINGS") {
      sendResponse(applySettings(message.settings));
      return false;
    }

    if (message?.type === "GTR_GET_STATUS") {
      sendResponse(applySettings());
      return false;
    }

    return false;
  });

  window.__gtrResizerApplySettings = applySettings;
})();
