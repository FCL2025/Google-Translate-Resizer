(() => {
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
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body.gtr-resizer-enabled .ccvoYb,
      body.gtr-resizer-enabled .ccvoYb > div:first-child,
      body.gtr-resizer-enabled .zXU7Rb {
        max-width: none !important;
        overflow: visible !important;
      }

      body.gtr-resizer-enabled .ccvoYb > div:first-child,
      body.gtr-resizer-enabled .zXU7Rb,
      body.gtr-resizer-enabled .OPPzxe {
        width: var(--gtr-total-width) !important;
      }

      body.gtr-resizer-enabled .OPPzxe {
        display: flex !important;
        align-items: stretch !important;
        gap: ${GAP_PX}px !important;
        max-width: none !important;
        overflow: visible !important;
      }

      body.gtr-resizer-enabled .OPPzxe > .n4sEPd {
        flex: 0 0 var(--gtr-left-width) !important;
        width: var(--gtr-left-width) !important;
        max-width: none !important;
        min-width: 0 !important;
      }

      body.gtr-resizer-enabled .OPPzxe > .sciAJc {
        flex: 0 0 var(--gtr-right-width) !important;
        width: var(--gtr-right-width) !important;
        max-width: none !important;
        min-width: 0 !important;
      }

      body.gtr-resizer-enabled .OPPzxe > .n4sEPd > c-wiz,
      body.gtr-resizer-enabled .OPPzxe > .sciAJc {
        box-sizing: border-box !important;
      }

      body.gtr-resizer-enabled .OPPzxe textarea.er8xn {
        max-width: none !important;
      }

      @media (max-width: 720px) {
        body.gtr-resizer-enabled .ccvoYb > div:first-child,
        body.gtr-resizer-enabled .zXU7Rb,
        body.gtr-resizer-enabled .OPPzxe {
          width: auto !important;
        }

        body.gtr-resizer-enabled .OPPzxe {
          display: block !important;
        }

        body.gtr-resizer-enabled .OPPzxe > .n4sEPd,
        body.gtr-resizer-enabled .OPPzxe > .sciAJc {
          flex: none !important;
          width: 100% !important;
        }
      }
    `;
    (document.head ?? document.documentElement).append(style);
  }

  function findPanels() {
    const rightPanel = document.querySelector(".OPPzxe > .sciAJc, c-wiz.sciAJc, .sciAJc[role='region']");
    const leftPanel = rightPanel?.parentElement?.querySelector(":scope > .n4sEPd")
      ?? document.querySelector(".OPPzxe > .n4sEPd, div.n4sEPd");
    const container = rightPanel?.parentElement
      ?? leftPanel?.parentElement
      ?? document.querySelector(".OPPzxe");

    return {
      container,
      leftPanel,
      rightPanel,
      found: Boolean(container && leftPanel && rightPanel)
    };
  }

  function setPageVariables(settings) {
    const widths = getEffectiveWidths(settings);
    const totalWidth = widths.left + widths.right + GAP_PX;

    document.documentElement.style.setProperty("--gtr-left-width", `${widths.left}px`);
    document.documentElement.style.setProperty("--gtr-right-width", `${widths.right}px`);
    document.documentElement.style.setProperty("--gtr-total-width", `${totalWidth}px`);
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
})();
