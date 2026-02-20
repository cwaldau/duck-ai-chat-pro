// ==UserScript==
// @name         Duck.ai Chat Pro
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Adds Claude-style split-view code panels to duck.ai (and maybe other future enhancements)
// @author       Christopher Waldau
// @license      GNU GPLv3
// @downloadURL  https://github.com/cwaldau/duck-ai-chat-pro/raw/refs/heads/main/duck-ai-chat-pro.user.js
// @updateURL    https://github.com/cwaldau/duck-ai-chat-pro/raw/refs/heads/main/duck-ai-chat-pro.user.js
// @match        https://duck.ai/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup-templating.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-clike.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-java.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-c.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-cpp.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-ruby.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-go.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-rust.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-php.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markdown.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-tsx.min.js
// @icon         https://duck.ai/favicon.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        injectStyles(); // duck.ai custom styles (inline)
        injectPrismCSS(); // fetch and inject Prism CSS safely
        setupCodePanel();
        setupToggleButton();
    }

    // Sidebar management
    let sidebarWasCollapsed = false;

    // Code conversion toggle state (default: enabled)
    let codeConversionEnabled = true;

    // Load saved preference from localStorage
    try {
        const saved = localStorage.getItem('duck-ai-code-conversion-enabled');
        if (saved !== null) {
            codeConversionEnabled = saved === 'true';
        }
    } catch (e) {
        console.warn('Could not load code conversion preference:', e);
    }

    // Save preference to localStorage
    function saveCodeConversionPreference(enabled) {
        try {
            localStorage.setItem('duck-ai-code-conversion-enabled', enabled.toString());
        } catch (e) {
            console.warn('Could not save code conversion preference:', e);
        }
    }

    function getSidebar() {
        // Find sidebar by stable structural selectors, not obfuscated classes
        return document.querySelector('section[class]') ||
               document.querySelector('aside') ||
               document.querySelector('nav');
    }

    function getSidebarToggle() {
        // Find the sidebar toggle button
        return document.querySelector('button[aria-label*="sidebar"]');
    }

    function isSidebarCollapsed() {
        try {
            return localStorage.getItem('duckaiSidebarCollapsed') === 'true';
        } catch (e) {
            const sidebar = getSidebar();
            if (!sidebar) return false;
            return sidebar.offsetWidth < 100 || sidebar.style.display === 'none';
        }
    }

    function toggleSidebar() {
        const toggle = getSidebarToggle();
        if (toggle) {
            toggle.click();
        }
    }

    function collapseSidebarIfNeeded() {
        if (!isSidebarCollapsed()) {
            sidebarWasCollapsed = false;
            toggleSidebar();
        } else {
            sidebarWasCollapsed = true;
        }
    }

    function restoreSidebarIfNeeded() {
        if (!sidebarWasCollapsed && isSidebarCollapsed()) {
            toggleSidebar();
        }
    }

    function setupToggleButton() {
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            const sidebar = getSidebar();
            if (sidebar && sidebar.querySelector('button')) {
                clearInterval(check);
                insertToggleButton(sidebar);
                watchSidebarState();
            } else if (attempts > 50) {
                clearInterval(check);
            }
        }, 100);
    }

    function watchSidebarState() {
        updateToggleVisibility();

        window.addEventListener('storage', (e) => {
            if (e.key === 'duckaiSidebarCollapsed') {
                updateToggleVisibility();
            }
        });

        const originalSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function(key, value) {
            originalSetItem(key, value);
            if (key === 'duckaiSidebarCollapsed') {
                setTimeout(updateToggleVisibility, 50);
            }
        };

        const sidebar = getSidebar();
        if (sidebar) {
            const observer = new MutationObserver(() => {
                updateToggleVisibility();
            });
            observer.observe(sidebar, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }
    }

    function updateToggleVisibility() {
        const toggleContainer = document.querySelector('.code-conversion-toggle-container');
        if (!toggleContainer) return;

        const sidebarCollapsed = isSidebarCollapsed();

        if (sidebarCollapsed) {
            toggleContainer.style.display = 'none';
        } else {
            toggleContainer.style.display = '';
        }
    }

    function observeSidebarChanges() {
        // Watch for sidebar being replaced/modified
        const app = document.getElementById('app');
        if (!app) return;

        let lastSidebarCollapsed = isSidebarCollapsed();

        const observer = new MutationObserver(() => {
            const currentlyCollapsed = isSidebarCollapsed();

            // Sidebar was collapsed and is now expanded
            if (lastSidebarCollapsed && !currentlyCollapsed) {
                const sidebar = getSidebar();
                // Check if toggle is missing
                if (sidebar && !document.getElementById('code-conversion-toggle')) {
                    insertToggleButton(sidebar);
                }
            }

            lastSidebarCollapsed = currentlyCollapsed;
        });

        observer.observe(app, {
            childList: true,
            subtree: true
        });
    }

    function insertToggleButton(sidebar) {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'code-conversion-toggle-container';
        toggleContainer.innerHTML = `
            <button class="code-conversion-toggle" id="code-conversion-toggle" title="Toggle code block conversion">
                <div class="toggle-content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    <span class="toggle-label">Code Panels</span>
                </div>
                <div class="toggle-switch">
                    <div class="toggle-slider"></div>
                </div>
            </button>
        `;

        // Find insertion point using stable text content - never rely on obfuscated classes
        // Strategy 1: insert after the "Chat Protection" button
        const allButtons = Array.from(sidebar.querySelectorAll('button'));
        const chatProtectionBtn = allButtons.find(btn =>
            btn.textContent.trim().includes('Chat Protection')
        );

        if (chatProtectionBtn) {
            chatProtectionBtn.insertAdjacentElement('afterend', toggleContainer);
        } else {
            // Strategy 2: insert before the DuckDuckGo footer text
            const allEls = Array.from(sidebar.querySelectorAll('span, div'));
            const ddgText = allEls.find(el =>
                el.children.length === 0 && el.textContent.trim() === 'DuckDuckGo'
            );
            if (ddgText) {
                // Walk up to find the ancestor that is a direct child of sidebar
                let ancestor = ddgText.parentElement;
                while (ancestor && ancestor.parentElement !== sidebar) {
                    ancestor = ancestor.parentElement;
                }
                if (ancestor) {
                    sidebar.insertBefore(toggleContainer, ancestor);
                } else {
                    sidebar.appendChild(toggleContainer);
                }
            } else {
                // Strategy 3: just append
                sidebar.appendChild(toggleContainer);
            }
        }

        // Set initial state
        const toggleBtn = document.getElementById('code-conversion-toggle');
        if (!toggleBtn) return;
        if (codeConversionEnabled) toggleBtn.classList.add('enabled');

        // Click handler
        toggleBtn.addEventListener('click', () => {
            codeConversionEnabled = !codeConversionEnabled;
            saveCodeConversionPreference(codeConversionEnabled);

            if (codeConversionEnabled) {
                toggleBtn.classList.add('enabled');
                const chatWrapper = document.querySelector('.chat-wrapper');
                if (chatWrapper && window.codeManager) {
                    window.codeManager.convertCodeBlocks(chatWrapper);
                }
            } else {
                toggleBtn.classList.remove('enabled');
                if (window.codeManager) {
                    window.codeManager.closePanel();
                    window.codeManager.revertAllFilePanels();
                }
            }
        });
    }

    /**
     * TIMESTAMPS
     */

    const TS_TAG = '[Duck.ai timestamps]';
    let tsScheduled = false;
    let tsCache = {
        chatId: null,
        assistantMessages: null
    };

    function runWhenIdle(fn) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(fn, { timeout: 2000 });
        } else {
            setTimeout(fn, 50);
        }
    }

    function scheduleTimestamps(root) {
        if (tsScheduled) return;
        tsScheduled = true;

        runWhenIdle(() => {
            tsScheduled = false;
            addAssistantTimestampsIn(root);
        });
    }

    function loadChatsForTimestamps() {
        try {
            const raw = localStorage.getItem('savedAIChats');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn(TS_TAG, 'failed to parse savedAIChats', e);
            return null;
        }
    }

    function getChatContext(chatId, requiredCount) {
        const data = loadChatsForTimestamps();
        if (!data) return null;

        // Reuse chatId, but refresh assistantMessages if we need more
        if (!chatId) return null;

        let chat = data.chats.find(c => c.chatId === chatId);
        if (!chat || !Array.isArray(chat.messages)) return null;

        const assistantMessages = chat.messages.filter(m => m.role === 'assistant');

        // If we already have cache for this chat and it's long enough, reuse it
        if (tsCache.chatId === chatId &&
            tsCache.assistantMessages &&
            tsCache.assistantMessages.length >= requiredCount) {
            return tsCache;
        }

        tsCache = { chatId, assistantMessages };
        return tsCache;
    }

    // Extract chatId from an assistant message id:
    // "72eb1718-...-assistant-message-0-1" → "72eb1718-..."
    function getChatIdFromAssistantNode(node) {
        if (!node || !node.id) return null;
        const match = node.id.match(/^([0-9a-fA-F-]+)-assistant-message/);
        return match ? match[1] : null;
    }

    function formatTimestamp(iso) {
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,   // set false for 24h
            second: undefined
        });
    }

    // Add timestamps to assistant messages within a given root (e.g. chat-wrapper or a new node)
    function addAssistantTimestampsIn(root) {
        if (!root) return;

        // Find any assistant node to get chatId
        const firstAssistant = root.querySelector('div[id*="-assistant-message-"]:not([id^="heading-"])');
        if (!firstAssistant) return;

        const chatId = getChatIdFromAssistantNode(firstAssistant);
        if (!chatId) return;

        // All *outer* assistant nodes currently in DOM
        const assistantNodes = Array.from(
            root.querySelectorAll('div[id*="-assistant-message-"]:not([id^="heading-"])')
        );
        if (!assistantNodes.length) return;

        // Make sure we have at least this many assistant messages in cache
        const ctx = getChatContext(chatId, assistantNodes.length);
        if (!ctx) return;

        const { assistantMessages } = ctx;

        assistantNodes.forEach((node, idx) => {
            const msg = assistantMessages[idx];
            if (!msg || !msg.createdAt) return;

            if (node.querySelector('.duckai-timestamp')) return;

            const span = document.createElement('span');
            span.className = 'duckai-timestamp';
            span.textContent = formatTimestamp(msg.createdAt);

            span.style.opacity = '0.6';
            span.style.fontSize = '0.75rem';
            span.style.marginLeft = '0.5rem';
            span.style.display = 'inline-flex';
            span.style.alignItems = 'center';
            span.style.whiteSpace = 'nowrap';

            const directDivChildren = Array.from(node.children).filter(
                el => el.tagName === 'DIV'
            );
            const footer = directDivChildren[directDivChildren.length - 1] || node;

            // For row-reverse flex: insert first so it appears visually last
            if (footer.firstChild) {
                footer.insertBefore(span, footer.firstChild);
            } else {
                footer.appendChild(span);
            }
        });
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* ==================== CLAUDE-STYLE CODE OUTPUT STYLES ==================== */

/* Reverted code block styles - matches Duck.ai's native appearance */
.duck-code-block {
    box-sizing: border-box;
    background-color: var(--sds-color-background-container-pre) !important;
    border: 1px solid var(--sds-color-palette-shade-06);
    border-radius: var(--sds-radius-x03);
    margin: 8px 0;
}

.duck-code-header {
    display: flex;
    justify-content: space-between;
    padding: var(--sds-space-x03) var(--sds-space-x03) var(--sds-space-x02) var(--sds-space-x04) !important;
}

.duck-code-lang-container {
    display: flex;
    align-items: center;
    gap: 8px;
}

.duck-code-lang-container * {
    color: var(--sds-color-text-on-dark-02);
    font-size: var(--sds-font-size-label) !important;
}

.duck-code-lang-container i {
  width: 16px;
  height: 16px;
}

.duck-code-lang-label {
    font-family: var(--sds-font-family-monospace) !important;
    line-height: 2 !important;
    margin: 0;
}

.duck-code-button-container {
    position: relative;
}

.duck-code-copy-btn,
.duck-code-copied-btn {
    color: var(--sds-color-text-accent-01);
    background: transparent;
    border: none;
    cursor: pointer;
    animation: none;
    text-transform: capitalize;
    transition: opacity 0.25s ease-in-out;
    opacity: 1;
    font-weight: var(--sds-font-weight-normal);
    padding: 4px 8px !important;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--sds-font-size-label);
}

