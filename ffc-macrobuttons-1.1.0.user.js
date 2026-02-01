// ==UserScript==
// @name            FFC-MacroButtons
// @version         1.1.0
// @author          Joshua Messer
// @description     Adds customizable, persistant macro buttons to web pages
// @match           *://*/*
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// ==/UserScript==

// ==================================================
// Constants & Globals
// ==================================================

// Storage Keys
const FFC_MACROBUTTONS_SITEMAP_KEY = "ffcMacroButtons:siteMap";
const FFC_MACROBUTTONS_CONFIGS_KEY = "ffcMacroButtons:configs";
const FFC_MACROBUTTONS_SETTINGS_KEY = "ffcMacroButtons:settings";

const FFC_MACROBUTTONS_SITEMAP = 
{
    "youtube.com": {
        "/": {
            "configs": ["youtubeConfig1"]
        },
        "/watch": {
            "configs": ["youtubeConfig2"]
        },
        "/shorts": {
            "configs": ["youtubeConfig3"],
            "inherit": false
        }
    }
};
const FFC_MACROBUTTONS_CONFIGS =
{
    "youtubeConfig1": {
        "meta": {
            "uid": "fda401db-4f2b-40f2-b88b-607b98883238",
            "name": "Youtube",
            "version": "1.1.0"
        },
        "items": [
            {
                "type": "button",
                "id": "e7ad1095-0bfb-44c9-8997-8a9177311fa3",
                "label": "Play/Pause",
                "order": 10,
                "action": "Parsable Button Action Info"
            }
        ]
    },
    "youtubeConfig2": {
        "meta": {
            "uid": "fda401db-4f2b-40f2-b88b-607b98823538",
            "name": "Youtube/Watch",
            "version": "1.1.0"
        },
        "items": [
            {
                "type": "group",
                "id": "b4ebbef4-b74d-4c01-879a-682bfe456548",
                "label": "Volume",
                "order": 10,
                "items": [
                    {
                        "type": "button",
                        "id": "d138f910-9272-455a-ab9e-91233a66ebb1",
                        "label": "Volume Up",
                        "order": 10,
                        "action": "Parsable Button Action Info"
                    },
                    {
                        "type": "button",
                        "id": "a5da26e0-0183-414c-9ce9-8a5f3aad5e81",
                        "label": "Volume Down",
                        "order": 20,
                        "action": "Parsable Button Action Info"
                    },
                    {
                        "type": "button",
                        "id": "dd79ae57-8a04-4b68-b588-c37ec0cbb5b3",
                        "label": "Toggle Mute",
                        "order": 30,
                        "action": "Parsable Button Action Info"
                    }
                ]
            }
        ]
    },
    "youtubeConfig3": {
        "meta": {
            "uid": "fda401db-4f2b-40f2-b88b-607b92583238",
            "name": "Youtube/Shorts",
            "version": "1.1.0"
        },
        "items": [
            {
                "type": "button",
                "id": "d36f8c52-9f3f-4654-b3cb-6b8c2c7b5ad8",
                "label": "Skip",
                "order": 10,
                "action": "Parsable Button Action Info"
            }
        ]
    }
};



// ==================================================
// Storage Helpers
// ==================================================

// Checks if domain and path(s) within sitemap
function resolveConfigs(sitemap, location) {
    const host = location.hostname.replace(/^www\./, "");
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
    };

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
            };
        };

        if (entry.inherit === false) break; // Stops if inheritance is false
    };

    // Reverses configs back to most encompassing to most specific
    resolved.reverse();
    return resolved;
}

// Gets the items that need to be rendered
function getSideBarItems(configs) {
    const sidebarItems = [];

    configs.forEach(cfgId => {
        const cfg = FFC_MACROBUTTONS_CONFIGS[cfgId];
        if (cfg && cfg.items) sidebarItems.push(...cfg.items);
    });

    return sidebarItems;
}



// ==================================================
// Styles
// ==================================================

