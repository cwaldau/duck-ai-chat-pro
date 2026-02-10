// ==UserScript==
// @name         Duck.ai Chat Pro
// @namespace    http://tampermonkey.net/
// @version      1.3
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
    }

    // Sidebar management
    let sidebarWasCollapsed = false;

    function getSidebar() {
        // Find the sidebar - it contains the chat list and settings
        return document.querySelector('section.kc6VuoBdpB9ul8xqj6kl');
    }

    function getSidebarToggle() {
        // Find the sidebar toggle button
        return document.querySelector('button[aria-label*="sidebar"]');
    }

    function isSidebarCollapsed() {
        const sidebar = getSidebar();
        if (!sidebar) return false;
        // Check if sidebar is hidden or has minimal width
        return sidebar.offsetWidth < 100 || sidebar.style.display === 'none';
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

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* ==================== CLAUDE-STYLE CODE OUTPUT STYLES ==================== */

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
    padding-left: 16px !important;
    padding-right: 16px !important;
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

/* Dark theme: VS Code "Dark Modern"-style colors in code panel */
.set-theme--dark .code-panel-content pre[class*="language-"],
.set-theme--dark .code-panel-content code[class*="language-"] {
    background: #1e1e1e !important; /* editor background */
    color: #d4d4d4 !important;      /* editor foreground */
    text-shadow: none !important;
}

/* Make the content wrapper match so gaps/empty areas are the same color */
.set-theme--dark .code-panel-content .code-content-wrapper {
    background: #1e1e1e !important;
}

/* Comments */
.set-theme--dark .code-panel-content .token.comment,
.set-theme--dark .code-panel-content .token.prolog,
.set-theme--dark .code-panel-content .token.doctype,
.set-theme--dark .code-panel-content .token.cdata {
    color: #6a9955 !important;
}

/* Keywords and control flow */
.set-theme--dark .code-panel-content .token.keyword,
.set-theme--dark .code-panel-content .token.operator {
    color: #c586c0 !important;
}

/* Strings */
.set-theme--dark .code-panel-content .token.string,
.set-theme--dark .code-panel-content .token.char,
.set-theme--dark .code-panel-content .token.attr-value,
.set-theme--dark .code-panel-content .token.builtin {
    color: #ce9178 !important;
}

/* Functions / methods */
.set-theme--dark .code-panel-content .token.function,
.set-theme--dark .code-panel-content .token.method {
    color: #dcdcaa !important;
}

/* Numbers, booleans, constants */
.set-theme--dark .code-panel-content .token.number,
.set-theme--dark .code-panel-content .token.boolean,
.set-theme--dark .code-panel-content .token.constant {
    color: #b5cea8 !important;
}

/* Properties, variables, classes */
.set-theme--dark .code-panel-content .token.property,
.set-theme--dark .code-panel-content .token.class-name,
.set-theme--dark .code-panel-content .token.variable {
    color: #9cdcfe !important;
}

/* Punctuation and symbols */
.set-theme--dark .code-panel-content .token.punctuation,
.set-theme--dark .code-panel-content .token.symbol {
    color: #d4d4d4 !important;
}

/* Override Prism's semi-transparent background on some tokens */
.set-theme--dark .code-panel-content .language-css .token.string,
.set-theme--dark .code-panel-content .style .token.string,
.set-theme--dark .code-panel-content .token.entity,
.set-theme--dark .code-panel-content .token.operator,
.set-theme--dark .code-panel-content .token.url {
    background: none !important;
}

/* Dark theme: better contrast for red-ish tokens */
.set-theme--dark .code-panel-content .token.boolean,
.set-theme--dark .code-panel-content .token.constant,
.set-theme--dark .code-panel-content .token.deleted,
.set-theme--dark .code-panel-content .token.number,
.set-theme--dark .code-panel-content .token.property,
.set-theme--dark .code-panel-content .token.symbol,
.set-theme--dark .code-panel-content .token.tag {
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
                // Remove active state from all file panels
                document.querySelectorAll('.file-panel').forEach(p => p.classList.remove('active'));
                this.currentFile = null;

                // Restore sidebar if it was open before
                restoreSidebarIfNeeded();
            },

            observeChatForCode() {
                const target = document.querySelector('.chat-wrapper');
                if (!target) return;


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
                        }
                    }
                });

                observer.observe(target, {
                    childList: true,
                    subtree: true
                });
            },

            async convertCodeBlocks(element) {
                // Find all code blocks that haven't been converted
                const codeBlocks = element.querySelectorAll('pre:not(.file-panel-converted)');

                for (const block of codeBlocks) {
                    // Mark as converted
                    block.classList.add('file-panel-converted');

                    const codeElement = block.querySelector('code') || block;
                    const code = codeElement.textContent;

                    if (!code.trim()) continue;

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

                // Collapse sidebar when opening code panel
                collapseSidebarIfNeeded();

                // Update active state
                document.querySelectorAll('.file-panel').forEach(p => p.classList.remove('active'));
                file.element.classList.add('active');

                // Show code panel by adding class to wrapper
                const wrapper = document.querySelector('.chat-code-wrapper');
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
    }
})();
