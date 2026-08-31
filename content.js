(() => {
  "use strict";

  const HOST_ID = "mp-ad-cleaner-control";
  const PROMOTED_ATTRIBUTE = "data-mp-ad-cleaner-promoted";
  const WEBSITE_ATTRIBUTE = "data-mp-ad-cleaner-website";
  const HIDE_PROMOTED_ATTRIBUTE = "data-mp-ad-cleaner-hide-promoted";
  const HIDE_WEBSITE_ATTRIBUTE = "data-mp-ad-cleaner-hide-website";
  const PROMOTED_STORAGE_KEY = "hidePromotedListings";
  const WEBSITE_STORAGE_KEY = "hideWebsiteListings";
  const DEFAULT_PROMOTED_ENABLED = true;
  const DEFAULT_WEBSITE_ENABLED = false;

  // These are the paid-priority labels currently used by Marktplaats.
  // The extra localized labels make the detector resilient to copy changes.
  const PROMOTION_LABELS = new Set([
    "topadvertentie",
    "dagtopper",
    "advertentie",
    "gesponsord",
    "sponsored",
    "promoted",
    "top ad"
  ]);

  // Marktplaats uses both labels for listings that send visitors to a shop.
  const WEBSITE_LABELS = new Set([
    "bezoek website",
    "bestel op webshop",
    "bekijk website",
    "visit website",
    "visit webshop",
    "order on webshop"
  ]);

  const PROMOTION_MARKER_SELECTOR = [
    ".hz-priority-product",
    '[class*="ListingPriority"]',
    '[class*="listing-priority"]',
    '[data-testid*="listing-priority" i]',
    '[data-testid*="priority" i]'
  ].join(",");

  const WEBSITE_MARKER_SELECTOR = [
    ".hz-link-label",
    ".hz-Badge--brand",
    '[data-testid*="website" i]',
    '[data-testid*="webshop" i]',
    '[class*="website" i]',
    '[class*="webshop" i]'
  ].join(",");

  const CARD_SELECTOR = [
    "li.hz-Listing",
    'li[class*="Listing"]',
    '[data-testid*="listing-card" i]',
    '[data-testid*="search-result" i]',
    "article"
  ].join(",");

  let promotedEnabled = DEFAULT_PROMOTED_ENABLED;
  let websiteEnabled = DEFAULT_WEBSITE_ENABLED;
  let scanScheduled = false;
  let promotedCards = [];
  let websiteCards = [];
  let controls = null;

  function normalizeLabel(value) {
    return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("nl-NL");
  }

  function hasLabel(element, labels) {
    return labels.has(normalizeLabel(element.textContent || ""));
  }

  function findCard(marker) {
    // Gallery results wrap each article in a list item. Hide that outer item as
    // well so removing a listing does not leave an empty grid cell.
    const listItem = marker.closest("li");
    if (listItem) return listItem;

    return marker.closest(CARD_SELECTOR);
  }

  function updateToggle(toggle, options) {
    const { enabled, count, hiddenTitle, visibleTitle, hiddenLabel, visibleLabel } = options;
    toggle.button.dataset.enabled = String(enabled);
    toggle.button.setAttribute("aria-pressed", String(enabled));
    toggle.button.setAttribute("aria-label", enabled ? hiddenLabel(count) : visibleLabel(count));
    toggle.title.textContent = enabled ? hiddenTitle : visibleTitle;
    toggle.count.textContent = count === 1 ? "1 post" : `${count} posts`;
  }

  function updateControls() {
    if (!controls) return;

    updateToggle(controls.promoted, {
      enabled: promotedEnabled,
      count: promotedCards.length,
      hiddenTitle: "Ads verborgen",
      visibleTitle: "Ads zichtbaar",
      hiddenLabel: (count) =>
        `Advertenties worden verborgen. ${count} gevonden. Klik om ze te tonen.`,
      visibleLabel: (count) =>
        `Advertenties zijn zichtbaar. ${count} gevonden. Klik om ze te verbergen.`
    });

    updateToggle(controls.website, {
      enabled: websiteEnabled,
      count: websiteCards.length,
      hiddenTitle: "Websites verborgen",
      visibleTitle: "Websites zichtbaar",
      hiddenLabel: (count) =>
        `Website-advertenties worden verborgen. ${count} gevonden. Klik om ze te tonen.`,
      visibleLabel: (count) =>
        `Website-advertenties zijn zichtbaar. ${count} gevonden. Klik om ze te verbergen.`
    });
  }

  function applyVisibility() {
    for (const card of promotedCards) {
      card.setAttribute(HIDE_PROMOTED_ATTRIBUTE, String(promotedEnabled));
    }
    for (const card of websiteCards) {
      card.setAttribute(HIDE_WEBSITE_ATTRIBUTE, String(websiteEnabled));
    }
    updateControls();
  }

  function clearDetectionAttributes() {
    const selector = [
      `[${PROMOTED_ATTRIBUTE}]`,
      `[${WEBSITE_ATTRIBUTE}]`,
      `[${HIDE_PROMOTED_ATTRIBUTE}]`,
      `[${HIDE_WEBSITE_ATTRIBUTE}]`
    ].join(",");

    for (const card of document.querySelectorAll(selector)) {
      card.removeAttribute(PROMOTED_ATTRIBUTE);
      card.removeAttribute(WEBSITE_ATTRIBUTE);
      card.removeAttribute(HIDE_PROMOTED_ATTRIBUTE);
      card.removeAttribute(HIDE_WEBSITE_ATTRIBUTE);
    }
  }

  function findCards(markerSelector, labels) {
    const cards = new Set();
    for (const marker of document.querySelectorAll(markerSelector)) {
      if (!hasLabel(marker, labels)) continue;
      const card = findCard(marker);
      if (card) cards.add(card);
    }
    return [...cards];
  }

  function scan() {
    scanScheduled = false;
    clearDetectionAttributes();

    promotedCards = findCards(PROMOTION_MARKER_SELECTOR, PROMOTION_LABELS);
    websiteCards = findCards(WEBSITE_MARKER_SELECTOR, WEBSITE_LABELS);

    for (const card of promotedCards) {
      card.setAttribute(PROMOTED_ATTRIBUTE, "true");
    }
    for (const card of websiteCards) {
      card.setAttribute(WEBSITE_ATTRIBUTE, "true");
    }

    applyVisibility();
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    window.requestAnimationFrame(scan);
  }

  async function readPreferences() {
    try {
      if (!globalThis.chrome?.storage?.local) {
        return {
          promoted: DEFAULT_PROMOTED_ENABLED,
          website: DEFAULT_WEBSITE_ENABLED
        };
      }

      const saved = await chrome.storage.local.get({
        [PROMOTED_STORAGE_KEY]: DEFAULT_PROMOTED_ENABLED,
        [WEBSITE_STORAGE_KEY]: DEFAULT_WEBSITE_ENABLED
      });

      return {
        promoted: saved[PROMOTED_STORAGE_KEY] !== false,
        website: saved[WEBSITE_STORAGE_KEY] === true
      };
    } catch {
      return {
        promoted: DEFAULT_PROMOTED_ENABLED,
        website: DEFAULT_WEBSITE_ENABLED
      };
    }
  }

  async function savePreference(key, value) {
    try {
      await globalThis.chrome?.storage?.local?.set({ [key]: value });
    } catch {
      // Hiding still works for this tab if extension storage is unavailable.
    }
  }

  function createControl() {
    document.getElementById(HOST_ID)?.remove();

    const host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          inset: 92px auto auto 12px;
          z-index: 2147483646;
          color-scheme: light;
        }

        .controls {
          display: grid;
          gap: 8px;
        }

        button {
          --ink: #002f34;
          --muted: #537174;
          --paper: rgba(255, 255, 255, 0.96);
          --orange: #ff7f00;
          align-items: center;
          appearance: none;
          background: var(--paper);
          border: 1px solid rgba(0, 47, 52, 0.18);
          border-radius: 999px;
          box-shadow: 0 8px 24px rgba(0, 47, 52, 0.15), 0 2px 5px rgba(0, 47, 52, 0.08);
          color: var(--ink);
          cursor: pointer;
          display: grid;
          font: 700 12px/1.1 "Trebuchet MS", sans-serif;
          gap: 9px;
          grid-template-columns: 27px auto 29px;
          min-height: 48px;
          padding: 6px 9px 6px 7px;
          text-align: left;
          transition: box-shadow 160ms ease, transform 160ms ease;
          user-select: none;
          -webkit-font-smoothing: antialiased;
        }

        button:hover {
          box-shadow: 0 11px 28px rgba(0, 47, 52, 0.2), 0 2px 6px rgba(0, 47, 52, 0.1);
          transform: translateY(-1px);
        }

        button:active { transform: translateY(0); }

        button:focus-visible {
          outline: 3px solid rgba(255, 127, 0, 0.46);
          outline-offset: 3px;
        }

        .shield {
          align-items: center;
          background: var(--ink);
          border-radius: 50%;
          color: white;
          display: flex;
          height: 27px;
          justify-content: center;
          transition: background 180ms ease;
          width: 27px;
        }

        button[data-enabled="false"] .shield { background: #8aa0a2; }

        .shield svg { height: 15px; width: 15px; }

        .copy { display: grid; gap: 3px; min-width: 112px; }

        .title { letter-spacing: 0.01em; white-space: nowrap; }

        .count {
          color: var(--muted);
          font-size: 10px;
          font-weight: 500;
          white-space: nowrap;
        }

        .switch {
          background: #a6b6b7;
          border-radius: 999px;
          height: 17px;
          padding: 2px;
          transition: background 180ms ease;
          width: 29px;
        }

        .knob {
          background: white;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 47, 52, 0.28);
          display: block;
          height: 13px;
          transform: translateX(0);
          transition: transform 180ms cubic-bezier(.2, .8, .2, 1);
          width: 13px;
        }

        button[data-enabled="true"] .switch { background: var(--orange); }
        button[data-enabled="true"] .knob { transform: translateX(12px); }

        @media (max-width: 720px) {
          :host { inset: auto auto 16px 10px; }
          button { min-height: 44px; }
        }

        @media (prefers-reduced-motion: reduce) {
          button, .shield, .switch, .knob { transition: none; }
        }
      </style>
      <div class="controls">
        <button type="button" data-kind="promoted" data-enabled="true" aria-pressed="true">
          <span class="shield" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3 5.5 5.7v5.2c0 4.2 2.7 7.9 6.5 9.7 3.8-1.8 6.5-5.5 6.5-9.7V5.7L12 3Z"/>
              <path d="m8.7 12 2.1 2.1 4.5-4.6"/>
            </svg>
          </span>
          <span class="copy">
            <span class="title">Ads verborgen</span>
            <span class="count" aria-live="polite">0 posts</span>
          </span>
          <span class="switch" aria-hidden="true"><span class="knob"></span></span>
        </button>
        <button type="button" data-kind="website" data-enabled="false" aria-pressed="false">
          <span class="shield" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z"/>
            </svg>
          </span>
          <span class="copy">
            <span class="title">Websites zichtbaar</span>
            <span class="count" aria-live="polite">0 posts</span>
          </span>
          <span class="switch" aria-hidden="true"><span class="knob"></span></span>
        </button>
      </div>
    `;

    document.documentElement.append(host);

    function getToggle(kind) {
      const button = shadow.querySelector(`button[data-kind="${kind}"]`);
      return {
        button,
        title: button.querySelector(".title"),
        count: button.querySelector(".count")
      };
    }

    controls = {
      promoted: getToggle("promoted"),
      website: getToggle("website")
    };

    controls.promoted.button.addEventListener("click", async () => {
      promotedEnabled = !promotedEnabled;
      applyVisibility();
      await savePreference(PROMOTED_STORAGE_KEY, promotedEnabled);
    });

    controls.website.button.addEventListener("click", async () => {
      websiteEnabled = !websiteEnabled;
      applyVisibility();
      await savePreference(WEBSITE_STORAGE_KEY, websiteEnabled);
    });
  }

  async function start() {
    const preferences = await readPreferences();
    promotedEnabled = preferences.promoted;
    websiteEnabled = preferences.website;
    createControl();
    scan();

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    if (globalThis.chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;

        let changed = false;
        if (changes[PROMOTED_STORAGE_KEY]) {
          promotedEnabled = changes[PROMOTED_STORAGE_KEY].newValue !== false;
          changed = true;
        }
        if (changes[WEBSITE_STORAGE_KEY]) {
          websiteEnabled = changes[WEBSITE_STORAGE_KEY].newValue === true;
          changed = true;
        }
        if (changed) applyVisibility();
      });
    }
  }

  start();
})();
