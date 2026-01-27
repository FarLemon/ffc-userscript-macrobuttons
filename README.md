# FFC-MacroButtons

**Version:** 1.1.0  
**Author:** Joshua Messer  
**Description:** Adds customizable, persistent macro buttons to web pages for quick actions. Buttons and groups are configurable per website and URL path.

---

## Features
- Floating sidebar with macro buttons
- Supports button groups for organized actions
- Persistent configuration via `GM_setValue` / `GM_getValue` (Currently not implemented)
- Automatically updates when the URL changes (SPA support)
- Fully customizable per site and path

---

## Installation
1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/).
2. Create a new userscript and paste the code from `FFC-MacroButtons.user.js`.
3. Save and enable the script.
4. Visit any site included in your `siteMap` to see the macro sidebar.

---

## JSON Configuration

### 1. `siteMap`
Defines which configurations are applied to which domains and paths.

**Structure**
```json
{
    "domain": {
        "path": {
            "configs": ["configId"],
            "inherit": true,
            "remove": ["configId"]
        }
    }
}
```

**Example `siteMap`**
```json
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
}
```

---

### 2. `configs`

Defines macro button layouts, including groups and individual buttons.

**Structure**
```json
{
    "configId": {
        "meta": {
            "uid": "[unique-id]",
            "name": "Display Name",
            "version": "1.1.0"
        },
        "items": [
            {
                "type": "button" | "group",
                "id": "[item-id]",
                "label": "Button Label",
                "order": 10,
                "action": "Parsable Button Action Info", // for buttons
                "items": [] // for groups
            }
        ]
    }
}
```

**Example `configs`**
```json
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
}
```

---

## Usage
- Hover over the tag on the bottom left of the page.
- Click the hamburger `☰` to open the sidebar.
- Buttons execute their configured actions (currently as alert placeholders).
- Groups can be navigated via the sidebar and breadcrumb navigation at the top of the sidebar.
- Sidebar automatically updates when the page URL changes.

---

## Notes
- The script works on any site, and renders `configs` included in the `siteMap`.
- You can add new button actions by modifying the `configs` JSON.
- The script currently uses placeholder `alert` actions; replace these with real functions as needed.
