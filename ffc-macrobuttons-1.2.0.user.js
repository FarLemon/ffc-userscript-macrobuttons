// ==UserScript==
// @name            FFC-MacroButtons
// @version         1.2.0
// @author          Joshua Messer
// @description     Adds customizable, persistant macro buttons to web pages
// @match           *://*/*
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// @grant           unsafeWindow
// ==/UserScript==

// ==================================================
// Constants & Globals
// ==================================================

// Storage Keys
const FFC_MACROBUTTONS_SETTINGS_KEY = 'ffcMacroButtons:settings';
const FFC_MACROBUTTONS_SITEMAP_KEY = 'ffcMacroButtons:siteMap';
const FFC_MACROBUTTONS_CONFIGS_KEY = 'ffcMacroButtons:configs';

// Default Data Values
const FFC_MACROBUTTONS_SETTINGS_DEFAULT_DATA = {
    version: '1.2.0',
    sidebarOpen: false, // default false
    advancedMode: false // default false
};
const FFC_MACROBUTTONS_SITEMAP_DEFAULT_DATA = {};
const FFC_MACROBUTTONS_CONFIGS_DEFAULT_DATA = {};

// ==================================================
// Stores Initialization
// ==================================================

/** @type {object} Lazy-loaded settings store */
const FFC_MACROBUTTONS_SETTINGS_STORE = createLazyStore(
    FFC_MACROBUTTONS_SETTINGS_KEY,
    FFC_MACROBUTTONS_SETTINGS_DEFAULT_DATA
);

/** @type {object} Lazy-loaded sitemap store */
const FFC_MACROBUTTONS_SITEMAP_STORE = createLazyStore(
    FFC_MACROBUTTONS_SITEMAP_KEY,
    FFC_MACROBUTTONS_SITEMAP_DEFAULT_DATA
);

/** @type {object} Lazy-loaded configs store */
const FFC_MACROBUTTONS_CONFIGS_STORE = createLazyStore(
    FFC_MACROBUTTONS_CONFIGS_KEY,
    FFC_MACROBUTTONS_CONFIGS_DEFAULT_DATA
);

// ==================================================
// Storage Helpers
// ==================================================

/**
 * Creates a lazy-loaded storage facade for a key.
 * @param {string} key - The GM storage key
 * @param {object} defaults - Default value if nothing stored
 */
function createLazyStore(key, defaults) {
    let cache;
    let loaded = false;

    return {
        /** Load data from GM storage and cache it */
        load() {
            if (!loaded) {
                const stored = GM_getValue(key);
                cache = stored
                    ? { ...structuredClone(defaults), ...stored }
                    : structuredClone(defaults);
                loaded = true;
            }
        },

        /** Get cached data */
        get() {
            // Gives error if not loaded before executing
            if (!loaded) throw new Error(`Store "${key}" accessed before load()`);
            return cache;
        },

        /** Save cached data to GM storage */
        save() {
            // Gives feedback if not loaded before executing
            if (!loaded) {
                console.warn(`Store "${key}" saved before load()`);
                return;
            }
            GM_setValue(key, cache);
        },

        /** Reset store to defaults */
        reset() {
            cache = structuredClone(defaults);
            loaded = true;
            GM_setValue(key, cache);
        },

        /** Return if store is loaded */
        isLoaded() {
            return loaded;
        },
    };
}

/**
 * Resolves which configs apply for the current location
 * @param {object} sitemap - The sitemap object
 * @param {Location} location - The current location object
 * @returns {string[]} List of config IDs
 */
function resolveConfigs(sitemap, location) {
    const host = location.hostname.replace(/^www\./, '');
    const site = sitemap[host];

    if (!site) return []; // Return empty array if site not in sitemap

    // Creates array of path parts
    const pathParts = location.pathname
        .replace(/\/+$/, '')
        .split('/')
        .filter(Boolean);

    // Adds each path individually
    const paths = ['/'];
    let current = '';

    for (const part of pathParts) {
        current += '/' + part;
        paths.push(current);
    }

    // Adds all configs related to paths
    const resolved = [];
    const seen = new Set();

    paths.reverse(); // Reverses paths to better support inheritance

    for (const path of paths) {
        const entry = site[path];
        if (!entry) continue;

        for (const cfg of entry.configs) {
            if (!seen.has(cfg)) {
                resolved.push(cfg);
                seen.add(cfg);
            }
        }

        if (entry.inherit === false) break; // Stops if inheritance is false
    }

    // Reverses configs back to most encompassing to most specific
    resolved.reverse();
    return resolved;
}

