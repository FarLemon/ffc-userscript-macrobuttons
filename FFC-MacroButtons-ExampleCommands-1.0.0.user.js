// ==UserScript==
// @name            FFC-MacroButtons-ExampleCommands
// @version         1.0.0
// @author          Joshua Messer
// @description     Adds customizable, persistant macro buttons to web pages
// @match           *://*/*
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// @grant           unsafeWindow
// ==/UserScript==

// ==================================================
// Track last focused input/textarea globally
// ==================================================
let lastFocusedInput = null;

document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && e.target.type === 'text')) {
        lastFocusedInput = e.target;
    }
});



// ==================================================
// Commands
// ==================================================

const COMMANDS = {
    scrollToTop: () => {
        unsafeWindow.document.documentElement.style.scrollBehavior = 'smooth';
        unsafeWindow.scrollTo(0, 0);
    },

    scrollToBottom: () => {
        unsafeWindow.document.documentElement.style.scrollBehavior = 'smooth';
        unsafeWindow.scrollTo(0, unsafeWindow.document.body.scrollHeight);
    }
}



function awaitMacroButtonsCore(commands) {
    if (typeof unsafeWindow.FFC_MACROBUTTONS_registerCommand === 'function') {
        for (const [name, fn] of Object.entries(commands)) {
            unsafeWindow.FFC_MACROBUTTONS_registerCommand(name, fn);
        }
        console.log('FFC-MacroButtons (Core Commands) registered:', Object.keys(commands));
        return;
    }

    // Retry if FFC-MacroButtons (Engine) hasn't loaded yet
    setTimeout(awaitMacroButtonsCore, 100);
}


(function() {
    'use strict';
    awaitMacroButtonsCore(COMMANDS);
})();