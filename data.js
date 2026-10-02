// MovieLens snapshot: 0 means unobserved, never an imputed rating.
let movies = [];
let ratings = [];
let numUsers = 0;
let numMovies = 0;
let ratingMatrix = null;
let itemColumns = null;
let userIds = [];
let dataState = 'idle';
let loadPromise = null;
let loadTimings = null;

// All 19 flags in u.item order, including the unknown field.
const genreNames = [
    'unknown', 'Action', 'Adventure', 'Animation', "Children's", 'Comedy',
    'Crime', 'Documentary', 'Drama', 'Fantasy', 'Film-Noir', 'Horror',
    'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

function integerField(value, minimum, context) {
    const number = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < minimum) {
        throw new Error(`Invalid ${context}`);
    }
    return number;
}

// Parsers return local arrays; they never append to published state.
function parseItemData(text) {
    const parsed = [];
    const ids = new Set();
    for (const [index, line] of text.split(/\r?\n/).entries()) {
        if (!line.trim()) continue;
        const fields = line.split('|');
        const context = `u.item line ${index + 1}`;
        if (fields.length !== 24 || !fields[1]) throw new Error(`Invalid ${context}`);
        const id = integerField(fields[0], 1, context);
        if (ids.has(id) || fields.slice(5).some(flag => flag !== '0' && flag !== '1')) {
            throw new Error(`Duplicate ID or invalid flags: ${context}`);
        }
        ids.add(id);
        parsed.push({ id, title: fields[1], genres: genreNames.filter((_, i) => fields[i + 5] === '1') });
    }
    if (!parsed.length || parsed.some(movie => movie.id > parsed.length)) {
        throw new Error('u.item must have nonempty contiguous movie IDs');
    }
    return parsed.sort((a, b) => a.id - b.id);
}

function parseRatingData(text) {
    const parsed = [];
    const pairs = new Set();
    for (const [index, line] of text.split(/\r?\n/).entries()) {
        if (!line.trim()) continue;
        const fields = line.split('\t');
        const context = `u.data line ${index + 1}`;
        if (fields.length !== 4) throw new Error(`Invalid ${context}`);
        const [userId, itemId, rating, timestamp] = fields.map((value, i) => integerField(value, i === 3 ? 0 : 1, context));
        const key = `${userId}:${itemId}`;
        if (rating > 5 || pairs.has(key)) throw new Error(`Invalid rating or duplicate pair: ${context}`);
        pairs.add(key);
        parsed.push({ userId, itemId, rating, timestamp });
    }
    if (!parsed.length) throw new Error('u.data is empty');
    return parsed;
}

// Build a local raw-ID matrix and column view before atomically publishing.
function buildRatingMatrix(sourceRatings = ratings, sourceMovies = movies) {
    const ids = [...new Set(sourceRatings.map(row => row.userId))].sort((a, b) => a - b);
    const users = ids.length ? ids[ids.length - 1] : 0;
    const count = sourceMovies.length;
    const matrix = Array.from({ length: users + 1 }, () => new Float64Array(count + 1));
    const columns = Array.from({ length: count + 1 }, () => new Float64Array(users + 1));
    const catalog = new Set(sourceMovies.map(movie => movie.id));
    for (const row of sourceRatings) {
        if (!catalog.has(row.itemId)) throw new Error(`Unknown movie ID ${row.itemId}`);
        matrix[row.userId][row.itemId] = row.rating;
        columns[row.itemId][row.userId] = row.rating;
    }
    return { matrix, columns, ids, users, count };
}

function clearData() {
    movies = []; ratings = []; userIds = [];
    numUsers = 0; numMovies = 0;
    ratingMatrix = null; itemColumns = null; loadTimings = null;
}

function loadData() {
    if (loadPromise) return loadPromise;
    clearData();
    dataState = 'loading';
    if (typeof updateLoadUI === 'function') updateLoadUI();
    loadPromise = (async () => {
        try {
            const start = performance.now();
            const movieResponse = await fetch('u.item');
            if (!movieResponse.ok) throw new Error(`u.item HTTP ${movieResponse.status}`);
            // Observed snapshot bytes are invalid UTF-8. Windows-1252 and Latin-1
            // agree on this snapshot; this is not an official encoding claim.
            const movieText = new TextDecoder('windows-1252').decode(await movieResponse.arrayBuffer());
            const ratingResponse = await fetch('u.data');
            if (!ratingResponse.ok) throw new Error(`u.data HTTP ${ratingResponse.status}`);
            const ratingText = await ratingResponse.text();
            const fetched = performance.now();
            const nextMovies = parseItemData(movieText);
            const nextRatings = parseRatingData(ratingText);
            const parsed = performance.now();
            const built = buildRatingMatrix(nextRatings, nextMovies);
            const prepared = performance.now();
            movies = nextMovies; ratings = nextRatings;
            ratingMatrix = built.matrix; itemColumns = built.columns;
            userIds = built.ids; numUsers = built.users; numMovies = built.count;
            loadTimings = { fetchDecodeMs: fetched - start, parseMs: parsed - fetched, matrixColumnsMs: prepared - parsed };
            dataState = 'ready';
            if (typeof updateLoadUI === 'function') updateLoadUI();
        } catch (error) {
            clearData(); dataState = 'error';
            if (typeof updateLoadUI === 'function') updateLoadUI(error);
            throw error;
        } finally {
            loadPromise = null;
        }
    })();
    return loadPromise;
}
