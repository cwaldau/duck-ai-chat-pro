# duck-ai-chat-pro
Adds Claude-style split-view code panels to duck.ai (and maybe other future enhancements)

### Features
- Pro
    - Split-view Claude-style code panels, with ability to toggle on and off in sidebar
    - full dark mode compatibility
    - message timestamps
    - Updated to use new IndexedDB instead of localStorage
    - in progress: down arrow above message input field to scroll to bottom of chat
    - in progress: export copy of all messages (with ability to reimport / merge)
- Search
    - Forked from https://github.com/Hakorr/Userscripts/tree/main/Duck.ai/SearchMessages
    - Updated styles to be more in line with duck.ai defaults
    - Fixed centering of search button to be centered on content panel instead of entire viewport
    - Add spacing at top of messages so they start below the search button and can be viewed without being blocked
    - Updated to use new IndexedDB instead of localStorage

### TODO
- Pro
    - small scroll to bottom arrow like chatgpt has
    - line counts in code panel are counting line-wraps
    - add way to backup messages + import messages (with smart merge)
        - stores 30 messages at a time, kicks last one out. Maybe also a way to keep more or a way to paginate or something?
    - convert prompted/sent code blocks (encased with 3 backticks) to file panels (attempted, seemingly difficult)
        - difficulty lay with identifying user messages vs ai message but the savedAIChats data in localstorage identifies messages with role:user or role:assistant, maybe this could be used?
        - also the user message will always be the direct-above sibling of the assistant message (which always has an assistant-message id on it)
    - always open chat scrolled to bottom (meh; maybe with future preferences toggles)
    - always have sidebar opened on intial page load (meh; maybe with future preferences toggles)
- Search
    - 

<img width="1919" height="1104" alt="duck-ai-chat-pro-screenshot" src="https://github.com/user-attachments/assets/935a90da-dba2-4d12-b181-6fb5bc5a28e0" />