.duck-code-copy-btn:hover,
.duck-code-copied-btn:hover {
    background-color: var(--theme-col-bg-button-ghost-hover);
    border-radius: var(--rounded-md);
}

.duck-code-copy-btn svg,
.duck-code-copied-btn svg {
    width: 16px;
    height: 16px;
}

.duck-code-copied-btn {
    cursor: default;
    position: absolute;
    right: 0;
    width: max-content;
    opacity: 0;
    visibility: hidden;
}

.duck-code-content {
    color: var(--sds-color-text-01);
    font-family: var(--sds-font-family-monospace);
    direction: ltr;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    font-size: var(--sds-font-size-label);
    line-height: var(--sds-font-line-height-body);
    tab-size: 4;
    hyphens: none;
    padding: var(--sds-space-x02, 8px) var(--sds-space-x04, 16px) var(--sds-space-x04, 16px) !important;
    margin: 0;
    overflow: auto;
    border: none;
    background: transparent;
}

.duck-code-content code {
    color: var(--sds-color-text-01);
    font-family: var(--sds-font-family-monospace) !important;
    font-size: var(--sds-font-size-label) !important;
    line-height: var(--sds-font-line-height-body);
    background-color: transparent;
    white-space: pre-wrap !important;
    word-wrap: break-word;
    display: block;
    background: 0 0 !important;
}

