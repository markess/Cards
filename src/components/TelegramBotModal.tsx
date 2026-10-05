import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Power,
  Play,
  Pause,
  Key,
  Eye,
  EyeOff,
  BookOpen,
  Plus,
  HelpCircle,
  Clock,
  Sparkles,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Lock,
  Unlock,
  Copy
} from 'lucide-react';
import { StudySet } from '../types';
import { telegramBotManager, TelegramBotInfo, TelegramLogEntry } from '../services/telegramBotService';

interface TelegramBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  botToken: string;
  botUsername?: string;
  ownerUserId?: string;
  ownerUsername?: string;
  pairingCode?: string;
  sets: StudySet[];
  onSaveConfig: (config: {
    botToken: string;
    botUsername?: string;
    ownerUserId?: string;
    ownerUsername?: string;
    pairingCode?: string;
  }) => Promise<void>;
  onDeleteToken: () => Promise<void>;
}

export const TelegramBotModal: React.FC<TelegramBotModalProps> = ({
  isOpen,
  onClose,
  botToken,
  botUsername,
  ownerUserId: initialOwnerId,
  ownerUsername: initialOwnerUsername,
  pairingCode: initialPairCode,
  sets,
  onSaveConfig,
  onDeleteToken,
}) => {
  const [tokenInput, setTokenInput] = useState(botToken);
  const [showToken, setShowToken] = useState(false);
  const [manualOwnerInput, setManualOwnerInput] = useState(initialOwnerId || initialOwnerUsername || '');
  const [showManualOwnerInput, setShowManualOwnerInput] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [logs, setLogs] = useState<TelegramLogEntry[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(telegramBotManager.getActiveSetId());
  const [isPolling, setIsPolling] = useState<boolean>(telegramBotManager.getIsRunning());
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(telegramBotManager.getBotInfo());

  // Access control state from telegramBotManager
  const accessControl = telegramBotManager.getAccessControl();
  const currentOwnerId = accessControl.ownerUserId || initialOwnerId || '';
  const currentOwnerUsername = accessControl.ownerUsername || initialOwnerUsername || '';
  const isOwnerLocked = !!(currentOwnerId || currentOwnerUsername);
  const pairCode = accessControl.pairingCode || initialPairCode || telegramBotManager.getOrCreatePairingCode();

  // Keep tokenInput in sync when opened or prop updates
  useEffect(() => {
    setTokenInput(botToken);
  }, [botToken]);

  // Subscribe to live Telegram logs while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = telegramBotManager.subscribeLogs((newLogs) => {
      setLogs([...newLogs]);
    });
    setBotInfo(telegramBotManager.getBotInfo());
    setIsPolling(telegramBotManager.getIsRunning());
    setActiveSetId(telegramBotManager.getActiveSetId());
    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setStatusMessage({ text: 'Please enter a valid Telegram Bot Token.', type: 'error' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const verified = await telegramBotManager.verifyToken(trimmed);
      setBotInfo(verified);

      // Save to Google Drive cards_telegram & localStorage
      await onSaveConfig({
        botToken: trimmed,
        botUsername: verified.username,
        ownerUserId: currentOwnerId || undefined,
        ownerUsername: currentOwnerUsername || undefined,
        pairingCode: pairCode,
      });

      setStatusMessage({
        text: `Bot @${verified.username} successfully connected and saved to Google Drive (cards_telegram)!`,
        type: 'success',
      });
      setIsPolling(true);
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to verify Telegram Bot Token. Make sure it is correct.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManualOwner = async () => {
    const trimmed = manualOwnerInput.trim().replace(/^@/, '');
    if (!trimmed) return;

    const isNumeric = /^\d+$/.test(trimmed);
    const updatedOwnerId = isNumeric ? trimmed : undefined;
    const updatedOwnerUsername = !isNumeric ? trimmed : undefined;

    telegramBotManager.setAccessControl({
      ownerUserId: updatedOwnerId,
      ownerUsername: updatedOwnerUsername,
    });

    await onSaveConfig({
      botToken: tokenInput.trim() || botToken,
      botUsername: botInfo?.username || botUsername,
      ownerUserId: updatedOwnerId,
      ownerUsername: updatedOwnerUsername,
      pairingCode: pairCode,
    });

    setShowManualOwnerInput(false);
    setStatusMessage({
      text: `Access locked to ${updatedOwnerUsername ? `@${updatedOwnerUsername}` : `ID: ${updatedOwnerId}`}. All other users are blocked.`,
      type: 'success',
    });
  };

  const handleResetOwner = async () => {
    if (!window.confirm('Reset owner access? The bot will unlock and wait for a new pairing code.')) {
      return;
    }

    const newCode = `CARD-${Math.floor(1000 + Math.random() * 9000)}`;
    telegramBotManager.setAccessControl({
      ownerUserId: null,
      ownerUsername: null,
      pairingCode: newCode,
    });

    await onSaveConfig({
      botToken: tokenInput.trim() || botToken,
      botUsername: botInfo?.username || botUsername,
      ownerUserId: undefined,
      ownerUsername: undefined,
      pairingCode: newCode,
    });

    setManualOwnerInput('');
    setStatusMessage({
      text: 'Owner access reset. Send the new pairing code to lock to a new account.',
      type: 'success',
    });
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove the Telegram Bot Token from Google Drive? The bot will stop.')) {
      return;
    }

    setIsDeleting(true);
    setStatusMessage(null);

    try {
      telegramBotManager.stop();
      await onDeleteToken();
      setTokenInput('');
      setBotInfo(null);
      setIsPolling(false);
      setStatusMessage({
        text: 'Telegram Bot Token removed from Google Drive (cards_telegram) and local storage.',
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to remove bot token from Google Drive.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePolling = () => {
    if (isPolling) {
      telegramBotManager.stop();
      setIsPolling(false);
    } else {
      if (tokenInput.trim()) {
        handleTestAndSave();
      }
    }
  };

  const handleSelectActiveSet = (id: string) => {
    setActiveSetId(id);
    telegramBotManager.setActiveSetId(id);
  };

  const handleCopyPairCode = () => {
    navigator.clipboard.writeText(`/pair ${pairCode}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center shadow-sm">
              <Send className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Telegram Bot Integration</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Google Drive Synced
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your flashcards and add words on-the-go with strict owner privacy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Status Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    botToken && isPolling
                      ? 'bg-emerald-500 animate-pulse'
                      : botToken
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  {botToken && isPolling ? (
                    <span>Bot Active &amp; Polling</span>
                  ) : botToken ? (
                    <span>Bot Connected (Polling Paused)</span>
                  ) : (
                    <span>No Bot Configured</span>
                  )}
                  {botInfo?.username && (
                    <span className="font-mono text-sky-600 dark:text-sky-400 text-xs">
                      @{botInfo.username}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Config saved in Google Drive: <code className="font-mono font-medium text-emerald-600 dark:text-emerald-400">cards_telegram</code></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {botInfo?.username && (
                <a
                  href={`https://t.me/${botInfo.username}${!isOwnerLocked ? `?start=${pairCode}` : ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-sky-500/20 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Telegram</span>
                </a>
              )}

              {botToken && (
                <button
                  type="button"
                  onClick={handleTogglePolling}
                  className={`p-2 rounded-xl border transition-colors ${
                    isPolling
                      ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                      : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                  title={isPolling ? 'Pause polling' : 'Resume polling'}
                >
                  {isPolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* 🔒 Strict Access Control Section */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Owner Access Restriction (Приватний доступ)
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isOwnerLocked
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}>
                {isOwnerLocked ? '🔒 Private (Owner Locked)' : '🔑 Waiting for Pairing'}
              </span>
            </div>

            {isOwnerLocked ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/60">
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Authorized Owner: {currentOwnerUsername ? `@${currentOwnerUsername}` : `Telegram ID: ${currentOwnerId}`}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {currentOwnerId ? `User ID: ${currentOwnerId}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetOwner}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold transition-colors"
                  >
                    Reset / Re-pair
                  </button>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Strict protection enabled: Messages from all other Telegram accounts are silently blocked and receive zero response.</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  To ensure <b>no one else can view your cards or talk to your bot</b>, pair your Telegram account right now using your unique code:
                </p>

                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      Send to your bot in Telegram:
                    </span>
                    <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      /pair {pairCode}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPairCode}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Command'}</span>
                  </button>
                  {botInfo?.username && (
                    <a
                      href={`https://t.me/${botInfo.username}?start=${pairCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Send className="w-3.5 h-3.5 -rotate-12" />
                      <span>1-Click Pair in Telegram</span>
                    </a>
                  )}
                </div>

                <div className="pt-1">
                  {!showManualOwnerInput ? (
                    <button
                      type="button"
                      onClick={() => setShowManualOwnerInput(true)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Or manually enter your Telegram ID / @username ⚙️
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 pt-1 animate-fade-in">
                      <input
                        type="text"
                        value={manualOwnerInput}
                        onChange={(e) => setManualOwnerInput(e.target.value)}
                        placeholder="e.g. maxim1nts or 123456789"
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveManualOwner}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Lock
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualOwnerInput(false)}
                        className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Token Configuration Section */}
          <form onSubmit={handleTestAndSave} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                <span>Telegram Bot API Token</span>
              </label>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Get token from @BotFather</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full pl-3.5 pr-20 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              API key and owner access ID are stored exclusively on your personal Google Drive in <code className="font-mono text-emerald-600">cards_telegram</code>.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSaving || !tokenInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying &amp; Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save to Google Drive &amp; Connect</span>
                  </>
                )}
              </button>

              {botToken && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-semibold text-xs transition-colors flex items-center gap-1.5 ml-auto"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete Key from Drive</span>
                </button>
              )}
            </div>
          </form>

          {/* Feedback status */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Active Set Selector */}
          {sets.length > 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Default Target Study Set for Telegram Cards</span>
                <span className="text-[11px] text-slate-400 font-normal">Can also be switched with /select</span>
              </label>
              <select
                value={activeSetId || (sets[0]?.id ?? '')}
                onChange={(e) => handleSelectActiveSet(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.terms.length} cards)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Activity & Security Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Live Activity &amp; Security Log</span>
              </h3>
              <span className="text-[10px] text-slate-400">
                {logs.length > 0 ? `${logs.length} events` : 'Listening for messages...'}
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2 font-mono text-[11px]">
              {logs.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No activity yet. Send a message to your bot in Telegram!
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="py-1.5 px-2 flex items-start gap-2">
                    <span className="text-slate-400 text-[10px] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.type === 'incoming'
                          ? 'text-sky-600 dark:text-sky-400'
                          : log.type === 'outgoing'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : log.type === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {log.sender}:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>

          {botInfo?.username && (
            <a
              href={`https://t.me/${botInfo.username}${!isOwnerLocked ? `?start=${pairCode}` : ''}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/30 transition-all"
            >
              <Send className="w-3.5 h-3.5 -rotate-12" />
              <span>{isOwnerLocked ? `Chat with @${botInfo.username}` : `Pair & Chat with @${botInfo.username}`}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
