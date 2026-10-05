import { StudySet, Term, UserStats } from '../types';

export interface TelegramBotInfo {
  id: number;
  username: string;
  firstName: string;
}

export interface TelegramLogEntry {
  id: string;
  timestamp: number;
  sender: string;
  message: string;
  type: 'incoming' | 'outgoing' | 'system' | 'error';
}

export interface TelegramBotHandlers {
  getSets: () => StudySet[];
  onAddCard: (setId: string, term: string, definition: string) => Promise<{ success: boolean; setTitle: string; totalCards: number; error?: string }>;
  onCreateSet: (title: string) => Promise<{ success: boolean; newSet: StudySet; error?: string }>;
  getStats: () => UserStats | null;
  onLog?: (entry: TelegramLogEntry) => void;
  onOwnerPaired?: (ownerUserId: string, ownerUsername?: string) => Promise<void>;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

class TelegramBotManager {
  private isRunning: boolean = false;
  private botToken: string = '';
  private botInfo: TelegramBotInfo | null = null;
  private lastUpdateId: number = 0;
  private activeSetId: string | null = null;
  private handlers: TelegramBotHandlers | null = null;
  private pollingTimeoutId: any = null;
  private pollInstanceId: number = 0;
  private processedUpdateIds: Set<number> = new Set();
  private logs: TelegramLogEntry[] = [];
  private logListeners: Set<(logs: TelegramLogEntry[]) => void> = new Set();

  // Access Control: Only the verified owner can interact with the bot
  private ownerUserId: string | null = null;
  private ownerUsername: string | null = null;
  private pairingCode: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedOffset = localStorage.getItem('cards_tg_last_update_id');
      if (savedOffset) {
        this.lastUpdateId = parseInt(savedOffset, 10) || 0;
      }
      this.activeSetId = localStorage.getItem('cards_tg_active_set_id') || null;
      this.ownerUserId = localStorage.getItem('cards_telegram_owner_id') || null;
      this.ownerUsername = localStorage.getItem('cards_telegram_owner_username') || null;
      this.pairingCode = localStorage.getItem('cards_telegram_pair_code') || null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getBotInfo(): TelegramBotInfo | null {
    return this.botInfo;
  }

  public getLogs(): TelegramLogEntry[] {
    return this.logs;
  }

  public subscribeLogs(listener: (logs: TelegramLogEntry[]) => void): () => void {
    this.logListeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  private addLog(entry: Omit<TelegramLogEntry, 'id' | 'timestamp'>) {
    const newEntry: TelegramLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      ...entry,
    };
    this.logs = [newEntry, ...this.logs.slice(0, 49)];
    this.logListeners.forEach((l) => l(this.logs));
  }

  public getActiveSetId(): string | null {
    return this.activeSetId;
  }

  public setActiveSetId(id: string | null) {
    this.activeSetId = id;
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('cards_tg_active_set_id', id);
      else localStorage.removeItem('cards_tg_active_set_id');
    }
  }

  /**
   * Get or create a unique pairing code for the owner
   */
  public getOrCreatePairingCode(): string {
    if (!this.pairingCode) {
      const code = `CARD-${Math.floor(1000 + Math.random() * 9000)}`;
      this.pairingCode = code;
      if (typeof window !== 'undefined') {
        localStorage.setItem('cards_telegram_pair_code', code);
      }
    }
    return this.pairingCode;
  }

  /**
   * Set and update owner access control credentials
   */
  public setAccessControl(options: {
    ownerUserId?: string | null;
    ownerUsername?: string | null;
    pairingCode?: string | null;
  }) {
    if (options.ownerUserId !== undefined) {
      this.ownerUserId = options.ownerUserId || null;
      if (typeof window !== 'undefined') {
        if (options.ownerUserId) localStorage.setItem('cards_telegram_owner_id', options.ownerUserId);
        else localStorage.removeItem('cards_telegram_owner_id');
      }
    }
    if (options.ownerUsername !== undefined) {
      this.ownerUsername = options.ownerUsername || null;
      if (typeof window !== 'undefined') {
        if (options.ownerUsername) localStorage.setItem('cards_telegram_owner_username', options.ownerUsername);
        else localStorage.removeItem('cards_telegram_owner_username');
      }
    }
    if (options.pairingCode !== undefined) {
      this.pairingCode = options.pairingCode || null;
      if (typeof window !== 'undefined') {
        if (options.pairingCode) localStorage.setItem('cards_telegram_pair_code', options.pairingCode);
        else localStorage.removeItem('cards_telegram_pair_code');
      }
    }
  }

