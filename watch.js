/* =================================
   MY LITTLE ARCHIVE
   WATCH ROOM
   ================================= */


/* =================================
   LOAD MOVIES
   ================================= */

async function loadMovies() {

    const movieGrid = document.getElementById("movie-grid");

    try {

        const response = await fetch("data/movies.json");

        if (!response.ok) {
            throw new Error("Could not load movies.json");
        }

        const movies = await response.json();

        displayMovies(movies);

    } catch (error) {

        console.error(error);

        movieGrid.innerHTML = `
            <div class="loading-message">
                <p>Unable to load the watch collection.</p>
                <p>Please check the movie data file.</p>
            </div>
        `;
    }
}


/* =================================
   DISPLAY MOVIES
   ================================= */

function displayMovies(movies) {

    const movieGrid = document.getElementById("movie-grid");

    movieGrid.innerHTML = "";


    movies.forEach(movie => {

        const movieCard = document.createElement("article");

        movieCard.className = "movie-card";


        /* ---------------------------------
           GENRES
           --------------------------------- */

        const genres = movie.genres
            .map(genre => `<span>${genre}</span>`)
            .join("");


        /* ---------------------------------
           TAGS
           --------------------------------- */

        const tags = movie.tags
            .map(tag => `<span>${tag}</span>`)
            .join("");


        /* ---------------------------------
           RATING
           --------------------------------- */

        const ratingHTML = movie.rating !== null
            ? `
                <div class="meta-group">
                    <span class="meta-label">RATING</span>
                    <p>${movie.rating} / 10</p>
                </div>
              `
            : "";


        /* ---------------------------------
           DATE WATCHED
           --------------------------------- */

        const dateWatchedHTML = movie.dateWatched
            ? `
                <div class="meta-group">
                    <span class="meta-label">WATCHED</span>
                    <p>${movie.dateWatched}</p>
                </div>
              `
            : "";


        /* ---------------------------------
           WHERE TO WATCH
           --------------------------------- */

        const whereToWatchHTML = movie.whereToWatch
            ? `
                <div class="meta-group">
                    <span class="meta-label">WHERE TO WATCH</span>

                    <div>

                        <p>${movie.whereToWatch}</p>

                        ${
                            movie.watchLink
                            ? `
                                <a
                                    class="source-link"
                                    href="${movie.watchLink}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open source →
                                </a>
                              `
                            : ""
                        }

                        ${
                            movie.availabilityChecked
                            ? `
                                <p class="availability-date">
                                    Availability checked:
                                    ${movie.availabilityChecked}
                                </p>
                              `
                            : ""
                        }

                    </div>
                </div>
              `
            : "";


        /* ---------------------------------
           SUMMARY
           --------------------------------- */

        const summaryHTML = movie.summary
            ? `
                <div class="movie-note">
                    <span class="meta-label">SUMMARY</span>
                    <p>${movie.summary}</p>
                </div>
              `
            : "";


        /* ---------------------------------
           PERSONAL NOTE
           --------------------------------- */

        const personalNoteHTML = movie.personalNote
            ? `
                <div class="movie-note personal-note">
                    <span class="meta-label">MY NOTE</span>
                    <p>${movie.personalNote}</p>
                </div>
              `
            : "";


        /* ---------------------------------
           MOVIE CARD
           --------------------------------- */

        movieCard.innerHTML = `

            <div class="movie-poster">

                ${
                    movie.poster
                    ? `
                        <img
                            src="${movie.poster}"
                            alt="${movie.title} poster"
                        >
                      `
                    : `
                        <div class="poster-placeholder">

                            <span>🎞</span>

                            <small>POSTER</small>

                        </div>
                      `
                }

            </div>


            <div class="movie-information">


                <p class="movie-type">
                    ${movie.type} · ${movie.year}
                </p>


                <h2>${movie.title}</h2>


                ${
                    movie.director
                    ? `
                        <p class="movie-director">
                            Directed by ${movie.director}
                        </p>
                      `
                    : ""
                }


                <div class="movie-meta">


                    ${
                        movie.language || movie.country
                        ? `
                            <div class="meta-group">

                                <span class="meta-label">
                                    DETAILS
                                </span>

                                <p>
                                    ${
                                        movie.language
                                        ? movie.language
                                        : ""
                                    }

                                    ${
                                        movie.language && movie.country
                                        ? " · "
                                        : ""
                                    }

                                    ${
                                        movie.country
                                        ? movie.country
                                        : ""
                                    }
                                </p>

                            </div>
                          `
                        : ""
                    }


                    <div class="meta-group">

                        <span class="meta-label">
                            GENRES
                        </span>

                        <div class="tag-list">
                            ${genres}
                        </div>

                    </div>


                    <div class="meta-group">

                        <span class="meta-label">
                            RELATIONSHIP
                        </span>

                        <p>
                            ${movie.relationship || "—"}
                        </p>

                    </div>


                    <div class="meta-group">

                        <span class="meta-label">
                            STATUS
                        </span>

                        <p>
                            ${movie.status || "—"}
                        </p>

                    </div>


                    <div class="meta-group">

                        <span class="meta-label">
                            TAGS
                        </span>

                        <div class="tag-list">
                            ${tags}
                        </div>

                    </div>


                    ${ratingHTML}


                    ${dateWatchedHTML}


                    ${whereToWatchHTML}


                </div>


                ${summaryHTML}


                ${personalNoteHTML}


            </div>

        `;


        movieGrid.appendChild(movieCard);

    });
}


/* =================================
   START
   ================================= */

loadMovies();
