// ==UserScript==
// @name         FFC-MacroButtons
// @version      1.0
// @author       messegjo
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

/* global Sortable */

// ========================= Global ========================= //
const STORAGE_KEY = 'ffc_macro_buttons';
const uid = (prefix = '') => prefix + Math.floor(Math.random() * 1e9).toString().padStart(9, '0');

const defaultData = {
    mainBarData: [
    ]
};

// Styles
GM_addStyle(`
    .ffc-wrapper {
        font-size: 1.5rem;
        box-sizing: border-box;
        position: fixed;
        bottom: 0.5em;
        width: 100%;
        font-family: 'Roboto Mono', monospace;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding-inline: 1em;
        gap: 1em;
    }
    .ffc-wrapper * { box-sizing: border-box; }
    .ffc-bar {
        width: fit-content;
        display: flex;
        gap: 1em;
    }
    .ffc-controls {
        display: flex;
        gap: 1em;
    }
    .ffc-mainBar {
        width: 100%;
        display: flex;
        justify-content: space-between;
    }
    .ffc-groupBar {
        margin-left: auto;
    }
    .ffc-button, .ffc-groupButton {
        height: 2em;
        padding-inline: 1em;
        background: #1e1e2e;
        color: #f5e0dc;
        border: 1px solid #45475a;
        border-radius: 0.75em;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .ffc-buttonColored {
    }
    .ffc-groupButton {
        border-radius: 0.25em;
    }
    .ffc-groupButton-active {
        background: #45475a;
    }
`);

// Elements
const wrapper = document.createElement('div');
wrapper.className = 'ffc-wrapper';
document.body.appendChild(wrapper);

const mainBar = document.createElement('div');
mainBar.className = 'ffc-bar ffc-mainBar';
wrapper.appendChild(mainBar);

const controlsGrp = document.createElement('div');
controlsGrp.className = 'ffc-bar ffc-controls';
mainBar.appendChild(controlsGrp);

const buttonsGrp = document.createElement('div');
buttonsGrp.className = 'ffc-bar ffc-buttons';
mainBar.appendChild(buttonsGrp);

let data;
let activeGroupsPerRow = [];

// Functions
// Load / Save
async function loadData() {
    try {
        return JSON.parse(GM_getValue(STORAGE_KEY, JSON.stringify(defaultData)));
    } catch (e) {
        console.error('Failed to load command bar data', e);
        return defaultData;
    }
}

async function saveData(data) {
    try {
        await GM_setValue(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save command bar data', e);
    }
}

// Variables
let isEditMode = false;
let isDragging = false;

// Styles
GM_addStyle(`
    div[data-testid="terminal-container"] {
        height: calc(100% - 4.4rem) !important;
    }
    .ffc-modal-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.25);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    .ffc-modal {
        background: #1e1e2e;
        border: 1px solid #45475a;
        border-radius: 6px;
        padding: 12px;
        width: 320px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .ffc-modal input,
    .ffc-modal select,
    .ffc-modal textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 4px;
        font-size: 12px;
    }
    .ffc-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        margin-top: 6px;
    }
    #ffc-delete {
        margin-right: auto;
    }
    .ffc-settingsModal {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }
    .ffc-settingsModal-content {
        background: #1e1e2e;
        color: #f5e0dc;
        border: 1px solid #45475a;
        border-radius: 0.5em;
        padding: 1.5em;
        min-width: 300px;
    }
    .ffc-settingsModal-content h3 {
        margin-top: 0;
        font-size: 1.2rem;
    }
`);

// ----- Constant Elements ----- //
// Create and append the control buttons
const settingsBtn = document.createElement('button');
settingsBtn.id = 'settingsButton';
settingsBtn.className = 'ffc-button ffc-buttonColored';
settingsBtn.innerHTML = '⚙️';
settingsBtn.setAttribute('tabindex', '-1');
settingsBtn.addEventListener('focus', e => e.target.blur());
settingsBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openSettingsMenu();
});
controlsGrp.appendChild(settingsBtn);

