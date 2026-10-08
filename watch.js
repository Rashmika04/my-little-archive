"use strict";

/* =========================================================
   MY LITTLE ARCHIVE — WATCH ROOM
========================================================= */

const WORKER_URL =
  "https://my-little-archive-api.peddini-rashmika04.workers.dev";

const STATUS_OPTIONS = [
  "Want to Watch",
  "Watching",
  "Watched",
  "Dropped"
];

const FILTER_DEFS = [
  ["TYPE", "type"],
  ["GENRE", "genres"],
  ["LANGUAGE", "language"],
  ["COUNTRY", "country"],
  ["RELATIONSHIP", "relationship"],
  ["STATUS", "status"],
  ["TAGS", "tags"]
];

const PALETTES = [
  ["#6e788a", "#d7d5cc"],
  ["#8e5e68", "#e0b7b1"],
  ["#526e87", "#c8b9c6"],
  ["#9b6d56", "#e5c5a9"],
  ["#596d61", "#cbd0b8"],
  ["#4d566f", "#b9c3d1"],
  ["#8a6d42", "#d8c39a"],
  ["#704e58", "#d1a7a4"],
  ["#4c6f72", "#b6d0c9"],
  ["#77717d", "#d4cbd6"],
  ["#6d684e", "#d5cf9e"],
  ["#8a6250", "#d9b8a5"]
];

const TITLE_STYLES = [
  "elegant",
  "romantic",
  "classic",
  "modern",
  "dramatic",
  "minimal"
];

/* HTML ELEMENTS */

const rail = document.getElementById("rail");
const search = document.getElementById("search");
const count = document.getElementById("count");
const filtersEl = document.getElementById("filters");
const empty = document.getElementById("empty");

const modal = document.getElementById("modal");
const detailContent = document.getElementById("detailContent");

const addModal = document.getElementById("addModal");
const addForm = document.getElementById("addForm");

const movieLookup = document.getElementById("movieLookup");
const movieSearchStatus = document.getElementById("movieSearchStatus");
const findMovieButton = document.getElementById("findMovie");

/* STATE */

let allMovies = [];
let filteredMovies = [];
let activeFilters = {};
let currentMovieId = null;
let editingMovieId = null;
let currentIndex = -1;

let drag = {
  active: false,
  moved: false,
  startX: 0,
  startScroll: 0,
  pointerId: null,
  target: null
};

/* FALLBACK TITLES */

const fallbackMovies = [
  {
    id: "pride-prejudice-2005",
    title: "Pride & Prejudice",
    type: "Movie",
    year: 2005,
    director: "Joe Wright",
    language: "English",
    country: "United Kingdom",
    genres: ["Romance", "Drama", "Historical", "Period"],
    relationship: "M/F",
    tags: ["slow burn", "classic", "period romance"],
    status: "Want to Watch",
    titleStyle: "romantic",
    description: "A beloved period romance about Elizabeth Bennet and Mr. Darcy."
  },
  {
    id: "little-women-2019",
    title: "Little Women",
    type: "Movie",
    year: 2019,
    director: "Greta Gerwig",
    language: "English",
    country: "United States",
    genres: ["Drama", "Romance", "Historical", "Coming-of-age"],
    relationship: "M/F",
    tags: ["family", "sisters", "period", "coming-of-age"],
    status: "Want to Watch",
    titleStyle: "classic",
    description: "Four sisters come of age while finding their own ways through love, family and ambition."
  },
  {
    id: "la-la-land-2016",
    title: "La La Land",
    type: "Movie",
    year: 2016,
    director: "Damien Chazelle",
    language: "English",
    country: "United States",
    genres: ["Romance", "Drama", "Musical"],
    relationship: "M/F",
    tags: ["music", "dreams", "bittersweet", "love"],
    status: "Want to Watch",
    titleStyle: "modern",
    description: "A musical romance about two dreamers trying to build lives and careers in Los Angeles."
  },
  {
    id: "grand-budapest-2014",
    title: "The Grand Budapest Hotel",
    type: "Movie",
    year: 2014,
    director: "Wes Anderson",
    language: "English",
    country: "Germany",
    genres: ["Comedy", "Drama", "Adventure"],
    relationship: "M/F",
    tags: ["quirky", "whimsical", "ensemble", "dark comedy"],
    status: "Want to Watch",
    titleStyle: "dramatic",
    description: "A whimsical caper centred on a legendary hotel concierge and his lobby boy protégé."
  },
  {
    id: "handmaiden-2016",
    title: "The Handmaiden",
    type: "Movie",
    year: 2016,
    director: "Park Chan-wook",
    language: "Korean",
    country: "South Korea",
    genres: ["Drama", "Romance", "Thriller"],
    relationship: "F/F · GL",
    tags: ["psychological", "period", "twist", "slow burn"],
    status: "Want to Watch",
    titleStyle: "elegant",
    description: "A visually rich psychological romance built around deception, desire and shifting loyalties."
  }
];

