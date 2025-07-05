/**
 * @name MSN Chat Plugin
 * @version 0.0.1
 * @description A replica of MSN chat for Discord using BetterDiscord.
 */

const MSN_CHAT_MEMBER_LIST_ID = 'msn-chat-member-list';
const MSN_CHAT_MEMBER_COUNT_TEXT_ID = 'msn-chat-member-count-text';
const MSN_CHAT_CHANNEL_HEADER_CONTAINER_ID = 'msn-chat-channel-header-container';
const MSN_CHAT_CHANNEL_TEXT_ID = 'msn-chat-channel-text';
const MSN_CHAT_USERNAME_HEADER_ID = 'msn-chat-username-header';
const MSN_CHAT_ROOT_STYLE = 'msn-chat-bg-style';

module.exports = class BasicPlugin {

  getChannelName() {
    const headerElements = [...document.querySelectorAll('h1')].find(el => 
      Array.from(el.classList).some(c => c.startsWith('title__'))
    );

    if (!headerElements) return 'Unknown';

    const parts = headerElements.textContent.split(':');
    if (!parts[1]) return 'Unknown';

    const secondToken = parts[1].trim();
    const tokens = secondToken.split('︱').map(t => t.trim());

    if (!tokens[1]) return 'Unknown';

    const formatted = tokens[1]
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return formatted || 'Unknown';
  }

  createChannelNameheader(memberList, displayableMemberCount) {
    if (!document.getElementById(MSN_CHAT_CHANNEL_HEADER_CONTAINER_ID)) {
      const box         = document.createElement('div');
      box.id            = MSN_CHAT_CHANNEL_HEADER_CONTAINER_ID;
      box.style.cssText = `
        background-color: #a4b2cd;
        position: sticky;
        top: 0;
        z-index: 10;
      `;

      memberList.parentElement.prepend(box);

      const channel                     = document.createElement('div');
      channel.id                        = MSN_CHAT_CHANNEL_TEXT_ID
      channel.style.textAlign           = 'left';
      channel.style.fontFamily          = 'sans-serif, Tahoma';
      channel.style.fontSize            = '24px';
      channel.style.paddingTop          = '6px';
      channel.style.paddingLeft         = '14px';
      channel.style.paddingBottom       = '8px';
      channel.style.color               = '#fcfce6';
      channel.style.backgroundImage     = "url('data:image/png;base64,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')";
      channel.style.backgroundRepeat    = 'no-repeat';
      channel.style.backgroundPosition  = 'right 4px top 4px';
      channel.style.backgroundSize      = '38px auto';

      const memberCount                 = document.createElement('div');
      memberCount.id                    = MSN_CHAT_MEMBER_COUNT_TEXT_ID;
      memberCount.style.textAlign       = 'left';
      memberCount.style.fontFamily      = 'Tahoma, sans-serif';
      memberCount.style.fontSize        = '14px';
      memberCount.style.paddingBottom   = '8px';
      memberCount.style.paddingLeft     = '14px';

      box.appendChild(channel);
      box.appendChild(memberCount);
    }

    var memberCount = document.getElementById(MSN_CHAT_MEMBER_COUNT_TEXT_ID);
    if (memberCount) {
      memberCount.textContent = displayableMemberCount + ' people chatting';
    }

    var channelName = document.getElementById(MSN_CHAT_CHANNEL_TEXT_ID);
    if (channelName) {
      channelName.textContent = this.getChannelName();
    }
  }

  createUserNameHeader(memberList) {
    if (!document.getElementById(MSN_CHAT_USERNAME_HEADER_ID)) {
      const box         = document.createElement('div');
      box.id            = MSN_CHAT_USERNAME_HEADER_ID;
      box.style.cssText = `
        background-color: #eeeff8;
        position: sticky;
        top: 60px;
        z-index: 10;
      `;

      memberList.parentElement.prepend(box);

      const discordUser                                 = BdApi.findModule(m => m.getCurrentUser !== undefined)?.getCurrentUser();
      const usernameContainer                    = document.createElement('div');

      usernameContainer.style.textAlign          = 'left';
      usernameContainer.textContent              = discordUser?.globalName || 'Unknown';
      usernameContainer.style.fontFamily         = 'Tahoma, sans-serif';
      usernameContainer.style.fontWeight         = 'bold';
      usernameContainer.style.fontSize           = '14px';
      usernameContainer.style.paddingTop         = '12px';
      usernameContainer.style.paddingLeft        = '33px';
      usernameContainer.style.paddingBottom      = '12px';
      usernameContainer.style.color              = '#000';
      usernameContainer.style.backgroundImage    = "url('data:image/png;base64,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')";
      usernameContainer.style.backgroundRepeat   = 'no-repeat';
      usernameContainer.style.backgroundPosition = 'right 4px top 3px';
      usernameContainer.style.backgroundSize     = '32px auto';

      box.appendChild(usernameContainer);
    }
  }

  updateDocument() {

    console.log('document updating');

    var displayableMemberCount = 0;

    var memberList = document.querySelector('aside[class^="membersWrap_"] > * > div[aria-label="Members"]');
    if (!memberList) return;

    var header;

    for (const child of memberList.children) {
      if (child.tagName.toLowerCase() === 'h3') {
        header = child.childNodes[1].textContent.split(' ')[0].toLowerCase();
        continue;
      }

      if (child.className.indexOf('offline__') == -1 && child.className.indexOf('member__') != -1) {
        displayableMemberCount += 1;
      }

      if (header == 'sysop' || header == 'admin') {
        child.style.backgroundImage     = "url('data:image/png;base64,UklGRmYKAABXRUJQVlA4WAoAAAAwAAAAHwAAHwAASUNDUMgHAAAAAAfIYXBwbAIgAABtbnRyUkdCIFhZWiAH2QACABkACwAaAAthY3NwQVBQTAAAAABhcHBsAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWFwcGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtkZXNjAAABCAAAAG9kc2NtAAABeAAABYpjcHJ0AAAHBAAAADh3dHB0AAAHPAAAABRyWFlaAAAHUAAAABRnWFlaAAAHZAAAABRiWFlaAAAHeAAAABRyVFJDAAAHjAAAAA5jaGFkAAAHnAAAACxiVFJDAAAHjAAAAA5nVFJDAAAHjAAAAA5kZXNjAAAAAAAAABRHZW5lcmljIFJHQiBQcm9maWxlAAAAAAAAAAAAAAAUR2VuZXJpYyBSR0IgUHJvZmlsZQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbWx1YwAAAAAAAAAfAAAADHNrU0sAAAAoAAABhGRhREsAAAAkAAABrGNhRVMAAAAkAAAB0HZpVk4AAAAkAAAB9HB0QlIAAAAmAAACGHVrVUEAAAAqAAACPmZyRlUAAAAoAAACaGh1SFUAAAAoAAACkHpoVFcAAAASAAACuGtvS1IAAAAWAAACym5iTk8AAAAmAAAC4GNzQ1oAAAAiAAADBmhlSUwAAAAeAAADKHJvUk8AAAAkAAADRmRlREUAAAAsAAADaml0SVQAAAAoAAADlnN2U0UAAAAmAAAC4HpoQ04AAAASAAADvmphSlAAAAAaAAAD0GVsR1IAAAAiAAAD6nB0UE8AAAAmAAAEDG5sTkwAAAAoAAAEMmVzRVMAAAAmAAAEDHRoVEgAAAAkAAAEWnRyVFIAAAAiAAAEfmZpRkkAAAAoAAAEoGhySFIAAAAoAAAEyHBsUEwAAAAsAAAE8HJ1UlUAAAAiAAAFHGVuVVMAAAAmAAAFPmFyRUcAAAAmAAAFZABWAWEAZQBvAGIAZQBjAG4A/QAgAFIARwBCACAAcAByAG8AZgBpAGwARwBlAG4AZQByAGUAbAAgAFIARwBCAC0AcAByAG8AZgBpAGwAUABlAHIAZgBpAGwAIABSAEcAQgAgAGcAZQBuAOgAcgBpAGMAQx6lAHUAIABoAOwAbgBoACAAUgBHAEIAIABDAGgAdQBuAGcAUABlAHIAZgBpAGwAIABSAEcAQgAgAEcAZQBuAOkAcgBpAGMAbwQXBDAEMwQwBDsETAQ9BDgEOQAgBD8EQAQ+BEQEMAQ5BDsAIABSAEcAQgBQAHIAbwBmAGkAbAAgAGcA6QBuAOkAcgBpAHEAdQBlACAAUgBWAEIAwQBsAHQAYQBsAOEAbgBvAHMAIABSAEcAQgAgAHAAcgBvAGYAaQBskBp1KABSAEcAQoJyX2ljz4/wx3y8GAAgAFIARwBCACDVBLhc0wzHfABHAGUAbgBlAHIAaQBzAGsAIABSAEcAQgAtAHAAcgBvAGYAaQBsAE8AYgBlAGMAbgD9ACAAUgBHAEIAIABwAHIAbwBmAGkAbAXkBegF1QXkBdkF3AAgAFIARwBCACAF2wXcBdwF2QBQAHIAbwBmAGkAbAAgAFIARwBCACAAZwBlAG4AZQByAGkAYwBBAGwAbABnAGUAbQBlAGkAbgBlAHMAIABSAEcAQgAtAFAAcgBvAGYAaQBsAFAAcgBvAGYAaQBsAG8AIABSAEcAQgAgAGcAZQBuAGUAcgBpAGMAb2ZukBoAUgBHAEJjz4/wZYdO9k4AgiwAIABSAEcAQgAgMNcw7TDVMKEwpDDrA5MDtQO9A7kDugPMACADwAPBA78DxgOvA7sAIABSAEcAQgBQAGUAcgBmAGkAbAAgAFIARwBCACAAZwBlAG4A6QByAGkAYwBvAEEAbABnAGUAbQBlAGUAbgAgAFIARwBCAC0AcAByAG8AZgBpAGUAbA5CDhsOIw5EDh8OJQ5MACAAUgBHAEIAIA4XDjEOSA4nDkQOGwBHAGUAbgBlAGwAIABSAEcAQgAgAFAAcgBvAGYAaQBsAGkAWQBsAGUAaQBuAGUAbgAgAFIARwBCAC0AcAByAG8AZgBpAGkAbABpAEcAZQBuAGUAcgBpAQ0AawBpACAAUgBHAEIAIABwAHIAbwBmAGkAbABVAG4AaQB3AGUAcgBzAGEAbABuAHkAIABwAHIAbwBmAGkAbAAgAFIARwBCBB4EMQRJBDgEOQAgBD8EQAQ+BEQEOAQ7BEwAIABSAEcAQgBHAGUAbgBlAHIAaQBjACAAUgBHAEIAIABQAHIAbwBmAGkAbABlBkUGRAZBACAGKgY5BjEGSgZBACAAUgBHAEIAIAYnBkQGOQYnBkUAAHRleHQAAAAAQ29weXJpZ2h0IDIwMDcgQXBwbGUgSW5jLiwgYWxsIHJpZ2h0cyByZXNlcnZlZC4AWFlaIAAAAAAAAPNSAAEAAAABFs9YWVogAAAAAAAAdE0AAD3uAAAD0FhZWiAAAAAAAABadQAArHMAABc0WFlaIAAAAAAAACgaAAAVnwAAuDZjdXJ2AAAAAAAAAAEBzQAAc2YzMgAAAAAAAQxCAAAF3v//8yYAAAeSAAD9kf//+6L///2jAAAD3AAAwGxBTFBIWQAAAAEPMP8REcJRbdtOc+kdJCDlOeMyi63vIBLyJfxh6rvpGiL6PwH4dwWCAZFA4ogzN9zpmdMb0RfxfhLvEs+SpR9RsiDZLhk+XIb7j7PWL0kL4rFBOBTYG/wPAFZQOCAWAgAAcAwAnQEqIAAgAD5lKJFFpCKhmAYAQAZEtgBOnKCdf/OeEM3d7m5IHzlsHO4A/XffAP2A6wD9QPYA/YD0w/1m+A79nf3K9pFFAJr1/nvI185ewB5DvUAfsY1zOoxznHatL00Wt6vxOqBgX+AAAP7/fIH/cefpuwTOOQS0ht7KA6P/0iFpdO/Tvy1m/wh3yRn/X6CT/8q/wF/vzWoP+7PftH3Bnuh7lOW6Kj09MV/JanZz23f+J4LO1eR0albb91Fk7ad7ojyBZeOLx0LebzDHws17gNDdsz4fCzPh+hvcY9qLuLWL/tEsYLWL/spsA/YaPwf+VLEth37IHxcLPDic/Id4BB/s2rrZjz/5cn8ub4udWkSbXO/2EX4/yBjo8lpN+33/8Nwq+tbmH35QWuhsK/6RNoJr5iLDWx3wSMOMXjjdq78nbCkaI2hIrFo8TBr4J7/zcw4N3lB4v7uHGFDOBenZ/6b2SXqY3ZI48UzxAjR5K7NOL/IGdRiJX/5aLaG9pN/Uo7jtmvewA1McOvWn6PMQkxq6oQhL2BiP+YzUVuV5sMW0hqikO/6HV6ryDOPJWSar7M5kblqr53xypAjz8TyWSKf0K+aIYxv3ZMRQFojeUSgcfdVVae5D5L//0clU0DKcJ8s6tqH4fRQz5/j8wJe9dPzTB95mPwEwsv///GLXVevpUfBrRk4CB36Bfz6uILsGgAAA')";
        child.style.backgroundRepeat    = 'no-repeat';
        child.style.backgroundPosition  = 'left 0px top 7px';
        child.style.backgroundSize      = '18px auto';

        const span = child.querySelector('span[class*="name__"][class*="username__"]');
        if (span && !span.textContent.includes('(Host)')) {
          span.textContent += ' (Host)';
        }
      }
    }

    this.createUserNameHeader(memberList);
    this.createChannelNameheader(memberList, displayableMemberCount);
  }

  start() {
    const css = `
      [class*="chatContent"],
      [class*="chat-"],
      [class*="content-"],
      [class*="container-"],
      [class*="messages-"],
      [class*="scroller-"] {
        background-color: #ffffff !important;
      }
      #channels {
        background-color: #f1f0eb;
        margin-bottom: 40px;
      }

      [class*="messageContent"] {
        color: #000000 !important;
      }
      div[aria-label="Members"] {
        background-color: #ffffff !important;
      }
      ul[aria-label="Channels"] > :first-child {
        height: 0px !important;
      }

      div[class*="message"] span[class*="username"] {
        color: #000080 !important;
      }
      div[class^="member__"] {
        background-color: white;
      }
      span[class^="nameContainer__"],
      div[class^="name__"],
      div[class^="username__"] {
        color: #000080 !important;
        font-family: 'Tahoma';
        font-size: 15px;
      }
      span[class^="chipletContainerInner__"] {
        display: none !important;
      }
      [class^="memberInner"] [class^="avatar__"] [role="img"] {
        display: none !important;
      }
      [class^="memberInner"] [class^="avatar__"] {
        display: contents !important;
      }
      [class^="avatar__"] + div {
        padding-left: 8px !important;
      }
      h3[class^="membersGroup_"][class*="container__"][class*="header__"] {
        display: none !important;
      }
      div[class^="memberInner__"] div[class^="subText__"] {
        display: none !important;
      }
      div[class*="offline__"] {
        display: none !important;
      }
      span[class^="chipletContainerInner__"] {
        display: none !important;
      }
      span[class^="botTag"] {
        display: none !important;
      }
      div[class*="nameplated__"] > div[class^="container__"] {
        display: none !important;
      }

      div[class*="messagesWrapper"] {
        border: 8px solid #feffe6;
      }

      div[class*="messagesWrapper"] > :first-child {
        border: 1px solid #c0c0c0;
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
      }

      div[aria-label="Members"] {
        padding-top: 0 !important;
        border: 1px solid #c0c0c0 !important;
      }


      /* The border between the nicklist and the chat area */
      div[class^="content"] > div[class^="container"] {
        border: none !important;
      }
      form[class^="form_"][class*="formWithLoadedChatInput_"] {
        background-color: #feffe6 !important;
        padding-left: 0px;
        margin-right: 0px;
        padding-bottom: 0px;
      }

      div[class^="channelTextArea_"] {
        background-color: #4a659c !important;
        border-radius: 0px !important;
        padding-left: 10px;
        padding-right: 10px;
        padding-bottom: 10px;
        padding-top: 10px;
        margin-top: 5px;
        
      }

      div[class*="textAreaSlate__"] {
        background-color: #6699ff !important;
        
      }

      div[class^="scrollableContainer__"][class*="themedBackground__"] {
        background-color: #6699ff;
        border-radius: 0px !important;
        padding: 4px;

        overflow-y: auto;
      }

      div[class^="markup__"][class*="editor__"] {
        background-color: #ffffff !important;
      }

      div[class^="inner__"][class*="sansAttachButton__"] {
        background-color: #ffffff !important;
        padding-right: 10px;
      }

      div[role="textbox"][contenteditable="true"][data-slate-editor="true"] {
        color: #000000 !important;
        caret-color: #000000 !important;
        font-family: 'Tahoma';
        font-size: 14px;
      }

      nav[class^="container__"] {
        background-color: #f1f0eb !important;
      }

      section[aria-label="Channel header"] {
        background-color: #4a659c !important;
      }

      section[aria-label="User area"] {
        background-color: #4a659c !important;
        margin-bottom: 14px;
      }

      [class^="sidebar_"]::after {
        background: #feffe6 !important;
      }

      header[class^="header"] {
        background-color: #4a659c;
      }

      .theme-dark [class^="children_"]:after {
        background: none;
      }

      .theme-light [class^="children_"]:after {
        background: none;
      }

      form svg {
        color: #4a659c;
        transition: color 0.3s;
      }

      form svg:hover {
        color: #6699ff;
      }

      [class^="overflow_"] {
        color: #000080;
        font-weight: bold;
      }

    `;
    this.styleElement = document.createElement('style');
    this.styleElement.id = MSN_CHAT_ROOT_STYLE;
    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);

    this.updateDocument();
    this.observer = new MutationObserver(() => this.updateDocument());
    const appMount = document.getElementById('app-mount');
    if (appMount) {
      this.observer.observe(appMount, { childList: true, subtree: true });
    }
  }

  stop() {

    console.log('MSN Chat plugin stopping');

    this.observer.disconnect();

    if (this.styleElement) {
      this.styleElement.remove();
    }

    const channelHeader = document.getElementById(MSN_CHAT_CHANNEL_HEADER_CONTAINER_ID);
    if (channelHeader) channelHeader.remove();

    const usernameHeader = document.getElementById(MSN_CHAT_USERNAME_HEADER_ID);
    if (usernameHeader) usernameHeader.remove();

    const memberList = document.getElementById(MSN_CHAT_MEMBER_LIST_ID);
    if (memberList) memberList.remove();

    document.querySelectorAll('span[class*="name__"][class*="username__"]').forEach(el => {
      el.textContent = el.textContent.replace('\(Host\)', '').trim();
    });

    console.log('MSN Chat plugin stopped');
  }
};
