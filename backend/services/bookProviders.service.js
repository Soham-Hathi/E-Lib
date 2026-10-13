/**
 * Unified Multi-Provider Book Discovery Architecture
 * Provides normalized catalog integration across:
 * - Gutendex (Project Gutenberg public domain works)
 * - Open Library (Bibliographic metadata & covers)
 * - Google Books API (Previews, free/paid e-books)
 * - Directory of Open Access Books (DOAB)
 * 
 * Features:
 * - Common schema normalization
 * - In-memory LRU/TTL caching (10 min expiry)
 * - Polite User-Agent headers
 * - Strict timeout enforcement via AbortSignal
 * - Resilient failure isolation (one provider outage does not fail others)
 */

// In-memory cache with TTL (10 minutes)
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

const USER_AGENT = 'ELibrary-UnifiedCatalog/1.0 (academic-discovery; contact@elibrary.local)';

const getCached = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const setCached = (key, data) => {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Standard Normalized Schema:
 * {
 *   source: string,
 *   sourceId: string,
 *   title: string,
 *   authors: string[],
 *   description: string | null,
 *   isbn: string | null,
 *   publisher: string | null,
 *   publishedDate: string | null,
 *   categories: string[],
 *   coverImage: string | null,
 *   language: string,
 *   accessType: 'free_download' | 'preview_only' | 'external_purchase' | 'open_access' | 'metadata_only',
 *   rightsStatus: 'verified_public_domain' | 'verified_open_license' | 'external_preview_only' | 'rights_pending' | 'unknown',
 *   licenseUrl: string | null,
 *   previewUrl: string | null,
 *   downloadUrl: string | null,
 *   purchaseUrl: string | null,
 *   sourceUrl: string,
 *   price: number | null,
 *   currency: string | null,
 * }
 */

// --- 1. Gutendex Adapter (Project Gutenberg) ---
export const searchGutendex = async (query = '', page = 1) => {
  try {
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&page=${page}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`[Gutendex] HTTP ${res.status}`);
      return { total: 0, items: [] };
    }

    const data = await res.json();
    const items = (data.results || []).map((item) => {
      const formats = item.formats || {};
      const downloadUrl = formats['application/epub+zip'] || formats['text/plain; charset=utf-8'] || formats['text/plain'] || null;
      const previewUrl = formats['text/html'] || formats['text/html; charset=utf-8'] || null;
      const coverImage = formats['image/jpeg'] || null;

      return {
        source: 'gutendex',
        sourceId: `gutenberg_${item.id}`,
        title: item.title || 'Untitled',
        authors: (item.authors || []).map((a) => a.name || 'Unknown Author'),
        description: `Classic public domain work cataloged by Project Gutenberg. Subjects: ${(item.subjects || []).slice(0, 3).join(', ') || 'Literature'}.`,
        isbn: null,
        publisher: 'Project Gutenberg',
        publishedDate: null,
        categories: (item.subjects || []).map((s) => s.split(' -- ')[0]),
        coverImage,
        language: item.languages?.[0] || 'en',
        accessType: 'free_download',
        rightsStatus: 'verified_public_domain',
        licenseUrl: 'https://www.gutenberg.org/license',
        previewUrl,
        downloadUrl,
        purchaseUrl: null,
        sourceUrl: `https://www.gutenberg.org/ebooks/${item.id}`,
        price: 0,
        currency: 'INR',
      };
    });

    return { total: data.count || items.length, items };
  } catch (err) {
    console.warn(`[Gutendex Adapter Error]:`, err.message);
    return { total: 0, items: [], error: err.message };
  }
};