/* HELPERS */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function hash(value = "") {
  let result = 0;

  for (let i = 0; i < value.length; i++) {
    result = (result * 31 + value.charCodeAt(i)) | 0;
  }

  return Math.abs(result);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function paletteFor(movie) {
  return PALETTES[hash(movie.id || movie.title) % PALETTES.length];
}

function normaliseMovie(movie, index = 0) {
  const result = { ...movie };

  result.id = String(
    result.id ||
    result.imdbId ||
    `movie-${index}-${hash(result.title || "untitled")}`
  );

  result.title = String(result.title || "Untitled");
  result.type = String(result.type || "Movie");

  result.genres = asArray(result.genres || result.genre);
  result.tags = asArray(result.tags);

  result.poster =
    result.poster ||
    result.posterUrl ||
    result.image ||
    "";

  result.description =
    result.description ||
    result.plot ||
    result.summary ||
    "";

  if (!STATUS_OPTIONS.includes(result.status)) {
    result.status = "Want to Watch";
  }

  if (!TITLE_STYLES.includes(result.titleStyle)) {
    result.titleStyle =
      TITLE_STYLES[hash(result.title) % TITLE_STYLES.length];
  }

  return result;
}

function statusOf(movie) {
  return localStorage.getItem("watch-status-" + movie.id) ||
    movie.status ||
    "Want to Watch";
}

/* LOCAL STORAGE */

function readLocalMovies() {
  try {
    return JSON.parse(localStorage.getItem("watch-manual-movies") || "[]");
  } catch {
    return [];
  }
}

function saveLocalMovies() {
  const manualMovies = allMovies.filter(movie => movie.localManual === true);

  localStorage.setItem(
    "watch-manual-movies",
    JSON.stringify(manualMovies)
  );
}

function readOverrides() {
  try {
    return JSON.parse(localStorage.getItem("watch-movie-overrides") || "{}");
  } catch {
    return {};
  }
}

function saveOverride(movie) {
  const overrides = readOverrides();
  overrides[movie.id] = movie;

  localStorage.setItem(
    "watch-movie-overrides",
    JSON.stringify(overrides)
  );
}

function applyOverrides(movies) {
  const overrides = readOverrides();

  return movies.map(movie => ({
    ...movie,
    ...(overrides[movie.id] || {})
  }));
}

/* ARTWORK LOOKUP */

function parseOMDb(data) {
  if (!data || data.Response === "False") return null;

  const valid = value => value && value !== "N/A" ? value : "";
  const list = value => valid(value)
    ? value.split(",").map(item => item.trim()).filter(Boolean)
    : [];

  const yearMatch = String(data.Year || "").match(/\d{4}/);

  return {
    title: valid(data.Title),
    type: valid(data.Type)
      ? data.Type.charAt(0).toUpperCase() + data.Type.slice(1)
      : "Movie",
    year: yearMatch ? Number(yearMatch[0]) : "",
    director: valid(data.Director),
    language: valid(data.Language),
    country: valid(data.Country),
    duration: valid(data.Runtime),
    rating: valid(data.imdbRating),
    genres: list(data.Genre),
    poster: valid(data.Poster),
    description: valid(data.Plot),
    imdbId: valid(data.imdbID)
  };
}

async function findArtwork(title) {
  title = String(title || "").trim();
  if (!title) return null;

  let result = null;

  /* First use the existing Cloudflare Worker and its OMDb proxy. */
  try {
    const response = await fetch(
      `${WORKER_URL}?title=${encodeURIComponent(title)}`,
      { cache: "no-store" }
    );

    if (response.ok) {
      const data = await response.json();
      result = parseOMDb(data);

      if (result && result.poster) return result;
    }
  } catch (error) {
    console.warn("OMDb lookup unavailable:", error);
  }

  /* If OMDb is unavailable, try Wikipedia's page image. */
  try {
    const slug = title.replace(/\s+/g, "_");

    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    );

    if (response.ok) {
      const data = await response.json();
      const poster =
        data?.originalimage?.source ||
        data?.thumbnail?.source ||
        "";

      if (poster) {
        return {
          ...(result || {}),
          title: result?.title || data.title || title,
          poster,
          description: result?.description || data.extract || ""
        };
      }
    }
  } catch (error) {
    console.warn("Wikipedia image lookup unavailable:", error);
  }

  return result;
}

