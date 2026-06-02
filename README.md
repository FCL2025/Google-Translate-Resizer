# Google Translate Resizer

Chrome / Edge MV3 extension for resizing the two main panels on Google Translate.

## DOM analysis

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

## Install locally

1. Open `chrome://extensions/` in Chrome or `edge://extensions/` in Edge.
2. Turn on Developer mode.
3. Choose Load unpacked.
4. Select this folder: `D:\Google Translate Resizer`.
5. Open Google Translate and use the extension popup.

## Controls

- Sync mode: one slider sets both panel widths.
- Split mode: separate sliders for the left source panel and right translation panel.
- Enable switch: temporarily disables the injected layout rules.
- Reset: restores the default `640 px` widths.