const editBtn = document.createElement('button');
editBtn.id = 'editButton';
editBtn.className = 'ffc-button ffc-buttonColored';
editBtn.innerHTML = '✎';
editBtn.setAttribute('tabindex', '-1');
editBtn.addEventListener('focus', e => e.target.blur());
editBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isEditMode = !isEditMode;
    if (isEditMode) {
        editBtn.classList.add('ffc-groupButton-active');
    } else {
        editBtn.classList.remove('ffc-groupButton-active');
    }
    renderBars();
    enableDrag();
});
controlsGrp.appendChild(editBtn);



// ----- Functions ----- //
// Recursive helper
function findBtnById(id, btnList = data.mainBarData) {
    for (const btn of btnList) {
        if (btn.type === 'group') {
            if (btn.id === id) return btn;
            const nested = findBtnById(id, btn.buttons);
            if (nested) return nested;
        }
    }
    return null;
}

// Capitalize first letter
function capitalizeFirstLetter(text) {
  if (text.length === 0) {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}



// ----- Button Scripts ----- //
function waitMs(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function simulateTyping(text) {
    const active = document.activeElement;
    if (!active) return;

    // Regular input or textarea
    if ('value' in active && !active.classList.contains('xterm-helper-textarea')) {
        for (const ch of text) {
            active.value += ch;
            active.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
    }

    // xterm helper textarea
    if (active.classList.contains('xterm-helper-textarea')) {
        active.focus();
        for (const ch of text) {
            // Insert the character as actual input event
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: ch,
                inputType: 'insertText',
            });
            active.value += ch; // xterm reads the value
            active.dispatchEvent(inputEvent);
        }
        return;
    }

    console.warn('No suitable element to type into.');
}

function simulateKey(combo) {
    if (!combo) return;
    const active = document.activeElement;
    if (!active) return;

    const parts = combo.split('+').map(k => k.trim());
    const modifiers = {
        shiftKey: parts.includes('Shift'),
        ctrlKey: parts.includes('Ctrl'),
        altKey: parts.includes('Alt'),
        metaKey: parts.includes('Meta'),
    };
    const key = parts[parts.length - 1];

    // xterm helper textarea
    if (active.classList.contains('xterm-helper-textarea')) {
        active.focus();
        let char = '';
        switch (key.toLowerCase()) {
            case 'enter': char = '\r'; break;
            case 'tab': char = '\t'; break;
            case 'backspace': char = '\b'; break;
            case 'escape': char = '\x1b'; break;
            default:
                if (key.length === 1) char = modifiers.shiftKey ? key.toUpperCase() : key;
        }
        if (char) {
            active.value += char;
            active.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: char, inputType: 'insertText' }));
        }
        return;
    }

    // Regular inputs / textareas
    const eventInit = {
        key,
        code: key === 'Enter' ? 'Enter' : `Key${key.toUpperCase()}`,
        keyCode: key === 'Enter' ? 13 : key.charCodeAt(0),
        charCode: key === 'Enter' ? 13 : key.charCodeAt(0),
        which: key === 'Enter' ? 13 : key.charCodeAt(0),
        bubbles: true,
        cancelable: true,
        ...modifiers,
    };

    // Dispatch keydown first
    const keydownEvent = new KeyboardEvent('keydown', eventInit);
    active.dispatchEvent(keydownEvent);

    // Some apps require keypress
    const keypressEvent = new KeyboardEvent('keypress', eventInit);
    active.dispatchEvent(keypressEvent);

    // Then keyup
    const keyupEvent = new KeyboardEvent('keyup', eventInit);
    active.dispatchEvent(keyupEvent);

    // If Enter was pressed and the input is in a form, try submitting it
    if (key.toLowerCase() === 'enter') {
        const form = active.form;
        if (form) form.requestSubmit?.();
    }
}


