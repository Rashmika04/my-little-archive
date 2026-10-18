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

/* ELEMENTS */

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

/* LIVE POSTER PREVIEW IN THE ADD / EDIT FORM */
const addPosterPreview = document.getElementById("addPosterPreview");
const addPosterPreviewImage = document.getElementById("addPosterPreviewImage");
const addPosterPreviewMessage = document.getElementById("addPosterPreviewMessage");
const addPosterField = addForm.elements.namedItem("poster");

function updateAddPosterPreview(url) {
  if (!addPosterPreview || !addPosterPreviewImage || !addPosterPreviewMessage) return;

  const posterURL = String(
    url !== undefined ? url : (addPosterField?.value || "")
  ).trim();

  addPosterPreviewImage.onerror = null;
  addPosterPreviewImage.removeAttribute("src");

  if (!posterURL) {
    addPosterPreview.hidden = true;
    return;
  }

  addPosterPreview.hidden = false;
  addPosterPreviewMessage.textContent = "Loading poster…";

  addPosterPreviewImage.onload = () => {
    addPosterPreviewMessage.textContent = "Poster preview loaded.";
  };

  addPosterPreviewImage.onerror = () => {
    addPosterPreviewMessage.textContent =
      "This poster could not be previewed. Check the image URL.";
  };

  addPosterPreviewImage.src = posterURL;
}

addPosterField?.addEventListener("input", () => updateAddPosterPreview());

/* MULTISELECT CONTROLS */

const multiSelectValues = new Map();

function setupMultiSelect(id, fieldName, separator = ", ") {
  const root = document.getElementById(id);
  if (!root) return;

  const options = root.querySelector(".multi-options");
  const selected = root.querySelector(".multi-selected");
  const customInput = root.querySelector(".multi-custom input");
  const addButton = root.querySelector(".multi-add");
  const hidden = root.querySelector(`input[name="${fieldName}"]`);
  const values = new Set();

  multiSelectValues.set(fieldName, values);

  function sync() {
    hidden.value = [...values].join(separator);
    selected.replaceChildren();

    values.forEach(value => {
      const chip = document.createElement("span");
      chip.className = "multi-chip";
      chip.append(document.createTextNode(value + " "));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + value);

      remove.addEventListener("click", () => {
        values.delete(value);
        sync();
      });

      chip.append(remove);
      selected.append(chip);
    });
  }

  function addValue(value) {
    value = value.trim();
    if (!value) return;

    const existing = [...values].some(
      item => item.toLowerCase() === value.toLowerCase()
    );

    if (!existing) values.add(value);
    sync();
  }

  options.addEventListener("change", () => {
    addValue(options.value);
    options.selectedIndex = 0;
  });

  addButton.addEventListener("click", () => {
    addValue(customInput.value);
    customInput.value = "";
  });

  customInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addButton.click();
    }
  });

  root.addValues = items => {
    values.clear();
    items.forEach(addValue);
    sync();
  };

  root.clearValues = () => {
    values.clear();
    sync();
  };
}

setupMultiSelect("representationSelect", "relationship");
setupMultiSelect("genreSelect", "genres");
setupMultiSelect("tagSelect", "tags");

function setMultiSelectValues(fieldName, value) {
  const idByField = {
    relationship: "representationSelect",
    genres: "genreSelect",
    tags: "tagSelect"
  };

  const root = document.getElementById(idByField[fieldName]);
  if (!root?.addValues) return;

  const items = Array.isArray(value)
    ? value
    : String(value || "").split(",");

  root.addValues(items);
}

function resetMultiSelects() {
  ["relationship", "genres", "tags"].forEach(field => {
    const idByField = {
      relationship: "representationSelect",
      genres: "genreSelect",
      tags: "tagSelect"
    };

    document.getElementById(idByField[field])?.clearValues();
  });
}


/* STATE */

let allMovies = [];
let filteredMovies = [];
let activeFilters = {};
let currentMovieId = null;
let editingMovieId = null;
let currentIndex = -1;
let artworkRequestIds = new Set();

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
    description:
      "A beloved period romance about Elizabeth Bennet and Mr. Darcy."
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
    description:
      "Four sisters come of age while finding their own ways through love, family and ambition."
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
    description:
      "A musical romance about two dreamers trying to build lives and careers in Los Angeles."
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
    description:
      "A whimsical caper centred on a legendary hotel concierge and his lobby boy protégé."
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
    description:
      "A visually rich psychological romance built around deception, desire and shifting loyalties."
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

function normaliseTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
    return JSON.parse(
      localStorage.getItem("watch-manual-movies") || "[]"
    );
  } catch {
    return [];
  }
}

function saveLocalMovies() {
  const manualMovies = allMovies.filter(
    movie => movie.localManual === true
  );

  localStorage.setItem(
    "watch-manual-movies",
    JSON.stringify(manualMovies)
  );
}

