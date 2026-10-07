/* =================================
   MY LITTLE ARCHIVE
   ADMIN DESK
   MOVIE SEARCH + SAVE
   ================================= */

const WORKER_URL =
    "https://my-little-archive-api.peddini-rashmika04.workers.dev";

let adminLoggedIn = false;


/* =================================
   START
   ================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeArchiveDesk();
    }
);


function initializeArchiveDesk() {

    const searchInput =
        document.getElementById("movie-search");

    const searchButton =
        document.getElementById("search-button");

    const searchStatus =
        document.getElementById("search-status");

    const searchResults =
        document.getElementById("search-results");

    if (
        !searchInput ||
        !searchButton ||
        !searchStatus ||
        !searchResults
    ) {
        console.error(
            "Archive Desk: required elements were not found."
        );
        return;
    }


    searchButton.addEventListener(
        "click",
        () => {
            searchMovie();
        }
    );


    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                searchMovie();
            }

        }
    );


    setupWatchedControls();
    setupCollectionButtons();
    setupSaveButton();


    console.log(
        "My Little Archive admin.js loaded successfully."
    );
}



/* =================================
   SEARCH MOVIE
   ================================= */

async function searchMovie() {

    const searchInput =
        document.getElementById("movie-search");

    const searchButton =
        document.getElementById("search-button");

    const searchStatus =
        document.getElementById("search-status");

    const searchResults =
        document.getElementById("search-results");


    const title =
        searchInput.value.trim();


    if (!title) {

        searchStatus.textContent =
            "Please enter a movie title.";

        searchResults.innerHTML = `
            <div class="empty-search">

                <span>🎞</span>

                <p>
                    Type a movie title above first.
                </p>

            </div>
        `;

        return;
    }


    searchButton.disabled = true;

    searchButton.textContent =
        "Searching...";

    searchStatus.textContent =
        `Searching for “${title}”…`;

    searchResults.innerHTML = `
        <div class="search-status">
            Looking through the movie database...
        </div>
    `;


    try {

        const requestURL =
            WORKER_URL +
            "?title=" +
            encodeURIComponent(title);


        const response =
            await fetch(requestURL);


        if (!response.ok) {

            throw new Error(
                `Worker returned HTTP ${response.status}`
            );

        }


        const movie =
            await response.json();


        if (
            movie.Response === "False"
        ) {

            searchStatus.textContent =
                "Movie not found.";

            searchResults.innerHTML = `
                <div class="search-status">

                    <strong>
                        Nothing found.
                    </strong>

                    <br><br>

                    ${escapeHTML(
                        movie.Error ||
                        "Try another movie title."
                    )}

                </div>
            `;

            return;
        }


        if (!movie.Title) {

            throw new Error(
                "The Worker returned data, but no movie title was found."
            );

        }


        searchStatus.textContent =
            `Found “${movie.Title}”.`;


        displayMovieResult(movie);

    }

    catch (error) {

        console.error(
            "Movie search error:",
            error
        );


        searchStatus.textContent =
            "Something went wrong while searching.";


        searchResults.innerHTML = `
            <div class="search-status">

                <strong>
                    I couldn't complete the search.
                </strong>

                <br><br>

                Please try again.

                <br><br>

                <small>
                    ${escapeHTML(error.message)}
                </small>

            </div>
        `;

    }

    finally {

        searchButton.disabled = false;

        searchButton.textContent =
            "Search";

    }

}



/* =================================
   DISPLAY SEARCH RESULT
   ================================= */

