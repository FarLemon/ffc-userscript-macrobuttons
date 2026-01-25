// ==UserScript==
// @name            FFC-MacroButtons
// @version         1.1.0
// @author          messegjo
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
            "configs": ["youtubeConfig2"],
            "inherit": false
        },
        "/shorts": {
            "configs": ["youtubeConfig3"]
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
                    },
                    {
                        "type": "group",
                        "id": "b4ebbef4-b74d-4c01-879a-682bfe456548",
                        "label": "Another Group",
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
                            },
                            {
                                "type": "group",
                                "id": "b4ebbef4-b74d-4c01-879a-682bfe456548",
                                "label": "Another Group 2",
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
        .ffc-macrobuttons-macro-sidebar {
            font-size: 16px;
            position: fixed;
            top: 0;
            right: 0;
            width: 20vw;
            min-width: 150px;
            max-width: 300px;
            height: 100vh;
            padding: 1em;
            background-color: #111;
            overflow-y: auto;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 0.5em;
            z-index: 9999;
        }
        .ffc-macrobuttons-macro-sidebar.ffc-macrobuttons-open { transform: translateX(0); }
        .ffc-macrobuttons-macro-sidebar button {
            font-size: 0.7em;
            padding: 0.4em 0.7em;
            color: #fff;
            background: #007bff;
            border: none;
            border-radius: 0.5em;
            cursor: pointer;
            width: fit-content;
            height: fit-content;
            text-align: left;
        }
        .ffc-macrobuttons-macro-sidebar button:hover { background-color: #0056b3; }
        .ffc-macrobuttons-macro-sidebar .ffc-macrobuttons-breadcrumb {
            width: 100%;
            font-weight: bold;
            margin-bottom: 0.5em;
            display: flex;
            flex-wrap: wrap;
            gap: 0.25em;
        }
        .ffc-macrobuttons-breadcrumb { width: 100%; }
        .ffc-macrobuttons-macro-sidebar .ffc-macrobuttons-breadcrumb span {
            font-size: 0.7em;
            cursor: pointer;
            color: #fff;
        }
        .ffc-macrobuttons-open-sidebar-btn {
            font-size: 16px;
            cursor: pointer;
            background-color: #007bff;
            color: white;
            padding: 0.5em 0.75em;
            border: none;
            position: fixed;
            bottom: 1em;
            right: 0;
            z-index: 10000;
            border-radius: 0.5em 0 0 0.5em;
        }
        .ffc-macrobuttons-open-sidebar-btn:hover { background-color: #0056b3; }
    `);
}



// ==================================================
// Random Stuff
// ==================================================

function renderSideBar() {
    const sidebar = document.createElement('div');
    sidebar.classList.add('ffc-macrobuttons-macro-sidebar');
    document.body.appendChild(sidebar);

    const toggleBtn = document.createElement('button');
    toggleBtn.classList.add('ffc-macrobuttons-open-sidebar-btn');
    toggleBtn.innerText = '☰';
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('ffc-macrobuttons-open'));
    document.body.appendChild(toggleBtn);

    return sidebar;
}

function renderCurrent(sidebar, items, currentStack, rootItems) {
    sidebar.innerHTML = '';

    // Breadcrumb
    const breadcrumb = document.createElement('div');
    breadcrumb.classList.add('ffc-macrobuttons-breadcrumb');

    const homeSpan = document.createElement('span');
    homeSpan.style.textDecoration = 'underline';
    homeSpan.innerText = 'Home';
    homeSpan.addEventListener('click', () => {
        currentStack.length = 0; // clear stack
        renderCurrent(sidebar, rootItems, currentStack, rootItems); // <-- pass top-level items
    });
    breadcrumb.appendChild(homeSpan);

    currentStack.forEach((grp, idx) => {
        const sep = document.createElement('span');
        sep.innerText = ' / ';
        breadcrumb.appendChild(sep);

        const span = document.createElement('span');
        span.innerText = grp.label;
        span.style.textDecoration = 'underline';
        span.addEventListener('click', () => {
            currentStack = currentStack.slice(0, idx + 1);
            renderCurrent(sidebar, currentStack[idx].items, currentStack, rootItems);
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
        } else if (item.type === 'group') {
            btn.addEventListener('click', () => {
                currentStack.push(item);
                renderCurrent(sidebar, item.items, currentStack, rootItems);
            });
        }

        sidebar.appendChild(btn);
    });
}



// ==================================================
// Initialization
// ==================================================
(async () => {
    // Exits if within iFrame
    if (window.top !== window.self) return;

    // Always load sidebar
    addStyles();
    const sidebar = renderSideBar()

    // Exit if no configs
    const configIds = resolveConfigs(FFC_MACROBUTTONS_SITEMAP, location);
    if (!configIds.length) return; // Stop if no configs related to URL

    // Render buttons
    let currentStack = [];
    let sidebarItems = getSideBarItems(configIds);
    renderCurrent(sidebar, sidebarItems, currentStack, sidebarItems);

})();