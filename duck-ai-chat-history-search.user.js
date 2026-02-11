// ==UserScript==
// @name        Duck.ai Chat History Search
// @description Adds a chat search to Duck.ai to search messages in your conversation history.
// @author      Christopher Waldau
// @license     GNU GPLv3
// @downloadURL https://github.com/cwaldau/duck-ai-chat-pro/raw/refs/heads/main/duck-ai-chat-history-search.user.js
// @updateURL   https://github.com/cwaldau/duck-ai-chat-pro/raw/refs/heads/main/duck-ai-chat-history-search.user.js
// @require     https://cdn.jsdelivr.net/npm/fuse.js@7.1.0
// @match       https://duck.ai/*
// @run-at      document-load
// @grant       GM_addStyle
// @namespace   http://tampermonkey.net/
// @version     1.3
// @icon        https://duck.ai/favicon.ico
// ==/UserScript==

const fuseOptions = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.2,
    ignoreLocation: true,
    distance: Infinity,
    keys: [
        'title',
        'messages.content',
        'messages.parts.text'
    ],
};

function truncate(str, maxLength, fromStart = false) {
    if(str.length <= maxLength) return str;

    if(fromStart) {
        return '...' + str.slice(str.length - maxLength + 3);
    } else {
        return str.slice(0, maxLength - 3) + '...';
    }
}

function getStoredChats() {
    try {
        return JSON.parse(localStorage.savedAIChats).chats;
    } catch {}

    return null;
}

if(!getStoredChats()) return;

const searchBarElem = document.createElement('input');
      searchBarElem.type = 'text';
      searchBarElem.placeholder = 'Search for messages...';
      searchBarElem.onchange = search;
      searchBarElem.name = 'dsu-search';

const containerElem = document.createElement('dialog');
      containerElem.id = 'DuckSearchUserscript';
      containerElem.innerHTML = `<div class="dsu-result-container"></div>`;
      containerElem.prepend(searchBarElem);
      containerElem.addEventListener('click', (event) => {
          if(event.target === containerElem) {
              containerElem.close();
          }
      });

const resultContainer = containerElem.querySelector('.dsu-result-container');
const openBtn = document.createElement('div');
      openBtn.id = 'dsu-open-btn';
      openBtn.innerText = 'Search...';
      openBtn.onclick = () => containerElem.showModal();

document.body.appendChild(containerElem);

waitForElement('main section:nth-of-type(2)').then(secondMainSection => {
  secondMainSection.style.position = secondMainSection.style.position || 'relative';
  secondMainSection.appendChild(openBtn);
});

function getChatElemByTitle(title) {
    const divs = document.querySelectorAll('div[title]');

    for(const div of divs) {
        if(div.title.includes(title)) {
            return div;
        }
    }

    return null;
}

function getMessageElem(chatId, i = 0, isUser = false) {
    const index = isUser ? Math.floor(i / 2) : i;

    const id = `${chatId}-assistant-message-${index}-1`;
    const elem = document.querySelector(`section [id="${id}"]`);

    return isUser ? elem?.parentElement?.querySelector('div') : elem;
}

