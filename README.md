# Ad Cleaner for Marktplaats

A small Chromium extension with independent controls for paid-priority and website-directed listings on Marktplaats.

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/egooojbdfjdeojnnlgcaifjcgdclmhhg).

Source code: https://github.com/otaliptus/marktplaats-ad-cleaner

It recognizes Marktplaats' **Topadvertentie** and **Dagtopper** labels, as well as website-directed listings labeled **Bezoek website** or **Bestel op Webshop**. It works with dynamically loaded results and adds two small switches to the top-left of the page. Both preferences are remembered across tabs and visits.

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

- Promoted-listing hiding is **on by default**.
- Website-listing hiding is **off by default**.
- Use **Ads verborgen / Ads zichtbaar** to toggle paid-priority posts.
- Use **Websites verborgen / Websites zichtbaar** to toggle website-directed posts.
- Each count shows how many matching posts were detected on the current page.

## Privacy

The extension has no analytics, network requests, or access to other websites. It stores only two local preferences: whether promoted listings and website-directed listings should be hidden.

## Uninstall

Remove **Ad Cleaner for Marktplaats** from the browser's extension page. You can then delete this folder.

This is an independent browser extension and is not affiliated with or endorsed by Marktplaats.