function readOverrides() {
  try {
    return JSON.parse(
      localStorage.getItem("watch-movie-overrides") || "{}"
    );
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

  const valid = value =>
    value && value !== "N/A" ? value : "";

  const list = value =>
    valid(value)
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


async function findArtwork(title, requestedYear = "", requestedType = "") {
  title = String(title || "").trim();
  if (!title) return null;

  const wanted = normaliseTitle(title);

  const normaliseArtworkType = value => {
    const type = String(value || "").trim().toLowerCase();

    if (["movie", "film"].includes(type)) return "movie";

    if (
      ["series", "tv show", "show", "drama", "anime"].includes(type)
    ) {
      return "series";
    }

    return type;
  };

  const matchesRequestedItem = result => {
    if (!result?.poster || !result?.title) return false;

    if (normaliseTitle(result.title) !== wanted) return false;

    // Reject different years when both are known.
    if (
      requestedYear &&
      result.year &&
      Number(requestedYear) !== Number(result.year)
    ) {
      return false;
    }

    // Reject different media types when both are known.
    const wantedType = normaliseArtworkType(requestedType);
    const resultType = normaliseArtworkType(result.type);

    if (wantedType && resultType && wantedType !== resultType) {
      return false;
    }

    return true;
  };

  // 1. Try the existing Worker / OMDb lookup.
  try {
    const params = new URLSearchParams({ title });

    if (requestedYear) {
      params.set("year", String(requestedYear));
    }

    if (requestedType) {
      params.set("type", normaliseArtworkType(requestedType));
    }

    const response = await fetch(
      `${WORKER_URL}?${params.toString()}`,
      { cache: "no-store" }
    );

    if (response.ok) {
      const result = parseOMDb(await response.json());

      if (matchesRequestedItem(result)) {
        return result;
      }

      if (result?.poster) {
        console.warn("Rejected mismatched Worker artwork:", {
          requested: title,
          requestedYear,
          requestedType,
          found: result.title,
          foundYear: result.year,
          foundType: result.type
        });
      }
    }
  } catch (error) {
    console.warn("OMDb lookup unavailable:", error);
  }

  // 2. Wikipedia fallback.
  // Wikipedia results do not reliably identify media type or release year,
  // so use this fallback only when no year/type was requested.
  if (requestedYear || requestedType) {
    return null;
  }

  try {
    const url =
      "https://en.wikipedia.org/w/api.php" +
      "?action=query" +
      "&generator=search" +
      "&gsrsearch=" + encodeURIComponent(title) +
      "&gsrnamespace=0" +
      "&gsrlimit=10" +
      "&prop=pageimages|extracts" +
      "&exintro=1" +
      "&explaintext=1" +
      "&piprop=thumbnail" +
      "&pithumbsize=900" +
      "&format=json" +
      "&formatversion=2" +
      "&origin=*";

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const data = await response.json();
    const pages = data?.query?.pages || [];

    const exactPage = pages.find(page =>
      normaliseTitle(page.title) === wanted &&
      page.thumbnail?.source
    );

    if (!exactPage) return null;

    return {
      title: exactPage.title,
      poster: exactPage.thumbnail.source,
      description: exactPage.extract || "",
      summary: exactPage.extract || ""
    };
  } catch (error) {
    console.warn("Wikipedia artwork lookup unavailable:", error);
  }

  return null;
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
    console.warn(
      "Remote save unavailable. The local copy is preserved.",
      error
    );

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

/* SEARCH */

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

/* TYPOGRAPHY */

const TYPOGRAPHY_FONTS = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: "Arial, Helvetica, sans-serif",
  condensed: '"Arial Narrow", "Roboto Condensed", sans-serif',
  typewriter: '"Courier New", Courier, monospace',
  rounded: '"Trebuchet MS", Arial, sans-serif',
  display: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  cursive: '"Brush Script MT", "Segoe Script", cursive'
};

function automaticTypography(movie) {
  const text = [
    movie.title,
    movie.description,
    ...asArray(movie.genres),
    ...asArray(movie.tags),
    movie.titleStyle
  ].join(" ").toLowerCase();

  if (/romance|romantic|love|gl|bl|yuri|relationship|wedding|heart/.test(text)) {
    return {
      fontFamily: TYPOGRAPHY_FONTS.serif,
      fontSize: "15px",
      fontWeight: "500",
      fontStyle: "italic",
      letterSpacing: "0.15px",
      color: "#fff8ee"
    };
  }

  if (/classic|historical|period|literary|adaptation|elegant|drama/.test(text)) {
    return {
      fontFamily: TYPOGRAPHY_FONTS.serif,
      fontSize: "14px",
      fontWeight: "600",
      fontStyle: "normal",
      letterSpacing: "0.35px",
      color: "#fff8ee"
    };
  }

  if (/thriller|horror|crime|mystery|dark|psychological|dramatic|action/.test(text)) {
    return {
      fontFamily: TYPOGRAPHY_FONTS.display,
      fontSize: "13px",
      fontWeight: "700",
      fontStyle: "normal",
      letterSpacing: "0.8px",
      color: "#fffaf2"
    };
  }

  if (/comedy|sitcom|animation|anime|family|adventure|whimsical|quirky/.test(text)) {
    return {
      fontFamily: TYPOGRAPHY_FONTS.rounded,
      fontSize: "14px",
      fontWeight: "700",
      fontStyle: "normal",
      letterSpacing: "0.1px",
      color: "#fff8ee"
    };
  }

  if (/minimal|modern|sci.?fi|science fiction|technology/.test(text)) {
    return {
      fontFamily: TYPOGRAPHY_FONTS.sans,
      fontSize: "13px",
      fontWeight: "600",
      fontStyle: "normal",
      letterSpacing: "1px",
      color: "#fff8ee"
    };
  }

  return {
    fontFamily: TYPOGRAPHY_FONTS.serif,
    fontSize: "14px",
    fontWeight: "600",
    fontStyle: "normal",
    letterSpacing: "0.25px",
    color: "#fff8ee"
  };
}

/* FIX: SUPPORT BOTH FONT ALIASES AND CSS FONT VALUES */

function typographyFor(movie) {
  if (movie.typographyMode !== "manual") {
    return automaticTypography(movie);
  }

  const savedFont = String(movie.manualFont || "serif").trim();

  const fontAliases = {
    serif: TYPOGRAPHY_FONTS.serif,
    sans: TYPOGRAPHY_FONTS.sans,
    condensed: TYPOGRAPHY_FONTS.condensed,
    typewriter: TYPOGRAPHY_FONTS.typewriter,
    rounded: TYPOGRAPHY_FONTS.rounded,
    display: TYPOGRAPHY_FONTS.display,
    cursive: TYPOGRAPHY_FONTS.cursive,
    inherit: '"Cormorant Garamond", Georgia, serif'
  };

  const allowedFonts = [
    "Georgia, serif",
    "'Palatino Linotype', Palatino, serif",
    "'Times New Roman', serif",
    "'Baskerville', serif",
    "'Garamond', serif",
    "'Courier New', monospace",
    "Arial, sans-serif",
    "'Trebuchet MS', sans-serif",
    "Impact, sans-serif"
  ];

  const fontFamily =
    fontAliases[savedFont] ||
    (allowedFonts.includes(savedFont)
      ? savedFont
      : TYPOGRAPHY_FONTS.serif);

  const size = Number(movie.manualFontSize);
  const spacing = Number(movie.manualLetterSpacing);
  const weight = String(movie.manualFontWeight || "600");

  return {
    fontFamily,
    fontSize: `${Math.min(28, Math.max(8, Number.isFinite(size) && size ? size : 14))}px`,
    fontWeight: ["400", "500", "600", "700"].includes(weight)
      ? weight
      : "600",
    fontStyle: movie.manualFontStyle === "italic" ? "italic" : "normal",
    letterSpacing: `${Math.min(5, Math.max(-1, Number.isFinite(spacing) ? spacing : 0))}px`,
    color: /^#[0-9a-f]{6}$/i.test(movie.manualFontColor || "")
      ? movie.manualFontColor
      : "#fff8ee"
  };
}

function applyTypographyToCase(element, movie) {
  const title = element.querySelector(".case-title");
  if (!title) return;

  const style = typographyFor(movie);

  title.style.fontFamily = style.fontFamily;
  title.style.fontSize = style.fontSize;
  title.style.fontWeight = style.fontWeight;
  title.style.fontStyle = style.fontStyle;
  title.style.letterSpacing = style.letterSpacing;
  title.style.color = style.color;
}

function setTypographyFormField(name, value) {
  const field =
    addForm.elements.namedItem(name) ||
    document.getElementById(name);

  if (field && value !== undefined && value !== null) {
    field.value = value;
  }
}

function readTypographyForm(formData) {
  return {
    typographyMode: String(formData.get("typographyMode") || "automatic"),
    manualFont: String(formData.get("manualFont") || "serif"),
    manualFontSize: Number(formData.get("manualFontSize") || 14),
    manualFontWeight: String(formData.get("manualFontWeight") || "600"),
    manualFontStyle: String(formData.get("manualFontStyle") || "normal"),
    manualLetterSpacing: Number(formData.get("manualLetterSpacing") || 0),
    manualFontColor: String(formData.get("manualFontColor") || "#fff8ee")
  };
}

/* CD CASE CREATION */

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

  applyTypographyToCase(element, movie);

  element.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(movie.id);
    }
  });

  return element;
}