.duck-code-content span {
    background-color: transparent;
}

/* Toggle button in sidebar */
.code-conversion-toggle-container {
    padding: 0;
    margin: 0;
    overflow: hidden;
    width: 100%;
    flex-shrink: 0;
}

.code-conversion-toggle-container button {
    border-radius: var(--sds-radius-x03);
    padding: 8px var(--sds-space-x03);
}

.code-conversion-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 14px;
    color: inherit;
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
}

.code-conversion-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
}

.toggle-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.code-conversion-toggle svg {
    flex-shrink: 0;
    opacity: 0.7;
}

.toggle-label {
    font-weight: 400;
    text-align: left;
    font-size: 14px;
}

.toggle-switch {
    width: 36px;
    height: 20px;
    background: #ccc;
    border-radius: 10px;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
}

.code-conversion-toggle.enabled .toggle-switch {
    background: #2196f3;
}

.toggle-slider {
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.code-conversion-toggle.enabled .toggle-slider {
    transform: translateX(16px);
}

/* Dark theme support for toggle */
.set-theme--dark .code-conversion-toggle:hover {
    background: rgba(255, 255, 255, 0.05);
}

.set-theme--dark .toggle-switch {
    background: #555;
}

.set-theme--dark .code-conversion-toggle.enabled .toggle-switch {
    background: #2196f3;
}

/* Keep the app container as is, but add wrapper for split view */
.chat-code-wrapper {
    display: flex !important;
    height: 100vh;
    overflow: hidden;
    flex: 1;
}

/* Left panel - Chat area (the main content, not sidebar) */
.chat-code-wrapper > .chat-wrapper {
    flex: 1;
    min-width: 400px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e0e0e0;
    overflow-y: auto;
}

/* When code panel is closed, chat takes full width */
.chat-code-wrapper:not(.code-panel-open) > .chat-wrapper {
    max-width: 100%;
    flex: 1;
}

/* When code panel is open, chat takes 60% */
.chat-code-wrapper.code-panel-open > .chat-wrapper {
    flex: 0 0 60%;
    max-width: 60%;
}

/* Override Duck.ai's centered chat layout to fit in narrower panel */
.chat-wrapper [class*="ChatMessages"],
.chat-wrapper [class*="chat-messages"],
.chat-wrapper main {
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
}

/* Make message containers full width */
.chat-wrapper [class*="Message"],
.chat-wrapper [class*="message"] {
    max-width: 100% !important;
}

/* Right panel - Code preview */
.code-panel {
    flex: 0 0 0;
    width: 0;
    display: flex;
    flex-direction: column;
    background: #f8f8f8;
    position: relative;
    overflow: hidden;
}

/* When code panel is open, it takes 40% */
.chat-code-wrapper.code-panel-open .code-panel {
    flex: 0 0 40%;
    width: 40%;
}

/* Code panel header with copy button */
.code-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    background: #fff;
    position: sticky;
    top: 0;
    z-index: 10;
}

.code-panel-filename {
    font-weight: 600;
    font-size: 14px;
    color: #333;
    flex: 1;
}

.code-panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.code-close-button {
    padding: 4px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 18px;
    color: #666;
    transition: all 0.2s !important;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
}

.code-close-button:hover {
    background: #f0f0f0;
    color: #333;
}