// main parser and runner
async function runButtonScript(script) {
    if (!script || typeof script !== 'string') return;

    // Split into lines or command blocks
    const lines = script
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    for (const line of lines) {
        if (line.startsWith('/')) {
            const [command, ...args] = line.split(' ');
            const argStr = args.join(' ').trim();

            switch (command.toLowerCase()) {
                case '/type':
                    await simulateTyping(argStr.replace(/^['"]|['"]$/g, ''));
                    break;

                case '/key':
                    simulateKey(argStr);
                    break;

                case '/wait':
                    await waitMs(parseInt(argStr) || 500);
                    break;

                default:
                    console.warn(`Unknown command: ${command}`);
            }
        } else {
            console.log(`Plain text ignored: ${line}`);
        }
    }
}



// ----- Menus ----- //
// Settings Menu
function openSettingsMenu() {
    const modal = document.createElement('div');
    modal.classList.add('ffc-settingsModal');

    modal.innerHTML = `
        <div class="ffc-settingsModal-content" style="max-width: 500px;">
            <h3>⚙️ Settings</h3>
            <div style="display: flex; flex-direction: column; gap: 1em;">
                <button id="ffc-export" class="ffc-button">Export Buttons</button>
                <input type="file" id="ffc-import-file" accept=".json" style="display:none;">
                <button id="ffc-import" class="ffc-button">Import Buttons (from file)</button>
                <textarea id="ffc-import-text" placeholder="Or paste JSON here" style="width:100%; height:6em;"></textarea>
                <div style="display: flex; gap: 1em; justify-content: flex-end;">
                    <button id="ffc-import-apply" class="ffc-button">Apply Import</button>
                    <button id="ffc-close-settings" class="ffc-button">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#ffc-close-settings');
    const exportBtn = modal.querySelector('#ffc-export');
    const importBtn = modal.querySelector('#ffc-import');
    const importFile = modal.querySelector('#ffc-import-file');
    const importText = modal.querySelector('#ffc-import-text');
    const importApply = modal.querySelector('#ffc-import-apply');

    closeBtn.onclick = () => modal.remove();

    exportBtn.onclick = async () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'FFC_MacroButtons_Data.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    importBtn.onclick = () => importFile.click();

    importFile.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (!parsed.mainBarData) throw new Error('Invalid format');
            data = parsed;
            await saveData(data);
            renderBars();
            modal.remove();
        } catch (err) {
            alert('Failed to import file: ' + err.message);
        }
    };

    importApply.onclick = async () => {
        const text = importText.value.trim();
        if (!text) return alert('Please paste some JSON.');
        try {
            const parsed = JSON.parse(text);
            if (!parsed.mainBarData) throw new Error('Invalid format');
            data = parsed;
            await saveData(data);
            renderBars();
            modal.remove();
        } catch (err) {
            alert('Invalid JSON: ' + err.message);
        }
    };
}

// Edit Menu
function openEditModal({ item = null, parentGroupId = null }) {
    const overlay = document.createElement('div');
    overlay.classList.add('ffc-modal-overlay');

    const modal = document.createElement('div');
    modal.classList.add('ffc-modal');
    modal.innerHTML = `
        <h3>${item ? '✎ Edit' : '+ Add'} ${capitalizeFirstLetter(item?.type || 'Item')}</h3>
        <label>Name:</label>
        <input id="ffc-name" type="text" value="${item?.name || ''}">

        <label>Type:</label>
        <select id="ffc-type">
            <option value="button" ${item?.type === 'button' ? 'selected' : ''}>Button</option>
            <option value="group" ${item?.type === 'group' ? 'selected' : ''}>Group</option>
        </select>

        <div id="ffc-script-section" style="display: ${item?.type === 'button' ? 'block' : 'none'};">
            <label>Script:</label>
            <textarea id="ffc-script" rows="6">${item?.script || ''}</textarea>
        </div>

        <div class="ffc-modal-actions">
            <button id="ffc-delete" class="ffc-button ffc-buttonColored">Delete</button>
            <button id="ffc-save" class="ffc-button ffc-buttonColored">Save</button>
            <button id="ffc-cancel" class="ffc-button">Cancel</button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const nameInput = modal.querySelector('#ffc-name');
    const typeSelect = modal.querySelector('#ffc-type');
    const scriptSection = modal.querySelector('#ffc-script-section');
    scriptSection.style.display = typeSelect.value === 'button' ? 'block' : 'none';
    const scriptInput = modal.querySelector('#ffc-script');

    typeSelect.addEventListener('change', () => {
        scriptSection.style.display = typeSelect.value === 'button' ? 'block' : 'none';
    });

    modal.querySelector('#ffc-delete').style.display = item != null ? 'block' : 'none';
    modal.querySelector('#ffc-delete').onclick = async () => {
        if (confirm(`Delete ${item.name}?`)) {
            const parentList = parentGroupId
                ? findBtnById(parentGroupId).buttons
                : data.mainBarData;
            const idx = parentList.findIndex(i => i.id === item.id);
            overlay.remove()
            if (idx !== -1) {
                parentList.splice(idx, 1);
                await saveData(data);
                renderBars();
            }
        }
    };

    modal.querySelector('#ffc-cancel').onclick = () => overlay.remove();

    modal.querySelector('#ffc-save').onclick = async () => {
        const name = nameInput.value.trim();
        if (!name) return alert('Please enter a name.');

        const type = typeSelect.value;
        const parentList = parentGroupId
            ? findBtnById(parentGroupId).buttons
            : data.mainBarData;

        if (item) {
            item.name = name;
            item.type = type;
            if (type === 'button') item.script = scriptInput.value;
        } else {
            const newItem =
                type === 'button'
                    ? { id: uid('b'), type, name, script: scriptInput.value }
                    : { id: uid('g'), type, name, buttons: [] };
            parentList.unshift(newItem);
        }

        await saveData(data);
        overlay.remove();
        renderBars();
    };
}



// ----- Creation of Bars ----- //
function handleGroupClick(item, rowIndex) {
    if (activeGroupsPerRow[rowIndex] === item.id) {
        activeGroupsPerRow = activeGroupsPerRow.slice(0, rowIndex);
    } else {
        activeGroupsPerRow = activeGroupsPerRow.slice(0, rowIndex);
        activeGroupsPerRow[rowIndex] = item.id;
    }
    renderBars();
}

// Creates button row
function renderRow(buttons, rowIndex, container, parentGroupId = null) {
    container.innerHTML = '';

    // Add "+" at the start in edit mode
    if (isEditMode) {
        const addBtn = document.createElement('button');
        addBtn.className = 'ffc-button ffc-buttonColored add-button';
        addBtn.textContent = '+';
        addBtn.setAttribute('tabindex', '-1');
        addBtn.addEventListener('focus', e => e.target.blur());
        addBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openEditModal({ parentGroupId });
        });
        container.appendChild(addBtn);
    }

    for (const item of buttons) {
        const btn = document.createElement('button');
        btn.dataset.id = item.id;
        btn.textContent = item.name;
        btn.setAttribute('tabindex', '-1');
        btn.addEventListener('focus', e => e.target.blur());

        if (isEditMode) {
            // Add handle
            const handle = document.createElement('span');
            handle.classList.add('button-handle');
            handle.textContent = '☰';
            handle.style.marginRight = '1em';
            handle.style.cursor = 'grab';
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            btn.prepend(handle);

            // Add edit icon
            const edit = document.createElement('span');
            edit.textContent = '✎';
            edit.style.marginLeft = '1em';
            edit.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openEditModal({ item, parentGroupId });
            });
            btn.appendChild(edit);
        }

        if (item.type === 'button') {
            btn.classList.add('ffc-button');
            btn.addEventListener('mousedown', (e) => {
                if (!isEditMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    runButtonScript(item.script);
                }
            });
        } else if (item.type === 'group') {
            btn.classList.add('ffc-groupButton');
            if (activeGroupsPerRow[rowIndex] === item.id)
                btn.classList.add('ffc-groupButton-active');
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGroupClick(item, rowIndex);
            });
        }

        container.appendChild(btn);
    }
}