function createResultElem(result) {
    const { item, matches } = result;
    const { title, chatId } = item;
    const messages = item.messages;

    const resultElem = document.createElement('div');
          resultElem.classList.add('dsu-result');
          resultElem.innerHTML = `
              <div class="dsu-result-title"></div>
              <div class="dsu-result-match-container"></div>
          `;

    const resultTitleElem = resultElem.querySelector('.dsu-result-title');
    const matchContainerElem = resultElem.querySelector('.dsu-result-match-container');
    const truncatedTitle = truncate(item.title, 60).replaceAll('\n', ' ');

    resultTitleElem.innerText = `Chat | ${truncatedTitle}`;

    matches.forEach(match => {
        const { key, value, indices, refIndex } = match;
        const isTitle = key === 'title';
        const isUser = key === 'messages.content';
        const isAI = key === 'messages.parts.text';

        const tag = isTitle ? 'title' : 'message';

        const fancyTag = isTitle
          ? tag
          : `${tag}${isUser ? ' | You' : isAI ? ' | AI' : ''}`;

        const matchElem = document.createElement('div');
              matchElem.classList.add('dsu-match');
              matchElem.classList.add(tag);
              matchElem.innerHTML = `
                  <div class="dsu-match-tag"></div>
                  <div class="dsu-match-text"></div>
              `;

        // When match elem is clicked, open the chat and highlight the message the match is from
        matchElem.onclick = () => {
            containerElem.close();

            const chatElem = getChatElemByTitle(title);

            chatElem?.click();

            setTimeout(() => {
                const messageElem = getMessageElem(chatId, refIndex, isUser);

                messageElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                messageElem.classList.add('dsu-highlight');

                setTimeout(() => messageElem.classList.remove('dsu-highlight'), 5000);
            }, 250);
        };

        const matchTagElem = matchElem.querySelector('.dsu-match-tag');
        const matchTextElem = matchElem.querySelector('.dsu-match-text');
              matchTagElem.classList.add(tag);
              matchTagElem.textContent = fancyTag;

        let lastIndex = 0;

        for(const [start, end] of indices) {
            if(start > lastIndex) {
                let beforeText = value.slice(lastIndex, start);
                matchTextElem.appendChild(document.createTextNode(beforeText));
            }

            const mark = document.createElement('mark');
            mark.textContent = value.slice(start, end + 1);
            matchTextElem.appendChild(mark);

            lastIndex = end + 1;
        }

        if(lastIndex < value.length) {
            let afterText = value.slice(lastIndex);
            matchTextElem.appendChild(document.createTextNode(afterText));
        }


        matchContainerElem.appendChild(matchElem);
    });

    return resultElem;
}

function render(results) {
    resultContainer.innerHTML = '';

    results.forEach(x => {
        const elem = createResultElem(x);
        resultContainer.appendChild(elem);
    });

    if(!results || results?.length === 0) {
        const noResultsText = document.createElement('div');
              noResultsText.classList.add('dsu-no-match-text');
              noResultsText.innerText = 'The search yielded no results. (╥﹏╥)';

        resultContainer.appendChild(noResultsText);
    }
}

function search(e) {
    const query = e?.target?.value?.toLowerCase();

    if(query?.length === 0) {
        resultContainer.innerHTML = '';
        return;
    }

    const chats = getStoredChats();
    const results = new Fuse(chats, { ...fuseOptions, 'minMatchCharLength':  query.length })
                        .search(query);

    render(results);
}

function waitForElement(selector) {
  return new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  });
}

