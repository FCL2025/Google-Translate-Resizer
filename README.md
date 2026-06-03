# Google Translate Resizer

Google Translate Resizer is a Chrome / Edge extension that resizes the two main text panels on Google Translate.

It can resize both panels together, or resize the source and translation panels separately.

## Download

Download the latest ZIP file from:

[GitHub Releases](https://github.com/FCL2025/Google-Translate-Resizer/releases/latest)

The release asset is named like:

```text
Google-Translate-Resizer-v0.1.0.zip
```

## Install On Chrome

Chrome does not install normal extension ZIP files by dragging them into the Extensions page. Download the ZIP, extract it first, then load the extracted folder.

1. Download `Google-Translate-Resizer-v0.1.0.zip` from the latest release.
2. Extract the ZIP file.
3. Open `chrome://extensions/`.
4. Turn on Developer mode.
5. Click Load unpacked.
6. Select the extracted folder that contains `manifest.json`.
7. Open or refresh Google Translate.
8. Click the extension icon and adjust the panel widths.

## Install On Edge

1. Download `Google-Translate-Resizer-v0.1.0.zip` from the latest release.
2. Extract the ZIP file.
3. Open `edge://extensions/`.
4. Turn on Developer mode.
5. Click Load unpacked.
6. Select the extracted folder that contains `manifest.json`.
7. Open or refresh Google Translate.
8. Click the extension icon and adjust the panel widths.

## Controls

- Sync mode: one slider sets both panel widths.
- Split mode: separate sliders for the left source panel and right translation panel.
- Enable switch: temporarily disables the injected layout rules.
- Reset: restores the default `640 px` widths.

## DOM Analysis

The pasted Google Translate component shows the main translation row as:

```html
<div class="OPPzxe">
  <div class="n4sEPd">...</div>
  <c-wiz class="sciAJc">...</c-wiz>
</div>
```

- Left/source panel: `.OPPzxe > .n4sEPd`
- Right/result panel: `.OPPzxe > .sciAJc`
- Shared row wrapper: `.OPPzxe`
- Outer component wrapper: `.ccvoYb`

The content script uses those selectors and applies CSS variables for the current widths. A `MutationObserver` reapplies the settings when Google Translate re-renders the page.

## Install From Source

1. Clone this repository.
2. Open `chrome://extensions/` in Chrome or `edge://extensions/` in Edge.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select the repository folder.