  public getAccessControl() {
    return {
      ownerUserId: this.ownerUserId,
      ownerUsername: this.ownerUsername,
      pairingCode: this.pairingCode || this.getOrCreatePairingCode(),
      isLocked: !!(this.ownerUserId || this.ownerUsername),
    };
  }

  /**
   * Verify if a sender is authorized as the owner
   */
  public isUserAuthorized(senderId: string, senderUsername?: string): boolean {
    if (!this.ownerUserId && !this.ownerUsername) {
      return false;
    }

    if (this.ownerUserId && senderId === this.ownerUserId) {
      return true;
    }

    if (
      this.ownerUsername &&
      senderUsername &&
      senderUsername.toLowerCase() === this.ownerUsername.toLowerCase()
    ) {
      return true;
    }

    return false;
  }

  /**
   * Verify token and fetch bot metadata via getMe
   */
  public async verifyToken(token: string): Promise<TelegramBotInfo> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error('Telegram bot token cannot be empty');
    }

    const res = await fetch(`https://api.telegram.org/bot${trimmed}/getMe`);
    const data = await res.json();

    if (!data.ok || !data.result) {
      throw new Error(data.description || 'Invalid Telegram Bot Token');
    }

    const info: TelegramBotInfo = {
      id: data.result.id,
      username: data.result.username || '',
      firstName: data.result.first_name || 'Cards Bot',
    };

    this.botInfo = info;
    return info;
  }

  /**
   * Register native Telegram command menu ([/] Menu button)
   */
  public async registerCommands(token: string) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'sets', description: '📚 View all study sets' },
            { command: 'current', description: '🎯 Browse words in active set' },
            { command: 'newset', description: '➕ Create a new study set' },
            { command: 'stats', description: '📊 View study statistics' },
            { command: 'help', description: 'ℹ️ Show guide and commands' },
          ],
        }),
      });
    } catch (e) {
      console.warn('[Telegram Bot] Failed to register commands:', e);
    }
  }

  /**
   * Default persistent Reply Keyboard layout for Telegram users
   */
  private getDefaultReplyMarkup() {
    return {
      keyboard: [
        [{ text: '📚 Study Sets' }, { text: '🎯 Current Set' }],
        [{ text: '➕ New Set' }, { text: '📊 Stats' }, { text: 'ℹ️ Help' }],
      ],
      resize_keyboard: true,
      is_persistent: true,
    };
  }

  /**
   * Send a text message to a Telegram chat with optional buttons
   */
  public async sendMessage(
    chatId: number | string,
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown';
      replyMarkup?: any;
    }
  ): Promise<boolean> {
    if (!this.botToken) return false;

    try {
      const body: any = {
        chat_id: chatId,
        text,
        reply_markup: options?.replyMarkup || this.getDefaultReplyMarkup(),
      };
      if (options?.parseMode) {
        body.parse_mode = options.parseMode;
      }

      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.ok) {
        this.addLog({
          sender: this.botInfo?.username ? `@${this.botInfo.username}` : 'Bot',
          message: text.length > 80 ? text.substring(0, 80) + '...' : text,
          type: 'outgoing',
        });
      }
      return data.ok;
    } catch (e: any) {
      console.warn('[Telegram Bot] Failed sending message:', e);
      return false;
    }
  }

  /**
   * Edit existing message text and inline keyboard in-place (for seamless pagination)
   */
  public async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown';
      replyMarkup?: any;
    }
  ): Promise<boolean> {
    if (!this.botToken) return false;

    try {
      const body: any = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
      };

      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return data.ok;
    } catch (e) {
      console.warn('[Telegram Bot] Failed editing message:', e);
      return false;
    }
  }

  /**
   * Answer inline callback queries to clear Telegram button loading spinners
   */
  private async answerCallbackQuery(callbackQueryId: string, text?: string) {
    if (!this.botToken) return;
    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || '',
          show_alert: false,
        }),
      });
    } catch (e) {
      console.warn('[Telegram Bot] Failed answering callback query:', e);
    }
  }

  /**
   * Build text and inline pagination buttons for browsing cards of a study set
   */
  public buildPaginatedCardsPayload(set: StudySet, page: number = 1, pageSize: number = 6) {
    const totalCards = set.terms.length;
    const totalPages = Math.max(1, Math.ceil(totalCards / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages));

    let text = `🎯 <b>Active Study Set:</b> <b>${escapeHtml(set.title)}</b>\n`;
    text += `📚 Total Cards: <b>${totalCards}</b>`;
    if (totalCards > 0) {
      text += ` • Page <b>${currentPage}</b> of <b>${totalPages}</b>\n`;
    } else {
      text += `\n`;
    }

    if (set.description) {
      text += `<i>${escapeHtml(set.description)}</i>\n`;
    }

    if (totalCards === 0) {
      text += `\n<i>This set is empty right now.</i>\n`;
      text += `Send words to add cards:\n<code>word - translation</code>`;
    } else {
      text += `\n──────────────────\n`;
      const startIndex = (currentPage - 1) * pageSize;
      const pageTerms = set.terms.slice(startIndex, startIndex + pageSize);

      pageTerms.forEach((term, idx) => {
        const num = startIndex + idx + 1;
        text += `<b>#${num}.</b> <b>${escapeHtml(term.term)}</b>\n`;
        text += `👉 <i>${escapeHtml(term.definition)}</i>\n\n`;
      });
      text += `──────────────────\n`;
      text += `💡 <i>Send <code>term - definition</code> anytime to add more cards!</i>`;
    }

    // Build pagination inline buttons
    const inlineKeyboard: any[][] = [];

    if (totalPages > 1) {
      const navRow: any[] = [];
      if (currentPage > 1) {
        navRow.push({
          text: '⬅️ Prev',
          callback_data: `view_cards:${set.id}:${currentPage - 1}`,
        });
      }
      navRow.push({
        text: `📄 ${currentPage}/${totalPages}`,
        callback_data: `view_cards:${set.id}:${currentPage}`,
      });
      if (currentPage < totalPages) {
        navRow.push({
          text: 'Next ➡️',
          callback_data: `view_cards:${set.id}:${currentPage + 1}`,
        });
      }
      inlineKeyboard.push(navRow);
    }

    // Secondary controls
    inlineKeyboard.push([
      {
        text: '🔄 Refresh',
        callback_data: `view_cards:${set.id}:${currentPage}`,
      },
      {
        text: '📚 All Sets',
        callback_data: `list_sets`,
      },
    ]);

    return { text, inlineKeyboard };
  }

  /**
   * Start polling for messages (strictly idempotent)
   */
  public async start(
    token: string,
    handlers: TelegramBotHandlers,
    accessControl?: {
      ownerUserId?: string;
      ownerUsername?: string;
      pairingCode?: string;
    }
  ): Promise<TelegramBotInfo> {
    const trimmed = token.trim();
    this.handlers = handlers;

    if (accessControl) {
      if (accessControl.ownerUserId !== undefined) this.ownerUserId = accessControl.ownerUserId || null;
      if (accessControl.ownerUsername !== undefined) this.ownerUsername = accessControl.ownerUsername || null;
      if (accessControl.pairingCode !== undefined) this.pairingCode = accessControl.pairingCode || null;
    }
    this.getOrCreatePairingCode();

    // If already running with the exact same token, just update handlers and return
    if (this.isRunning && this.botToken === trimmed && this.botInfo) {
      return this.botInfo;
    }

    // Stop any previously active poll loops before starting a fresh one
    this.stop();

    this.botToken = trimmed;
    const info = await this.verifyToken(trimmed);
    this.isRunning = true;
    const instanceId = ++this.pollInstanceId;

    // Register native Telegram bot menu
    this.registerCommands(trimmed).catch(() => {});

    this.addLog({
      sender: 'System',
      message: `Telegram Bot @${info.username} connected. Polling started. Access mode: ${this.ownerUserId ? `Locked to ID ${this.ownerUserId}` : 'Waiting for owner pairing'}`,
      type: 'system',
    });

    this.poll(instanceId);
    return info;
  }

  /**
   * Stop polling
   */
  public stop() {
    this.isRunning = false;
    this.pollInstanceId++;
    if (this.pollingTimeoutId) {
      clearTimeout(this.pollingTimeoutId);
      this.pollingTimeoutId = null;
    }
    this.addLog({
      sender: 'System',
      message: 'Telegram Bot polling stopped.',
      type: 'system',
    });
  }

  /**
   * Polling loop with duplicate prevention and instance isolation
   */
  private async poll(instanceId: number) {
    if (!this.isRunning || !this.botToken || instanceId !== this.pollInstanceId) return;

    try {
      const offsetParam = this.lastUpdateId ? `&offset=${this.lastUpdateId}` : '';
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?timeout=10&allowed_updates=["message","callback_query"]${offsetParam}`;

      const res = await fetch(url);
      const data = await res.json();

      if (instanceId !== this.pollInstanceId || !this.isRunning) return;

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          // Prevent processing the same update multiple times
          if (this.processedUpdateIds.has(update.update_id)) {
            continue;
          }
          this.processedUpdateIds.add(update.update_id);
          if (this.processedUpdateIds.size > 500) {
            const first = Array.from(this.processedUpdateIds)[0];
            this.processedUpdateIds.delete(first);
          }

          this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id + 1);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cards_tg_last_update_id', String(this.lastUpdateId));
          }

          // Handle message
          if (update.message && update.message.text) {
            await this.handleIncomingMessage(update.message);
          }

          // Handle callback query from inline buttons
          if (update.callback_query) {
            await this.handleCallbackQuery(update.callback_query);
          }
        }
      }
    } catch (e: any) {
      console.debug('[Telegram Bot Polling]:', e?.message);
    }

    if (this.isRunning && instanceId === this.pollInstanceId) {
      this.pollingTimeoutId = setTimeout(() => this.poll(instanceId), 1500);
    }
  }

  /**
   * Handle Inline Keyboard clicks (pagination & set selection) with STRICT ACCESS CONTROL
   */
  private async handleCallbackQuery(callbackQuery: any) {
    const callbackId = callbackQuery.id;
    const data = callbackQuery.data || '';
    const chatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;
    const senderId = String(callbackQuery.from?.id || '');
    const senderUsername = callbackQuery.from?.username || '';
    const fromUser = senderUsername
      ? `@${senderUsername}`
      : callbackQuery.from?.first_name || 'User';

    // 🔒 STRICT OWNER CHECK: reject unauthorized button clicks
    if (!this.isUserAuthorized(senderId, senderUsername)) {
      await this.answerCallbackQuery(callbackId, '⛔️ Access Denied. Private Bot.');
      this.addLog({
        sender: 'Security',
        message: `⛔️ Blocked unauthorized button click from ${fromUser} (ID: ${senderId})`,
        type: 'error',
      });
      return;
    }

    if (!chatId || !this.handlers) {
      await this.answerCallbackQuery(callbackId);
      return;
    }

    // 1. Select a set & immediately open paginated cards
    if (data.startsWith('select_set:')) {
      const setId = data.replace('select_set:', '').trim();
      const sets = this.handlers.getSets();
      const target = sets.find((s) => s.id === setId);

      if (target) {
        this.setActiveSetId(target.id);
        await this.answerCallbackQuery(callbackId, `Selected: ${target.title}`);
        const payload = this.buildPaginatedCardsPayload(target, 1);

        if (messageId) {
          const edited = await this.editMessageText(chatId, messageId, payload.text, {
            parseMode: 'HTML',
            replyMarkup: { inline_keyboard: payload.inlineKeyboard },
          });
          if (!edited) {
            await this.sendMessage(chatId, payload.text, {
              parseMode: 'HTML',
              replyMarkup: { inline_keyboard: payload.inlineKeyboard },
            });
          }
        } else {
          await this.sendMessage(chatId, payload.text, {
            parseMode: 'HTML',
            replyMarkup: { inline_keyboard: payload.inlineKeyboard },
          });
        }
      } else {
        await this.answerCallbackQuery(callbackId, 'Set not found');
      }
      return;
    }

    // 2. Paginate cards in set
    if (data.startsWith('view_cards:')) {
      const parts = data.split(':');
      const setId = parts[1];
      const page = parseInt(parts[2], 10) || 1;
      const sets = this.handlers.getSets();
      const target = sets.find((s) => s.id === setId);

      if (target) {
        await this.answerCallbackQuery(callbackId);
        const payload = this.buildPaginatedCardsPayload(target, page);

        if (messageId) {
          const edited = await this.editMessageText(chatId, messageId, payload.text, {
            parseMode: 'HTML',
            replyMarkup: { inline_keyboard: payload.inlineKeyboard },
          });
          if (!edited) {
            await this.sendMessage(chatId, payload.text, {
              parseMode: 'HTML',
              replyMarkup: { inline_keyboard: payload.inlineKeyboard },
            });
          }
        }
      } else {
        await this.answerCallbackQuery(callbackId, 'Set not found');
      }
      return;
    }

    // 3. Switch back to all sets list
    if (data === 'list_sets') {
      await this.answerCallbackQuery(callbackId);
      const sets = this.handlers.getSets();

      if (sets.length === 0) {
        await this.sendMessage(chatId, 'No study sets found.');
        return;
      }

      let msg = `📚 <b>Your Study Sets (${sets.length}):</b>\n\n`;
      sets.forEach((s, idx) => {
        const isActive = s.id === this.activeSetId;
        const icon = isActive ? '🎯 <b>[ACTIVE]</b> ' : `${idx + 1}. `;
        msg += `${icon}<b>${escapeHtml(s.title)}</b> (${s.terms.length} cards)\n`;
      });
      msg += `\n<i>Tap a set below to browse its cards:</i>`;

      const inlineKeyboard = sets.slice(0, 12).map((s, idx) => [
        {
          text: `${s.id === this.activeSetId ? '🎯 ' : ''}${idx + 1}. ${s.title.substring(0, 22)} (${s.terms.length})`,
          callback_data: `select_set:${s.id}`,
        },
      ]);

      if (messageId) {
        const edited = await this.editMessageText(chatId, messageId, msg, {
          parseMode: 'HTML',
          replyMarkup: { inline_keyboard: inlineKeyboard },
        });
        if (!edited) {
          await this.sendMessage(chatId, msg, {
            parseMode: 'HTML',
            replyMarkup: { inline_keyboard: inlineKeyboard },
          });
        }
      } else {
        await this.sendMessage(chatId, msg, {
          parseMode: 'HTML',
          replyMarkup: { inline_keyboard: inlineKeyboard },
        });
      }
      return;
    }

    await this.answerCallbackQuery(callbackId);
  }

  /**
   * Parse and process Telegram user messages with STRICT ACCESS ENFORCEMENT
   */
  private async handleIncomingMessage(message: any) {
    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const senderId = String(message.from?.id || '');
    const senderUsername = message.from?.username || '';
    const fromUser = senderUsername
      ? `@${senderUsername}`
      : message.from?.first_name || 'Telegram User';

    const isAuthorized = this.isUserAuthorized(senderId, senderUsername);

    // 🔒 SCENARIO A: User is NOT yet verified as owner
    if (!isAuthorized) {
      const lower = text.toLowerCase();
      const currentPairCode = (this.pairingCode || this.getOrCreatePairingCode()).toLowerCase();

      // Check if owner is not locked yet, and sender is providing the pairing code:
      if (!this.ownerUserId && !this.ownerUsername) {
        const isPairingAttempt =
          lower.includes(currentPairCode) ||
          lower.startsWith('/pair') ||
          (lower.startsWith('/start ') && lower.includes(currentPairCode));

        if (isPairingAttempt) {
          const provided = lower.replace(/^\/(?:pair|start)\s*/i, '').trim();
          if (!currentPairCode || provided === currentPairCode || lower.includes(currentPairCode)) {
            // Lock and authorize this user!
            this.ownerUserId = senderId;
            this.ownerUsername = senderUsername || undefined;
            if (typeof window !== 'undefined') {
              localStorage.setItem('cards_telegram_owner_id', senderId);
              if (senderUsername) localStorage.setItem('cards_telegram_owner_username', senderUsername);
            }

            this.addLog({
              sender: 'Security',
              message: `Owner successfully paired: ${fromUser} (ID: ${senderId})`,
              type: 'system',
            });

            if (this.handlers?.onOwnerPaired) {
              await this.handlers.onOwnerPaired(senderId, senderUsername);
            }

            await this.sendMessage(
              chatId,
              `🔒 <b>Authorized Owner Verified!</b>\n\n` +
                `Welcome, <b>${escapeHtml(fromUser)}</b>! You are now the verified owner of this Cards bot.\n\n` +
                `🛡️ <b>Access Restricted:</b> All other Telegram users are strictly blocked and cannot get any response.\n\n` +
                `Use the buttons below to study your sets and add words:`,
              { parseMode: 'HTML' }
            );
            return;
          }
        }

        // Owner not yet paired: inform user how to pair
        await this.sendMessage(
          chatId,
          `🔒 <b>Private Cards Bot</b>\n\n` +
            `This bot is private. To link it with your Cards workspace, send your Pairing Code from the app:\n\n` +
            `<code>/pair ${this.pairingCode || this.getOrCreatePairingCode()}</code>\n\n` +
            `Or click the link in your Cards app Telegram settings.`,
          { parseMode: 'HTML' }
        );
        return;
      }

      // SCENARIO B: Owner IS already locked, and an unauthorized stranger messaged the bot!
      // Requirement: "что би никто кроме того, кто добавил его и апи токеен, не мог получить от него ответ"
      // SILENT DROP: No response sent to stranger. Logged to Security in web app.
      this.addLog({
        sender: 'Security',
        message: `⛔️ Blocked stranger ${fromUser} (ID: ${senderId}): "${text.length > 30 ? text.substring(0, 30) + '...' : text}"`,
        type: 'error',
      });
      return; // Do not send any reply!
    }

    // User is authorized owner: log incoming message and proceed
    this.addLog({
      sender: fromUser,
      message: text,
      type: 'incoming',
    });

    if (!this.handlers) return;

    const lower = text.toLowerCase();

    // 1. /start or /help or button "ℹ️ Help"
    if (lower === '/start' || lower === '/help' || lower === 'ℹ️ help' || lower === 'help') {
      const welcome =
        `👋 <b>Welcome to Cards Study Bot!</b>\n\n` +
        `I am connected directly to your Cards web app & Google Sheets.\n\n` +
        `<b>Available Commands & Menu:</b>\n` +
        `📚 <b>/sets</b> — View all study sets\n` +
        `🎯 <b>/current</b> — Browse words in active set (with pagination 📄)\n` +
        `📌 <b>/select &lt;number or title&gt;</b> — Select active set\n` +
        `➕ <b>/newset &lt;title&gt;</b> — Create a new study set\n` +
        `📝 <b>/add &lt;term&gt; - &lt;definition&gt;</b> — Add a flashcard\n` +
        `📊 <b>/stats</b> — View study statistics\n` +
        `ℹ️ <b>/help</b> — Show this guide\n\n` +
        `💡 <i>Quick Card Adding:</i> Send words separated by a dash or colon:\n` +
        `<code>bonjour - hello</code>\n` +
        `and it will automatically be added to your active set!`;

      await this.sendMessage(chatId, welcome, { parseMode: 'HTML' });
      return;
    }

    // 2. /sets or /list or button "📚 Study Sets"
    if (
      lower === '/sets' ||
      lower === '/list' ||
      lower === '📚 study sets' ||
      lower === 'study sets' ||
      lower === 'sets'
    ) {
      const sets = this.handlers.getSets();
      if (sets.length === 0) {
        await this.sendMessage(
          chatId,
          `📚 You don't have any study sets yet.\nCreate one with:\n<code>/newset My First Set</code>`,
          { parseMode: 'HTML' }
        );
        return;
      }

      let activeSet = sets.find((s) => s.id === this.activeSetId);
      if (!activeSet && sets.length > 0) {
        activeSet = sets[0];
        this.setActiveSetId(activeSet.id);
      }

      let msg = `📚 <b>Your Study Sets (${sets.length}):</b>\n\n`;
      sets.forEach((s, idx) => {
        const isActive = s.id === this.activeSetId;
        const icon = isActive ? '🎯 <b>[ACTIVE]</b> ' : `${idx + 1}. `;
        msg += `${icon}<b>${escapeHtml(s.title)}</b> (${s.terms.length} cards)\n`;
      });

      msg += `\n<i>Tap a set below to browse its words page-by-page:</i>`;

      // Build inline buttons for direct 1-tap set selection & browsing
      const inlineKeyboard = sets.slice(0, 12).map((s, idx) => [
        {
          text: `${s.id === this.activeSetId ? '🎯 ' : ''}${idx + 1}. ${s.title.substring(0, 22)} (${s.terms.length})`,
          callback_data: `select_set:${s.id}`,
        },
      ]);

      await this.sendMessage(chatId, msg, {
        parseMode: 'HTML',
        replyMarkup: { inline_keyboard: inlineKeyboard },
      });
      return;
    }

    // 3. /current, /words, /cards or button "🎯 Current Set"
    if (
      lower === '/current' ||
      lower === '/words' ||
      lower === '/cards' ||
      lower === '🎯 current set' ||
      lower === 'current set' ||
      lower === 'current'
    ) {
      const sets = this.handlers.getSets();
      const current = sets.find((s) => s.id === this.activeSetId) || sets[0];

      if (!current) {
        await this.sendMessage(
          chatId,
          `No sets found. Create one with:\n<code>/newset My Set</code>`,
          { parseMode: 'HTML' }
        );
        return;
      }

      this.setActiveSetId(current.id);
      const payload = this.buildPaginatedCardsPayload(current, 1);
      await this.sendMessage(chatId, payload.text, {
        parseMode: 'HTML',
        replyMarkup: { inline_keyboard: payload.inlineKeyboard },
      });
      return;
    }

    // 4. Button "➕ New Set"
    if (lower === '➕ new set' || lower === 'new set') {
      await this.sendMessage(
        chatId,
        `➕ <b>Create New Study Set</b>\n\n` +
          `Please send the command with your set title, for example:\n` +
          `<code>/newset French Vocabulary</code>\n` +
          `or\n<code>/newset German B1</code>`,
        { parseMode: 'HTML' }
      );
      return;
    }

    // 5. /newset <title> or /create <title>
    if (lower.startsWith('/newset ') || lower.startsWith('/create ')) {
      const title = text.replace(/^\/(?:newset|create)\s+/i, '').trim();
      if (!title) {
        await this.sendMessage(
          chatId,
          `⚠️ Please specify a set title. Example:\n<code>/newset French Vocabulary</code>`,
          { parseMode: 'HTML' }
        );
        return;
      }

      const res = await this.handlers.onCreateSet(title);
      if (res.success && res.newSet) {
        this.setActiveSetId(res.newSet.id);
        const payload = this.buildPaginatedCardsPayload(res.newSet, 1);
        await this.sendMessage(
          chatId,
          `✅ <b>Study Set Created!</b>\n\nTitle: <b>${escapeHtml(res.newSet.title)}</b>\n` +
            `It is now your 🎯 <b>Active Set</b>.\n\n` +
            `Now add words by sending:\n<code>bonjour - hello</code>`,
          {
            parseMode: 'HTML',
            replyMarkup: { inline_keyboard: payload.inlineKeyboard },
          }
        );
      } else {
        await this.sendMessage(chatId, `❌ Failed to create set: ${res.error || 'Unknown error'}`);
      }
      return;
    }

    // 6. /select <index or title>
    if (lower.startsWith('/select ')) {
      const query = text.replace(/^\/select\s+/i, '').trim();
      const sets = this.handlers.getSets();

      if (sets.length === 0) {
        await this.sendMessage(chatId, `No study sets available.`);
        return;
      }

      let targetSet: StudySet | undefined;
      const index = parseInt(query, 10);
      if (!isNaN(index) && index >= 1 && index <= sets.length) {
        targetSet = sets[index - 1];
      } else {
        targetSet = sets.find(
          (s) => s.title.toLowerCase().includes(query.toLowerCase()) || s.id === query
        );
      }

      if (targetSet) {
        this.setActiveSetId(targetSet.id);
        const payload = this.buildPaginatedCardsPayload(targetSet, 1);
        await this.sendMessage(
          chatId,
          payload.text,
          {
            parseMode: 'HTML',
            replyMarkup: { inline_keyboard: payload.inlineKeyboard },
          }
        );
      } else {
        await this.sendMessage(
          chatId,
          `⚠️ Could not find a set matching "${query}". Send <code>/sets</code> to view all sets.`,
          { parseMode: 'HTML' }
        );
      }
      return;
    }

    // 7. /stats or button "📊 Stats"
    if (lower === '/stats' || lower === '📊 stats' || lower === 'stats') {
      const stats = this.handlers.getStats();
      const sets = this.handlers.getSets();
      const totalCards = sets.reduce((acc, s) => acc + s.terms.length, 0);

      const msg =
        `📊 <b>Your Cards Statistics:</b>\n\n` +
        `📚 Study Sets: <b>${sets.length}</b>\n` +
        `🃏 Total Flashcards: <b>${totalCards}</b>\n` +
        `🔥 Current Streak: <b>${stats?.streakDays || 0} days</b>\n` +
        `🧠 Cards Practiced: <b>${stats?.totalCardsStudied || 0}</b>\n` +
        `🏆 Tests Completed: <b>${stats?.testsCompleted || 0}</b>\n` +
        `⚡ Match Games Won: <b>${stats?.matchesWon || 0}</b>`;

      await this.sendMessage(chatId, msg, { parseMode: 'HTML' });
      return;
    }

    // 8. /add <term> - <definition> or plain <term> - <definition>
    let cardContent = text;
    if (lower.startsWith('/add ')) {
      cardContent = text.replace(/^\/add\s+/i, '').trim();
    }

    // Check for delimiter: " - ", " : ", or "\t"
    let term = '';
    let definition = '';

    if (cardContent.includes('\t')) {
      const parts = cardContent.split('\t');
      term = parts[0]?.trim();
      definition = parts.slice(1).join('\t').trim();
    } else if (cardContent.includes(' - ')) {
      const parts = cardContent.split(' - ');
      term = parts[0]?.trim();
      definition = parts.slice(1).join(' - ').trim();
    } else if (cardContent.includes(' — ')) {
      const parts = cardContent.split(' — ');
      term = parts[0]?.trim();
      definition = parts.slice(1).join(' — ').trim();
    } else if (cardContent.includes(': ')) {
      const parts = cardContent.split(': ');
      term = parts[0]?.trim();
      definition = parts.slice(1).join(': ').trim();
    }

    if (term && definition) {
      const sets = this.handlers.getSets();
      let targetSet = sets.find((s) => s.id === this.activeSetId);

      if (!targetSet && sets.length > 0) {
        targetSet = sets[0];
        this.setActiveSetId(targetSet.id);
      }

      if (!targetSet) {
        // Automatically create a default set if user has none
        const createRes = await this.handlers.onCreateSet('Telegram Flashcards');
        if (createRes.success && createRes.newSet) {
          targetSet = createRes.newSet;
          this.setActiveSetId(targetSet.id);
        }
      }

      if (!targetSet) {
        await this.sendMessage(
          chatId,
          `⚠️ No study set available. Please create one first with:\n<code>/newset My Vocabulary</code>`,
          { parseMode: 'HTML' }
        );
        return;
      }

      const res = await this.handlers.onAddCard(targetSet.id, term, definition);

      if (res.success) {
        const updatedTarget = {
          ...targetSet,
          terms: [...targetSet.terms, { id: `term-${Date.now()}`, term, definition }],
        };
        const lastPage = Math.max(1, Math.ceil(res.totalCards / 6));
        const payload = this.buildPaginatedCardsPayload(updatedTarget, lastPage);

        await this.sendMessage(
          chatId,
          `✅ <b>Card Added to "${escapeHtml(res.setTitle)}"!</b>\n\n` +
            `<b>Term:</b> ${escapeHtml(term)}\n` +
            `<b>Definition:</b> ${escapeHtml(definition)}\n\n` +
            `Total cards in set: <b>${res.totalCards}</b>`,
          {
            parseMode: 'HTML',
            replyMarkup: { inline_keyboard: payload.inlineKeyboard },
          }
        );
      } else {
        await this.sendMessage(chatId, `❌ Failed to save card: ${res.error || 'Unknown error'}`);
      }
      return;
    }

    // Unrecognized text
    await this.sendMessage(
      chatId,
      `🤔 I didn't recognize that message.\n\n` +
        `To add a card, send:\n<code>term - definition</code>\n\n` +
        `Or use the menu buttons below ⬇️`,
      { parseMode: 'HTML' }
    );
  }
}

export const telegramBotManager = new TelegramBotManager();