.code-copy-button {
    padding: 6px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.code-copy-button:hover {
    background: #f5f5f5;
    border-color: #b0b0b0;
}

.code-copy-button.copied {
    background: #e8f5e9;
    border-color: #4caf50;
    color: #2e7d32;
}

/* Code content area */
.code-panel-content {
    flex: 1;
    overflow: auto;
    padding: 16px;
}

.code-panel-content pre {
    margin: 0;
    padding: 0;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    overflow-x: auto;
    font-family: "JetBrains Mono", "JetBrains Mono Fallback", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    font-size: 13px;
    line-height: 1.6;
    display: flex;
}

.code-line-numbers {
    padding: 8px 0 8px 0;
    text-align: right;
    user-select: none;
    color: #999;
    border-right: 1px solid #e0e0e0;
    background: #fafafa;
    min-width: 50px;
}

.code-line-numbers div {
    line-height: 1.6;
}

.code-content-wrapper {
    flex: 1;
    padding: 8px;
    overflow-x: auto;
    white-space: pre;
}

#code-content pre {
    white-space: pre;
}

#code-content code {
    white-space: pre-wrap;
    display: block;
    line-height: 1.6;
}

.code-panel-content code {
    font-family: "JetBrains Mono", "JetBrains Mono Fallback", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    background: transparent !important;
}

/* File panel in chat - replaces inline code blocks */
.file-panel {
    margin: 8px 0;
    padding: 10px 14px;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 52px;
    max-height: 70px;
    display: flex;
    align-items: center;
}

.file-panel:hover {
    background: #ebebeb;
    border-color: #d0d0d0;
}

.file-panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    width: 100%;
}

.file-icon {
    width: 18px;
    height: 18px;
    opacity: 0.7;
    flex-shrink: 0;
    margin-left: 16px !important;
}

.file-name {
    font-weight: 600;
    color: #333;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 13px;
}

.file-panel .file-view-button {
    padding: 8px 16px;
    background: #fff;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    font-size: 13px;
    color: #555;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    font-weight: 500;
    margin-right: 16px;
}

.file-view-button:hover {
    background: #f5f5f5;
    border-color: #b0b0b0;
}

.file-panel.active {
    background: #e3f2fd;
    border-color: #2196f3;
}

.file-panel.active .file-view-button {
    background: #2196f3;
    color: #fff;
    border-color: #2196f3;
}

/* Empty state for code panel */
.code-panel-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    text-align: center;
    padding: 32px;
}

.code-panel-empty svg {
    width: 64px;
    height: 64px;
    opacity: 0.3;
    margin-bottom: 16px;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
    .chat-code-wrapper {
        flex-direction: column !important;
    }

    .chat-code-wrapper > .chat-wrapper,
    .chat-code-wrapper.code-panel-open > .chat-wrapper {
        max-width: 100%;
        flex: 1;
        min-height: 50vh;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
    }

    .chat-code-wrapper.code-panel-open .code-panel {
        flex: 0 0 50vh;
        width: 100%;
        min-height: 50vh;
    }
}

/* Dark theme support */
.set-theme--dark .chat-wrapper {
    border-right-color: #333;
}

.set-theme--dark .code-panel {
    background: #1a1a1a;
}

.set-theme--dark .code-panel-header {
    background: #242424;
    border-bottom-color: #333;
}

.set-theme--dark .code-panel-filename {
    color: #e0e0e0;
}

.set-theme--dark .code-copy-button {
    background: #2a2a2a;
    border-color: #444;
    color: #e0e0e0;
}

.set-theme--dark .code-copy-button:hover {
    background: #333;
    border-color: #555;
}

.set-theme--dark .code-panel-content pre {
    background: #242424;
    border-color: #333;
    color: #e0e0e0;
}

.set-theme--dark .code-line-numbers {
    background: #1e1e1e;
    border-right-color: #333;
}

.set-theme--dark .file-panel {
    background: #2a2a2a;
    border-color: #333;
}

.set-theme--dark .file-panel:hover {
    background: #333;
    border-color: #444;
}

.set-theme--dark .file-name {
    color: #e0e0e0;
}

.set-theme--dark .file-view-button {
    background: #333;
    border-color: #444;
    color: #aaa;
}

.set-theme--dark .file-panel.active {
    background: #1e3a5f;
    border-color: #2196f3;
}

.set-theme--dark .code-panel-empty {
    color: #666;
}

.set-theme--dark .code-conversion-toggle {
    color: var(--sds-color-text-01);
}

.set-theme--dark .code-conversion-toggle:hover {
    background-color: var(--theme-col-bg-button-ghostsecondary-hover);
    border-color: var(--theme-col-border-button-ghostsecondary-hover);
}

/* Dark theme: VS Code "Dark Modern"-style colors in code panel */
.set-theme--dark .code-panel-content pre[class*="language-"],
.set-theme--dark .code-panel-content code[class*="language-"],
.set-theme--dark pre.duck-code-block,
.set-theme--dark .duck-code-block code[class*="language-"] {
    background: #1e1e1e !important; /* editor background */
    color: #d4d4d4 !important;      /* editor foreground */
    text-shadow: none !important;
}

/* Make the content wrapper match so gaps/empty areas are the same color */
.set-theme--dark .code-panel-content .code-content-wrapper,
.set-theme--dark .duck-code-block .duck-code-content {
    background: #1e1e1e !important;
}

/* Dark theme: style the header area */
.set-theme--dark .duck-code-block .duck-code-header {
    background: #1e1e1e !important;
    color: #d4d4d4 !important;
}

.set-theme--dark .duck-code-block .duck-code-lang-label {
    color: #d4d4d4 !important;
}

.set-theme--dark .duck-code-block .duck-code-lang-container svg {
    color: #d4d4d4 !important;
}

/* Comments */
.set-theme--dark .code-panel-content .token.comment,
.set-theme--dark .code-panel-content .token.prolog,
.set-theme--dark .code-panel-content .token.doctype,
.set-theme--dark .code-panel-content .token.cdata,
.set-theme--dark .duck-code-block .token.comment,
.set-theme--dark .duck-code-block .token.prolog,
.set-theme--dark .duck-code-block .token.doctype,
.set-theme--dark .duck-code-block .token.cdata {
    color: #6a9955 !important;
}