/* RENDER SHELF — INFINITE DISPLAY LOOP */
let shelfLoopWidth = 0;

function render() {
  filteredMovies = allMovies.filter(matchesFilters);

  count.textContent =
    `${filteredMovies.length} ${filteredMovies.length === 1 ? "TITLE" : "TITLES"}`;

  rail.innerHTML = "";
  shelfLoopWidth = 0;

  const appendCopy = () => {
    filteredMovies.forEach(movie => {
      rail.appendChild(makeCase(movie));
    });
  };

  appendCopy();

  empty.hidden = filteredMovies.length > 0;

  if (currentMovieId) {
    currentIndex = filteredMovies.findIndex(
      movie => movie.id === currentMovieId
    );
  }

  // Measure one row before deciding whether to loop it.
  if (filteredMovies.length > 1) {
    const first = rail.querySelector(".case");
    const last = rail.querySelector(".case:last-child");

    if (first && last) {
      const gap = parseFloat(getComputedStyle(rail).gap) || 0;
      const rowWidth =
        last.offsetLeft + last.offsetWidth - first.offsetLeft + gap;

      // Only repeat a shelf long enough to feel continuous.
      if (rowWidth > 2600) {
        shelfLoopWidth = rowWidth;
        rail.innerHTML = "";

        appendCopy();
        appendCopy();
        appendCopy();

        requestAnimationFrame(() => {
          rail.scrollLeft = shelfLoopWidth;
          updateShelfArrows();
          updateShelfCurve();
        });
      }
    }
  }

  if (!shelfLoopWidth) {
    rail.scrollLeft = 0;
    requestAnimationFrame(updateShelfCurve);
  }

  updateShelfArrows();
}