/**
 * Get sidebar items from a list of config IDs
 * @param {string[]} configIDs - Array of config IDs
 * @param {object} configData - Configs object
 * @returns {object[]} List of sidebar items
 */
function getSidebarItems(configIDs, configData) {
    const sidebarItems = [];

    configIDs.forEach((cfgId) => {
        const cfg = configData[cfgId];
        if (cfg && cfg.items) sidebarItems.push(...cfg.items);
    });

    return sidebarItems;
}

// ==================================================
// Styles
// ==================================================

/**
 * Adds sidebar and tag styles to the page
 * @param {object} styleSettings - Optional style configuration
 */
function addStyles(styleSettings) {
    GM_addStyle(`
        /* ===== Tag Bar ===== */
        .ffc-macrobuttons-tag {
            /* Positioning */
            position: fixed;
            right: 0;
            bottom: 1em;
            z-index: 10000;

            /* Box model */
            width: 3em;
            height: fit-content;
            margin: 0;
            padding: 0.25em 0;
            display: flex;

            /* Layout */
            justify-content: center;
            align-items: center;

            /* Typography */
            font-size: 16px;
            line-height: 1em;
            text-align: center;
            color: white;

            /* Visual */
            background-color: #007bff;
            border: none;
            border-radius: 0.75em 0 0 0.75em;

            /* Interaction */
            cursor: pointer;

            /* Motion */
            transform: translateX(1.5em);
            transition: transform 0.3s ease;
        }

        .ffc-macrobuttons-tag-hamburger {
            /* Box model */
            width: fit-content;
            height: fit-content;
            margin: 0;
            padding: 0;

            /* Motion */
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }

        .ffc-macrobuttons-tag:hover,
        .ffc-macrobuttons-tag:hover .ffc-macrobuttons-tag-hamburger {
            transform: translateX(0);
        }

        /* ===== Side Bar ===== */
        .ffc-macrobuttons-sidebar {
            /* Positioning */
            position: fixed;
            top: 0;
            right: 0;
            height: 100vh;
            z-index: 9999;

            /* Box model */
            width: 20vw;
            min-width: 150px;
            max-width: 300px;
            padding: 1em;
            overflow-y: auto;

            /* Layout */
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 0.5em;

            /* Typography / Visual */
            font-size: 16px;
            color: #fff;
            background-color: #111;

            /* Motion */
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }

        .ffc-macrobuttons-sidebar-open {
            transform: translateX(0);
        }

        /* ===== Breadcrumbs ===== */
        .ffc-macrobuttons-sidebar-breadcrumb {
            /* Box model / Layout */
            width: 100%;
            height: fit-content;
            margin-bottom: 1em;
            display: flex;
            flex-wrap: wrap;
            gap: 0.25em;

            /* Typography */
            font-size: 0.6em;
            font-weight: bold;
        }

        .ffc-macrobuttons-sidebar-breadcrumb span {
            cursor: pointer;
        }

        /* ===== Macro Buttons ===== */
        .ffc-macrobuttons-sidebar-macro {
            /* Box model */
            width: 100%;
            height: fit-content;
            padding: 0.5em 1em;
            border: none;
            border-radius: 0.5em;
            text-align: left;

            /* Typography */
            font-size: 0.6em;
            color: inherit;

            /* Interaction */
            cursor: pointer;
        }

        .ffc-macrobuttons-sidebar-macro-button { background-color: #3d8372ff; }
        .ffc-macrobuttons-sidebar-macro-button:hover { background-color: #2e6356ff; }
        .ffc-macrobuttons-sidebar-macro-group { background-color: #583d83ff; }
        .ffc-macrobuttons-sidebar-macro-group:hover { background-color: #422e63ff; }
    `);
}

// ==================================================
// DOM Rendering
// ==================================================

/**
 * Renders the initial sidebar and tag elements
 * @returns {HTMLElement} The sidebar element
 */