GM_addStyle(`
/* Make space for the search bubble at the top without blocking the first message */
body > div > div > div > main > section:nth-of-type(2) > div:nth-of-type(3) > div:first-of-type {
  padding-top: 60px !important;
}
/* Light theme (default) */
#DuckSearchUserscript {
    height: fit-content;
    border: 1px solid rgba(0, 0, 0, 0.1);
    width: 90%;
    max-width: 800px;
    max-height: 90%;
    background: var(--color-surface-primary, #ffffff);
    color: var(--color-text-primary, #333333);
    border-bottom-width: 2px;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    position: relative;
}

#DuckSearchUserscript::backdrop {
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
}

#DuckSearchUserscript input {
    font-size: 16px;
    width: 100%;
    padding: 12px 16px;
    box-sizing: border-box;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: var(--color-surface-secondary, #f7f7f7);
    color: var(--color-text-primary, #333333);
    outline: none;
    transition: border-color 0.2s ease;
}

#DuckSearchUserscript input:focus {
    border-color: var(--color-accent, #4495d4);
}

.dsu-result {
    width: 100%;
    height: fit-content;
    padding: 16px;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.dsu-result:last-child {
    border-bottom: none;
}

.dsu-result-match-container {
    background: var(--color-surface-secondary, #f7f7f7);
    padding: 16px;
    border-radius: 6px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    border: 1px solid rgba(0, 0, 0, 0.06);
}

.dsu-match {
    background: #ffffff;
    padding: 12px;
    border-radius: 6px;
    position: relative;
    padding-top: 28px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    width: fit-content;
    transition: all 0.2s ease;
    cursor: pointer;
    user-select: none;
    width: 100%;
    box-sizing: border-box;
}

.dsu-result:first-of-type {
    margin-top: 12px;
}

.dsu-match.title {
    background: #f0f7ff;
    border-color: rgba(68, 149, 212, 0.2);
}

.dsu-match-tag.title {
    background: var(--color-accent, #4495d4);
    color: white;
}

.dsu-match:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dsu-match:active {
    transform: translateY(0);
}

.dsu-match-tag {
    text-transform: capitalize;
    font-weight: 600;
    font-size: 12px;
    position: absolute;
    top: -8px;
    left: 8px;
    background: #666666;
    color: white;
    border-radius: 12px;
    padding: 2px 10px;
    white-space: nowrap;
}

.dsu-match-text {
    font-weight: 400;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-primary, #333333);
}

.dsu-match-text mark {
    font-weight: 700;
    background-color: #ffeb3b;
    color: #000000;
    padding: 2px 0;
    border-radius: 2px;
}

.title .dsu-match-text mark {
    background-color: #b3d9ff;
}

.dsu-result-container {
    max-height: 80vh;
    overflow: hidden;
    overflow-y: auto;
    margin-top: 8px;
}

.dsu-result-title {
    font-weight: 600;
    font-size: 16px;
    border-bottom: 2px solid rgba(0, 0, 0, 0.1);
    margin-bottom: 12px;
    padding-bottom: 8px;
    color: var(--color-text-primary, #333333);
}

.dsu-no-match-text {
    padding: 32px;
    font-weight: 500;
    font-size: 14px;
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
    border-radius: 6px;
    text-align: center;
}

#dsu-open-btn {
    width: fit-content;
    height: fit-content;
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface-primary, #ffffff);
    color: var(--color-text-secondary, #666666);
    padding: 8px 24px;
    border-radius: 20px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

#dsu-open-btn:hover {
    background: var(--color-surface-secondary, #f7f7f7);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dsu-highlight {
    transition: all 0.5s ease;
    background-color: rgba(68, 149, 212, 0.2) !important;
    box-shadow: 0 0 20px rgba(68, 149, 212, 0.4);
    border-radius: 6px;
}

/* Dark theme */
.set-theme--dark #DuckSearchUserscript {
    background: var(--color-surface-primary, #1a1a1a);
    color: var(--color-text-primary, #e8e8e8);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

.set-theme--dark #DuckSearchUserscript::backdrop {
    background: rgba(0, 0, 0, 0.6);
}

.set-theme--dark #DuckSearchUserscript input {
    background: var(--color-surface-secondary, #2a2a2a);
    color: var(--color-text-primary, #e8e8e8);
    border-color: rgba(255, 255, 255, 0.1);
}

.set-theme--dark #DuckSearchUserscript input:focus {
    border-color: var(--color-accent, #5dade2);
}

.set-theme--dark .dsu-result {
    border-bottom-color: rgba(255, 255, 255, 0.08);
}

.set-theme--dark .dsu-result-match-container {
    background: var(--color-surface-secondary, #2a2a2a);
    border-color: rgba(255, 255, 255, 0.06);
}

.set-theme--dark .dsu-match {
    background: #333333;
    border-color: rgba(255, 255, 255, 0.1);
}

.set-theme--dark .dsu-match.title {
    background: #1e3a52;
    border-color: rgba(93, 173, 226, 0.3);
}

.set-theme--dark .dsu-match-tag.title {
    background: var(--color-accent, #5dade2);
}

.set-theme--dark .dsu-match:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.set-theme--dark .dsu-match-tag {
    background: #555555;
}

.set-theme--dark .dsu-match-text {
    color: var(--color-text-primary, #e8e8e8);
}

.set-theme--dark .dsu-match-text mark {
    background-color: #ffd54f;
    color: #000000;
}

.set-theme--dark .title .dsu-match-text mark {
    background-color: #5dade2;
}

.set-theme--dark .dsu-result-title {
    color: var(--color-text-primary, #e8e8e8);
    border-bottom-color: rgba(255, 255, 255, 0.1);
}

.set-theme--dark .dsu-no-match-text {
    background: #3d2a1f;
    color: #ffb74d;
    border-color: #5d4037;
}

.set-theme--dark #dsu-open-btn {
    background: var(--color-surface-primary, #1a1a1a);
    color: var(--color-text-secondary, #999999);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.set-theme--dark #dsu-open-btn:hover {
    background: var(--color-surface-secondary, #2a2a2a);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.set-theme--dark .dsu-highlight {
    background-color: rgba(93, 173, 226, 0.3) !important;
    box-shadow: 0 0 20px rgba(93, 173, 226, 0.5);
}
`);
