/**
 * Voice selection and speech synthesis engine
 * Provides male and female voices for English, Spanish, and French.
 * Tag-based voice mapping:
 * - EN-FEMALE: English Female Voice
 * - EN-MALE: English Male Voice
 * - ES-FEMALE: Spanish Female Voice
 * - ES-MALE: Spanish Male Voice
 * - FR-FEMALE: French Female Voice
 * - FR-MALE: French Male Voice
 */

export interface VoiceOption {
  tag: string;
  name: string;
  language: string;
  gender: 'female' | 'male';
  langCode: string; // e.g. 'es-ES', 'fr-FR', 'en-US'
  targetLangShort: 'es' | 'fr' | 'en';
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { tag: 'EN-FEMALE', name: 'English (US) - Female', language: 'English', gender: 'female', langCode: 'en-US', targetLangShort: 'en' },
  { tag: 'EN-MALE', name: 'English (US) - Male', language: 'English', gender: 'male', langCode: 'en-US', targetLangShort: 'en' },
  { tag: 'ES-FEMALE', name: 'Spanish (ES) - Female', language: 'Spanish', gender: 'female', langCode: 'es-ES', targetLangShort: 'es' },
  { tag: 'ES-MALE', name: 'Spanish (ES) - Male', language: 'Spanish', gender: 'male', langCode: 'es-ES', targetLangShort: 'es' },
  { tag: 'FR-FEMALE', name: 'French (FR) - Female', language: 'French', gender: 'female', langCode: 'fr-FR', targetLangShort: 'fr' },
  { tag: 'FR-MALE', name: 'French (FR) - Male', language: 'French', gender: 'male', langCode: 'fr-FR', targetLangShort: 'fr' },
];

/**
 * Determine the configured voice option from study set tags.
 * Checks for explicit voice tags (e.g. ES-FEMALE, FR-MALE),
 * as well as common tags (ES, SPANISH, FR, FRENCH, EN, ENGLISH).
 */
export function getVoiceConfigFromTags(tags: string[] = []): VoiceOption {
  if (!Array.isArray(tags)) {
    return AVAILABLE_VOICES[0];
  }

  // 1. Exact match on voice tag (e.g. 'ES-FEMALE', 'ES-MALE', 'FR-FEMALE', 'FR-MALE')
  for (const rawTag of tags) {
    if (!rawTag) continue;
    const t = String(rawTag).trim().toUpperCase();
    const found = AVAILABLE_VOICES.find((v) => v.tag === t);
    if (found) return found;
  }

  // 2. Match on language abbreviations in tags
  for (const rawTag of tags) {
    if (!rawTag) continue;
    const t = String(rawTag).trim().toUpperCase();
    if (t === 'ES' || t === 'SPANISH' || t === 'ESP' || t === 'ESPAÑOL' || t === 'ESPANOL' || t.includes('SPANISH')) {
      return AVAILABLE_VOICES.find((v) => v.tag === 'ES-FEMALE')!;
    }
    if (t === 'FR' || t === 'FRENCH' || t === 'FRA' || t === 'FRANCAIS' || t === 'FRANÇAIS' || t.includes('FRENCH')) {
      return AVAILABLE_VOICES.find((v) => v.tag === 'FR-FEMALE')!;
    }
    if (t === 'EN' || t === 'ENGLISH' || t === 'ENG' || t.includes('ENGLISH')) {
      return AVAILABLE_VOICES.find((v) => v.tag === 'EN-FEMALE')!;
    }
  }

  // Default to English female
  return AVAILABLE_VOICES[0];
}

export function getLanguageFromTags(tags: string[] = []): string {
  return getVoiceConfigFromTags(tags).langCode;
}

// In-memory cache for voices loaded via 'voiceschanged'
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const updateVoices = () => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
    } catch (e) {
      // Ignore
    }
  };

  updateVoices();
  window.speechSynthesis.onvoiceschanged = updateVoices;
}

/**
 * Helper to get available SpeechSynthesis voices safely
 */
function getSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  let v = window.speechSynthesis.getVoices();
  if (!v || v.length === 0) {
    v = cachedVoices;
  }
  return v || [];
}