function renderInitial() {
    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.classList.add('ffc-macrobuttons-sidebar');

    // Open sidebar if stored in settings
    if (FFC_MACROBUTTONS_SETTINGS_STORE.get().sidebarOpen) sidebar.classList.add('ffc-macrobuttons-sidebar-open');

    // Side Tag
    const tag = document.createElement('div');
    tag.classList.add('ffc-macrobuttons-tag');
    tag.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle(
            'ffc-macrobuttons-sidebar-open'
        );
        FFC_MACROBUTTONS_SETTINGS_STORE.get().sidebarOpen = isOpen;
    });

    // Hamburger Button
    const hamburgerButton = document.createElement('span');
    hamburgerButton.classList.add('ffc-macrobuttons-tag-hamburger');
    hamburgerButton.innerText = '☰';

    // Add DOM elements to page
    tag.appendChild(hamburgerButton);
    document.body.appendChild(tag);
    document.body.appendChild(sidebar);

    return sidebar; // Return sidebar to allow dynamic updates
}

/**
 * Render sidebar buttons and groups with breadcrumbs
 * @param {HTMLElement} sidebar - Sidebar element
 * @param {object[]} items - Sidebar items to render
 * @param {object[]} currentStackRef - Current breadcrumb stack
 * @param {object[]} rootItems - Top-level items for "Home"
 */
function renderSidebarConfigs(sidebar, items, currentStackRef, rootItems) {
    sidebar.innerHTML = '';

    // Breadcrumb for navigation
    // Initial 'Home' in breadcrumb navigation
    const breadcrumb = document.createElement('div');
    breadcrumb.classList.add('ffc-macrobuttons-sidebar-breadcrumb');

    const homeSpan = document.createElement('span');
    homeSpan.style.textDecoration = 'underline';
    homeSpan.innerText = 'Home';
    homeSpan.addEventListener('click', () => {
        currentStackRef.length = 0;
        renderSidebarConfigs(sidebar, rootItems, currentStackRef, rootItems); // Pass top-level items
    });
    breadcrumb.appendChild(homeSpan);

    // Creates rest of breadcrumb navigation
    currentStackRef.forEach((grp, idx) => {
        const sep = document.createElement('span');
        sep.innerText = ' / ';
        breadcrumb.appendChild(sep);

        const span = document.createElement('span');
        span.innerText = grp.label;
        span.style.textDecoration = 'underline';
        span.addEventListener('click', () => {
            currentStackRef.splice(idx + 1);
            renderSidebarConfigs(
                sidebar,
                currentStackRef[idx].items,
                currentStackRef,
                rootItems
            );
        });
        breadcrumb.appendChild(span);
    });

    sidebar.appendChild(breadcrumb);

    // Render buttons/groups
    items.forEach((item) => {
        const btn = document.createElement('button');
        btn.innerText = item.label;

        if (item.type === 'button') {
            btn.addEventListener('click', () => runCommands(item.commands));
            btn.classList.add(
                'ffc-macrobuttons-sidebar-macro',
                'ffc-macrobuttons-sidebar-macro-button'
            );
        } else if (item.type === 'group') {
            btn.addEventListener('click', () => {
                currentStackRef.push(item);
                renderSidebarConfigs(
                    sidebar,
                    item.items,
                    currentStackRef,
                    rootItems
                );
            });
            btn.classList.add(
                'ffc-macrobuttons-sidebar-macro',
                'ffc-macrobuttons-sidebar-macro-group'
            );
        }

        sidebar.appendChild(btn);
    });
}

/**
 * Update sidebar for current URL by resolving configs
 * @param {HTMLElement} sidebar - Sidebar element
 * @param {object[]} currentStackRef - Breadcrumb stack reference
 */
function updateSidebar(sidebar, currentStackRef) {
    sidebar.innerHTML = '';

    const configIDs = resolveConfigs(
        FFC_MACROBUTTONS_SITEMAP_STORE.get(),
        location
    );
    if (!configIDs.length) return;

    if (!FFC_MACROBUTTONS_CONFIGS_STORE.isLoaded()) FFC_MACROBUTTONS_CONFIGS_STORE.load(); // Loads FFC_MACROBUTTONS_CONFIGS_STORE if not already loaded
    const sidebarItems = getSidebarItems(
        configIDs,
        FFC_MACROBUTTONS_CONFIGS_STORE.get()
    );

    currentStackRef.length = 0;
    renderSidebarConfigs(sidebar, sidebarItems, currentStackRef, sidebarItems); // Renders new sidebar items
}

// ==================================================
// Macro Execution
// ==================================================

/**
 * Command handlers object
 */