function displayMovieResult(movie) {

    const searchResults =
        document.getElementById("search-results");


    const poster =
        movie.Poster &&
        movie.Poster !== "N/A"
            ? movie.Poster
            : "";


    const title =
        movie.Title || "Unknown title";


    const year =
        movie.Year &&
        movie.Year !== "N/A"
            ? movie.Year
            : "";


    const type =
        movie.Type &&
        movie.Type !== "N/A"
            ? movie.Type
            : "movie";


    const director =
        movie.Director &&
        movie.Director !== "N/A"
            ? movie.Director
            : "Not available";


    const genre =
        movie.Genre &&
        movie.Genre !== "N/A"
            ? movie.Genre
            : "Not available";


    const language =
        movie.Language &&
        movie.Language !== "N/A"
            ? movie.Language
            : "Not available";


    const country =
        movie.Country &&
        movie.Country !== "N/A"
            ? movie.Country
            : "Not available";


    const plot =
        movie.Plot &&
        movie.Plot !== "N/A"
            ? movie.Plot
            : "No summary available.";


    searchResults.innerHTML = `

        <article
            style="
                display:grid;
                grid-template-columns:150px 1fr;
                gap:28px;
                padding:24px;
                border:1px solid rgba(0,0,0,.12);
                background:rgba(255,255,255,.35);
            "
        >

            <div
                style="
                    width:150px;
                    aspect-ratio:2/3;
                    overflow:hidden;
                    background:#e8e2d8;
                "
            >

                ${
                    poster
                    ? `
                        <img
                            src="${escapeAttribute(poster)}"
                            alt="${escapeAttribute(title)} poster"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                display:block;
                            "
                        >
                    `
                    : `
                        <div
                            style="
                                width:100%;
                                height:100%;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                font-size:2rem;
                            "
                        >
                            🎞
                        </div>
                    `
                }

            </div>


            <div>

                <p
                    style="
                        margin:0 0 8px;
                        font-size:.7rem;
                        letter-spacing:.12em;
                        text-transform:uppercase;
                        opacity:.6;
                    "
                >
                    ${escapeHTML(type)}
                    ${year ? ` · ${escapeHTML(year)}` : ""}
                </p>


                <h2
                    style="
                        margin:0 0 12px;
                        font-family:Georgia,'Times New Roman',serif;
                        font-size:2rem;
                        font-weight:normal;
                    "
                >
                    ${escapeHTML(title)}
                </h2>


                <p
                    style="
                        line-height:1.7;
                        opacity:.75;
                    "
                >

                    <strong>Director:</strong>
                    ${escapeHTML(director)}

                    <br>

                    <strong>Genre:</strong>
                    ${escapeHTML(genre)}

                    <br>

                    <strong>Language:</strong>
                    ${escapeHTML(language)}

                    <br>

                    <strong>Country:</strong>
                    ${escapeHTML(country)}

                </p>


                <p
                    style="
                        line-height:1.7;
                        margin:18px 0;
                    "
                >
                    ${escapeHTML(plot)}
                </p>


                <button
                    type="button"
                    id="use-movie-button"
                    class="save-button"
                    style="
                        width:auto;
                        padding:12px 18px;
                    "
                >
                    Use this movie →
                </button>


                ${
                    movie.imdbID
                    ? `
                        <p
                            style="
                                margin-top:14px;
                                font-size:.75rem;
                                opacity:.6;
                            "
                        >
                            IMDb: ${escapeHTML(movie.imdbID)}
                        </p>
                    `
                    : ""
                }

            </div>

        </article>

    `;


    const useButton =
        document.getElementById(
            "use-movie-button"
        );


    if (useButton) {

        useButton.addEventListener(
            "click",
            () => {
                useMovie(movie);
            }
        );

    }

}



/* =================================
   USE MOVIE
   ================================= */