/* FLOATING CASE PREVIEW */
const rack = rail.closest(".rack");
const prevArrow = document.getElementById("prev");
const nextArrow = document.getElementById("next");

const casePreview = document.createElement("aside");
casePreview.className = "case-preview";
casePreview.setAttribute("aria-hidden", "true");
casePreview.innerHTML = `
  <div class="case-preview-art"></div>
  <div class="case-preview-copy">
    <span class="case-preview-meta"></span>
    <h3 class="case-preview-title"></h3>
    <p class="case-preview-genres"></p>
    <span class="case-preview-status"></span>
  </div>
`;
document.body.appendChild(casePreview);

let previewMovieId = null;

function hideCasePreview() {
  previewMovieId = null;
  casePreview.classList.remove("visible");
  casePreview.setAttribute("aria-hidden", "true");
}

function showCasePreview(element) {
  if (!element || drag.active) return;

  const movie = filteredMovies.find(
    item => item.id === element.dataset.id
  );
  if (!movie) return;

  previewMovieId = movie.id;

  const art = casePreview.querySelector(".case-preview-art");
  const meta = casePreview.querySelector(".case-preview-meta");
  const title = casePreview.querySelector(".case-preview-title");
  const genres = casePreview.querySelector(".case-preview-genres");
  const status = casePreview.querySelector(".case-preview-status");

  art.replaceChildren();

  if (movie.poster) {
    const image = document.createElement("img");
    image.src = movie.poster;
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      if (previewMovieId === movie.id) image.remove();
    }, { once: true });
    art.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "case-preview-placeholder";
    placeholder.textContent = movie.title;
    art.appendChild(placeholder);
  }

  meta.textContent = [
    movie.type,
    movie.year
  ].filter(Boolean).join(" · ");

  title.textContent = movie.title;

  const genreList = Array.isArray(movie.genre)
    ? movie.genre
    : Array.isArray(movie.genres)
      ? movie.genres
      : movie.genre
        ? [movie.genre]
        : movie.genres
          ? [movie.genres]
          : [];

  genres.textContent = genreList.filter(Boolean).join(" · ");
  genres.hidden = genreList.length === 0;

  status.textContent = statusOf(movie) || "";
  status.hidden = !status.textContent;

  const caseRect = element.getBoundingClientRect();
  const rackRect = rack.getBoundingClientRect();
  const previewWidth = Math.min(320, window.innerWidth - 24);

  casePreview.style.width = `${previewWidth}px`;

  const left = Math.max(
    12,
    Math.min(
      caseRect.left + caseRect.width / 2 - previewWidth / 2,
      window.innerWidth - previewWidth - 12
    )
  );

  casePreview.style.left = `${left}px`;
  casePreview.style.top = `${Math.max(
    12,
    Math.min(rackRect.top + 18, window.innerHeight - casePreview.offsetHeight - 12)
  )}px`;
  casePreview.classList.add("visible");
  casePreview.setAttribute("aria-hidden", "false");
}

rail.addEventListener("pointerover", event => {
  if (event.pointerType === "touch") return;
  const element = event.target.closest(".case");
  if (element && !element.contains(event.relatedTarget)) {
    showCasePreview(element);
  }
});

rail.addEventListener("pointerout", event => {
  const element = event.target.closest(".case");
  if (element && !element.contains(event.relatedTarget)) {
    hideCasePreview();
  }
});

rail.addEventListener("focusin", event => {
  const element = event.target.closest(".case");
  if (element) showCasePreview(element);
});

rail.addEventListener("focusout", event => {
  if (!rail.contains(event.relatedTarget)) hideCasePreview();
});


function updateShelfArrows() {
  if (shelfLoopWidth > 0) {
    prevArrow.disabled = false;
    nextArrow.disabled = false;

    prevArrow.setAttribute("aria-disabled", "false");
    nextArrow.setAttribute("aria-disabled", "false");
    return;
  }

  const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
  const atStart = rail.scrollLeft <= 2;
  const atEnd = rail.scrollLeft >= maxScroll - 2;

  prevArrow.disabled = atStart;
  nextArrow.disabled = atEnd;

  prevArrow.setAttribute("aria-disabled", String(atStart));
  nextArrow.setAttribute("aria-disabled", String(atEnd));
}