// --- 2. Open Library Adapter ---
export const searchOpenLibrary = async (query = '', page = 1, limit = 15) => {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`[Open Library] HTTP ${res.status}`);
      return { total: 0, items: [] };
    }

    const data = await res.json();
    const items = (data.docs || []).map((doc) => {
      const coverImage = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;
      const key = doc.key ? doc.key.replace('/works/', '') : '';
      const sourceUrl = doc.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org';

      return {
        source: 'openlibrary',
        sourceId: `openlib_${key || doc.edition_key?.[0] || Math.random().toString(36).substring(7)}`,
        title: doc.title || 'Untitled',
        authors: doc.author_name || ['Unknown Author'],
        description: doc.first_sentence?.[0] || (doc.subject ? `Subjects: ${doc.subject.slice(0, 4).join(', ')}` : null),
        isbn: doc.isbn?.[0] || null,
        publisher: doc.publisher?.[0] || null,
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null,
        categories: (doc.subject || []).slice(0, 4),
        coverImage,
        language: doc.language?.[0] || 'en',
        accessType: doc.has_fulltext ? 'preview_only' : 'metadata_only',
        rightsStatus: 'rights_pending',
        licenseUrl: null,
        previewUrl: sourceUrl,
        downloadUrl: null,
        purchaseUrl: null,
        sourceUrl,
        price: null,
        currency: null,
      };
    });

    return { total: data.numFound || items.length, items };
  } catch (err) {
    console.warn(`[Open Library Adapter Error]:`, err.message);
    return { total: 0, items: [], error: err.message };
  }
};

// --- 3. Google Books Adapter ---
export const searchGoogleBooks = async (query = '', page = 1, limit = 15, filter = null) => {
  try {
    const startIndex = (page - 1) * limit;
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&startIndex=${startIndex}&maxResults=${limit}`;
    if (filter === 'free-ebooks' || filter === 'paid-ebooks') {
      url += `&filter=${filter}`;
    }
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      url += `&key=${apiKey}`;
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`[Google Books] HTTP ${res.status}`);
      return { total: 0, items: [] };
    }

    const data = await res.json();
    const items = (data.items || []).map((item) => {
      const info = item.volumeInfo || {};
      const sale = item.saleInfo || {};
      const access = item.accessInfo || {};

      const isFree = sale.saleability === 'FREE';
      const isForSale = sale.saleability === 'FOR_SALE';
      const price = isForSale && sale.retailPrice?.amount ? sale.retailPrice.amount : (isFree ? 0 : null);
      const currency = sale.retailPrice?.currencyCode || (isFree ? 'INR' : null);

      let accessType = 'metadata_only';
      let rightsStatus = 'rights_pending';

      if (isFree && access.epub?.isAvailable) {
        accessType = 'free_download';
        rightsStatus = 'verified_open_license';
      } else if (isForSale) {
        accessType = 'external_purchase';
        rightsStatus = 'external_preview_only';
      } else if (access.viewability === 'PARTIAL' || access.viewability === 'ALL_PAGES') {
        accessType = 'preview_only';
        rightsStatus = 'external_preview_only';
      }

      const coverImage = info.imageLinks?.thumbnail ? info.imageLinks.thumbnail.replace(/^http:\/\//i, 'https://') : null;

      return {
        source: 'googlebooks',
        sourceId: `google_${item.id}`,
        title: info.title || 'Untitled',
        authors: info.authors || ['Unknown Author'],
        description: info.description || null,
        isbn: info.industryIdentifiers?.[0]?.identifier || null,
        publisher: info.publisher || null,
        publishedDate: info.publishedDate || null,
        categories: info.categories || [],
        coverImage,
        language: info.language || 'en',
        accessType,
        rightsStatus,
        licenseUrl: null,
        previewUrl: info.previewLink || null,
        downloadUrl: isFree && access.epub?.downloadLink ? access.epub.downloadLink : null,
        purchaseUrl: sale.buyLink || null,
        sourceUrl: info.infoLink || `https://books.google.com/books?id=${item.id}`,
        price,
        currency,
      };
    });

    return { total: data.totalItems || items.length, items };
  } catch (err) {
    console.warn(`[Google Books Adapter Error]:`, err.message);
    return { total: 0, items: [], error: err.message };
  }
};

