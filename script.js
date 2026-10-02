// Missing-value strategy: CO-RATED ONLY. Norms and dot product use exactly
// the jointly observed positive coordinates. No filling, centering, support
// weighting or minimum-support threshold. See Analysis Part 2b (M04/M05).

window.onload = async function() {
    try { await loadData(); } catch (error) { console.error('Initialization error:', error); }
};

function updateLoadUI(error) {
    const select = document.getElementById('user-select');
    while (select.options.length > 1) select.remove(1);
    select.selectedIndex = 0;
    select.disabled = dataState !== 'ready';
    document.getElementById('recommend-btn').disabled = dataState !== 'ready';
    if (dataState === 'ready') populateUserDropdown();
    const message = dataState === 'ready' ? 'Data loaded. Select a user.' :
        dataState === 'error' ? `Error: ${error.message}. Retry loading the data.` : 'Loading movie data...';
    for (const id of ['user-based-result', 'item-based-result']) {
        renderList(id, [], message, dataState === 'error');
    }
}

function populateUserDropdown() {
    const select = document.getElementById('user-select');
    while (select.options.length > 1) select.remove(1);
    for (const id of userIds) {
        const option = document.createElement('option');
        option.value = id; option.textContent = `User ${id}`;
        select.appendChild(option);
    }
}

// Input validation is also useful for independent tiny fixtures. Production
// dense vectors have been validated by the parsers; diagnostics use the same kernel.
function cosineDetails(a, b) {
    if (!a || !b || a.length !== b.length) throw new Error('Vector dimensions do not match');
    let dot = 0, squaredA = 0, squaredB = 0, support = 0;
    for (let k = 0; k < a.length; k++) {
        const x = a[k], y = b[k];
        if (!Number.isFinite(x) || !Number.isFinite(y) ||
            (x !== 0 && (x < 1 || x > 5)) || (y !== 0 && (y < 1 || y > 5))) {
            throw new Error('Ratings must be finite, zero or in [1,5]');
        }
        if (x > 0 && y > 0) {
            dot += x * y; squaredA += x * x; squaredB += y * y; support++;
        }
    }
    const denominator = Math.sqrt(squaredA * squaredB);
    let similarity = denominator === 0 ? 0 : dot / denominator;
    if (similarity > 1 && similarity <= 1 + 1e-12) similarity = 1;
    if (similarity < 0 || similarity > 1) throw new Error('Cosine out of range');
    return { similarity, support, dot, squaredA, squaredB };
}

function cosineSimilarity(a, b) { return cosineDetails(a, b).similarity; }

// Positive weighted means of ratings 1..5 are bounded mathematically.
// Correct only endpoint roundoff BEFORE ranking; never hide invalid scores.
function normalizePredictedRating(score) {
    const tolerance = 1e-12;
    if (!Number.isFinite(score) || score < 1 - tolerance || score > 5 + tolerance) {
        throw new Error('Predicted rating outside [1,5] beyond numerical tolerance');
    }
    if (Math.abs(score - 1) <= tolerance) return 1;
    if (Math.abs(score - 5) <= tolerance) return 5;
    return score;
}

function validateQuery(activeUserId, topK) {
    if (dataState !== 'ready' || !Number.isSafeInteger(activeUserId) || !userIds.includes(activeUserId)) {
        throw new Error('Select an existing user after data has loaded');
    }
    if (!Number.isSafeInteger(topK) || topK < 0) throw new Error('Invalid topK');
}

function rankRecommendations(items, topK) {
    items.sort((a, b) => b.score - a.score || a.id - b.id);
    return items.slice(0, topK).map((item, index) => ({ ...item, rank: index + 1 }));
}

function selectNeighbours(activeUserId) {
    const neighbours = [];
    for (const id of userIds) {
        if (id === activeUserId) continue;
        const details = cosineDetails(ratingMatrix[activeUserId], ratingMatrix[id]);
        if (details.similarity > 0) neighbours.push({ id, ...details });
    }
    neighbours.sort((a, b) => b.similarity - a.similarity || a.id - b.id);
    return neighbours.slice(0, 20); // README example N=20, approved fixed choice.
}