rail.addEventListener("scroll", updateShelfArrows, { passive: true });


/* Seamless boundary wrapping — no automatic scrolling */
rail.addEventListener("scroll", () => {
  if (!shelfLoopWidth) return;

  const leftBoundary = shelfLoopWidth * 0.5;
  const rightBoundary = shelfLoopWidth * 1.5;
  let newPosition = null;

  if (rail.scrollLeft < leftBoundary) {
    newPosition = rail.scrollLeft + shelfLoopWidth;
  } else if (rail.scrollLeft > rightBoundary) {
    newPosition = rail.scrollLeft - shelfLoopWidth;
  }

  if (newPosition !== null) {
    // Teleport to the equivalent point without smooth-scroll animation.
    const previousBehavior = rail.style.scrollBehavior;
    rail.style.scrollBehavior = "auto";
    rail.scrollLeft = newPosition;

    requestAnimationFrame(() => {
      rail.style.scrollBehavior = previousBehavior;
    });
  }
}, { passive: true });




/* SCROLL-RESPONSIVE 3D SHELF */
function updateShelfCurve() {
  const cases = rail.querySelectorAll(".case");
  const halfWidth = Math.max(1, rail.clientWidth / 2);
  const shelfCenter = rail.scrollLeft + halfWidth;

  cases.forEach(element => {
    // Layout position is stable even when the case is transformed.
    const caseCenter =
      element.offsetLeft + element.offsetWidth / 2;

    const distance = Math.max(
      -1,
      Math.min(1, (caseCenter - shelfCenter) / halfWidth)
    );

    const eased = Math.sign(distance) *
      Math.pow(Math.abs(distance), 1.35);

    element.style.setProperty(
      "--curve-angle",
      `${eased * 10}deg`
    );
  });
}
rail.addEventListener("scroll", updateShelfCurve, { passive: true });
window.addEventListener("resize", updateShelfCurve);
window.addEventListener("resize", updateShelfArrows);

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
            : `<div class="poster-missing">${escapeHTML(movie.title)} — poster unavailable</div>`
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
      if (!art || art.querySelector(".poster-missing")) return;

      const fallback = document.createElement("div");
      fallback.className = "poster-missing";
      fallback.textContent = `${movie.title} — poster unavailable`;
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

  detailContent.querySelector("#detailPrev").addEventListener(
    "click",
    () => navigate(-1)
  );

  detailContent.querySelector("#detailNext").addEventListener(
    "click",
    () => navigate(1)
  );

  detailContent.querySelector("#detailPrev").disabled = currentIndex <= 0;
  detailContent.querySelector("#detailNext").disabled =
    currentIndex < 0 || currentIndex >= filteredMovies.length - 1;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

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


/* RETRIEVE MISSING ARTWORK — VALIDATE BEFORE SAVING */

async function fetchArtworkForExistingMovie(movie) {
  if (!movie || artworkRequestIds.has(movie.id)) return;

  // Never replace a poster chosen manually by the user.
  if (movie.posterManuallySet === true) return;

  // This function should only retrieve artwork when the poster is missing.
  if (movie.poster) return;

  artworkRequestIds.add(movie.id);

  const normaliseTypeForArtwork = value => {
    const type = String(value || "").trim().toLowerCase();

    if (["movie", "film"].includes(type)) return "movie";

    if (
      ["series", "tv show", "show", "drama", "anime"].includes(type)
    ) {
      return "series";
    }

    return type;
  };

  try {
    const found = await findArtwork(movie.title, movie.year, movie.type);

    if (!found?.poster || !found?.title) return;

    // Require an exact normalized title match.
    if (
      normaliseTitle(found.title) !== normaliseTitle(movie.title)
    ) {
      console.warn("Rejected mismatched artwork title:", {
        requested: movie.title,
        found: found.title
      });
      return;
    }

    // If both years are known, they must match.
    if (
      movie.year &&
      found.year &&
      Number(movie.year) !== Number(found.year)
    ) {
      console.warn("Rejected artwork from a different year:", {
        title: movie.title,
        requestedYear: movie.year,
        foundYear: found.year
      });
      return;
    }

    // If both media types are known, they must match.
    const requestedType = normaliseTypeForArtwork(movie.type);
    const foundType = normaliseTypeForArtwork(found.type);

    if (
      requestedType &&
      foundType &&
      requestedType !== foundType
    ) {
      console.warn("Rejected artwork from a different media type:", {
        title: movie.title,
        requestedType,
        foundType
      });
      return;
    }

    // Recheck before saving in case the poster was manually changed
    // while the artwork request was in progress.
    if (movie.posterManuallySet === true || movie.poster) return;

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

    if (currentMovieId === movie.id && modal.classList.contains("open")) {
      openDetail(movie.id);
    }
  } catch (error) {
    console.warn(`Artwork lookup failed for ${movie.title}:`, error);
  } finally {
    artworkRequestIds.delete(movie.id);
  }
}

/* ADD / EDIT MODAL */
const archiveType = document.getElementById("archiveType");
const customType = document.getElementById("customType");

