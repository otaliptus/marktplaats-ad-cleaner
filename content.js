(() => {
  "use strict";

  const HOST_ID = "mp-ad-cleaner-control";
  const PROMOTED_ATTRIBUTE = "data-mp-ad-cleaner-promoted";
  const HIDDEN_ATTRIBUTE = "data-mp-ad-cleaner-hidden";
  const STORAGE_KEY = "hidePromotedListings";
  const DEFAULT_ENABLED = true;

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

  const MARKER_SELECTOR = [
    ".hz-priority-product",
    '[class*="ListingPriority"]',
    '[class*="listing-priority"]',
    '[data-testid*="listing-priority" i]',
    '[data-testid*="priority" i]'
  ].join(",");

  const CARD_SELECTOR = [
    "li.hz-Listing",
    'li[class*="Listing"]',
    '[data-testid*="listing-card" i]',
    '[data-testid*="search-result" i]',
    "article"
  ].join(",");

  let enabled = DEFAULT_ENABLED;
  let scanScheduled = false;
  let promotedCards = [];
  let control = null;

  function normalizeLabel(value) {
    return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("nl-NL");
  }

  function isPromotionMarker(element) {
    const label = normalizeLabel(element.textContent || "");
    return PROMOTION_LABELS.has(label);
  }

  function findCard(marker) {
    // Gallery results wrap each article in a list item. Hide that outer item as
    // well so removing an advertisement does not leave an empty grid cell.
    const listItem = marker.closest("li");
    if (listItem) return listItem;

    return marker.closest(CARD_SELECTOR);
  }

  function updateControl() {
    if (!control) return;

    const count = promotedCards.length;
    control.button.dataset.enabled = String(enabled);
    control.button.setAttribute("aria-pressed", String(enabled));
    control.button.setAttribute(
      "aria-label",
      enabled
        ? `Advertenties worden verborgen. ${count} gevonden. Klik om ze te tonen.`
        : `Advertenties zijn zichtbaar. ${count} gevonden. Klik om ze te verbergen.`
    );
    control.title.textContent = enabled ? "Ads verborgen" : "Ads zichtbaar";
    control.count.textContent = count === 1 ? "1 post" : `${count} posts`;
  }

  function applyVisibility() {
    for (const card of promotedCards) {
      card.setAttribute(HIDDEN_ATTRIBUTE, String(enabled));
    }
    updateControl();
  }

  function scan() {
    scanScheduled = false;

    for (const card of document.querySelectorAll(`[${PROMOTED_ATTRIBUTE}]`)) {
      card.removeAttribute(PROMOTED_ATTRIBUTE);
      card.removeAttribute(HIDDEN_ATTRIBUTE);
    }

    const cards = new Set();
    for (const marker of document.querySelectorAll(MARKER_SELECTOR)) {
      if (!isPromotionMarker(marker)) continue;
      const card = findCard(marker);
      if (card) cards.add(card);
    }

    promotedCards = [...cards];
    for (const card of promotedCards) {
      card.setAttribute(PROMOTED_ATTRIBUTE, "true");
    }
    applyVisibility();
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    window.requestAnimationFrame(scan);
  }

  async function readPreference() {
    try {
      if (!globalThis.chrome?.storage?.local) return DEFAULT_ENABLED;
      const saved = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED });
      return saved[STORAGE_KEY] !== false;
    } catch {
      return DEFAULT_ENABLED;
    }
  }

  async function savePreference(value) {
    try {
      await globalThis.chrome?.storage?.local?.set({ [STORAGE_KEY]: value });
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

        .copy { display: grid; gap: 3px; min-width: 83px; }

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
      <button type="button" data-enabled="true" aria-pressed="true">
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
    `;

    document.documentElement.append(host);

    const button = shadow.querySelector("button");
    const title = shadow.querySelector(".title");
    const count = shadow.querySelector(".count");
    control = { button, title, count };

    button.addEventListener("click", async () => {
      enabled = !enabled;
      applyVisibility();
      await savePreference(enabled);
    });
  }

  async function start() {
    enabled = await readPreference();
    createControl();
    scan();

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    if (globalThis.chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes[STORAGE_KEY]) return;
        enabled = changes[STORAGE_KEY].newValue !== false;
        applyVisibility();
      });
    }
  }

  start();
})();