async function saveMovieToWorker(movie) {
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveMovie",
        movie
      })
    });

    return response.ok;
  } catch (error) {
    console.warn("Remote save unavailable. The local copy is preserved.", error);
    return false;
  }
}

/* FILTERS */

function valuesFor(movie, key) {
  if (key === "status") return [statusOf(movie)];
  if (key === "genres") return asArray(movie.genres).map(String);
  if (key === "tags") return asArray(movie.tags).map(String);
  return movie[key] ? [String(movie[key])] : [];
}

function uniqueValues(key) {
  if (key === "status") return [...STATUS_OPTIONS];

  const result = new Set();

  allMovies.forEach(movie => {
    valuesFor(movie, key).forEach(value => result.add(value));
  });

  return [...result].sort((a, b) => a.localeCompare(b));
}

function buildFilters() {
  filtersEl.innerHTML = "";

  FILTER_DEFS.forEach(([label, key]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "filter";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${label} ▾`;

    const menu = document.createElement("div");
    menu.className = "menu";
    menu.hidden = true;

    uniqueValues(key).forEach(value => {
      const labelElement = document.createElement("label");
      const checkbox = document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.value = value;
      checkbox.checked = (activeFilters[key] || []).includes(value);

      checkbox.addEventListener("change", () => {
        activeFilters[key] = [
          ...menu.querySelectorAll("input:checked")
        ].map(input => input.value);

        if (!activeFilters[key].length) {
          delete activeFilters[key];
        }

        button.classList.toggle("active", Boolean(activeFilters[key]));
        render();
      });

      labelElement.append(checkbox, document.createTextNode(value));
      menu.appendChild(labelElement);
    });

    button.classList.toggle("active", Boolean(activeFilters[key]));

    button.addEventListener("click", event => {
      event.stopPropagation();

      document.querySelectorAll("#filters .menu").forEach(other => {
        if (other !== menu) other.hidden = true;
      });

      menu.hidden = !menu.hidden;
    });

    menu.addEventListener("click", event => event.stopPropagation());

    wrapper.append(button, menu);
    filtersEl.appendChild(wrapper);
  });
}

document.addEventListener("click", () => {
  document.querySelectorAll("#filters .menu").forEach(menu => {
    menu.hidden = true;
  });
});

/* SEARCH AND FILTER MATCHING */

function matchesFilters(movie) {
  const query = String(search.value || "").trim().toLowerCase();

  if (query) {
    const text = [
      movie.title,
      movie.type,
      movie.year,
      movie.director,
      movie.language,
      movie.country,
      movie.relationship,
      movie.description,
      movie.whereToWatch,
      ...asArray(movie.genres),
      ...asArray(movie.tags)
    ].join(" ").toLowerCase();

    if (!text.includes(query)) return false;
  }

  return Object.entries(activeFilters).every(([key, selected]) => {
    const values = valuesFor(movie, key).map(value => value.toLowerCase());

    return selected.some(value =>
      values.includes(String(value).toLowerCase())
    );
  });
}

/* CASE CREATION */

function makeCase(movie) {
  const [c, c2] = paletteFor(movie);

  const element = document.createElement("article");
  element.className = `case style-${movie.titleStyle}`;
  element.dataset.id = movie.id;
  element.tabIndex = 0;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", `Open ${movie.title}`);

  const width = 68 + hash(movie.id + "width") % 13;
  const height = 245 + hash(movie.id + "height") % 36;
  const tilt = (hash(movie.id + "tilt") % 5) - 2;

  element.style.setProperty("--c", c);
  element.style.setProperty("--c2", c2);
  element.style.setProperty("--w", `${width}px`);
  element.style.setProperty("--h", `${height}px`);
  element.style.setProperty("--tilt", `${tilt}deg`);

  element.innerHTML = `
    <div class="case-art" aria-hidden="true"></div>
    <div class="case-text">
      <div class="case-title">${escapeHTML(movie.title)}</div>
    </div>
  `;

  element.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(movie.id);
    }
  });

  return element;
}

/* RENDER SHELF */

function render() {
  filteredMovies = allMovies.filter(matchesFilters);

  count.textContent =
    `${filteredMovies.length} ${filteredMovies.length === 1 ? "TITLE" : "TITLES"}`;

  rail.innerHTML = "";

  filteredMovies.forEach(movie => {
    rail.appendChild(makeCase(movie));
  });

  empty.hidden = filteredMovies.length > 0;

  if (currentMovieId) {
    currentIndex = filteredMovies.findIndex(movie => movie.id === currentMovieId);
  }
}

/* DETAIL MODAL */

function openDetail(id) {
  const movie = allMovies.find(item => item.id === id);
  if (!movie) return;

  currentMovieId = movie.id;
  currentIndex = filteredMovies.findIndex(item => item.id === movie.id);

  const [c, c2] = paletteFor(movie);

  const chips = [
    movie.language,
    movie.country,
    movie.relationship,
    movie.duration,
    movie.rating ? `Rating ${movie.rating}` : "",
    movie.dateWatched ? `Watched ${movie.dateWatched}` : "",
    ...asArray(movie.genres),
    ...asArray(movie.tags)
  ].filter(Boolean);

  detailContent.innerHTML = `
    <div class="detail-grid">
      <div class="detail-art" style="--c:${c};--c2:${c2}">
        ${
          movie.poster
            ? `<img class="detail-poster-image" src="${escapeHTML(movie.poster)}" alt="Poster for ${escapeHTML(movie.title)}">`
            : `<div class="poster-missing">${escapeHTML(movie.title)}</div>`
        }
      </div>

      <div class="detail-info">
        <div class="eyebrow">${escapeHTML(statusOf(movie))} · ${escapeHTML(movie.type)}</div>
        <h2>${escapeHTML(movie.title)}</h2>
        <div class="director">
          ${escapeHTML(movie.year || "")}
          ${movie.director ? ` · ${escapeHTML(movie.director)}` : ""}
        </div>

        <div class="description">
          ${escapeHTML(movie.description || "Add a description to remember this story.")}
        </div>

        <div class="meta-grid">
          ${chips.map(value => `<span class="pill">${escapeHTML(value)}</span>`).join("")}
        </div>

        <div class="detail-actions">
          ${STATUS_OPTIONS.map(status => `
            <button
              type="button"
              data-status="${escapeHTML(status)}"
              class="${statusOf(movie) === status ? "active" : ""}"
            >${escapeHTML(status)}</button>
          `).join("")}
        </div>

        <div class="detail-edit-row">
          <button id="detailEdit" class="edit-button" type="button">EDIT THIS TITLE</button>
        </div>

        ${movie.personalNote ? `
          <div class="archive-note">
            <span>MY NOTE</span>
            <p>${escapeHTML(movie.personalNote)}</p>
          </div>
        ` : ""}

        ${movie.whereToWatch ? `
          <div class="watch-source">WHERE TO WATCH · ${escapeHTML(movie.whereToWatch)}</div>
        ` : ""}

        ${movie.watchLink ? `
          <a class="watch-link" href="${escapeHTML(movie.watchLink)}" target="_blank" rel="noopener">
            OPEN SOURCE / WATCH LINK ↗
          </a>
        ` : ""}

        <div class="detail-nav">
          <button id="detailPrev" type="button">← PREVIOUS</button>
          <button id="detailNext" type="button">NEXT →</button>
        </div>
      </div>
    </div>
  `;

  const poster = detailContent.querySelector(".detail-poster-image");

  if (poster) {
    poster.addEventListener("error", () => {
      poster.remove();

      const art = detailContent.querySelector(".detail-art");
      const fallback = document.createElement("div");
      fallback.className = "poster-missing";
      fallback.textContent = movie.title;
      art.appendChild(fallback);
    });
  }

  detailContent.querySelectorAll("[data-status]").forEach(button => {
    button.addEventListener("click", async () => {
      movie.status = button.dataset.status;

      localStorage.setItem("watch-status-" + movie.id, movie.status);
      saveOverride(movie);
      saveLocalMovies();

      buildFilters();
      render();
      openDetail(movie.id);

      await saveMovieToWorker(movie);
    });
  });

  detailContent.querySelector("#detailEdit").addEventListener("click", () => {
    closeModal();
    openEditModal(movie);
  });

  detailContent.querySelector("#detailPrev").addEventListener("click", () => navigate(-1));
  detailContent.querySelector("#detailNext").addEventListener("click", () => navigate(1));

  detailContent.querySelector("#detailPrev").disabled = currentIndex <= 0;
  detailContent.querySelector("#detailNext").disabled =
    currentIndex < 0 || currentIndex >= filteredMovies.length - 1;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  /* If artwork is missing, attempt to fetch it after opening the detail. */
  if (!movie.poster) {
    fetchArtworkForExistingMovie(movie);
  }
}

function navigate(step) {
  const nextIndex = currentIndex + step;

  if (nextIndex < 0 || nextIndex >= filteredMovies.length) return;

  openDetail(filteredMovies[nextIndex].id);
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* RETRIEVE MISSING ARTWORK */

async function fetchArtworkForExistingMovie(movie) {
  const found = await findArtwork(movie.title);

  if (!found) return;

  if (found.poster) movie.poster = found.poster;
  if (!movie.description && found.description) movie.description = found.description;
  if (!movie.director && found.director) movie.director = found.director;
  if (!movie.language && found.language) movie.language = found.language;
  if (!movie.country && found.country) movie.country = found.country;
  if (!movie.year && found.year) movie.year = found.year;
  if (!movie.genres?.length && found.genres) movie.genres = found.genres;

  saveOverride(movie);
  saveLocalMovies();

  if (currentMovieId === movie.id && modal.classList.contains("open")) {
    openDetail(movie.id);
  }
}

/* ADD / EDIT MODAL */

function openAddModal() {
  editingMovieId = null;
  addForm.reset();

  document.getElementById("addHeadingTitle").textContent = "Add a story.";
  document.getElementById("addHeadingText").textContent =
    "Find a title or enter its details manually. You can edit everything before saving.";

  addForm.querySelector('[type="submit"]').textContent = "SAVE TO ARCHIVE";
  movieSearchStatus.textContent = "Artwork and details are retrieved automatically when available.";

  addModal.classList.add("open");
  addModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  setTimeout(() => addForm.elements.namedItem("title").focus(), 50);
}

function openEditModal(movie) {
  editingMovieId = movie.id;
  addForm.reset();

  document.getElementById("addHeadingTitle").textContent = "Edit this story.";
  document.getElementById("addHeadingText").textContent =
    "Make your changes and save the updated entry.";

  addForm.querySelector('[type="submit"]').textContent = "SAVE CHANGES";

  const set = (name, value) => {
    const field = addForm.elements.namedItem(name);
    if (field) field.value = value ?? "";
  };

  set("title", movie.title);
  set("type", movie.type);
  set("year", movie.year);
  set("director", movie.director);
  set("language", movie.language);
  set("country", movie.country);
  set("relationship", movie.relationship);
  set("genres", asArray(movie.genres).join(", "));
  set("tags", asArray(movie.tags).join(", "));
  set("status", statusOf(movie));
  set("titleStyle", movie.titleStyle);
  set("poster", movie.poster);
  set("duration", movie.duration);
  set("rating", movie.rating);
  set("dateWatched", movie.dateWatched);
  set("whereToWatch", movie.whereToWatch);
  set("watchLink", movie.watchLink);
  set("description", movie.description);
  set("personalNote", movie.personalNote);

  movieLookup.value = movie.title;

  addModal.classList.add("open");
  addModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeAddModal() {
  addModal.classList.remove("open");
  addModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  editingMovieId = null;
}

/* FIND A TITLE */

function fillEmptyField(name, value) {
  const field = addForm.elements.namedItem(name);

  if (field && !String(field.value || "").trim() && value !== undefined && value !== "") {
    field.value = value;
  }
}

async function lookupMovie() {
  const title = movieLookup.value.trim();

  if (!title) {
    movieSearchStatus.textContent = "Enter a movie or show title first.";
    return;
  }

  findMovieButton.disabled = true;
  movieSearchStatus.textContent = "Looking for the title and its artwork…";

  try {
    const found = await findArtwork(title);

    if (!found) {
      fillEmptyField("title", title);
      movieSearchStatus.textContent =
        "No automatic match was found. You can fill in the details manually.";
      return;
    }

    fillEmptyField("title", found.title || title);
    fillEmptyField("type", found.type);
    fillEmptyField("year", found.year);
    fillEmptyField("director", found.director);
    fillEmptyField("language", found.language);
    fillEmptyField("country", found.country);
    fillEmptyField("duration", found.duration);
    fillEmptyField("rating", found.rating);
    fillEmptyField("genres", asArray(found.genres).join(", "));
    fillEmptyField("description", found.description);
    fillEmptyField("poster", found.poster);

    movieSearchStatus.textContent = found.poster
      ? "Title found. Poster and available details have been filled in."
      : "Title found, but artwork was unavailable. You can still save it.";

  } catch (error) {
    console.error("Title lookup failed:", error);
    movieSearchStatus.textContent =
      "Automatic lookup failed. You can still add the title manually.";
  } finally {
    findMovieButton.disabled = false;
  }
}

findMovieButton.addEventListener("click", lookupMovie);

movieLookup.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    lookupMovie();
  }
});

/* SAVE NEW OR EDITED TITLE */

addForm.addEventListener("submit", async event => {
  event.preventDefault();

  const formData = new FormData(addForm);
  const title = String(formData.get("title") || "").trim();
  const type = String(formData.get("type") || "Movie").trim();

  if (!title) {
    alert("Please enter a title.");
    return;
  }

  const existing = editingMovieId
    ? allMovies.find(movie => movie.id === editingMovieId)
    : null;

  const year = String(formData.get("year") || "");

  const duplicate = allMovies.some(movie =>
    movie.id !== editingMovieId &&
    movie.title.trim().toLowerCase() === title.toLowerCase() &&
    String(movie.year || "") === year
  );

  if (duplicate) {
    alert("That title is already in your archive.");
    return;
  }

  const saveButton = addForm.querySelector('[type="submit"]');
  const originalLabel = saveButton.textContent;

  saveButton.disabled = true;
  saveButton.textContent = "SAVING…";

  try {
    let posterURL = String(formData.get("poster") || "").trim();
    let found = null;

    if (!posterURL) {
      found = await findArtwork(title);
      posterURL = found?.poster || "";
    }

    const movie = normaliseMovie({
      ...(existing || {}),
      id: existing?.id || `manual-${Date.now()}-${hash(title)}`,
      title,
      type,
      year: year ? Number(year) : "",
      director: String(formData.get("director") || "").trim(),
      language: String(formData.get("language") || "").trim(),
      country: String(formData.get("country") || "").trim(),
      relationship: String(formData.get("relationship") || "").trim(),
      genres: splitList(formData.get("genres")),
      tags: splitList(formData.get("tags")),
      status: String(formData.get("status") || "Want to Watch"),
      titleStyle: String(formData.get("titleStyle") || "elegant"),
      poster: posterURL,
      duration: String(formData.get("duration") || "").trim(),
      rating: String(formData.get("rating") || "").trim(),
      dateWatched: String(formData.get("dateWatched") || "").trim(),
      whereToWatch: String(formData.get("whereToWatch") || "").trim(),
      watchLink: String(formData.get("watchLink") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      personalNote: String(formData.get("personalNote") || "").trim(),
      localManual: existing?.localManual === true || !existing
    }, allMovies.length);

    const index = allMovies.findIndex(item => item.id === movie.id);

    if (index >= 0) {
      allMovies[index] = movie;
    } else {
      allMovies.push(movie);
    }

    localStorage.setItem("watch-status-" + movie.id, movie.status);
    saveOverride(movie);
    saveLocalMovies();

    buildFilters();
    render();
    closeAddModal();

    if (existing) {
      openDetail(movie.id);
    } else {
      rail.scrollTo({
        left: rail.scrollWidth,
        behavior: "smooth"
      });
    }

    /* The local entry is saved even if the Worker is unavailable. */
    await saveMovieToWorker(movie);

  } catch (error) {
    console.error("Could not save the archive entry:", error);
    alert("The entry could not be saved. Check the browser console for details.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = originalLabel;
  }
});

/* EVENTS */

search.addEventListener("input", render);

document.getElementById("clearSearch").addEventListener("click", () => {
  search.value = "";
  render();
  search.focus();
});

document.getElementById("clearFilters").addEventListener("click", () => {
  activeFilters = {};
  buildFilters();
  render();
});

document.getElementById("prev").addEventListener("click", () => {
  rail.scrollBy({ left: -430, behavior: "smooth" });
});

document.getElementById("next").addEventListener("click", () => {
  rail.scrollBy({ left: 430, behavior: "smooth" });
});

document.getElementById("openAdd").addEventListener("click", openAddModal);
document.getElementById("emptyAdd").addEventListener("click", openAddModal);
document.getElementById("closeAdd").addEventListener("click", closeAddModal);
document.getElementById("cancelAdd").addEventListener("click", closeAddModal);
document.getElementById("close").addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target.hasAttribute("data-close")) closeModal();
});

addModal.addEventListener("click", event => {
  if (event.target.hasAttribute("data-add-close")) closeAddModal();
});

/* DRAGGING: CASE CLICKS OPEN DETAILS; DRAGGING SCROLLS THE SHELF */

rail.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const target = event.target.closest(".case");

  drag = {
    active: true,
    moved: false,
    startX: event.clientX,
    startScroll: rail.scrollLeft,
    pointerId: event.pointerId,
    target
  };

  rail.classList.add("dragging");

  try {
    rail.setPointerCapture(event.pointerId);
  } catch {}
});

rail.addEventListener("pointermove", event => {
  if (!drag.active) return;

  const distance = event.clientX - drag.startX;

  if (Math.abs(distance) > 7) {
    drag.moved = true;
  }

  rail.scrollLeft = drag.startScroll - distance;
});

rail.addEventListener("pointerup", event => {
  if (!drag.active) return;

  const wasClick = !drag.moved;
  const clickedCase = drag.target;

  drag.active = false;
  rail.classList.remove("dragging");

  try {
    rail.releasePointerCapture(event.pointerId);
  } catch {}

  if (wasClick && clickedCase) {
    openDetail(clickedCase.dataset.id);
  }

  if (drag.moved) {
    setTimeout(() => {
      drag.moved = false;
    }, 120);
  }
});

rail.addEventListener("pointercancel", event => {
  drag.active = false;
  rail.classList.remove("dragging");

  try {
    rail.releasePointerCapture(event.pointerId);
  } catch {}
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeModal();
    closeAddModal();
  }

  if (modal.classList.contains("open") && event.key === "ArrowRight") {
    navigate(1);
  }

  if (modal.classList.contains("open") && event.key === "ArrowLeft") {
    navigate(-1);
  }
});

/* CLOCK */

function updateClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;

  clock.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

updateClock();
setInterval(updateClock, 60000);

/* LOAD COLLECTION */

async function loadMovies() {
  let baseMovies = [];

  try {
    const response = await fetch("data/movies.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`movies.json returned ${response.status}`);
    }

    const data = await response.json();

    baseMovies = Array.isArray(data)
      ? data
      : Array.isArray(data.movies)
        ? data.movies
        : [];

    if (!baseMovies.length) {
      baseMovies = fallbackMovies;
    }

  } catch (error) {
    console.warn("Using fallback movie data:", error);
    baseMovies = fallbackMovies;
  }

  const manualMovies = readLocalMovies();
  const baseIds = new Set(baseMovies.map(movie => movie.id));

  const combined = [
    ...baseMovies,
    ...manualMovies.filter(movie => !baseIds.has(movie.id))
  ];

  allMovies = applyOverrides(
    combined.map((movie, index) => normaliseMovie(movie, index))
  ).map(movie => ({
    ...movie,
    status: statusOf(movie)
  }));

  buildFilters();
  render();

  /* Retrieve artwork for existing entries that have no poster. */
  hydrateMissingArtwork();
}

async function hydrateMissingArtwork() {
  for (const movie of allMovies) {
    if (movie.poster) continue;

    try {
      const found = await findArtwork(movie.title);
      if (!found?.poster) continue;

      movie.poster = found.poster;

      if (!movie.description && found.description) {
        movie.description = found.description;
      }

      if (!movie.director && found.director) {
        movie.director = found.director;
      }

      if (!movie.language && found.language) {
        movie.language = found.language;
      }

      if (!movie.country && found.country) {
        movie.country = found.country;
      }

      if (!movie.year && found.year) {
        movie.year = found.year;
      }

      if ((!movie.genres || !movie.genres.length) && found.genres) {
        movie.genres = found.genres;
      }

      saveOverride(movie);
      saveLocalMovies();

    } catch (error) {
      console.warn(`Artwork lookup failed for ${movie.title}:`, error);
    }
  }

  render();
}

loadMovies();