function updateCustomType() {
  const isOther = archiveType.value === "Other";
  customType.hidden = !isOther;
  customType.required = isOther;

  if (!isOther) customType.value = "";
}

archiveType.addEventListener("change", updateCustomType);
updateCustomType();

function openAddModal() {
  lastAutoFilledPoster = "";
  updateAddPosterPreview("");
  editingMovieId = null;
  addForm.reset();
  resetMultiSelects();
  customType.value = "";
  updateCustomType();
  document.getElementById("addHeadingTitle").textContent = "Add a story.";
  document.getElementById("addHeadingText").textContent =
    "Find a title or enter its details manually. You can edit everything before saving.";

  addForm.querySelector('[type="submit"]').textContent = "SAVE TO ARCHIVE";

  movieSearchStatus.textContent =
    "Artwork and details are retrieved automatically when available.";

  const typographyModeField =
    addForm.elements.namedItem("typographyMode") ||
    document.getElementById("typographyMode");

  if (typographyModeField) {
    typographyModeField.value = "automatic";
    typographyModeField.dispatchEvent(new Event("change", { bubbles: true }));
  }

  setTypographyFormField("manualFont", "serif");
  setTypographyFormField("manualFontSize", 14);
  setTypographyFormField("manualFontWeight", "600");
  setTypographyFormField("manualFontStyle", "normal");
  setTypographyFormField("manualLetterSpacing", 0);
  setTypographyFormField("manualFontColor", "#fff8ee");

  addModal.classList.add("open");
  addModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  setTimeout(() => addForm.elements.namedItem("title").focus(), 50);
}

