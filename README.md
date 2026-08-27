# Marktplaats Ad Cleaner

A small local Chromium extension that hides paid-priority listing posts on Marktplaats by default.

It currently recognizes Marktplaats' **Topadvertentie** and **Dagtopper** labels (plus a few localized fallbacks), works with dynamically loaded results, and adds a small switch to the top-left of the page. The preference is remembered across tabs and visits.

## Install in Chrome, Edge, Brave, or another Chromium browser

1. Keep this folder somewhere permanent; the browser loads the extension from it.
2. Open your browser's extension page:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `marktplaats-ad-cleaner` folder (the folder containing `manifest.json`).
6. Reload any already-open Marktplaats tabs.

## Use

- Hiding is **on by default**.
- Click the small **Ads verborgen / Ads zichtbaar** control on Marktplaats to toggle promoted posts.
- The count shows how many paid-priority posts were detected on the current page.

## Privacy

The extension has no analytics, network requests, or access to other websites. It stores only one local preference: whether promoted listings should be hidden.

## Uninstall

Remove **Marktplaats Ad Cleaner** from the browser's extension page. You can then delete this folder.