/* Keywords and control flow */
.set-theme--dark .code-panel-content .token.keyword,
.set-theme--dark .code-panel-content .token.operator,
.set-theme--dark .duck-code-block .token.keyword,
.set-theme--dark .duck-code-block .token.operator {
    color: #c586c0 !important;
}

/* Strings */
.set-theme--dark .code-panel-content .token.string,
.set-theme--dark .code-panel-content .token.char,
.set-theme--dark .code-panel-content .token.attr-value,
.set-theme--dark .code-panel-content .token.builtin,
.set-theme--dark .duck-code-block .token.string,
.set-theme--dark .duck-code-block .token.char,
.set-theme--dark .duck-code-block .token.attr-value,
.set-theme--dark .duck-code-block .token.builtin,
.set-theme--dark .duck-code-block .token.triple-quoted-string,
.set-theme--dark .duck-code-block .token.string-interpolation .token.string {
    color: #ce9178 !important;
}

/* Functions / methods */
.set-theme--dark .code-panel-content .token.function,
.set-theme--dark .code-panel-content .token.method,
.set-theme--dark .duck-code-block .token.function,
.set-theme--dark .duck-code-block .token.method {
    color: #dcdcaa !important;
}

/* Numbers, booleans, constants */
.set-theme--dark .code-panel-content .token.number,
.set-theme--dark .code-panel-content .token.boolean,
.set-theme--dark .code-panel-content .token.constant,
.set-theme--dark .duck-code-block .token.number,
.set-theme--dark .duck-code-block .token.boolean,
.set-theme--dark .duck-code-block .token.constant {
    color: #b5cea8 !important;
}

/* Properties, variables, classes */
.set-theme--dark .code-panel-content .token.property,
.set-theme--dark .code-panel-content .token.class-name,
.set-theme--dark .code-panel-content .token.variable,
.set-theme--dark .duck-code-block .token.property,
.set-theme--dark .duck-code-block .token.class-name,
.set-theme--dark .duck-code-block .token.variable {
    color: #9cdcfe !important;
}

/* Punctuation and symbols */
.set-theme--dark .code-panel-content .token.punctuation,
.set-theme--dark .code-panel-content .token.symbol,
.set-theme--dark .duck-code-block .token.punctuation,
.set-theme--dark .duck-code-block .token.symbol,
.set-theme--dark .duck-code-block .token.interpolation .token.punctuation {
    color: #d4d4d4 !important;
}

/* Override Prism's semi-transparent background on some tokens */
.set-theme--dark .code-panel-content .language-css .token.string,
.set-theme--dark .code-panel-content .style .token.string,
.set-theme--dark .code-panel-content .token.entity,
.set-theme--dark .code-panel-content .token.operator,
.set-theme--dark .code-panel-content .token.url,
.set-theme--dark .duck-code-block .language-css .token.string,
.set-theme--dark .duck-code-block .style .token.string,
.set-theme--dark .duck-code-block .token.entity,
.set-theme--dark .duck-code-block .token.operator,
.set-theme--dark .duck-code-block .token.url {
    background: none !important;
}

/* Dark theme: better contrast for red-ish tokens */
.set-theme--dark .code-panel-content .token.boolean,
.set-theme--dark .code-panel-content .token.constant,
.set-theme--dark .code-panel-content .token.deleted,
.set-theme--dark .code-panel-content .token.number,
.set-theme--dark .code-panel-content .token.property,
.set-theme--dark .code-panel-content .token.symbol,
.set-theme--dark .code-panel-content .token.tag,
.set-theme--dark .duck-code-block .token.boolean,
.set-theme--dark .duck-code-block .token.constant,
.set-theme--dark .duck-code-block .token.deleted,
.set-theme--dark .duck-code-block .token.number,
.set-theme--dark .duck-code-block .token.property,
.set-theme--dark .duck-code-block .token.symbol,
.set-theme--dark .duck-code-block .token.tag {
    color: #f44747 !important; /* VS Code Dark Modern–style red */
}
        `;
        document.head.appendChild(style);
    }

    function injectPrismCSS() {
        const style = document.createElement('style');
        style.textContent = `
