(() => {
  const SCRIPT_VERSION = "0.1.4";
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

  const state = window.__gtrResizerState ?? {};
  window.__gtrResizerState = state;
  state.anchorWidths ??= new WeakMap();
  state.currentSettings ??= { ...DEFAULT_SETTINGS };

  let pendingApply = null;

  function getStyleText() {
    return `
      body.gtr-resizer-enabled [data-gtr-resizer-container="true"] {
        display: grid !important;
        grid-template-columns: var(--gtr-left-width) var(--gtr-right-width) !important;
        column-gap: var(--gtr-gap-width) !important;
        align-items: stretch !important;
        justify-content: start !important;
        inline-size: var(--gtr-total-width) !important;
        width: var(--gtr-total-width) !important;
        margin-inline-start: var(--gtr-center-offset) !important;
        margin-inline-end: var(--gtr-center-offset) !important;
        max-inline-size: none !important;
        max-width: none !important;
        overflow: visible !important;
        box-sizing: border-box !important;
      }

      body.gtr-resizer-enabled [data-gtr-resizer-shell="true"] {
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

    const styleText = getStyleText();
    if (style.textContent !== styleText) {
      style.textContent = styleText;
    }

    if (!existingStyle) {
      (document.head ?? document.documentElement).append(style);
    }
  }

  function clearMarkers(panels = state.panels) {
    panels?.container?.removeAttribute("data-gtr-resizer-container");
    panels?.leftPanel?.removeAttribute("data-gtr-resizer-left");
    panels?.rightPanel?.removeAttribute("data-gtr-resizer-right");
    panels?.shell?.removeAttribute("data-gtr-resizer-shell");
  }

  function markPanels(panels) {
    if (state.panels?.container !== panels.container) {
      clearMarkers();
    }

    panels.container.setAttribute("data-gtr-resizer-container", "true");
    panels.leftPanel.setAttribute("data-gtr-resizer-left", "true");
    panels.rightPanel.setAttribute("data-gtr-resizer-right", "true");
    panels.shell?.setAttribute("data-gtr-resizer-shell", "true");
    state.panels = panels;
  }

  function findPanels() {
    const containers = Array.from(document.querySelectorAll(".OPPzxe"));
    let container = null;
    let leftPanel = null;
    let rightPanel = null;

    for (const candidate of containers) {
      const candidateLeft = candidate.querySelector(":scope > .n4sEPd");
      const candidateRight = candidate.querySelector(":scope > .sciAJc");
      if (candidateLeft && candidateRight) {
        container = candidate;
        leftPanel = candidateLeft;
        rightPanel = candidateRight;
        break;
      }
    }

    return {
      container,
      leftPanel,
      rightPanel,
      shell: container?.parentElement,
      found: Boolean(container && leftPanel && rightPanel)
    };
  }

  function measureAnchorWidth(panels) {
    const cachedWidth = state.anchorWidths.get(panels.container);
    if (cachedWidth) {
      return cachedWidth;
    }

    const wasEnabled = document.body.classList.contains("gtr-resizer-enabled");
    document.body.classList.remove("gtr-resizer-enabled");

    const leftRect = panels.leftPanel.getBoundingClientRect();
    const rightRect = panels.rightPanel.getBoundingClientRect();
    const anchorLeft = Math.min(leftRect.left, rightRect.left);
    const anchorRight = Math.max(leftRect.right, rightRect.right);
    const anchorWidth = Math.max(1, Math.round(anchorRight - anchorLeft));

    document.body.classList.toggle("gtr-resizer-enabled", wasEnabled);
    state.anchorWidths.set(panels.container, anchorWidth);
    return anchorWidth;
  }

  function setPageVariables(settings, anchorWidth) {
    const widths = getEffectiveWidths(settings);
    const totalWidth = widths.left + widths.right + GAP_PX;
    const centerOffset = (anchorWidth - totalWidth) / 2;

    document.documentElement.style.setProperty("--gtr-left-width", `${widths.left}px`);
    document.documentElement.style.setProperty("--gtr-right-width", `${widths.right}px`);
    document.documentElement.style.setProperty("--gtr-gap-width", `${GAP_PX}px`);
    document.documentElement.style.setProperty("--gtr-total-width", `${totalWidth}px`);
    document.documentElement.style.setProperty("--gtr-anchor-width", `${anchorWidth}px`);
    document.documentElement.style.setProperty("--gtr-center-offset", `${centerOffset}px`);
  }

  function applySettings(settings = state.currentSettings) {
    state.currentSettings = normalizeSettings(settings);
    ensureStyle();

    const panels = findPanels();
    if (!state.currentSettings.enabled || !panels.found) {
      document.body.classList.remove("gtr-resizer-enabled");
      if (!state.currentSettings.enabled) {
        clearMarkers();
      }

      return {
        ok: true,
        version: SCRIPT_VERSION,
        enabled: state.currentSettings.enabled,
        found: panels.found,
        leftWidth: getEffectiveWidths(state.currentSettings).left,
        rightWidth: getEffectiveWidths(state.currentSettings).right
      };
    }

    markPanels(panels);
    setPageVariables(state.currentSettings, measureAnchorWidth(panels));
    document.body.classList.add("gtr-resizer-enabled");

    return {
      ok: true,
      version: SCRIPT_VERSION,
      enabled: state.currentSettings.enabled,
      found: panels.found,
      leftWidth: getEffectiveWidths(state.currentSettings).left,
      rightWidth: getEffectiveWidths(state.currentSettings).right
    };
  }

  function scheduleApply() {
    window.clearTimeout(pendingApply);
    pendingApply = window.setTimeout(() => applySettings(), 80);
  }

  function startObserver() {
    state.observer?.disconnect();

    state.observer = new MutationObserver(() => {
      const panels = state.panels;
      if (!panels?.container?.isConnected || !panels.leftPanel?.isConnected || !panels.rightPanel?.isConnected) {
        scheduleApply();
      }
    });
    state.observer.observe(document.body ?? document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  state.applySettings = applySettings;
  window.__gtrResizerApplySettings = applySettings;
  window.__gtrResizerVersion = SCRIPT_VERSION;

  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
    state.currentSettings = normalizeSettings(result[STORAGE_KEY]);
    applySettings(state.currentSettings);
    startObserver();
  });

  if (!state.storageListener) {
    state.storageListener = (changes, areaName) => {
      if (areaName !== "sync" || !changes[STORAGE_KEY]) {
        return;
      }
      state.applySettings(changes[STORAGE_KEY].newValue);
    };
    chrome.storage.onChanged.addListener(state.storageListener);
  }

  if (!state.messageListener) {
    state.messageListener = (message, _sender, sendResponse) => {
      if (message?.type === "GTR_APPLY_SETTINGS") {
        sendResponse(state.applySettings(message.settings));
        return false;
      }

      if (message?.type === "GTR_GET_STATUS") {
        sendResponse(state.applySettings());
        return false;
      }

      if (message?.type === "GTR_GET_VERSION") {
        sendResponse({ ok: true, version: SCRIPT_VERSION });
        return false;
      }

      return false;
    };
    chrome.runtime.onMessage.addListener(state.messageListener);
  } else {
    state.applySettings(state.currentSettings);
  }
})();