const COMMAND_HANDLERS = {
    /**
     * Execute a custom JS command
     * @param {object} param0
     * @param {string} param0.value - JS code to execute
     */
    custom({ value }) {
        if (typeof value !== 'string') return;

        try {
            const ctx = {
                window: unsafeWindow,
                document: unsafeWindow.document,
                location: unsafeWindow.location,
                console: unsafeWindow.console,
            };

            const fn = new Function('ctx', `"use strict"; ${value}`);
            fn(ctx);
        } catch (err) {
            console.error('Custom command failed:', err);
        }
    },
};

/**
 * Run an array of commands
 * @param {object[]} commands - List of commands to execute
 */
async function runCommands(commands) {
    for (const cmd of commands) {
        // Only run advanced commands if user manually changed 'advancedMode' to 'true' in settings
        if (
            cmd.advanced &&
            !FFC_MACROBUTTONS_SETTINGS_STORE.get().advancedMode
        ) {
            console.warn(`Skipping advanced command: ${cmd.name}`);
            continue;
        }

        // Check if command exists in command handler
        const handler = COMMAND_HANDLERS[cmd.name];
        if (!handler) {
            console.warn('Unknown command:', cmd.name);
            continue;
        }

        // Run the command
        const result = handler(cmd);

        // Support async commands by awaiting promise
        if (result instanceof Promise) await result;
    }
}

// ==================================================
// Observers & Listeners
// ==================================================

/**
 * Watch for URL changes and call callback
 * @param {function} callback - Function to execute on URL change
 */
function watchUrlChanges(callback) {
    let lastUrl = location.href;

    // Notifies callback if URL changes
    const notify = () => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            callback(lastUrl);
        }
    };

    // Intercept SPA navigation via history API
    ['pushState', 'replaceState'].forEach((method) => {
        const original = history[method];
        history[method] = function (...args) {
            original.apply(this, args);
            notify();
        };
    });

    // Listen to back/forward buttons
    window.addEventListener('popstate', notify);

    // Observe DOM changes as fallback
    const observer = new MutationObserver(notify);
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Save all stores before leaving the page
 */
function setupDataAutoSave() {
    const saveAllStores = () => {
        FFC_MACROBUTTONS_SETTINGS_STORE.save();
        FFC_MACROBUTTONS_SITEMAP_STORE.save();
        FFC_MACROBUTTONS_CONFIGS_STORE.save();
    };

    // Fires when user tries to leave page (closing tab, navigating away, refreshing)
    window.addEventListener('beforeunload', saveAllStores);

    // Save if page becomes hidden (for SPA navigation)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveAllStores();
    });
}

// ==================================================
// DEVELOPMENT TOOLS (Temporary Code for Testing)
// ==================================================

// Enables browser console tools
function enableConsoleTools(sidebarRef, currentStackRef) {
    unsafeWindow.FFC_MACROBUTTONS_DEBUG = {
        settings: FFC_MACROBUTTONS_SETTINGS_STORE,
        sitemap: FFC_MACROBUTTONS_SITEMAP_STORE,
        configs: FFC_MACROBUTTONS_CONFIGS_STORE,

        resetAllStores() {
            this.settings.reset();
            this.sitemap.reset();
            this.configs.reset();
            updateSidebar(sidebarRef, currentStackRef);
        },

        setStoreCache(storeName, value) {
            if (typeof value !== 'object' || value === null) return;

            const store = this[storeName];
            if (!store) return;

            store.cache = {
                ...structuredClone(store.defaults),
                ...structuredClone(value),
            };
            store.save();
        },
    };
}

// ==================================================
// Initialization
// ==================================================
(async () => {
    // =========================
    // Initial Setup
    // =========================

    if (window.top !== window.self) return; // Exits if within iFrame

    // Loads required data
    FFC_MACROBUTTONS_SETTINGS_STORE.load();
    FFC_MACROBUTTONS_SITEMAP_STORE.load();

    addStyles(FFC_MACROBUTTONS_SETTINGS_STORE.get()); // Always add styles
    const sidebar = renderInitial(); // Always render tag and blank sidebar
    let currentStack = []; // Setup variable

    // Initial Rendering if configs on sitemap
    updateSidebar(sidebar, currentStack);

    // =========================
    // Dev Console Access
    // =========================

    enableConsoleTools(sidebar, currentStack);

    // =========================
    // Listeners
    // =========================

    // Update sidebar on URL change
    watchUrlChanges(() => updateSidebar(sidebar, currentStack));

    // Setup auto-save on page close/unload
    setupDataAutoSave();
})();