function useMovie(movie) {

    setValue(
        "movie-title",
        movie.Title
    );


    setValue(
        "movie-year",
        movie.Year
    );


    setValue(
        "movie-type",
        movie.Type
    );


    setValue(
        "movie-director",
        movie.Director
    );


    setValue(
        "movie-language",
        movie.Language
    );


    setValue(
        "movie-country",
        movie.Country
    );


    setValue(
        "movie-genres",
        movie.Genre
    );


    setValue(
        "movie-summary",
        movie.Plot
    );


    const posterURL =
        movie.Poster &&
        movie.Poster !== "N/A"
            ? movie.Poster
            : "";


    setValue(
        "poster-url",
        posterURL
    );


    const posterPreview =
        document.getElementById(
            "poster-preview"
        );


    const posterImage =
        document.getElementById(
            "poster-preview-image"
        );


    if (
        posterURL &&
        posterPreview &&
        posterImage
    ) {

        posterImage.src =
            posterURL;

        posterPreview.style.display =
            "block";

    }

    else if (posterPreview) {

        posterPreview.style.display =
            "none";

    }


    setValue(
        "imdb-id",
        movie.imdbID || ""
    );


    const movieSource =
        document.getElementById(
            "movie-source"
        );


    if (
        movieSource &&
        movie.imdbID
    ) {

        movieSource.innerHTML = `

            <a
                href="https://www.imdb.com/title/${encodeURIComponent(movie.imdbID)}/"
                target="_blank"
                rel="noopener noreferrer"
            >
                View on IMDb →
            </a>

        `;

    }


    setValue(
        "relationship",
        ""
    );


    setValue(
        "movie-status",
        "want"
    );


    setValue(
        "rating",
        ""
    );


    setValue(
        "tags",
        ""
    );


    setValue(
        "where-to-watch",
        ""
    );


    setValue(
        "personal-note",
        ""
    );


    const watched =
        document.getElementById(
            "watched"
        );


    const watchedDateField =
        document.getElementById(
            "watched-date-field"
        );


    const watchedDate =
        document.getElementById(
            "watched-date"
        );


    if (watched) {

        watched.checked =
            false;

    }


    if (watchedDate) {

        watchedDate.value =
            "";

    }


    if (watchedDateField) {

        watchedDateField.classList.add(
            "hidden-field"
        );

    }


    const message =
        document.getElementById(
            "selected-movie-message"
        );


    if (message) {

        message.style.display =
            "block";

        message.textContent =
            `✓ ${movie.Title} has been added to the form. Now add your personal details below.`;

    }


    const searchStatus =
        document.getElementById(
            "search-status"
        );


    if (searchStatus) {

        searchStatus.textContent =
            `✓ ${movie.Title} selected.`;

    }


    const titleField =
        document.getElementById(
            "movie-title"
        );


    if (titleField) {

        titleField.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

}



/* =================================
   WATCHED CONTROLS
   ================================= */

function setupWatchedControls() {

    const watched =
        document.getElementById(
            "watched"
        );


    const watchedDateField =
        document.getElementById(
            "watched-date-field"
        );


    const watchedDate =
        document.getElementById(
            "watched-date"
        );


    const movieStatus =
        document.getElementById(
            "movie-status"
        );


    if (!watched) {
        return;
    }


    watched.addEventListener(
        "change",
        () => {

            if (watched.checked) {

                if (watchedDateField) {

                    watchedDateField.classList.remove(
                        "hidden-field"
                    );

                }


                if (movieStatus) {

                    movieStatus.value =
                        "watched";

                }

            }

            else {

                if (watchedDateField) {

                    watchedDateField.classList.add(
                        "hidden-field"
                    );

                }


                if (watchedDate) {

                    watchedDate.value =
                        "";

                }


                if (movieStatus) {

                    movieStatus.value =
                        "want";

                }

            }

        }
    );


    if (movieStatus) {

        movieStatus.addEventListener(
            "change",
            () => {

                if (
                    movieStatus.value ===
                    "watched"
                ) {

                    watched.checked =
                        true;


                    if (watchedDateField) {

                        watchedDateField.classList.remove(
                            "hidden-field"
                        );

                    }

                }

            }
        );

    }

}



/* =================================
   COLLECTION BUTTONS
   ================================= */

function setupCollectionButtons() {

    const buttons =
        document.querySelectorAll(
            ".add-type"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    buttons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );

                }
            );

        }
    );

}



/* =================================
   SAVE BUTTON
   ================================= */

function setupSaveButton() {

    const saveButton =
        document.getElementById(
            "save-button"
        );


    if (!saveButton) {
        return;
    }


    saveButton.addEventListener(
        "click",
        () => {

            saveMovie();

        }
    );

}



/* =================================
   LOGIN
   ================================= */

async function login() {

    const password =
        window.prompt(
            "Enter your Archive Desk password:"
        );


    if (!password) {

        return false;

    }


    try {

        const response =
            await fetch(
                WORKER_URL,
                {
                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        action: "login",
                        password: password
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Login failed."
            );

            return false;

        }


        adminLoggedIn =
            true;


        return true;

    }

    catch (error) {

        console.error(
            "Login error:",
            error
        );


        alert(
            "I couldn't connect to the Archive Desk."
        );


        return false;

    }

}



/* =================================
   SAVE MOVIE
   ================================= */