function openEditModal(movie) {
  lastAutoFilledPoster = "";
  editingMovieId = movie.id;
  addForm.reset();
  resetMultiSelects();
  
  document.getElementById("addHeadingTitle").textContent = "Edit this story.";
  document.getElementById("addHeadingText").textContent =
    "Make your changes and save the updated entry.";

  addForm.querySelector('[type="submit"]').textContent = "SAVE CHANGES";

  const set = (name, value) => {
    const field = addForm.elements.namedItem(name);
    if (field) field.value = value ?? "";
  };

  set("title", movie.title);
  const standardTypes = [
  "Movie", "Series", "Drama", "TV Show",
  "Anime", "Special", "Other"
];

if (standardTypes.includes(movie.type)) {
  set("type", movie.type);
  set("customType", "");
} else {
  set("type", "Other");
  set("customType", movie.type);
}

updateCustomType();
  set("year", movie.year);
  set("director", movie.director);
  set("language", movie.language);
  set("country", movie.country);
  setMultiSelectValues("relationship", movie.relationship);
  setMultiSelectValues("genres", movie.genres);
  setMultiSelectValues("tags", movie.tags);
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

  setTypographyFormField("typographyMode", movie.typographyMode || "automatic");
  setTypographyFormField("manualFont", movie.manualFont || "serif");
  setTypographyFormField("manualFontSize", movie.manualFontSize ?? 14);
  setTypographyFormField("manualFontWeight", movie.manualFontWeight || "600");
  setTypographyFormField("manualFontStyle", movie.manualFontStyle || "normal");
  setTypographyFormField("manualLetterSpacing", movie.manualLetterSpacing ?? 0);
  setTypographyFormField("manualFontColor", movie.manualFontColor || "#fff8ee");

  const typographyModeField =
    addForm.elements.namedItem("typographyMode") ||
    document.getElementById("typographyMode");

  if (typographyModeField) {
    typographyModeField.dispatchEvent(new Event("change", { bubbles: true }));
  }

  movieLookup.value = movie.title;
  updateAddPosterPreview(movie.poster || "");
  movieSearchStatus.textContent =
    "Editing an existing entry. Searching again can retrieve its artwork.";

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

let lastAutoFilledPoster = "";
let lastAutoFilledFields = {};
let lookupRequestToken = 0;

function clearPreviousAutomaticResults() {
  for (const [name, previousValue] of Object.entries(lastAutoFilledFields)) {
    const field = addForm.elements.namedItem(name);
    if (field && String(field.value || "").trim() === previousValue) {
      field.value = "";
    }
  }

  lastAutoFilledFields = {};

  const posterField = addForm.elements.namedItem("poster");
  if (
    posterField &&
    lastAutoFilledPoster &&
    String(posterField.value || "").trim() === lastAutoFilledPoster
  ) {
    posterField.value = "";
    updateAddPosterPreview("");
  }

  lastAutoFilledPoster = "";
}

function setAutomaticField(name, value) {
  const field = addForm.elements.namedItem(name);
  if (!field || value === undefined || value === null || value === "") return;

  const textValue = String(value);
  field.value = textValue;
  lastAutoFilledFields[name] = textValue;
}

async function lookupMovie() {
  const title = movieLookup.value.trim();

  if (!title) {
    movieSearchStatus.textContent = "Enter a movie or show title first.";
    return;
  }

  const requestToken = ++lookupRequestToken;

  // Clear only values supplied by the previous automatic search.
  // Values the user edited manually are preserved.
  clearPreviousAutomaticResults();

  findMovieButton.disabled = true;
  movieSearchStatus.textContent = "Looking for the exact title and artwork…";

  try {
    
const requestedYear = String(
  addForm.elements.namedItem("year")?.value || ""
).trim();

// Don't assume a new title is a movie just because the
// form defaults to Movie. Search without a type restriction.
const requestedType = "";

const found = await findArtwork(title, requestedYear, requestedType);

    // Ignore older searches that finish after a newer search.
    if (requestToken !== lookupRequestToken) return;

    if (!found || !found.title ||
        normaliseTitle(found.title) !== normaliseTitle(title)) {
      const titleField = addForm.elements.namedItem("title");
      if (titleField && !titleField.value.trim()) {
        titleField.value = title;
      }

      updateAddPosterPreview("");
      movieSearchStatus.textContent =
        "No exact title match found. Enter the details manually or try another title.";
      return;
    }

    setAutomaticField("title", found.title);
    setAutomaticField("type", found.type);
    setAutomaticField("year", found.year);
    setAutomaticField("director", found.director);
    setAutomaticField("language", found.language);
    setAutomaticField("country", found.country);
    setAutomaticField("duration", found.duration);
    setAutomaticField("rating", found.rating);
    setAutomaticField("genres", asArray(found.genres).join(", "));
    setAutomaticField("description", found.description);

    const posterField = addForm.elements.namedItem("poster");

    if (posterField) {
      posterField.value = found.poster || "";
      lastAutoFilledPoster = found.poster || "";
      updateAddPosterPreview(lastAutoFilledPoster);
    }

    movieSearchStatus.textContent = found.poster
      ? "Exact title found. Details and poster preview updated."
      : "Title found, but artwork is unavailable. You can still save it.";
  } catch (error) {
    if (requestToken !== lookupRequestToken) return;
    console.error("Title lookup failed:", error);
    updateAddPosterPreview("");
    movieSearchStatus.textContent =
      "Automatic lookup failed. Check the title or enter the details manually.";
  } finally {
    if (requestToken === lookupRequestToken) {
      findMovieButton.disabled = false;
    }
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
  const selectedType = String(formData.get("type") || "Movie").trim();
const customType = String(formData.get("customType") || "").trim();
const type = selectedType === "Other" ? customType : selectedType;

if (!type) {
  alert("Please enter a custom type.");
  return;
}

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
    const enteredPosterURL = String(formData.get("poster") || "").trim();
    let posterURL = enteredPosterURL || existing?.poster || "";

    if (!posterURL) {
      const found = await findArtwork(title, year, type);

      if (
        found?.poster &&
        normaliseTitle(found.title) === normaliseTitle(title) &&
        (!year || !found.year || Number(found.year) === Number(year))
      ) {
        posterURL = found.poster;
      }
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
      posterManuallySet: enteredPosterURL
        ? enteredPosterURL !== lastAutoFilledPoster
        : existing?.posterManuallySet === true,
      duration: String(formData.get("duration") || "").trim(),
      rating: String(formData.get("rating") || "").trim(),
      dateWatched: String(formData.get("dateWatched") || "").trim(),
      whereToWatch: String(formData.get("whereToWatch") || "").trim(),
      watchLink: String(formData.get("watchLink") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      personalNote: String(formData.get("personalNote") || "").trim(),
      ...readTypographyForm(formData),
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

prevArrow.addEventListener("click", () => {
  rail.scrollBy({
    left: -Math.max(300, rail.clientWidth * 0.75),
    behavior: "smooth"
  });
});

nextArrow.addEventListener("click", () => {
  rail.scrollBy({
    left: Math.max(300, rail.clientWidth * 0.75),
    behavior: "smooth"
  });
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


/* DRAGGING THE SHELF — smooth momentum */

let shelfMomentumFrame = null;
let shelfVelocity = 0;
let shelfLastX = 0;
let shelfLastTime = 0;

const stopShelfMomentum = () => {
  if (shelfMomentumFrame !== null) {
    cancelAnimationFrame(shelfMomentumFrame);
    shelfMomentumFrame = null;
  }
};

const runShelfMomentum = () => {
  rail.scrollLeft -= shelfVelocity;
  shelfVelocity *= 0.94;

  if (Math.abs(shelfVelocity) > 0.35) {
    shelfMomentumFrame = requestAnimationFrame(runShelfMomentum);
  } else {
    shelfMomentumFrame = null;
    shelfVelocity = 0;
  }
};

rail.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  stopShelfMomentum();
  shelfVelocity = 0;

  const target = event.target.closest(".case");

  drag = {
    active: true,
    moved: false,
    startX: event.clientX,
    startScroll: rail.scrollLeft,
    pointerId: event.pointerId,
    target
  };

  shelfLastX = event.clientX;
  shelfLastTime = performance.now();

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

  const now = performance.now();
  const elapsed = now - shelfLastTime;

  if (elapsed > 0) {
    const instantVelocity =
      (event.clientX - shelfLastX) / elapsed;

    shelfVelocity = instantVelocity * 16;
  }

  shelfLastX = event.clientX;
  shelfLastTime = now;
});

const finishShelfDrag = event => {
  if (!drag.active) return;

  const wasClick = !drag.moved;
  const clickedCase = drag.target;
  const pointerId = drag.pointerId;

  drag.active = false;
  rail.classList.remove("dragging");

  try {
    if (rail.hasPointerCapture(pointerId)) {
      rail.releasePointerCapture(pointerId);
    }
  } catch {}

  if (wasClick && clickedCase) {
    shelfVelocity = 0;
    openDetail(clickedCase.dataset.id);
    return;
  }

  if (drag.moved) {
    drag.moved = false;
  }

  // A quick release glides; a slow release settles almost immediately.
  shelfVelocity = Math.max(-22, Math.min(22, shelfVelocity));

  if (Math.abs(shelfVelocity) > 1) {
    shelfMomentumFrame = requestAnimationFrame(runShelfMomentum);
  } else {
    shelfVelocity = 0;
  }
};

rail.addEventListener("pointerup", finishShelfDrag);

rail.addEventListener("pointercancel", event => {
  if (!drag.active) return;

  drag.active = false;
  shelfVelocity = 0;
  rail.classList.remove("dragging");

  try {
    if (rail.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }
  } catch {}
});

/* KEYBOARD */

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

/* LOAD COLLECTION — MERGE DUPLICATES SAFELY */

function movieMatchKey(movie) {
  const title = normaliseTitle(movie.title);
  const year = String(movie.year || "").trim();
  const type = String(movie.type || "").trim().toLowerCase();

  if (!title || !year) return "";

  const normalizedType =
    /^(movie|film)$/i.test(type) ? "movie" :
    /^(series|tv show|show|drama|anime)$/i.test(type) ? "series" :
    type;

  return `${title}|${year}|${normalizedType}`;
}

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
  const overrides = readOverrides();

  const combined = [];
  const byId = new Map();
  const byMatchKey = new Map();

  function hasUsefulValue(value) {
    return value !== undefined &&
      value !== null &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0);
  }

  function addOrMerge(rawMovie) {
    const movie = normaliseMovie(rawMovie, combined.length);
    const matchKey = movieMatchKey(movie);

    const existing =
      byId.get(movie.id) ||
      (matchKey ? byMatchKey.get(matchKey) : null);

    if (!existing) {
      combined.push(movie);
      byId.set(movie.id, movie);

      if (matchKey) {
        byMatchKey.set(matchKey, movie);
      }

      return;
    }

    for (const [key, value] of Object.entries(movie)) {
      if (key === "id" || key === "status") continue;

      if (hasUsefulValue(value)) {
        existing[key] = value;
      }
    }

    existing.localManual =
      existing.localManual === true || movie.localManual === true;

    byId.set(existing.id, existing);

    const mergedKey = movieMatchKey(existing);

    if (mergedKey) {
      byMatchKey.set(mergedKey, existing);
    }
  }

  baseMovies.forEach(addOrMerge);
  manualMovies.forEach(addOrMerge);

  allMovies = combined.map(movie => {
    const override = overrides[movie.id] || {};

    const merged = normaliseMovie(
      { ...movie, ...override, id: movie.id },
      0
    );

    return {
      ...merged,
      status: statusOf(merged)
    };
  });

  buildFilters();
  render();

  hydrateMissingArtwork();
}


async function hydrateMissingArtwork() {
  for (const movie of allMovies) {
    // Never replace a manually selected poster.
    if (movie.posterManuallySet === true || movie.poster) {
      continue;
    }

    try {
      const found = await findArtwork(
        movie.title,
        movie.year,
        movie.type
      );

      if (!found?.poster || !found?.title) {
        continue;
      }

      // Require an exact title match.
      if (
        normaliseTitle(found.title) !== normaliseTitle(movie.title)
      ) {
        console.warn("Rejected mismatched artwork title:", {
          requested: movie.title,
          found: found.title
        });
        continue;
      }

      // Reject a different year when both years are known.
      if (
        movie.year &&
        found.year &&
        Number(movie.year) !== Number(found.year)
      ) {
        console.warn("Rejected artwork from a different year:", {
          title: movie.title,
          requestedYear: movie.year,
          foundYear: found.year
        });
        continue;
      }

      // Compare media types when both are available.
      const normaliseType = value => {
        const type = String(value || "").trim().toLowerCase();

        if (["movie", "film"].includes(type)) return "movie";

        if (
          ["series", "tv show", "show", "drama", "anime"].includes(type)
        ) {
          return "series";
        }

        return type;
      };

      const wantedType = normaliseType(movie.type);
      const foundType = normaliseType(found.type);

      if (
        wantedType &&
        foundType &&
        wantedType !== foundType
      ) {
        console.warn("Rejected artwork from a different media type:", {
          title: movie.title,
          wantedType,
          foundType
        });
        continue;
      }

      // Check again before saving.
      if (movie.posterManuallySet === true || movie.poster) {
        continue;
      }

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