// Recursively render button rows
function renderBars() {
    // Remove all old group bars
    document.querySelectorAll('.ffc-groupBar').forEach(bar => bar.remove());

    // Render main bar
    buttonsGrp.innerHTML = '';
    renderRow(data.mainBarData, 0, buttonsGrp);

    // Render active groups recursively
    let previousBar = mainBar; // Start from main bar
    for (let rowIndex = 0; rowIndex < activeGroupsPerRow.length; rowIndex++) {
        const groupId = activeGroupsPerRow[rowIndex];
        const parentButtons = rowIndex === 0
            ? data.mainBarData
            : findBtnById(activeGroupsPerRow[rowIndex - 1]).buttons;
        const group = parentButtons.find(i => i.id === groupId && i.type === 'group');
        if (group) {
            const groupBar = document.createElement('div');
            groupBar.className = 'ffc-bar ffc-groupBar';
            groupBar.dataset.groupId = group.id;
            groupBar.style.display = 'flex';
            groupBar.style.gap = '1em';

            wrapper.insertBefore(groupBar, previousBar);

            renderRow(group.buttons, rowIndex + 1, groupBar, group.id);
            previousBar = groupBar; // update previousBar to stack above
        }
    }

    enableDrag();
}

// Sortable setup
function enableDrag() {
    const scriptId = 'sortablejs';
    if (!document.getElementById(scriptId)) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';
        s.id = scriptId;
        s.onload = setupSortables;
        document.head.appendChild(s);
    } else setupSortables();
}



