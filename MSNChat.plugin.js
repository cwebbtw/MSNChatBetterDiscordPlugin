/**
 * @name MSN Chat Plugin
 * @version 1.0.0
 * @description A replica of MSN chat for Discord using BetterDiscord.
 * @author Christopher Webb (cwebbtw)
 */

const MSN_CHAT_MEMBER_LIST_ID = 'msn-chat-member-list';
const MSN_CHAT_MEMBER_COUNT_TEXT_ID = 'msn-chat-member-count-text';
const MSN_CHAT_CHANNEL_HEADER_CONTAINER_ID = 'msn-chat-channel-header-container';
const MSN_CHAT_CHANNEL_TEXT_ID = 'msn-chat-channel-text';
const MSN_CHAT_USERNAME_HEADER_TEXT_ID = 'msn-chat-username-text';
const MSN_CHAT_USERNAME_HEADER_ID = 'msn-chat-username-header';
const MSN_CHAT_ROOT_STYLE = 'msn-chat-bg-style';

class SizedQueue {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.queue = [];
  }

  enqueue(item) {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift();
    }
    this.queue.push(item);
  }

  getAll() {
    return [...this.queue];
  }
}

module.exports = class BasicPlugin {

  constructor() {
    this._lastOnlineCount = null;
    this._lastOnlineCountTime = 0;
    this.userStatus = {};
    this.guildRolesMap = {};
    this.eventQueue = new SizedQueue(20);
  }

  getChannelName() {
    const headerElements = [...document.querySelectorAll('h1')].find(el => 
      Array.from(el.classList).some(c => c.startsWith('title__'))
    );

    if (!headerElements) return 'Unknown';

    const parts = headerElements.textContent.split(':');
    if (!parts[1]) return headerElements.textContent;

    const secondToken = parts[1].trim();
    const tokens = secondToken.split('︱').map(t => t.trim());

    if (!tokens[1]) return secondToken;

    const formatted = tokens[1]
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return formatted || tokens[1];
  }

  hasViewChannelPermission(RolesStore, user, guild, channel) {
    const rolesMap = RolesStore.getRoles(guild.id) || {};

    const userRoles = (user.roles || []).concat(guild.id);

    let permissions = 0n;
    for (const roleId of userRoles) {
      const role = rolesMap[roleId];
      if (role && role.permissions !== undefined) {
        permissions |= BigInt(role.permissions);
      }
    }

    const ADMINISTRATOR = 1n << 3n;
    if ((permissions & ADMINISTRATOR) === ADMINISTRATOR) {
      return true;
    }

    if (user?.userId === guild.ownerId) {
      return true;
    }

    if (channel?.permissionOverwrites) {
      const everyoneOverwrite = channel.permissionOverwrites[guild.id];
      if (everyoneOverwrite) {
        permissions &= ~BigInt(everyoneOverwrite.deny);
        permissions |= BigInt(everyoneOverwrite.allow);
      }

      let allow = 0n, deny = 0n;
      for (const roleId of userRoles) {
        const overwrite = channel.permissionOverwrites[roleId];
        if (overwrite) {
          allow |= BigInt(overwrite.allow);
          deny |= BigInt(overwrite.deny);
        }
      }
      permissions &= ~deny;
      permissions |= allow;

      const memberOverwrite = channel.permissionOverwrites[user.userId];
      if (memberOverwrite) {
        permissions &= ~BigInt(memberOverwrite.deny);
        permissions |= BigInt(memberOverwrite.allow);
      }
    }

  const VIEW_CHANNEL = 1n << 10n;
  return (permissions & VIEW_CHANNEL) === VIEW_CHANNEL;
  }

  getOnlineCount() {
    const now = Date.now();
    if (this._lastOnlineCount !== null && (now - this._lastOnlineCountTime) < 2000) {
      return this._lastOnlineCount;
    }

    const RolesStore = BdApi.Webpack.getModule(m => m.getRole && m.getRoles);
    const GuildMemberStore = BdApi.Webpack.getModule(m => m.getMember && m.getMembers);
    const PresenceStore = BdApi.Webpack.getModule(m => m.getState && m.getStatus);
    const SelectedChannelStore = BdApi.Webpack.getStore("SelectedChannelStore");
    const ChannelStore = BdApi.Webpack.getStore("ChannelStore");
    const GuildStore = BdApi.Webpack.getModule(m => m.getGuild && m.getGuilds);
    
    const currentChannelId = SelectedChannelStore.getChannelId();
    const currentChannel = ChannelStore.getChannel(currentChannelId);

    const SelectedGuildStore = BdApi.Webpack.getModule(m => m.getLastSelectedGuildId);
    const guildId = SelectedGuildStore?.getLastSelectedGuildId();
    const guild = GuildStore.getGuild(guildId);
    const allMembers = GuildMemberStore.getMembers(guildId);
    this.guildRolesMap = new Map(
      Object.values(RolesStore.getRoles(guildId)).map(role => [role.name, role.id])
    )

    let onlineCount = 0;

    for (const memberId in allMembers) {

      const status = this.userStatus[allMembers[memberId].userId] ?? PresenceStore.getStatus(allMembers[memberId].userId);

      this.userStatus[allMembers[memberId].userId] = status;

      if (["online", "idle", "dnd", "unknown"].includes(status)) {
        const canView = this.hasViewChannelPermission(RolesStore, allMembers[memberId], guild, currentChannel);

        if (canView) {
          onlineCount++;
        }
      }
    }

    this._lastOnlineCount = onlineCount;
    this._lastOnlineCountTime = now;

    return onlineCount;
  }

  createChannelNameheader(memberList, channelName) {
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
      channel.style.backgroundImage     = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-butterfly-logo.png')";
      channel.style.backgroundRepeat    = 'no-repeat';
      channel.style.backgroundPosition  = 'right 4px top 4px';
      channel.style.backgroundSize      = '38px auto';

      const memberCount                 = document.createElement('div');
      memberCount.id                    = MSN_CHAT_MEMBER_COUNT_TEXT_ID;
      memberCount.style.color           = 'black';
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
      const count = this.getOnlineCount();
      memberCount.textContent = count + ' ' + (count === 1 ? 'person' : 'people') + ' chatting';
    }

    var channelNameObject = document.getElementById(MSN_CHAT_CHANNEL_TEXT_ID);
    if (channelNameObject) {
      channelNameObject.textContent = channelName;
    }
  }

  createUserNameHeader(memberList) {
    const userId = BdApi.Webpack.getModule(m => m.getCurrentUser).getCurrentUser().id;
    const SelectedGuildStore = BdApi.Webpack.getModule(m => m.getLastSelectedGuildId);
    const GuildMemberStore = BdApi.Webpack.getModule(m => m.getMember && m.getMembers);
    const guildId = SelectedGuildStore?.getLastSelectedGuildId();
    const member = GuildMemberStore.getMember(guildId, userId);

    const isIdle = this.userStatus[userId] === "idle";
    const isOwner = member?.roles?.includes(this.guildRolesMap?.get("Owner"));
    const isHost = member?.roles?.includes(this.guildRolesMap?.get("Host"))

    if (!document.getElementById(MSN_CHAT_USERNAME_HEADER_ID)) {
      const box                                  = document.createElement('div');
      box.id                                     = MSN_CHAT_USERNAME_HEADER_ID;

      memberList.parentElement.prepend(box);

      const usernameContainer                    = document.createElement('div');
      usernameContainer.id                       = MSN_CHAT_USERNAME_HEADER_TEXT_ID;

      usernameContainer.style.textAlign          = 'left';
      usernameContainer.textContent              = this.getMyName();
      usernameContainer.style.fontFamily         = 'Tahoma, sans-serif';
      usernameContainer.style.fontWeight         = 'bold';
      usernameContainer.style.fontSize           = '15px';
      usernameContainer.style.paddingTop         = '12px';
      usernameContainer.style.paddingLeft        = '33px';
      usernameContainer.style.paddingBottom      = '12px';
      usernameContainer.style.color              = '#000';
      usernameContainer.style.backgroundImage    = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-coffee-cup-button.png')";
      usernameContainer.style.backgroundRepeat   = 'no-repeat';
      usernameContainer.style.backgroundPosition = 'right 4px top 3px';
      usernameContainer.style.backgroundSize     = '32px auto';

      box.appendChild(usernameContainer);
    }

    const box = document.getElementById(MSN_CHAT_USERNAME_HEADER_ID);
    box.style.cssText = `
      background-color: #eeeff8;
      position: sticky;
      top: 60px;
      z-index: 10;
    `;

    if (isIdle) {
      box.style.cssText += `
        background-image: url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-self-nicklist-coffee.png');
        background-repeat: no-repeat;
        background-position: left 11px top 10px;
        background-size: 18px auto;
      `
    }
    else if (isOwner) {
      box.style.cssText += `
        background-image: url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-self-nicklist-owner.png');
        background-repeat: no-repeat;
        background-position: left 8px top 10px;
        background-size: 18px auto;
      `

    } else if (isHost) {
      box.style.cssText += `
        background-image: url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-self-nicklist-host.png');
        background-repeat: no-repeat;
        background-position: left 8px top 10px;
        background-size: 18px auto;
      `
    }

    if ((isHost || isOwner)) {
      const usernameContainer = box.firstChild;
      if (!usernameContainer.textContent.includes('(Host)'))
      {
        usernameContainer.textContent += ' (Host)';
      }
    }
  }

  updateDocument() {
    const SelectedGuildStore = BdApi.Webpack.getModule(m => m.getLastSelectedGuildId);
    const GuildMemberStore = BdApi.Webpack.getModule(m => m.getMember && m.getMembers);
    const guildId = SelectedGuildStore?.getLastSelectedGuildId();

    var channelName = this.getChannelName();

    var memberList = document.querySelector('aside[class^="membersWrap_"] > * > div[aria-label="Members"]');
    if (!memberList) return;

    var header;

    const myName = this.getMyName();

    const allMessages = document.querySelectorAll('h3[class^="header"][aria-labelledby^="message-username-"]');


    if (allMessages) {
      const admin = this.guildRolesMap?.get("Admin");
      const sysop = this.guildRolesMap?.get("Sysop");
      const guide = this.guildRolesMap?.get("Guide");
      const owner = this.guildRolesMap?.get("Owner");
      const host  = this.guildRolesMap?.get("Host");

      for (const child of Array.from(allMessages).reverse()) {

        const usernameSpan = child.querySelector(`[data-text]`);
        if (!usernameSpan) continue;

        const id = child?.parentElement?.parentElement?.getAttribute('data-author-id');
        if (!id) continue;

        const member = GuildMemberStore.getMember(guildId, id);
        if (!member?.roles) continue;

        const roles = member.roles;
        const target = usernameSpan.parentElement;

        if (roles.includes(owner)) {
          target.style.backgroundImage = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-nicklist-owner.png')";
        } else if (roles.includes(host)) {
          target.style.backgroundImage = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-nicklist-host.png')";
        } else if (roles.includes(admin) || roles.includes(sysop) || roles.includes(guide)) {
          target.style.backgroundImage = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-nicklist-butterfly.png')";
        } else {
          continue;
        }

        target.style.backgroundRepeat   = 'no-repeat';
        target.style.backgroundPosition = 'left 6px top 2px';
        target.style.backgroundSize     = '16px auto';
      }
    }


    for (const child of memberList.children) {
      if (child.tagName.toLowerCase() === 'h3') {
        var parts = child.childNodes[1].textContent.split(' ');
        header = parts[0].toLowerCase();

        continue;
      } else {
        const span = child.querySelector('span[class*="name__"][class*="username__"]:not(:has(span))');
        if (span?.textContent?.trim() === myName) {
            child.style.display           = 'none';
            continue;
        }

        const idle = child.querySelector('div[aria-label$="Idle"]');
        if (idle) {
          if (span) {
            span.style.color = 'grey';
          }
          child.style.backgroundImage     = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-nicklist-coffee-cup.png')";
          child.style.backgroundRepeat    = 'no-repeat';
          child.style.backgroundPosition  = 'left 2px top 7px';
          child.style.backgroundSize      = '18px auto';
        } else if (span) {
          span.style.color = '';
          child.style.backgroundImage     = '';
          child.style.backgroundRepeat    = '';
          child.style.backgroundPosition  = '';
          child.style.backgroundSize      = '';
        }

        if (header == 'sysop' || header == 'admin' || header == 'guide') {
          if (!idle) {
            child.style.backgroundImage     = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-nicklist-butterfly.png')";
            child.style.backgroundRepeat    = 'no-repeat';
            child.style.backgroundPosition  = 'left 0px top 7px';
            child.style.backgroundSize      = '18px auto';
          }

        } else if (header == 'owner') {
          if (!idle) {
            child.style.backgroundImage     = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-nicklist-owner.png')";
            child.style.backgroundRepeat    = 'no-repeat';
            child.style.backgroundPosition  = 'left 2px top 7px';
            child.style.backgroundSize      = '18px auto';
          }
        } else if (header == 'host') {
          if (!idle) {
            child.style.backgroundImage     = "url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/refs/heads/main/msn-nicklist-host.png')";
            child.style.backgroundRepeat    = 'no-repeat';
            child.style.backgroundPosition  = 'left 2px top 7px';
            child.style.backgroundSize      = '18px auto';
          }
        }

        if (span && !span.textContent.includes('(Host)') && ['admin', 'sysop', 'guide', 'owner', 'host'].includes(header)) {
          span.textContent += ' (Host)';
        }

      }
    }

    this.createUserNameHeader(memberList);
    this.createChannelNameheader(memberList, channelName);
  }

  getMyName() {
    const userId = BdApi.Webpack.getModule(m => m.getCurrentUser).getCurrentUser().id;
    const SelectedGuildStore = BdApi.Webpack.getModule(m => m.getLastSelectedGuildId);
    const GuildMemberStore = BdApi.Webpack.getModule(m => m.getMember && m.getMembers);
    const UserStore = BdApi.Webpack.getModule(m => m.getUser && m.getCurrentUser);
    const guildId = SelectedGuildStore?.getLastSelectedGuildId();
    const member = GuildMemberStore.getMember(guildId, userId);
    const user = UserStore.getUser(userId);

    return member?.nick ||
          user?.globalName ||
          user?.username ||
          "Unknown";
  }

  onChannelSelect(channelSelectEvent) {
    const GuildMemberStore = BdApi.Webpack.getModule(m => m.getMember && m.getMembers);
    const GuildStore = BdApi.Webpack.getModule(m => m.getGuild && m.getGuilds);
    const SelectedChannelStore = BdApi.Webpack.getStore("SelectedChannelStore");
    const ChannelStore = BdApi.Webpack.getStore("ChannelStore");
    const currentChannelId = SelectedChannelStore.getChannelId();
    const currentChannel = ChannelStore.getChannel(currentChannelId);
    const SelectedGuildStore = BdApi.Webpack.getModule(m => m.getLastSelectedGuildId);
    const guildId = SelectedGuildStore?.getLastSelectedGuildId();
    const guild = GuildStore.getGuild(guildId);
    const RolesStore = BdApi.Webpack.getModule(m => m.getRole && m.getRoles);

    setTimeout(() => {
      try {
        const messages = document.querySelector('ol[role="list"][data-list-id="chat-messages"][aria-label^="Messages"]');
        if (messages) {
          const allEvents = this.eventQueue.getAll();

          let i = allEvents.length - 1;
          let j = messages.children.length - 1;

          while (i >= 0) {
            const event = allEvents[i];
            
            if (event.guild !== channelSelectEvent.guildId)  {
              i--;
              continue;
            }

            const member = GuildMemberStore.getMember(channelSelectEvent.guildId, event.userId);

            if (!this.hasViewChannelPermission(RolesStore, member, guild, currentChannel)) {
              i--;
              continue;
            }

            while (j >= 0) {
              const id = messages.children[j].id;
              if (id) {
                const parts = id.split('-');
                if (parts.length === 4) {
                  const snowflake = parts[3];
                  const eventTime = BigInt(event.time);
                  const msgTime = BigInt(snowflake);

                  if (eventTime > msgTime) break;
                }
              }
              j--;
            }

            const entry = `
              <div data-author-id="1234">
                <div>
                  <div><span>${event.message}</span></div>
                </div>
              </div>
            `;
            const template = document.createElement('template');
            template.innerHTML = entry.trim();
            const entryNode = template.content.firstChild;

            if (j >= 0) {
              const refNode = messages.children[j].nextSibling;
              messages.insertBefore(entryNode, refNode);
            } else {
              const lastItem = messages.lastElementChild;
              if (lastItem) {
                messages.insertBefore(entryNode, lastItem);
              } else {
                messages.appendChild(entryNode);
              }
            }

            i--;
          }
        }
      } catch(error) {
        console.error("An error occurred:", error);
      }
    }, 200);
  }

  onPresenceUpdate(event) {
    try {
      const GuildMemberStore = BdApi.Webpack.getModule(m => m.getMember && m.getMembers);
      const SelectedChannelStore = BdApi.Webpack.getStore("SelectedChannelStore");
      const UserStore = BdApi.Webpack.getModule(m => m.getUser && m.getCurrentUser);
      const ChannelStore = BdApi.Webpack.getStore("ChannelStore");
      const currentChannelId = SelectedChannelStore.getChannelId();
      const currentChannel = ChannelStore.getChannel(currentChannelId);
      const SelectedGuildStore = BdApi.Webpack.getModule(m => m.getLastSelectedGuildId);
      const guildId = SelectedGuildStore?.getLastSelectedGuildId();

      var update = event.updates[0];
      if (update.guildId === guildId) {
        const member = GuildMemberStore.getMember(guildId, update.user.id);
        const user = UserStore.getUser(update.user.id);

        const displayName =
          member?.nick ||
          user?.globalName ||
          user?.username ||
          "Unknown";

        const self = UserStore.getCurrentUser();

        const previousStatus = this.userStatus[update.user.id];

        this.userStatus[update.user.id] = update.status;

        let message = undefined;
        if (previousStatus === "idle" && update.status === "online") {
          if (update.user.id === self.id) {
            message = `You have returned.`
          } else {
            message = `${displayName} has returned.`
          }
        } else if (previousStatus === "online" && update.status === "idle") {

          if (update.user.id === self.id) {
            message = `You are away.`
          } else {
            message = `${displayName} is away.`
          }
        } else if (["offline", undefined].includes(previousStatus) && ["online"].includes(update.status)) {
          message = `${displayName} has joined the conversation.`
        } else if (["online"].includes(previousStatus) && ["offline", undefined].includes(update.status)) {
          message = `${displayName} has left the conversation.`
        }

        console.log(`${displayName} : old: ${previousStatus}, new: ${update.status}`);

        if (message) {
          if (currentChannel && currentChannel.type == 0) {
            const messages = document.querySelector(
              'ol[role="list"][data-list-id="chat-messages"][aria-label^="Messages"]'
            );

            if (messages) {
              const entry = `
                <div data-author-id="1234">
                    <div>
                        <div><span>${message}</span></div>
                    </div>
                </div>
              `

              this.eventQueue.enqueue({ message: message, time: this.generateFakeSnowflake(), userId: update.user.id, guild: guildId });

              const template = document.createElement('template');
              template.innerHTML = entry.trim();
              const entryNode = template.content.firstChild;

              const lastItem = messages.lastElementChild;
              if (lastItem) {
                messages.insertBefore(entryNode, lastItem);
              } else {
                messages.appendChild(entryNode);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
  }

  generateFakeSnowflake() {
    const DISCORD_EPOCH = 1420070400000n;
    const timestamp = BigInt(Date.now()) - DISCORD_EPOCH;
    const workerId = 1n; 
    const processId = 1n; 
    const increment = BigInt(Math.floor(Math.random() * 4096)); 

    const snowflake = (timestamp << 22n) | (workerId << 17n) | (processId << 12n) | increment;
    return snowflake.toString();
  }

  start() {
    // TODO: Temporary hack to populate user status
    this.getOnlineCount();

    const Dispatcher = BdApi.Webpack.getModule(m => 
      typeof m?.subscribe === "function" && 
      typeof m?.dispatch === "function"
    );

    this.boundPresenceUpdate = this.onPresenceUpdate.bind(this);
    Dispatcher.subscribe("PRESENCE_UPDATES", this.boundPresenceUpdate);

    this.boundChannelSelect = this.onChannelSelect.bind(this);
    Dispatcher.subscribe("CHANNEL_SELECT", this.boundChannelSelect);

    const css = `
      [class*="chatContent"],
      [class*="chat-"],
      [class*="content-"],
      [class*="container-"],
      [class*="messages-"],
      [class*="scroller-"] {
        background-color: #ffffff !important;
      }

      @font-face {
        font-family: 'OriginalTahoma';
        src: url('https://raw.githubusercontent.com/cwebbtw/MSNChatBetterDiscordPlugin/main/xp-tahoma.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }

      #channels {
        background-color: #f1f0eb;
        margin-bottom: 40px;
      }

      pre code {
        color: grey !important;
      }

      [class*="messageContent"] {
        color: #000000 !important;
        font-size: 22px;
        font-family: OriginalTahoma;
        
      }
      div[role="list"][aria-label="Members"] {
        background-color: #ffffff !important;
      }
      ul[aria-label="Channels"] > :first-child {
        height: 0px !important;
      }

      div[class*="message__"]:hover {
        background-color: white !important;
      }

      div[class*="message__"] {
        background-color: white !important;
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
        font-family: 'OriginalTahoma';
        letter-spacing: 0.3px;
        font-size: 22px;
      }

      nav[aria-label="Private channels"] span[class^="nameContainer__"],
      nav[aria-label="Private channels"] div[class^="name__"],
      nav[aria-label="Private channels"] div[class^="username__"] {
        all: unset !important;
      }

      [class*="defaultColor__"] {
        color: #6699ff !important;
      }

      h2[class*="defaultColor__"] {
        color: white !important;
      }

      div[class*="defaultColor__"] {
        color: #6699ff !important;
      }

      // h3 span[class*="timestamp"] {
      //   display: none !important;
      // }

      div[class^="repliedMessageClickableSpine_"] {
        display: none;
      }

      h3 span[class*="timestamp"] {
        opacity: 0;
        font-size: 8px !important;
        pointer-events: none;
        margin-left: -28px;
      }

      h3:hover span[class*="timestamp"] {
        opacity: 1;
        font-size: 8px !important;
        margin-left: -28px;
      }

      div[id^="message-reply-context-"] {
        padding-top: 15px;
        margin-left: -38px !important;
      }

      div[class*="isFailed_"]::after {
        color: #ff0000C0 !important;
        content: '(failed to send)' !important;
        padding-left: 10px;
      }

      div[class^="reactions_"] {
        padding-bottom: 15px;
      }

      div[data-is-self="true"] span[class^="username_"]:not([class*="name__"]):not([class^="mention"]):not([tabindex="-1"]):not([tabindex="-1"]):not([aria-label]):not([data-text^="@"]) {
        margin-left: 26px !important;
        font-size: 14px;
        font-family: 'Tahoma';
        font-weight: bold !important;
        color: black !important;
        text-decoration: none !important;
      }

      span[class^="username_"]:not([class*="name__"]):not([class^="mention"]):not([tabindex="-1"]):not([tabindex="-1"]):not([aria-label]):not([data-text^="@"]) {
        margin-left: 26px !important;
        font-size: 22px;
        font-family: 'OriginalTahoma';
        font-weight: normal !important;
        text-decoration: none !important;
      }

      span[class^="username_"]:not([class*="name__"]):not([class^="mention"]):not([tabindex="-1"]):not([aria-label]):not([data-text^="@"])::after {
        content: ':';
        font-weight: 100 !important;
        margin-left: 6px;
      }

      [class*="text-"] {
        color: #6699ff !important;
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
        font-family: 'OriginalTahoma';
        letter-spacing: 0.3px;
        font-size: 24px;
      }

      nav[class^="container__"] {
        background-color: #f1f0eb !important;
      }

      aside[class^="membersWrap"] div[class^="members_"] {
        background-color: #f1f0eb !important;
        scrollbar-width: none; /* hides scrollbar */
        -ms-overflow-style: none; /* for IE and Edge */
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

      a {
        color: #6699ff !important;
      }

      nav > div > header[class^="header"]:not([class^="headerFull"]) {
        background-color: #4a659c;
      }

      .theme-dark [class^="children_"]:after {
        background: none;
      }

      .theme-light [class^="children_"]:after {
        background: none;
      }

      svg {
        color: #6699ff !important;
      }

      form svg {
        color: #4a659c !important;
        transition: color 0.3s;
      }

      form svg:hover {
        color: #6699ff;
      }

      h3 > div[class^="overflow_"] {
        color: #000080;
        font-weight: bold;
      }

      div[data-author-id="1234"], div[data-author-id="1234"] * {
        display: flex;
        font-size: 22px;
        letter-spacing: 0.3px;
        font-family: OriginalTahoma;
        color: #808080 !important;
        align-items: center;
        padding: 0px;
        padding-bottom: 0px;
        margin-top: 0px;
        padding-top: 0px;
        height: 20px !important;
        min-height: 20px !important;
      }

      div[data-author-id="1234"]::before {
        content: "▶";
        color: #808080;
        font-size: 10px;
        // padding-bottom: px;
        margin-right: 4px;
        margin-left: 85px;
      }
    `;
    this.styleElement = document.createElement('style');
    this.styleElement.id = MSN_CHAT_ROOT_STYLE;
    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);

    this.observer = new MutationObserver(
      (mutations) => {
        let raiseEvent = false;

        mutations.forEach(element => {
          // The below is used for diagnostics - keep it for now
          // due to the optimisation to only watch specific parts of
          // the DOM updating

          // console.log(element?.target?.classList);

          if ([...element?.target?.classList || []].some(cls => 
            cls.startsWith("scroller") ||
            cls.startsWith("content_")
          )) {
            raiseEvent = true;
          }
        });

        if (raiseEvent) {
          // console.log('mutating');
          // console.log(mutations);
          this.updateDocument();
        }
      }
    );
    const appMount = document.getElementById('app-mount');
    if (appMount) {
      this.observer.observe(appMount, { childList: true, subtree: true });
    }
  }

  stop() {

    console.log('MSN Chat plugin stopping');

    const Dispatcher = BdApi.Webpack.getModule(m => 
      typeof m?.subscribe === "function" && 
      typeof m?.dispatch === "function"
    );

    Dispatcher.unsubscribe("PRESENCE_UPDATES", this.boundPresenceUpdate);
    Dispatcher.unsubscribe("CHANNEL_SELECT", this.boundChannelSelect);

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
