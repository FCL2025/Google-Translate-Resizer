(() => {
  const SCRIPT_VERSION = "0.1.9";
  const STYLE_ID = "gtr-resizer-style";
  const STORAGE_KEY = "gtrSettings";
  const DEFAULT_SETTINGS = {
    enabled: true,
    linked: true,
    linkedWidth: 640,
    leftWidth: 640,
    rightWidth: 640,
    compactPreview: true
  };
  const LIMITS = {
    min: 320,
    max: 1200
  };
  const GAP_PX = 8;
  const STARTUP_REAPPLY_DELAYS = [120, 300, 700, 1500, 3000];

  const state = window.__gtrResizerState ?? {};
  window.__gtrResizerState = state;
  state.anchorWidths ??= new WeakMap();
  state.currentSettings ??= { ...DEFAULT_SETTINGS };
  state.compactTextEntries ??= new Map();
  state.compactActionEntries ??= new Map();
  state.startupTimers ??= [];
  state.compactPauseUntil ??= 0;

  let pendingApply = null;
  let pendingCompact = null;

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

      body.gtr-resizer-enabled [data-gtr-resizer-right="true"] > div,
      body.gtr-resizer-enabled [data-gtr-resizer-right="true"] > c-wiz {
        inline-size: 100% !important;
        width: 100% !important;
        max-inline-size: none !important;
        max-width: none !important;
        min-inline-size: 0 !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .usGWQd {
        line-height: 1.45 !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .usGWQd br + br {
        display: none !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .usGWQd :is(p, div, span) {
        margin-block-start: 0 !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .usGWQd :is(p, div) {
        margin-block-end: 0.35em !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .usGWQd :is(p, div):empty,
      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .usGWQd :is(p, div):has(> br:only-child) {
        display: none !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .usGWQd :is(.ryNqvb, .HwtZe, .jCAhz, .ChMk0b) {
        line-height: 1.45 !important;
        margin-block: 0 !important;
        padding-block: 0 !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .HwtZe {
        line-height: 1.45 !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .HwtZe > .jCAhz {
        display: block !important;
        margin-block: 0 0.35em !important;
        padding-block: 0 !important;
        max-inline-size: 100% !important;
        max-width: 100% !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .HwtZe > .jCAhz > .ryNqvb {
        display: inline !important;
        white-space: pre-line !important;
        line-height: 1.45 !important;
        margin-block: 0 !important;
        padding-block: 0 !important;
        max-inline-size: 100% !important;
        max-width: 100% !important;
        overflow-wrap: anywhere !important;
      }

      body.gtr-resizer-enabled.gtr-compact-preview-enabled [data-gtr-resizer-right="true"] .HwtZe > .jCAhz > .NWlwsb {
        margin-block: 0 !important;
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
    const enabled = settings.enabled !== false;
    const linked = settings.linked !== false;
    const linkedWidth = clampWidth(settings.linkedWidth ?? DEFAULT_SETTINGS.linkedWidth);
    return {
      enabled,
      linked,
      linkedWidth,
      leftWidth: linked ? linkedWidth : clampWidth(settings.leftWidth ?? linkedWidth ?? DEFAULT_SETTINGS.leftWidth),
      rightWidth: linked ? linkedWidth : clampWidth(settings.rightWidth ?? linkedWidth ?? DEFAULT_SETTINGS.rightWidth),
      compactPreview: settings.compactPreview !== false
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

  function isStructuredLine(line) {
    return /^(?:\d+[\.)]|[-–—•])\s*/.test(line);
  }

  function getSourceText(panels = state.panels) {
    const textarea = panels?.leftPanel?.querySelector("textarea.er8xn");
    if (textarea?.value) {
      return textarea.value;
    }

    return panels?.leftPanel?.querySelector("[jsname='ZdXDJ']")?.textContent ?? "";
  }

  function getSourceLines(panels = state.panels) {
    let blankBefore = 0;
    return getSourceText(panels)
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .reduce((lines, line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          blankBefore += 1;
          return lines;
        }

        lines.push({
          blankBefore,
          isStructured: isStructuredLine(trimmed),
          text: trimmed
        });
        blankBefore = 0;
        return lines;
      }, []);
  }

  function normalizePreviewText(text, sourceLines = [], sourceStartIndex = 0) {
    const lines = text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!lines.length) {
      return {
        consumedSourceLines: 0,
        text: ""
      };
    }

    let consumedSourceLines = 1;
    let normalized = lines[0];

    for (const line of lines.slice(1)) {
      const sourceNextLine = sourceLines[sourceStartIndex + consumedSourceLines];
      const preserveSourceBreak = shouldPreservePreviewBreak(line, sourceNextLine);

      if (preserveSourceBreak) {
        const separator = sourceNextLine?.blankBefore > 0 ? "\n\n" : "\n";
        normalized = `${normalized}${separator}${line}`;
        consumedSourceLines += 1;
      } else {
        normalized = joinPreviewLines(normalized, line);
      }
    }

    return {
      consumedSourceLines,
      text: normalized
    };
  }

  function shouldPreservePreviewBreak(line, sourceNextLine) {
    if (isStructuredLine(line)) {
      return true;
    }

    if (!sourceNextLine) {
      return false;
    }

    return !sourceNextLine.isStructured;
  }

  function joinPreviewLines(left, right) {
    const needsNoSpace = /[\u3400-\u9fff）】」』]$/.test(left) && /^[\u3400-\u9fff（【「『]/.test(right);
    return needsNoSpace ? `${left}${right}` : `${left} ${right}`.replace(/\s+/g, " ");
  }

  function getCompactTextTargets(panels = state.panels) {
    if (!panels?.rightPanel?.isConnected) {
      return [];
    }

    return Array.from(panels.rightPanel.querySelectorAll(".HwtZe > .jCAhz > .ryNqvb"));
  }

  function restoreLegacyCompactActions(panels = state.panels) {
    for (const [target, entry] of state.compactActionEntries) {
      if (!target.isConnected) {
        continue;
      }

      if (entry.jsaction) {
        target.setAttribute("jsaction", entry.jsaction);
      } else {
        target.removeAttribute("jsaction");
      }
      target.removeAttribute("data-gtr-compact-stable");
    }
    state.compactActionEntries.clear();

    panels?.rightPanel
      ?.querySelectorAll("[data-gtr-compact-stable='true']")
      .forEach((target) => target.removeAttribute("data-gtr-compact-stable"));
  }

  function applyCompactPreview(panels = state.panels) {
    if (!state.currentSettings.compactPreview || !panels?.rightPanel?.isConnected) {
      return;
    }

    if (Date.now() < state.compactPauseUntil) {
      return;
    }

    restoreLegacyCompactActions(panels);
    state.isCompacting = true;
    try {
      const sourceLines = getSourceLines(panels);
      let sourceLineIndex = 0;

      for (const target of getCompactTextTargets(panels)) {
        const entry = state.compactTextEntries.get(target);
        const currentText = target.textContent ?? "";
        const sourceText = entry && currentText === entry.normalized ? entry.original : currentText;
        const normalized = normalizePreviewText(sourceText, sourceLines, sourceLineIndex);
        sourceLineIndex += Math.max(1, normalized.consumedSourceLines);

        if (!normalized.text || normalized.text === currentText) {
          if (!entry && normalized.text === currentText) {
            state.compactTextEntries.set(target, { original: sourceText, normalized: normalized.text });
          }
          continue;
        }

        state.compactTextEntries.set(target, { original: sourceText, normalized: normalized.text });
        target.textContent = normalized.text;
      }
    } finally {
      state.isCompacting = false;
    }
  }

  function restoreCompactPreview() {
    state.compactObserver?.disconnect();
    state.compactObserver = null;

    for (const [target, entry] of state.compactTextEntries) {
      if (target.isConnected && target.textContent === entry.normalized) {
        target.textContent = entry.original;
      }
    }
    state.compactTextEntries.clear();
    restoreLegacyCompactActions();
  }

  function scheduleCompactPreview() {
    window.clearTimeout(pendingCompact);
    pendingCompact = window.setTimeout(() => applyCompactPreview(), 80);
  }

  function pauseCompactDuringInteraction(event) {
    if (!state.currentSettings.compactPreview || !state.panels?.rightPanel?.isConnected) {
      return;
    }

    const target = event.target instanceof Element ? event.target.closest(".ryNqvb") : null;
    if (!target || !state.panels.rightPanel.contains(target)) {
      return;
    }

    state.compactPauseUntil = Date.now() + 600;
    window.clearTimeout(pendingCompact);
  }

  function ensureCompactInteractionPause() {
    removeLegacyCompactInteractionGuard();
    if (state.compactInteractionPause) {
      return;
    }

    state.compactInteractionPause = pauseCompactDuringInteraction;
    for (const eventName of ["mouseover", "mouseout", "click"]) {
      document.addEventListener(eventName, state.compactInteractionPause, true);
    }
  }

  function removeLegacyCompactInteractionGuard() {
    if (!state.compactInteractionGuard) {
      return;
    }

    for (const eventName of ["mouseover", "mouseout", "click"]) {
      document.removeEventListener(eventName, state.compactInteractionGuard, true);
    }
    state.compactInteractionGuard = null;
  }

  function startCompactObserver(panels) {
    ensureCompactInteractionPause();
    state.compactObserver?.disconnect();
    state.compactObserver = new MutationObserver(() => {
      if (!state.isCompacting && state.currentSettings.compactPreview) {
        scheduleCompactPreview();
      }
    });
    state.compactObserver.observe(panels.rightPanel, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  function applySettings(settings = state.currentSettings) {
    state.currentSettings = normalizeSettings(settings);
    ensureStyle();

    const panels = findPanels();
    if (!state.currentSettings.enabled || !panels.found) {
      document.body.classList.remove("gtr-resizer-enabled");
      document.body.classList.remove("gtr-compact-preview-enabled");
      restoreCompactPreview();
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
    document.body.classList.toggle("gtr-compact-preview-enabled", state.currentSettings.compactPreview);
    if (state.currentSettings.compactPreview) {
      applyCompactPreview(panels);
      startCompactObserver(panels);
    } else {
      restoreCompactPreview();
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

  function scheduleApply() {
    window.clearTimeout(pendingApply);
    pendingApply = window.setTimeout(() => applySettings(), 80);
  }

  function clearStartupTimers() {
    for (const timer of state.startupTimers) {
      window.clearTimeout(timer);
    }
    state.startupTimers = [];
  }

  function scheduleStartupReapply() {
    clearStartupTimers();
    state.startupTimers = STARTUP_REAPPLY_DELAYS.map((delay) => window.setTimeout(() => {
      if (state.currentSettings.enabled) {
        applySettings(state.currentSettings);
      }
    }, delay));
  }

  function panelsNeedRefresh(panels = state.panels) {
    return (
      !panels?.container?.isConnected ||
      !panels.leftPanel?.isConnected ||
      !panels.rightPanel?.isConnected ||
      panels.container.getAttribute("data-gtr-resizer-container") !== "true" ||
      panels.leftPanel.getAttribute("data-gtr-resizer-left") !== "true" ||
      panels.rightPanel.getAttribute("data-gtr-resizer-right") !== "true"
    );
  }

  function startObserver() {
    state.observer?.disconnect();

    state.observer = new MutationObserver(() => {
      if (state.currentSettings.enabled && panelsNeedRefresh()) {
        scheduleApply();
      }
    });
    state.observer.observe(document.body ?? document.documentElement, {
      attributes: true,
      attributeFilter: ["data-gtr-resizer-container", "data-gtr-resizer-left", "data-gtr-resizer-right"],
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
    scheduleStartupReapply();
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
