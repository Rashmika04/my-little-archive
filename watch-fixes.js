
/* =========================================================
   MY LITTLE ARCHIVE — WATCH FIXES
   Saves poster changes persistently to the correct title.
   Posters appear only inside the details window.
========================================================= */

(() => {
  "use strict";

  const OVERRIDES_KEY = "watch-movie-overrides";
  const MANUAL_KEY = "watch-manual-movies";
  const detailContent = document.getElementById("detailContent");
  const detailModal = document.getElementById("modal");

  if (!detailContent || !detailModal) {
    console.error("Watch Fixes: detail elements not found.");
    return;
  }

  const readJSON = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  };

  const normalise = value =>
    String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  function getCurrentTitle() {
    return detailContent.querySelector("h2")?.textContent.trim() || "";
  }

  function getCurrentMovie() {
    const title = getCurrentTitle();
    if (!title) return null;

    const overrides = readJSON(OVERRIDES_KEY, {});
    const manual = readJSON(MANUAL_KEY, []);
    const yearText = detailContent.querySelector(".detail-info")?.textContent || "";
    const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
    const displayedYear = yearMatch ? Number(yearMatch[0]) : null;

    // Prefer the currently displayed case, matching the exact title.
    const cases = [...document.querySelectorAll("#rail .case")];
    const matchingCases = cases.filter(item => {
      const caseTitle = item.querySelector(".case-title")?.textContent;
      return normalise(caseTitle) === normalise(title);
    });

    // The original detail modal may be displaying a duplicate title.
    // Match its year when the shelf contains multiple copies.
    let matchingCase = matchingCases[0];

    if (matchingCases.length > 1 && displayedYear) {
      matchingCase = matchingCases.find(item => {
        const caseYear = item.dataset.year ||
          item.querySelector(".case-year")?.textContent || "";
        return String(caseYear).includes(String(displayedYear));
      }) || matchingCase;
    }

    let id = matchingCase?.dataset.id;

    // If the shelf element doesn't expose an ID, resolve it from saved data.
    if (!id) {
      const records = [
        ...Object.entries(overrides).map(([key, value]) => ({
          ...value,
          id: String(value?.id || key)
        })),
        ...(Array.isArray(manual) ? manual : [])
      ];

      const record = records.find(movie =>
        normalise(movie.title) === normalise(title) &&
        (!displayedYear || !movie.year ||
          Number(movie.year) === displayedYear)
      );

      if (record) id = String(record.id);
    }

    if (!id) {
      console.error("Poster editor: could not resolve title ID:", title);
      return null;
    }

    const existing = overrides[id] ||
      (Array.isArray(manual)
        ? manual.find(movie => String(movie.id) === String(id))
        : null) ||
      {};

    return {
      id: String(id),
      title,
      movie: { ...existing, id: String(id), title }
    };
  }

  function updateImage(poster, title) {
    let image = detailContent.querySelector(".detail-poster-image");
    const posterBox = detailContent.querySelector(".detail-art");

    if (!image && posterBox) {
      posterBox.replaceChildren();
      image = document.createElement("img");
      image.className = "detail-poster-image";
      posterBox.appendChild(image);
    }

    if (image) {
      image.onerror = () => {
        image.alt = "Poster could not be loaded. Check the image URL.";
      };
      image.src = poster;
      image.alt = title + " poster";
    }
  }

  function showMessage(message, isError = false) {
    const output = document.getElementById("posterFixMessage");
    if (output) {
      output.textContent = message;
      output.style.color = isError ? "#ffb8b8" : "#d5e8d5";
    }
  }

  async function savePoster(poster) {
    const current = getCurrentMovie();

    if (!current) {
      showMessage(
        "Couldn't identify this title. Close the details and reopen it.",
        true
      );
      return;
    }

    const button = document.getElementById("savePosterUrl");
    if (button) button.disabled = true;

    try {
      // Save an explicit manual-poster marker so automatic lookups
      // cannot silently replace the poster selected by the user.
      const updatedMovie = {
        ...current.movie,
        id: current.id,
        title: current.title,
        poster,
        posterManuallySet: true
      };

      const overrides = readJSON(OVERRIDES_KEY, {});
      overrides[current.id] = updatedMovie;

      // Write and verify the override before showing success.
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));

      const check = readJSON(OVERRIDES_KEY, {});
      if (check[current.id]?.poster !== poster) {
        throw new Error("The saved poster could not be verified.");
      }

      // Update an existing manual record without removing other fields.
      const manual = readJSON(MANUAL_KEY, []);
      if (Array.isArray(manual)) {
        const index = manual.findIndex(
          movie => String(movie.id) === current.id
        );

        if (index !== -1) {
          manual[index] = {
            ...manual[index],
            poster,
            posterManuallySet: true
          };
          localStorage.setItem(MANUAL_KEY, JSON.stringify(manual));
        }
      }

      updateImage(poster, current.title);
      showMessage("Poster saved for " + current.title + ". Reopen to verify.");

      // Don't call the archive's automatic artwork lookup here.
      console.info("Poster saved:", current.title, current.id);
    } catch (error) {
      console.error("Poster save failed:", error);
      showMessage(
        "Save failed. The image may exceed browser storage. Try an image URL.",
        true
      );
    } finally {
      if (button) button.disabled = false;
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error("Could not read image"));

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => reject(new Error("Invalid image"));
        image.onload = () => {
          const max = 850;
          const scale = Math.min(1, max / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");

          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));

          const context = canvas.getContext("2d");
          if (!context) return reject(new Error("Canvas unavailable"));

          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  function createPosterTools() {
    if (detailContent.querySelector("#posterFixTools")) return;

    const tools = document.createElement("section");
    tools.id = "posterFixTools";
    tools.className = "poster-fix-tools";

    tools.innerHTML = `
      <button type="button" id="togglePosterFix" class="poster-fix-button">
        EDIT POSTER
      </button>

      <div id="posterFixPanel" hidden>
        <label for="posterFixUrl">PASTE POSTER IMAGE URL</label>
        <input id="posterFixUrl" type="url"
          placeholder="https://example.com/poster.jpg">

        <button type="button" id="savePosterUrl" class="poster-fix-button">
          SAVE IMAGE URL
        </button>

        <label for="posterFixUpload">OR CHOOSE AN IMAGE FROM YOUR DEVICE</label>
        <input id="posterFixUpload" type="file" accept="image/*">

        <p id="posterFixMessage" role="status" aria-live="polite">
          Choose a poster, then save it.
        </p>
      </div>
    `;

    detailContent.appendChild(tools);

    tools.querySelector("#togglePosterFix").addEventListener("click", () => {
      const panel = tools.querySelector("#posterFixPanel");
      panel.hidden = !panel.hidden;
    });

    tools.querySelector("#savePosterUrl").addEventListener("click", async () => {
      const input = tools.querySelector("#posterFixUrl");
      const url = input.value.trim();

      if (!url) {
        showMessage("Paste an image URL first.", true);
        return;
      }

      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        showMessage("Enter a valid http:// or https:// image URL.", true);
        return;
      }

      await savePoster(url);
    });

    tools.querySelector("#posterFixUpload").addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showMessage("Choose an image file.", true);
        return;
      }

      showMessage("Preparing image…");

      try {
        const dataURL = await compressImage(file);
        await savePoster(dataURL);
      } catch (error) {
        console.error(error);
        showMessage("Couldn't process the image. Try another image.", true);
      }
    });
  }

  const observer = new MutationObserver(() => {
    if (detailModal.classList.contains("open")) createPosterTools();
  });

  observer.observe(detailContent, { childList: true, subtree: true });
  observer.observe(detailModal, {
    attributes: true,
    attributeFilter: ["class", "aria-hidden"]
  });

  if (detailModal.classList.contains("open")) createPosterTools();

  console.info("Watch Fixes loaded.");
})();