/* ==================== PRISM INLINE CSS ==================== */
code[class*=language-],pre[class*=language-]{color:#000;background:0 0;text-shadow:0 1px #fff;font-family:Consolas,Monaco,'Andale Mono','Ubuntu Mono',monospace;font-size:1em;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none}code[class*=language-] ::-moz-selection,code[class*=language-]::-moz-selection,pre[class*=language-] ::-moz-selection,pre[class*=language-]::-moz-selection{text-shadow:none;background:#b3d4fc}code[class*=language-] ::selection,code[class*=language-]::selection,pre[class*=language-] ::selection,pre[class*=language-]::selection{text-shadow:none;background:#b3d4fc}@media print{code[class*=language-],pre[class*=language-]{text-shadow:none}}pre[class*=language-]{padding:1em;margin:.5em 0;overflow:auto}:not(pre)>code[class*=language-],pre[class*=language-]{background:#f5f2f0}:not(pre)>code[class*=language-]{padding:.1em;border-radius:.3em;white-space:normal}.token.cdata,.token.comment,.token.doctype,.token.prolog{color:#708090}.token.punctuation{color:#999}.token.namespace{opacity:.7}.token.boolean,.token.constant,.token.deleted,.token.number,.token.property,.token.symbol,.token.tag{color:#905}.token.attr-name,.token.builtin,.token.char,.token.inserted,.token.selector,.token.string{color:#690}.language-css .token.string,.style .token.string,.token.entity,.token.operator,.token.url{color:#9a6e3a;background:hsla(0,0%,100%,.5)}.token.atrule,.token.attr-value,.token.keyword{color:#07a}.token.class-name,.token.function{color:#dd4a68}.token.important,.token.regex,.token.variable{color:#e90}.token.bold,.token.important{font-weight:700}.token.italic{font-style:italic}.token.entity{cursor:help}
        `;
        document.head.appendChild(style);
    }

    function setupCodePanel() {
        // Wait for the app container to exist and have children
        const checkApp = setInterval(() => {
            const app = document.getElementById('app');
            if (app && app.children.length > 0) {
                clearInterval(checkApp);

                // Find the main content area (not the sidebar)
                // The structure is: #app > [sidebar, main content]
                // We want to wrap the main content and add our code panel
                const mainContent = Array.from(app.children).find(child =>
                    !child.querySelector('[class*="sidebar"]') &&
                    child.offsetWidth > 300
                );

                if (mainContent) {
                    createCodePanel(mainContent);
                } else {
                    // Fallback: wrap everything except first child (sidebar)
                    setTimeout(() => {
                        const children = Array.from(app.children);
                        if (children.length >= 2) {
                            createCodePanel(children[1]);
                        } else if (children.length === 1) {
                            createCodePanel(children[0]);
                        }
                    }, 500);
                }
            }
        }, 100);
    }

    function createCodePanel(mainContent) {
        const app = document.getElementById('app');

        // Create wrapper for split view
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-code-wrapper';

        // Create chat wrapper
        const chatWrapper = document.createElement('div');
        chatWrapper.className = 'chat-wrapper';

        // Move main content into chat wrapper
        app.insertBefore(wrapper, mainContent);
        chatWrapper.appendChild(mainContent);
        wrapper.appendChild(chatWrapper);

        // Create code panel
        const codePanel = document.createElement('div');
        codePanel.className = 'code-panel';
        codePanel.innerHTML = `
            <div class="code-panel-header" id="code-header">
                <span class="code-panel-filename" id="current-filename">No file selected</span>
                <div class="code-panel-actions">
                    <button class="code-copy-button" id="copy-button">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy code
                    </button>
                    <button class="code-close-button" id="close-button" title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="code-panel-content" id="code-content">
                <div class="code-panel-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    <div>Select a file to view code</div>
                </div>
            </div>
        `;

        wrapper.appendChild(codePanel);

        // Initialize code panel manager
        initCodePanelManager();
    }

    function initCodePanelManager() {
        const manager = {
            currentFile: null,
            files: new Map(),
            prismLoaded: false,
            prismLanguages: new Set(['markup', 'css', 'clike', 'javascript']), // Default languages

            setupButtons() {
                const copyBtn = document.getElementById('copy-button');
                const closeBtn = document.getElementById('close-button');

                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        if (this.currentFile) {
                            navigator.clipboard.writeText(this.currentFile.content);
                            copyBtn.classList.add('copied');
                            copyBtn.innerHTML = `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Copied!
                            `;
                            setTimeout(() => {
                                copyBtn.classList.remove('copied');
                                copyBtn.innerHTML = `
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    Copy code
                                `;
                            }, 2000);
                        }
                    });
                }

                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        this.closePanel();
                    });
                }
            },

            closePanel() {
                const wrapper = document.querySelector('.chat-code-wrapper');
                if (wrapper) {
                    wrapper.classList.remove('code-panel-open');
                }
                // Remove active state from all file panels and reset button text
                document.querySelectorAll('.file-panel').forEach(p => {
                    p.classList.remove('active');
                    const btn = p.querySelector('.file-view-button');
                    if (btn) btn.textContent = 'View';
                });
                this.currentFile = null;

                // Restore sidebar if it was open before
                restoreSidebarIfNeeded();
            },

            revertAllFilePanels() {
                // Find all file panels and convert them back to code blocks
                const filePanels = document.querySelectorAll('.file-panel');

                filePanels.forEach(panel => {
                    // Get the file data from our map
                    const fileData = Array.from(this.files.values()).find(f => f.element === panel);

                    if (fileData) {
                        // Determine language from extension
                        const ext = fileData.filename.split('.').pop().toLowerCase();
                        const langMap = {
                            'js': 'javascript',
                            'ts': 'typescript',
                            'py': 'python',
                            'html': 'html',
                            'css': 'css',
                            'json': 'json',
                            'jsx': 'jsx',
                            'tsx': 'tsx',
                            'java': 'java',
                            'cpp': 'cpp',
                            'c': 'c',
                            'cs': 'csharp',
                            'rb': 'ruby',
                            'go': 'go',
                            'rs': 'rust',
                            'php': 'php',
                            'xml': 'xml',
                            'yml': 'yaml',
                            'yaml': 'yaml',
                            'md': 'markdown',
                            'sh': 'bash',
                            'sql': 'sql'
                        };

                        const language = langMap[ext] || 'python';

                        // Create the Duck.ai-style code block structure
                        const pre = document.createElement('pre');
                        pre.className = 'duck-code-block';

                        // Header
                        const header = document.createElement('div');
                        header.className = 'duck-code-header';

                        // Language container
                        const langContainer = document.createElement('div');
                        langContainer.className = 'duck-code-lang-container';

                        const icon = document.createElement('i');
                        icon.innerHTML = '<svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M15.434 7.51c.137.137.212.311.212.49a.694.694 0 0 1-.212.5l-3.54 3.5a.893.893 0 0 1-.277.18 1.024 1.024 0 0 1-.684.038.945.945 0 0 1-.302-.148.787.787 0 0 1-.213-.234.652.652 0 0 1-.045-.58.74.74 0 0 1 .175-.256l3.045-3-3.045-3a.69.69 0 0 1-.22-.55.723.723 0 0 1 .303-.52 1 1 0 0 1 .648-.186.962.962 0 0 1 .614.256l3.541 3.51Zm-12.281 0A.695.695 0 0 0 2.94 8a.694.694 0 0 0 .213.5l3.54 3.5a.893.893 0 0 0 .277.18 1.024 1.024 0 0 0 .684.038.945.945 0 0 0 .302-.148.788.788 0 0 0 .213-.234.651.651 0 0 0 .045-.58.74.74 0 0 0-.175-.256L4.994 8l3.045-3a.69.69 0 0 0 .22-.55.723.723 0 0 0-.303-.52 1 1 0 0 0-.648-.186.962.962 0 0 0-.615.256l-3.54 3.51Z"></path></svg>';

                        const langLabel = document.createElement('p');
                        langLabel.className = 'duck-code-lang-label';
                        langLabel.textContent = language;

                        langContainer.appendChild(icon);
                        langContainer.appendChild(langLabel);

                        header.appendChild(langContainer);

                        /* Can't work due to needing to be event bound to duck.ai events, so just hide it
                        // Button container
                        const buttonContainer = document.createElement('div');
                        buttonContainer.className = 'duck-code-button-container';

                        const copyButton = document.createElement('button');
                        copyButton.type = 'button';
                        copyButton.className = 'duck-code-copy-btn';
                        copyButton.setAttribute('data-copycode', 'true');
                        copyButton.setAttribute('aria-label', 'Copy Code');
                        copyButton.innerHTML = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M9.975 1h.09a3.2 3.2 0 0 1 3.202 3.201v1.924a.754.754 0 0 1-.017.16l1.23 1.353A2 2 0 0 1 15 8.983V14a2 2 0 0 1-2 2H8a2 2 0 0 1-1.733-1H4.183a3.201 3.201 0 0 1-3.2-3.201V4.201a3.2 3.2 0 0 1 3.04-3.197A1.25 1.25 0 0 1 5.25 0h3.5c.604 0 1.109.43 1.225 1ZM4.249 2.5h-.066a1.7 1.7 0 0 0-1.7 1.701v7.598c0 .94.761 1.701 1.7 1.701H6V7a2 2 0 0 1 2-2h3.197c.195 0 .387.028.57.083v-.882A1.7 1.7 0 0 0 10.066 2.5H9.75c-.228.304-.591.5-1 .5h-3.5c-.41 0-.772-.196-1-.5ZM5 1.75v-.5A.25.25 0 0 1 5.25 1h3.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-3.5A.25.25 0 0 1 5 1.75ZM7.5 7a.5.5 0 0 1 .5-.5h3V9a1 1 0 0 0 1 1h1.5v4a.5.5 0 0 1-.5.5H8a.5.5 0 0 1-.5-.5V7Zm6 2v-.017a.5.5 0 0 0-.13-.336L12 7.14V9h1.5Z"></path></svg>Copy Code';

                        const copiedButton = document.createElement('button');
                        copiedButton.type = 'button';
                        copiedButton.className = 'duck-code-copied-btn';
                        copiedButton.innerHTML = '<svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M20.618 4.214a1 1 0 0 1 .168 1.404l-11 14a1 1 0 0 1-1.554.022l-5-6a1 1 0 0 1 1.536-1.28l4.21 5.05L19.213 4.382a1 1 0 0 1 1.404-.168Z" clip-rule="evenodd"></path></svg>Copied';

                        buttonContainer.appendChild(copyButton);
                        buttonContainer.appendChild(copiedButton);

                        header.appendChild(buttonContainer);
                        */

                        // Code content
                        const codeContainer = document.createElement('div');
                        codeContainer.className = 'duck-code-content';

                        const code = document.createElement('code');
                        code.className = `language-${language}`;
                        code.textContent = fileData.content;

                        codeContainer.appendChild(code);

                        // Assemble
                        pre.appendChild(header);
                        pre.appendChild(codeContainer);

                        // Replace the file panel with the pre element
                        const parent = panel.parentNode;
                        parent.replaceChild(pre, panel);

                        // Apply Prism syntax highlighting if available
                        if (window.Prism && Prism.languages[language]) {
                            Prism.highlightElement(code);
                        }
                    }
                });

                // Clear the files map since we've reverted everything
                this.files.clear();
            },

            observeChatForCode() {
                const target = document.querySelector('.chat-wrapper');
                if (!target) return;

                // timestamps on existing assistant messages
                scheduleTimestamps(target);

                const observer = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        for (const node of m.addedNodes) {
                            if (node.nodeType !== 1) continue;

                            // If the node itself is a <pre>
                            if (node.tagName === 'PRE') {
                                this.convertCodeBlocks(node.parentNode);
                            } else {
                                this.convertCodeBlocks(node);
                            }

                            // timestamps on any new assistant messages
                            scheduleTimestamps(target);
                        }
                    }
                });

                observer.observe(target, {
                    childList: true,
                    subtree: true
                });
            },

            async convertCodeBlocks(element) {
                // Check if code conversion is enabled
                if (!codeConversionEnabled) {
                    return;
                }

                // Configuration: minimum lines required to convert to file panel
                const MIN_LINES_FOR_FILE_PANEL = 5;

                // Find all code blocks that haven't been converted
                const codeBlocks = element.querySelectorAll('pre:not(.file-panel-converted)');

                for (const block of codeBlocks) {
                    // Mark as converted
                    block.classList.add('file-panel-converted');

                    const codeElement = block.querySelector('code') || block;
                    const code = codeElement.textContent;

                    if (!code.trim()) continue;

                    // Count non-empty lines
                    const lines = code.split('\n').filter(line => line.trim().length > 0);

                    // Skip conversion if below minimum line threshold
                    if (lines.length <= MIN_LINES_FOR_FILE_PANEL) {
                        continue;
                    }

                    let filename = 'code.txt';
                    let detectedLang = '';

                    // Wait for language detection
                    detectedLang = await new Promise((resolve) => {
                        let tries = 0;
                        const iv = setInterval(() => {
                            const lang = findLang(block);
                            if (lang || tries++ > 10) {
                                clearInterval(iv);
                                resolve(lang || '');
                            }
                        }, 100);
                    });

                    // Fallback: class-based detection
                    if (!detectedLang) {
                        const className = codeElement.className;
                        if (className.includes('language-')) {
                            const lang = className.match(/language-(\w+)/)?.[1];
                            if (lang) detectedLang = lang;
                        }
                    }

                    // Determine file extension
                    const ext = getExtensionFromLanguage(detectedLang);
                    filename = `code.${ext}`;

                    // Create and replace with file panel
                    const filePanel = this.createFilePanel(filename, code);
                    block.parentNode.replaceChild(filePanel, block);
                }
            },

            createFilePanel(filename, content) {
                const panel = document.createElement('div');
                panel.className = 'file-panel';
                panel.innerHTML = `
                    <div class="file-panel-header">
                        <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        <span class="file-name">${escapeHtml(filename)}</span>
                        <button class="file-view-button">View</button>
                    </div>
                `;

                // Store file data
                const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                this.files.set(fileId, { filename, content, element: panel });

                // Add click handler
                panel.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showFile(fileId);
                });

                return panel;
            },

            showFile(fileId) {
                const file = this.files.get(fileId);
                if (!file) return;

                // Check if clicking on already active panel
                const isAlreadyActive = file.element.classList.contains('active');

                if (isAlreadyActive) {
                    // Close the panel if it's already active
                    this.closePanel();
                    return;
                }

                // Check if code panel is currently closed (before opening)
                const wrapper = document.querySelector('.chat-code-wrapper');
                const codePanelWasClosed = wrapper && !wrapper.classList.contains('code-panel-open');

                // Only collapse sidebar if we're opening the code panel for the first time
                if (codePanelWasClosed) {
                    collapseSidebarIfNeeded();
                }

                // Update active state
                document.querySelectorAll('.file-panel').forEach(p => {
                    p.classList.remove('active');
                    // Reset all "View" buttons
                    const btn = p.querySelector('.file-view-button');
                    if (btn) btn.textContent = 'View';
                });
                file.element.classList.add('active');

                // Update button text to "Close"
                const activeBtn = file.element.querySelector('.file-view-button');
                if (activeBtn) activeBtn.textContent = 'Close';

                // Show code panel by adding class to wrapper
                if (wrapper) {
                    wrapper.classList.add('code-panel-open');
                }

                // Update code panel
                this.currentFile = file;
                document.getElementById('current-filename').textContent = file.filename;

                const codeContent = document.getElementById('code-content');
                const lines = file.content.split('\n');
                const lineNumbers = lines.map((_, i) => `<div>${i + 1}</div>`).join('');

                codeContent.innerHTML = `
                    <pre><div class="code-line-numbers">${lineNumbers}</div><div class="code-content-wrapper"><code>${escapeHtml(file.content)}</code></div></pre>
                `;

                // Apply syntax highlighting
                this.applySyntaxHighlighting(file.filename);
            },

            applySyntaxHighlighting(filename) {
                const codeElement = document.querySelector('#code-content code');
                if (!codeElement) return;

                // Determine language from extension
                const ext = filename.split('.').pop().toLowerCase();
                const langMap = {
                    'js': 'javascript',
                    'ts': 'typescript',
                    'py': 'python',
                    'html': 'markup',
                    'css': 'css',
                    'json': 'json',
                    'jsx': 'jsx',
                    'tsx': 'tsx',
                    'java': 'java',
                    'cpp': 'cpp',
                    'c': 'c',
                    'cs': 'csharp',
                    'rb': 'ruby',
                    'go': 'go',
                    'rs': 'rust',
                    'php': 'php',
                    'xml': 'markup',
                    'yml': 'yaml',
                    'yaml': 'yaml',
                    'md': 'markdown',
                    'sh': 'bash',
                    'sql': 'sql'
                };

                const language = langMap[ext] || 'javascript';

                // Add language class
                codeElement.className = `language-${language}`;

                // Highlight with Prism
                this.highlightCode(language, codeElement);
            },

            highlightCode(language, codeElement) {
                if (!Prism) return;
                if (!Prism.languages[language]) {
                    console.warn(`Prism language "${language}" not loaded`);
                    return;
                }
                codeElement.className = `language-${language}`;
                Prism.highlightElement(codeElement);
            }
        };

        // Helper function to find code block lang defined by duck.ai
        function findLang(pre) {
            const header = pre.firstElementChild;
            const p = header?.querySelector('p');
            return p?.textContent.trim().toLowerCase();
        }

        // Helper function to escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Helper function to get file extension from language
        function getExtensionFromLanguage(lang) {
            const extensions = {
                'javascript': 'js',
                'typescript': 'ts',
                'python': 'py',
                'java': 'java',
                'cpp': 'cpp',
                'c': 'c',
                'csharp': 'cs',
                'ruby': 'rb',
                'go': 'go',
                'rust': 'rs',
                'php': 'php',
                'html': 'html',
                'css': 'css',
                'json': 'json',
                'xml': 'xml',
                'yaml': 'yml',
                'markdown': 'md',
                'bash': 'sh',
                'shell': 'sh',
                'sql': 'sql',
                'jsx': 'jsx',
                'tsx': 'tsx'
            };
            return extensions[lang] || 'txt';
        }

        // Initialize
        manager.setupButtons();
        manager.observeChatForCode();

        // Also scan existing content
        setTimeout(() => {
            const chatWrapper = document.querySelector('.chat-wrapper');
            if (chatWrapper) {
                manager.convertCodeBlocks(chatWrapper);
            }
        }, 1000);

        // Make manager accessible globally for toggle button
        window.codeManager = manager;
    }
})();
