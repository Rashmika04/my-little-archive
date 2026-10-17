
"use strict";

/*
 * MY LITTLE ARCHIVE — BULK POSTER REPAIR
 * Repairs existing poster URLs without replacing other metadata.
 * Uses exact title + year validation and rejects duplicate artwork.
 */

(async function repairArchivePosters() {
  const WORKER_URL =
    "https://my-little-archive-api.peddini-rashmika04.workers.dev";

  const OVERRIDES_KEY = "watch-movie-overrides";
  const MANUAL_KEY = "watch-manual-movies";

  const normaliseTitle = value =>
    String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const readJSON = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  };

  const overrides = readJSON(OVERRIDES_KEY, {});
  const manualMovies = readJSON(MANUAL_KEY, []);

  const response = await fetch("data/movies.json", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Could not load data/movies.json. No changes were made.");
  }

  const data = await response.json();
  const baseMovies = Array.isArray(data) ? data : data.movies || [];

  // Merge the same sources used by the archive, preserving existing IDs.
  const moviesById = new Map();

  for (const movie of [...baseMovies, ...manualMovies]) {
    if (!movie?.id || !movie?.title) continue;
    moviesById.set(String(movie.id), { ...movie });
  }

  for (const [id, override] of Object.entries(overrides)) {
    if (!override?.title) continue;

    const existing = moviesById.get(String(id)) || {};
    moviesById.set(String(id), {
      ...existing,
      ...override,
      id: String(id)
    });
  }

  const movies = [...moviesById.values()].filter(movie =>
    movie.title && Number(movie.year) >= 1900
  );

  const candidates = [];
  const failures = [];

  function sameType(a, b) {
    const type = value => {
      const t = String(value || "").toLowerCase();
      if (/movie|film/.test(t)) return "movie";
      if (/series|show|drama|anime/.test(t)) return "series";
      return t;
    };

    const wanted = type(a);
    const found = type(b);

    return !wanted || !found || wanted === found;
  }

  async function lookup(movie) {
    const url = new URL(WORKER_URL);
    url.searchParams.set("title", movie.title);
    url.searchParams.set("year", String(movie.year));
    url.searchParams.set("_repair", `${Date.now()}-${Math.random()}`);

    const response = await fetch(url.toString(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Lookup returned HTTP ${response.status}`);
    }

    const result = await response.json();

    if (
      !result ||
      result.Response === "False" ||
      !result.Title ||
      !result.Poster ||
      result.Poster === "N/A"
    ) {
      throw new Error("No poster returned");
    }

    const foundYear = Number(String(result.Year || "").match(/\d{4}/)?.[0]);
    const wantedTitle = normaliseTitle(movie.title);
    const foundTitle = normaliseTitle(result.Title);

    if (wantedTitle !== foundTitle) {
      throw new Error(`Title mismatch: ${result.Title}`);
    }

    if (!foundYear || foundYear !== Number(movie.year)) {
      throw new Error(
        `Year mismatch: received ${result.Year || "no year"}`
      );
    }

    if (!sameType(movie.type, result.Type)) {
      throw new Error(`Media type mismatch: ${result.Type}`);
    }

    return {
      id: movie.id,
      title: movie.title,
      year: Number(movie.year),
      poster: result.Poster,
      foundTitle: result.Title,
      foundYear,
      foundType: result.Type
    };
  }

  console.info(`Poster repair started: ${movies.length} titles.`);

  // Do not overwhelm the Worker with simultaneous requests.
  for (const movie of movies) {
    try {
      const candidate = await lookup(movie);
      candidates.push(candidate);
      console.info("Verified candidate:", movie.title, movie.year);
    } catch (error) {
      failures.push({
        title: movie.title,
        year: movie.year,
        reason: error.message
      });
      console.warn(
        "Left unchanged:",
        movie.title,
        movie.year,
        error.message
      );
    }
  }

  // If multiple different titles return the same poster URL,
  // don't apply that ambiguous image to any of them.
  const posterCounts = new Map();

  for (const candidate of candidates) {
    const key = candidate.poster.trim();
    posterCounts.set(key, (posterCounts.get(key) || 0) + 1);
  }

 const safeCandidates = candidates.filter(candidate => {
  const current =
    overrides[String(candidate.id)] ||
    moviesById.get(String(candidate.id)) ||
    {};

  if (current.posterManuallySet === true) {
    console.info("Keeping manually selected poster:", candidate.title);
    return false;
  }

  const duplicate = posterCounts.get(candidate.poster.trim()) > 1;

  if (duplicate) {
    failures.push({
      title: candidate.title,
      year: candidate.year,
      reason: "Duplicate poster URL returned for multiple titles"
    });
    console.warn("Duplicate poster rejected:", candidate.title);
  }

  return !duplicate;
});

  if (!safeCandidates.length) {
    console.warn(
      "No safe replacements found. Existing posters were left unchanged."
    );
    console.table(failures);
    return;
  }

  // Save poster-only changes to overrides, retaining all other fields.
  const updatedOverrides = readJSON(OVERRIDES_KEY, {});

  for (const candidate of safeCandidates) {
    const id = String(candidate.id);
    const current = updatedOverrides[id] ||
      moviesById.get(id) ||
      { id, title: candidate.title, year: candidate.year };

    updatedOverrides[id] = {
      ...current,
      poster: candidate.poster,
      posterVerifiedTitle: candidate.foundTitle,
      posterVerifiedYear: candidate.foundYear
    };
  }

  // Preserve all existing manual records and only update their poster field.
  const updatedManualMovies = readJSON(MANUAL_KEY, []).map(movie => {
    const candidate = safeCandidates.find(
      item => String(item.id) === String(movie.id)
    );

    return candidate
      ? { ...movie, poster: candidate.poster }
      : movie;
  });

  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(updatedOverrides));
    localStorage.setItem(MANUAL_KEY, JSON.stringify(updatedManualMovies));
  } catch (error) {
    console.error(
      "Could not save repaired posters. Check localStorage space.",
      error
    );
    alert("Poster repair could not be saved. Your existing data was not intentionally cleared.");
    return;
  }

  console.table(
    safeCandidates.map(item => ({
      title: item.title,
      year: item.year,
      result: "Poster saved"
    }))
  );

  console.table(failures);

  alert(
    `Poster repair finished.\n` +
    `${safeCandidates.length} poster replacements saved.\n` +
    `${failures.length} uncertain matches left unchanged.\n\n` +
    `Reload the Watch page to view the results.`
  );
})();