// --- 4. Directory of Open Access Books (DOAB) Adapter ---
export const searchDOAB = async (query = '', page = 1, limit = 10) => {
  try {
    const url = `https://directory.doabooks.org/rest/search?query=${encodeURIComponent(query)}&expand=metadata&limit=${limit}`;
    const res = await fetch(url, {
      headers: { 
        'User-Agent': USER_AGENT,
        'Accept': 'application/json' 
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`[DOAB] HTTP ${res.status}`);
      return { total: 0, items: [] };
    }

    const data = await res.json();
    const items = (Array.isArray(data) ? data : []).map((item) => {
      const metadata = item.metadata || [];
      const getMeta = (key) => metadata.find((m) => m.key === key)?.value || null;

      const title = getMeta('dc.title') || item.name || 'Untitled Academic Book';
      const author = getMeta('dc.contributor.author') || 'Academic Contributor';
      const publisher = getMeta('dc.publisher') || 'Open Access Publisher';
      const license = getMeta('dc.rights') || 'Creative Commons Open Access';
      const handle = item.handle || '';

      return {
        source: 'doab',
        sourceId: `doab_${item.id || handle}`,
        title,
        authors: [author],
        description: getMeta('dc.description.abstract') || 'Peer-reviewed open access academic monograph indexed by the Directory of Open Access Books (DOAB).',
        isbn: getMeta('dc.identifier.isbn') || null,
        publisher,
        publishedDate: getMeta('dc.date.issued') || null,
        categories: ['Academic', 'Open Access', 'Research'],
        coverImage: null,
        language: getMeta('dc.language') || 'en',
        accessType: 'open_access',
        rightsStatus: 'verified_open_license',
        licenseUrl: license.includes('http') ? license : 'https://creativecommons.org/licenses/',
        previewUrl: handle ? `https://directory.doabooks.org/handle/${handle}` : null,
        downloadUrl: handle ? `https://directory.doabooks.org/handle/${handle}` : null,
        purchaseUrl: null,
        sourceUrl: handle ? `https://directory.doabooks.org/handle/${handle}` : 'https://doabooks.org',
        price: 0,
        currency: 'INR',
      };
    });

    return { total: items.length, items };
  } catch (err) {
    console.warn(`[DOAB Adapter Warning]:`, err.message);
    return { total: 0, items: [], error: err.message };
  }
};

/**
 * Unified Search Orchestrator across all adapters
 * @param {Object} options
 * @param {string} options.query - User query string
 * @param {string} options.provider - Specific provider ('all', 'gutendex', 'openlibrary', 'googlebooks', 'doab')
 * @param {string} options.filter - Filter mode ('free', 'paid', 'all')
 * @param {number} options.page - Pagination page (1-based)
 * @param {number} options.limit - Max items to return
 */
export const unifiedSearch = async ({
  query = '',
  provider = 'all',
  filter = 'all',
  page = 1,
  limit = 20,
} = {}) => {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) {
    return { total: 0, page, items: [], providersQueried: [] };
  }

  const cacheKey = `${cleanQuery.toLowerCase()}_${provider}_${filter}_${page}_${limit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const providersQueried = [];
  const promises = [];

  // Determine which adapters to execute
  if (provider === 'gutendex' || (provider === 'all' && filter !== 'paid')) {
    providersQueried.push('gutendex');
    promises.push(searchGutendex(cleanQuery, page));
  }

  if (provider === 'openlibrary' || provider === 'all') {
    providersQueried.push('openlibrary');
    promises.push(searchOpenLibrary(cleanQuery, page, Math.ceil(limit / 2)));
  }

  if (provider === 'googlebooks' || provider === 'all') {
    providersQueried.push('googlebooks');
    const gFilter = filter === 'free' ? 'free-ebooks' : (filter === 'paid' ? 'paid-ebooks' : null);
    promises.push(searchGoogleBooks(cleanQuery, page, Math.ceil(limit / 2), gFilter));
  }

  if (provider === 'doab' || (provider === 'all' && filter !== 'paid')) {
    providersQueried.push('doab');
    promises.push(searchDOAB(cleanQuery, page, 5));
  }

  const results = await Promise.allSettled(promises);
  let combinedItems = [];
  let totalCount = 0;

  results.forEach((res) => {
    if (res.status === 'fulfilled' && res.value?.items) {
      combinedItems.push(...res.value.items);
      totalCount += (res.value.total || res.value.items.length);
    }
  });

  // Apply filter if specified
  if (filter === 'free') {
    combinedItems = combinedItems.filter((i) => i.price === 0 || i.accessType === 'free_download' || i.accessType === 'open_access');
  } else if (filter === 'paid') {
    combinedItems = combinedItems.filter((i) => (i.price && i.price > 0) || i.accessType === 'external_purchase');
  }

  // Deduplicate by title & author
  const seen = new Set();
  const dedupedItems = combinedItems.filter((item) => {
    const key = `${item.title.toLowerCase()}_${(item.authors[0] || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);

  const responsePayload = {
    total: totalCount,
    page: Number(page),
    limit: Number(limit),
    providersQueried,
    items: dedupedItems,
  };

  setCached(cacheKey, responsePayload);
  return responsePayload;
};