/**
 * Pick the best matching voice for a given target language prefix and gender.
 */
function pickBestVoice(langPrefix: string, gender: 'female' | 'male'): SpeechSynthesisVoice | undefined {
  const voices = getSpeechVoices();
  if (voices.length === 0) return undefined;

  // Filter voices that match the language prefix (e.g. 'es', 'fr', 'en')
  const langVoices = voices.filter((v) => {
    const l = (v.lang || '').toLowerCase().replace('_', '-');
    return l.startsWith(langPrefix + '-') || l === langPrefix;
  });

  if (langVoices.length === 0) {
    return undefined;
  }

  const maleKeywords = [
    'male', 'guy', 'david', 'george', 'thomas', 'jorge', 'pablo', 'henri',
    'nicolas', 'alain', 'bernard', 'raul', 'diego', 'miguel', 'carlos',
    'enrique', 'antoine', 'pierre', 'louis', 'julien', 'natural'
  ];
  const femaleKeywords = [
    'female', 'woman', 'zira', 'susan', 'monica', 'laura', 'carmen', 'lucia',
    'celine', 'amelie', 'marie', 'helen', 'clara', 'paulina', 'helena',
    'soledad', 'conchita', 'hortense', 'lea', 'charlotte'
  ];

  const targetKeywords = gender === 'male' ? maleKeywords : femaleKeywords;
  const oppKeywords = gender === 'male' ? femaleKeywords : maleKeywords;

  // 1. Voice matching target gender keyword in name
  const genderMatched = langVoices.find((v) => {
    const n = v.name.toLowerCase();
    return targetKeywords.some((kw) => n.includes(kw));
  });
  if (genderMatched) return genderMatched;

  // 2. Voice that does NOT have the opposite gender keyword
  const nonOpposite = langVoices.find((v) => {
    const n = v.name.toLowerCase();
    return !oppKeywords.some((kw) => n.includes(kw));
  });
  if (nonOpposite) return nonOpposite;

  // 3. Fallback to first voice for this language
  return langVoices[0];
}

/**
 * Speaks text in the specified language (Spanish, French, English, etc.)
 * and gender (female/male) using the native browser Web Speech API.
 * Completely client-side, zero latency, free, and works offline.
 */
export function speakText(text: string, voiceOrTagOrConfig?: string | VoiceOption): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser environment.');
    return;
  }

  const cleanText = (text || '').trim();
  if (!cleanText) return;

  // Cancel any ongoing speech synthesis
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    // Ignore
  }

  // Resolve target voice option
  let voiceOpt: VoiceOption;
  if (typeof voiceOrTagOrConfig === 'object' && voiceOrTagOrConfig !== null) {
    voiceOpt = voiceOrTagOrConfig;
  } else if (typeof voiceOrTagOrConfig === 'string') {
    const matching = AVAILABLE_VOICES.find(
      (v) =>
        v.tag.toUpperCase() === voiceOrTagOrConfig.toUpperCase() ||
        v.langCode.toLowerCase() === voiceOrTagOrConfig.toLowerCase()
    );
    if (matching) {
      voiceOpt = matching;
    } else {
      const s = voiceOrTagOrConfig.toLowerCase();
      if (s.startsWith('es')) {
        voiceOpt = AVAILABLE_VOICES.find((v) => v.tag === 'ES-FEMALE')!;
      } else if (s.startsWith('fr')) {
        voiceOpt = AVAILABLE_VOICES.find((v) => v.tag === 'FR-FEMALE')!;
      } else {
        voiceOpt = AVAILABLE_VOICES[0];
      }
    }
  } else {
    voiceOpt = AVAILABLE_VOICES[0];
  }

  const targetPrefix = voiceOpt.targetLangShort; // 'es', 'fr', 'en'
  const bestVoice = pickBestVoice(targetPrefix, voiceOpt.gender);

  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang || voiceOpt.langCode;
    } else {
      utterance.lang = voiceOpt.langCode;
    }

    utterance.rate = 0.95;
    utterance.pitch = voiceOpt.gender === 'male' ? 0.88 : 1.06;

    // Workaround for Chrome bug where long speech pauses or cancels prematurely
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('SpeechSynthesis speak failed:', err);
  }
}
