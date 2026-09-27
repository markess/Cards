import { StudySet } from '../types';

/**
 * Fetch and parse a Quenti study set directly in the browser.
 * Uses public trpc endpoint with proxy fallbacks if CORS headers are restricted.
 */
export async function fetchQuentiStudySet(urlOrId: string): Promise<StudySet> {
  const raw = urlOrId.trim();
  if (!raw) {
    throw new Error('Please enter a Quenti URL or set ID');
  }

  let setId = raw;
  const urlMatch = raw.match(/(?:app\.quenti\.io\/(?:sets\/)?|quenti\.io\/(?:sets\/)?)([a-zA-Z0-9_-]{10,40})/);
  if (urlMatch && urlMatch[1]) {
    setId = urlMatch[1];
  } else {
    setId = setId.split('?')[0].replace(/\/+$/, '').split('/').pop() || setId;
  }

  const inputObj = {
    '0': {
      json: {
        studySetId: setId,
        withDistractors: false,
        withCollab: false,
      },
    },
  };

  const endpoint = `https://app.quenti.io/api/trpc/studySets.getPublic?batch=1&input=${encodeURIComponent(
    JSON.stringify(inputObj)
  )}`;

  // Candidate fetch URLs: direct first, then CORS proxies
  const candidateUrls = [
    endpoint,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(endpoint)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(endpoint)}`,
  ];

  let setPayload: any = null;
  let lastError: Error | null = null;

  for (const fetchUrl of candidateUrls) {
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) continue;

      const json = await res.json();
      const payload = json?.[0]?.result?.data?.json;
      if (payload && Array.isArray(payload.terms)) {
        setPayload = payload;
        break;
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  if (!setPayload) {
    throw new Error(
      lastError?.message ||
        'Could not load set from Quenti. Make sure the set is public or paste the cards manually.'
    );
  }

  const terms = (setPayload.terms || []).map((t: any, idx: number) => ({
    id: `term-q-${Date.now()}-${idx}`,
    term: t.word || t.term || `Term ${idx + 1}`,
    definition: t.definition || '',
    starred: false,
  }));

  return {
    id: `set-quenti-${setPayload.id || Date.now()}`,
    title: setPayload.title || 'Imported Quenti Set',
    description: setPayload.description || `Imported from Quenti (${terms.length} cards)`,
    author: setPayload.user?.username || 'quenti',
    tags: Array.isArray(setPayload.tags) && setPayload.tags.length > 0 ? setPayload.tags : ['Quenti', 'Imported'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    terms,
  };
}