async function saveMovie() {

    const saveButton =
        document.getElementById(
            "save-button"
        );


    const title =
        getValue(
            "movie-title"
        );


    if (!title) {

        alert(
            "Please search for a movie and choose it first."
        );

        return;

    }


    const movie = {

        title:
            getValue("movie-title"),

        type:
            getValue("movie-type"),

        year:
            parseInt(
                getValue("movie-year"),
                10
            ) || null,

        poster:
            getValue("poster-url"),

        director:
            getValue("movie-director"),

        language:
            getValue("movie-language"),

        country:
            getValue("movie-country"),

        genres:
            getValue("movie-genres")
                .split(",")
                .map(item => item.trim())
                .filter(Boolean),

        relationship:
            getValue("relationship"),

        tags:
            getValue("tags")
                .split(",")
                .map(item => item.trim())
                .filter(Boolean),

        status:
            getValue("movie-status"),

        rating:
            getValue("rating")
                ? Number(
                    getValue("rating")
                )
                : null,

        dateWatched:
            getValue("watched-date"),

        summary:
            getValue("movie-summary"),

        personalNote:
            getValue("personal-note"),

        whereToWatch:
            getValue("where-to-watch"),

        watchLink:
            getWatchLink(),

        availabilityChecked:
            "",

        imdbID:
            getValue("imdb-id")

    };


    if (
        movie.status ===
        "watched" &&
        !movie.dateWatched
    ) {

        const today =
            new Date();


        movie.dateWatched =
            today.toISOString()
                .split("T")[0];

    }


    saveButton.disabled =
        true;

    saveButton.textContent =
        "Saving...";


    try {

        if (!adminLoggedIn) {

            const loggedIn =
                await login();


            if (!loggedIn) {

                return;

            }

        }


        let response =
            await sendSaveRequest(
                movie
            );


        /*
         * If the session expired,
         * log in again once and retry.
         */

        if (response.status === 401) {

            adminLoggedIn =
                false;


            const loggedIn =
                await login();


            if (!loggedIn) {

                return;

            }


            response =
                await sendSaveRequest(
                    movie
                );

        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                `Save failed with HTTP ${response.status}`
            );

        }


        showSaveSuccess(
            movie.title
        );


        resetMovieForm();

    }

    catch (error) {

        console.error(
            "Save error:",
            error
        );


        alert(
            error.message ||
            "Something went wrong while saving."
        );

    }

    finally {

        saveButton.disabled =
            false;

        saveButton.textContent =
            "Save to My Archive";

    }

}



/* =================================
   SEND SAVE REQUEST
   ================================= */

async function sendSaveRequest(movie) {

    return await fetch(
        WORKER_URL,
        {
            method: "POST",

            credentials: "include",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                action:
                    "saveMovie",

                movie:
                    movie
            })
        }
    );

}



/* =================================
   WATCH LINK
   ================================= */

function getWatchLink() {

    const whereToWatch =
        getValue(
            "where-to-watch"
        );


    /*
     * We intentionally do not
     * invent streaming URLs.
     *
     * The existing source link
     * from the selected movie is
     * kept only if one exists.
     */

    const movieSource =
        document.getElementById(
            "movie-source"
        );


    if (
        movieSource &&
        movieSource.querySelector("a")
    ) {

        return movieSource
            .querySelector("a")
            .href;

    }


    return "";

}



/* =================================
   SAVE SUCCESS
   ================================= */

function showSaveSuccess(title) {

    const message =
        document.getElementById(
            "selected-movie-message"
        );


    if (!message) {

        alert(
            `✓ ${title} was saved to your archive.`
        );

        return;

    }


    message.style.display =
        "block";


    message.textContent =
        `✓ ${title} was saved to your archive.`;

}



/* =================================
   RESET FORM
   ================================= */

function resetMovieForm() {

    const fields = [

        "movie-title",
        "movie-year",
        "movie-type",
        "movie-director",
        "movie-language",
        "movie-country",
        "movie-genres",
        "tags",
        "where-to-watch",
        "movie-summary",
        "personal-note",
        "poster-url",
        "imdb-id",
        "watched-date"

    ];


    fields.forEach(
        id => {

            setValue(
                id,
                ""
            );

        }
    );


    setValue(
        "relationship",
        ""
    );


    setValue(
        "movie-status",
        "want"
    );


    setValue(
        "rating",
        ""
    );


    const watched =
        document.getElementById(
            "watched"
        );


    if (watched) {

        watched.checked =
            false;

    }


    const watchedDateField =
        document.getElementById(
            "watched-date-field"
        );


    if (watchedDateField) {

        watchedDateField.classList.add(
            "hidden-field"
        );

    }


    const posterPreview =
        document.getElementById(
            "poster-preview"
        );


    if (posterPreview) {

        posterPreview.style.display =
            "none";

    }


    const posterImage =
        document.getElementById(
            "poster-preview-image"
        );


    if (posterImage) {

        posterImage.src =
            "";

    }


    const movieSource =
        document.getElementById(
            "movie-source"
        );


    if (movieSource) {

        movieSource.textContent =
            "Search for a movie first.";

    }

}



/* =================================
   SET VALUE
   ================================= */

function setValue(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    if (
        value === undefined ||
        value === null ||
        value === "N/A"
    ) {

        element.value =
            "";

        return;

    }


    element.value =
        value;

}



/* =================================
   GET VALUE
   ================================= */

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {

        return "";

    }


    return element.value.trim();

}



/* =================================
   ESCAPE HTML
   ================================= */

function escapeHTML(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}



/* =================================
   ESCAPE ATTRIBUTE
   ================================= */

function escapeAttribute(value) {

    return escapeHTML(value);

}