function getUserBasedRecommendations(activeUserId, topK = 5, includeTrace = false) {
    validateQuery(activeUserId, topK);
    const selected = selectNeighbours(activeUserId);
    const contributors = [...selected].sort((a, b) => a.id - b.id);
    const result = [];
    for (const movie of movies) {
        if (ratingMatrix[activeUserId][movie.id] > 0) continue;
        let numerator = 0, denominator = 0, support = 0;
        const trace = includeTrace ? [] : null;
        for (const neighbour of contributors) {
            const rating = ratingMatrix[neighbour.id][movie.id];
            if (rating === 0) continue;
            const product = neighbour.similarity * rating;
            numerator += product; denominator += neighbour.similarity; support++;
            if (trace) trace.push({ neighbourId: neighbour.id, rating, product, ...neighbour });
        }
        if (denominator === 0) continue;
        const item = { id: movie.id, title: movie.title, score: normalizePredictedRating(numerator / denominator), support };
        if (includeTrace) item.trace = { activeUserId, candidateId: movie.id, selectedNeighbours: selected, contributors: trace, numerator, denominator };
        result.push(item);
    }
    return rankRecommendations(result, topK);
}

function getItemBasedRecommendations(activeUserId, topK = 5, includeTrace = false) {
    validateQuery(activeUserId, topK);
    const history = movies.filter(movie => ratingMatrix[activeUserId][movie.id] > 0).sort((a, b) => a.id - b.id);
    const result = [];
    for (const candidate of movies) {
        if (ratingMatrix[activeUserId][candidate.id] > 0) continue;
        let numerator = 0, denominator = 0, support = 0;
        const trace = includeTrace ? [] : null;
        for (const source of history) {
            const details = cosineDetails(itemColumns[source.id], itemColumns[candidate.id]);
            if (details.similarity <= 0) continue;
            const rating = ratingMatrix[activeUserId][source.id];
            const product = details.similarity * rating;
            numerator += product; denominator += details.similarity; support++;
            if (trace) trace.push({ sourceItemId: source.id, rating, product, ...details });
        }
        if (denominator === 0) continue;
        const item = { id: candidate.id, title: candidate.title, score: normalizePredictedRating(numerator / denominator), support };
        if (includeTrace) item.trace = { activeUserId, candidateId: candidate.id, contributors: trace, numerator, denominator };
        result.push(item);
    }
    return rankRecommendations(result, topK);
}

function getRecommendations() {
    if (dataState !== 'ready') return;
    const id = Number(document.getElementById('user-select').value);
    if (!id) {
        for (const target of ['user-based-result', 'item-based-result']) renderList(target, [], 'Please select a user first.');
        return;
    }
    try {
        const userItems = getUserBasedRecommendations(id);
        const itemItems = getItemBasedRecommendations(id);
        renderList('user-based-result', userItems);
        renderList('item-based-result', itemItems);
    } catch (error) {
        for (const target of ['user-based-result', 'item-based-result']) renderList(target, [], `Error: ${error.message}`, true);
    }
}

function renderList(elementId, items, message, isError = false) {
    const element = document.getElementById(elementId);
    element.replaceChildren();
    const explanation = document.createElement('p');
    if (isError) explanation.className = 'error';
    explanation.textContent = message || (!items || !items.length ?
        'No recommendations with usable rating evidence for this user.' :
        elementId === 'user-based-result' ? 'Based on ratings from similar users. Scores are predicted ratings.' :
        'Based on similarities to movies you rated. Scores are predicted ratings.');
    element.appendChild(explanation);
    if (message || !items || !items.length) return;
    const list = document.createElement('ul');
    for (const item of items) {
        if (!Number.isFinite(item.score)) throw new Error('Invalid recommendation score');
        const entry = document.createElement('li');
        entry.textContent = `${item.title} — ${item.score.toFixed(3)}`;
        list.appendChild(entry);
    }
    element.appendChild(list);
}