function addStyles() {
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

// Tag DOM Element
function renderInitial() {
    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.classList.add('ffc-macrobuttons-sidebar');

    // Side Tag
    const tag = document.createElement('div');
    tag.classList.add('ffc-macrobuttons-tag');
    tag.addEventListener('click', () => sidebar.classList.toggle('ffc-macrobuttons-sidebar-open'));

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

// Renders the current button setup
function updateSidebar(sidebar, items, currentStack, rootItems) {
    sidebar.innerHTML = '';

    // Breadcrumb for navigation
    // Initial 'Home' in breadcrumb navigation
    const breadcrumb = document.createElement('div');
    breadcrumb.classList.add('ffc-macrobuttons-sidebar-breadcrumb');

    const homeSpan = document.createElement('span');
    homeSpan.style.textDecoration = 'underline';
    homeSpan.innerText = 'Home';
    homeSpan.addEventListener('click', () => {
        currentStack.length = 0; // clear stack
        updateSidebar(sidebar, rootItems, currentStack, rootItems); // <-- pass top-level items
    });
    breadcrumb.appendChild(homeSpan);

    // Creates rest of breadcrumb navigation
    currentStack.forEach((grp, idx) => {
        const sep = document.createElement('span');
        sep.innerText = ' / ';
        breadcrumb.appendChild(sep);

        const span = document.createElement('span');
        span.innerText = grp.label;
        span.style.textDecoration = 'underline';
        span.addEventListener('click', () => {
            currentStack = currentStack.slice(0, idx + 1);
            updateSidebar(sidebar, currentStack[idx].items, currentStack, rootItems);
        });
        breadcrumb.appendChild(span);
    });

    sidebar.appendChild(breadcrumb);

    // Render buttons/groups
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.innerText = item.label;

        if (item.type === 'button') {
            btn.addEventListener('click', () => alert(`Action: ${item.label}`));
            btn.classList.add('ffc-macrobuttons-sidebar-macro', 'ffc-macrobuttons-sidebar-macro-button');
        } else if (item.type === 'group') {
            btn.addEventListener('click', () => {
                currentStack.push(item);
                updateSidebar(sidebar, item.items, currentStack, rootItems);
            });
            btn.classList.add('ffc-macrobuttons-sidebar-macro', 'ffc-macrobuttons-sidebar-macro-group');
        }

        sidebar.appendChild(btn);
    });
}

function updateSidebarForCurrentURL(sidebar, currentStackRef) {
    const configIds = resolveConfigs(FFC_MACROBUTTONS_SITEMAP, location);
    if (!configIds.length) {
        sidebar.innerHTML = ''; // clear sidebar if no config
        return;
    }

    const sidebarItems = getSideBarItems(configIds);

    // Reset the stack for breadcrumbs
    currentStackRef.length = 0; 

    // Render the sidebar
    updateSidebar(sidebar, sidebarItems, currentStackRef, sidebarItems);
}



// ==================================================
// Macro Execution
// ==================================================



// ==================================================
// Config Update
// ==================================================

// Checks if the URL changes
function watchUrlChanges(callback) {
    let lastUrl = location.href;

    // Notifies callback if URL changes
    const notify = () => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            callback(lastUrl);
        }
    };

    // Listen to back/forward buttons
    window.addEventListener('popstate', notify);

    // Intercept SPA navigation via history API
    ['pushState', 'replaceState'].forEach(fn => {
        const orig = history[fn];
        history[fn] = function (...args) {
            orig.apply(this, args);
            notify();
        };
    });

    // Observe DOM changes as fallback
    const observer = new MutationObserver(() => {
        notify();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}



// ==================================================
// Initialization
// ==================================================
(async () => {
    // Exits if within iFrame
    if (window.top !== window.self) return;

    addStyles() // Always add styles
    const sidebar = renderInitial(); // Always render tag and blank sidebar

    // Exit if no configs
    const configIds = resolveConfigs(FFC_MACROBUTTONS_SITEMAP, location);
    if (!configIds.length) return; // Stop if no configs related to URL

    // Initialize variables
    let currentStack = [];

    // Initial render
    updateSidebarForCurrentURL(sidebar, currentStack);

    // Update sidebar on URL change
    watchUrlChanges(() => updateSidebarForCurrentURL(sidebar, currentStack));
})();