function setupSortables() {
    function findItemAndParent(id, list = data.mainBarData, parent = null) {
        for (const item of list) {
            if (item.id === id) return { item, parentList: parent || list };
            if (item.type === 'group') {
                const found = findItemAndParent(id, item.buttons, item.buttons);
                if (found) return found;
            }
        }
        return null;
    }

    function handleSortableAdd(evt, bar) {
        const id = evt.item.dataset.id;
        const movedInfo = findItemAndParent(id);
        if (!movedInfo) return;

        const idx = movedInfo.parentList.findIndex(b => b.id === id);
        if (idx !== -1) {
            const [moved] = movedInfo.parentList.splice(idx, 1);
            const newParentList =
                  bar === buttonsGrp
            ? data.mainBarData
            : findItemAndParent(bar.dataset.groupId)?.item?.buttons || data.mainBarData;

            const newIndex = Array.from(bar.children).indexOf(evt.item);
            newParentList.splice(newIndex, 0, moved);
            saveData(data);
        }
    }

    function handleSortableEnd(evt, bar) {
        const parentList =
            bar === buttonsGrp
                ? data.mainBarData
                : findItemAndParent(bar.dataset.groupId)?.item?.buttons || data.mainBarData;

        const newOrderIds = Array.from(bar.children)
            .filter(c => c.dataset.id) // ignore non-buttons
            .map(el => el.dataset.id);

        parentList.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
        saveData(data);
        isDragging = false;
    }

    const bars = [buttonsGrp, ...document.querySelectorAll('.ffc-groupBar')];

    for (const bar of bars) {
        if (bar._sortable) {
            try { bar._sortable.destroy(); } catch (e) {}
        }

        if (isEditMode) {
            bar._sortable = new Sortable(bar, {
                handle: '.button-handle',
                draggable: 'button:not(.add-button)', // ignore the "+" button
                animation: 150,
                group: { name: 'nested-bar', pull: true, put: true },
                onStart: () => { isDragging = true; },
                onAdd: (evt) => handleSortableAdd(evt, bar),
                onEnd: (evt) => handleSortableEnd(evt, bar),
            });
        }
    }
}



// Initialize
(async () => {
    data = await loadData();
    renderBars();
})();