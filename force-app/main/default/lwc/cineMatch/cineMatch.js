import { LightningElement } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import fightclub from "@salesforce/resourceUrl/fightclub";

import getMovieVideos from "@salesforce/apex/CineMatchTMDBService.getMovieVideos";
import getMovieWatchProviders from "@salesforce/apex/CineMatchTMDBService.getMovieWatchProviders";
import getSimilarMovies from "@salesforce/apex/CineMatchTMDBService.getSimilarMovies";

import getWatchlist from "@salesforce/apex/CineMatchUserDataController.getWatchlist";
import addToWatchlist from "@salesforce/apex/CineMatchUserDataController.addToWatchlist";
import removeFromWatchlist from "@salesforce/apex/CineMatchUserDataController.removeFromWatchlist";
import getMyReview from "@salesforce/apex/CineMatchUserDataController.getMyReview";
import saveMyReview from "@salesforce/apex/CineMatchUserDataController.saveMyReview";

export default class CineMatch extends NavigationMixin(LightningElement) {
  heroImage = fightclub;
  selectedMood = "";
  watchlist = [];

  showWatchlist = false;
  showMovieDetails = false;
  selectedMovie = null;

  isWatchlistLoading = false;
  isLoadingExtras = false;
  isSavingReview = false;

  trailerUrl = "";
  watchProviders = [];
  watchProviderUrl = "";
  providerMessage = "No streaming availability found in India.";
  similarMovies = [];

  reviewRating = "";
  reviewText = "";
  savedReview = null;

  genreMap = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    18: "Drama",
    14: "Fantasy",
    27: "Horror",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    53: "Thriller"
  };

  connectedCallback() {
    this.loadWatchlist();
  }

  get heroStyle() {
    return `background-image:
            linear-gradient(
                90deg,
                rgba(5, 6, 14, 0.97) 0%,
                rgba(5, 6, 14, 0.82) 38%,
                rgba(5, 6, 14, 0.25) 100%
            ),
            radial-gradient(
                ellipse at 75% 45%,
                rgba(129, 75, 190, 0.38),
                transparent 55%
            ),
            linear-gradient(
                120deg,
                #101426,
                #342044 55%,
                #8b552d
            );`;
  }

  get watchlistCount() {
    return this.watchlist.length;
  }

  get watchlistIds() {
    return this.watchlist.map((movie) => movie.id);
  }

  get hasWatchlist() {
    return this.watchlist.length > 0;
  }

  // MY MOVIE SPACE DASHBOARD
  get savedGenreCount() {
    const genres = this.watchlist
      .map((movie) => movie.genre)
      .filter((genre) => genre && genre !== "N/A")
      .flatMap((genre) => genre.split("•"))
      .map((genre) => genre.trim())
      .filter(Boolean);

    return new Set(genres).size;
  }

  get selectedMoodDisplay() {
    return this.selectedMood || "Not selected";
  }

  get hasCollectionSpotlight() {
    return this.watchlist.length > 0;
  }

  get collectionSpotlight() {
    if (!this.watchlist.length) {
      return null;
    }

    return [...this.watchlist].sort((a, b) => {
      const ratingA = Number(a.rating) || 0;
      const ratingB = Number(b.rating) || 0;
      return ratingB - ratingA;
    })[0];
  }

  handleViewCollection() {
    this.showWatchlist = true;

    requestAnimationFrame(() => {
      const section = this.template.querySelector("[data-watchlist]");

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  }

  handleOpenSpotlight() {
    const movie = this.collectionSpotlight;

    if (movie) {
      this.openMovie(movie);
    }
  }

  get hasWatchProviders() {
    return this.watchProviders.length > 0;
  }

  get hasSimilarMovies() {
    return this.similarMovies.length > 0;
  }

  get reviewButtonLabel() {
    return this.isSavingReview ? "Saving..." : "Save My Review";
  }

  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant
      })
    );
  }

  async loadWatchlist() {
    this.isWatchlistLoading = true;

    try {
      this.watchlist = await getWatchlist();
    } catch (error) {
      this.showToast(
        "Watchlist could not be loaded",
        error.body?.message || error.message || "Please try again.",
        "error"
      );
    } finally {
      this.isWatchlistLoading = false;
    }
  }

  // HOME PAGE EXPLORE BUTTON
  handleExplore() {
    const section = this.template.querySelector(".movie-space");

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  // MOOD SELECTION
  handleMoodSelect(event) {
    this.selectedMood = event.detail;

    const resultsSection = this.template.querySelector("c-movie-results");

    if (resultsSection) {
      resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  // ADD MOVIE TO SALESFORCE WATCHLIST
  async handleAddToWatchlist(event) {
    const movie = event.detail;

    try {
      await addToWatchlist({
        movieId: Number(movie.id),
        title: movie.title,
        year: movie.year,
        genre: movie.genre,
        rating: movie.rating === "N/A" ? null : Number(movie.rating),
        image: movie.image,
        overview: movie.overview
      });

      await this.loadWatchlist();

      this.showToast(
        "Added to Watchlist",
        `${movie.title} has been saved to your collection.`,
        "success"
      );
    } catch (error) {
      this.showToast(
        "Unable to add movie",
        error.body?.message || error.message || "Please try again.",
        "error"
      );
    }
  }

  // SHOW / HIDE WATCHLIST
  handleWatchlist() {
    this.showWatchlist = !this.showWatchlist;

    if (this.showWatchlist) {
      requestAnimationFrame(() => {
        const section = this.template.querySelector("[data-watchlist]");

        if (section) {
          section.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });
    }
  }

  // REMOVE MOVIE FROM WATCHLIST
  async handleRemoveMovie(event) {
    const recordId = event.currentTarget.dataset.recordId;
    const movieId = Number(event.currentTarget.dataset.movieId);

    try {
      await removeFromWatchlist({ recordId });
      await this.loadWatchlist();

      if (this.selectedMovie && Number(this.selectedMovie.id) === movieId) {
        this.handleCloseMovie();
      }

      this.showToast(
        "Removed from Watchlist",
        "The movie has been removed from your collection.",
        "success"
      );
    } catch (error) {
      this.showToast(
        "Unable to remove movie",
        error.body?.message || error.message || "Please try again.",
        "error"
      );
    }
  }

  // OPEN MOVIE FROM WATCHLIST
  handleOpenMovie(event) {
    const movieId = Number(event.currentTarget.dataset.id);

    const movie = this.watchlist.find((item) => Number(item.id) === movieId);

    if (movie) {
      this.openMovie(movie);
    }
  }

  // OPEN MOVIE FROM TRENDING OR DISCOVER
  handleOpenMovieFromResults(event) {
    this.openMovie(event.detail);
  }

  handleOpenSimilarMovie(event) {
    const movieId = Number(event.currentTarget.dataset.id);

    const movie = this.similarMovies.find(
      (item) => Number(item.id) === movieId
    );

    if (movie) {
      this.openMovie(movie);
    }
  }

  // SHARED MOVIE DETAILS
  openMovie(movie) {
    this.selectedMovie = movie;
    this.showMovieDetails = true;

    this.trailerUrl = "";
    this.watchProviders = [];
    this.watchProviderUrl = "";
    this.providerMessage = "No streaming availability found in India.";
    this.similarMovies = [];

    this.reviewRating = "";
    this.reviewText = "";
    this.savedReview = null;

    this.loadMovieExtras(movie.id);
    this.loadMyReview(movie.id);
  }

  // STREAMING PROVIDER SEARCH URL
  getProviderSearchUrl(providerName, movieTitle) {
    const name = (providerName || "").toLowerCase().trim();
    const title = (movieTitle || "").trim();
    const query = encodeURIComponent(title);

    if (name.includes("netflix")) {
      return `https://www.netflix.com/search?q=${query}`;
    }

    if (name.includes("amazon prime") || name.includes("prime video")) {
      return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
    }

    if (name.includes("apple tv")) {
      return `https://tv.apple.com/search?term=${query}`;
    }

    if (name.includes("youtube")) {
      return `https://www.youtube.com/results?search_query=${query}`;
    }

    if (name.includes("hotstar") || name.includes("disney+")) {
      return `https://www.hotstar.com/in/search?q=${query}`;
    }

    if (name.includes("zee5")) {
      return `https://www.zee5.com/search?q=${query}`;
    }

    if (name.includes("sonyliv")) {
      return `https://www.sonyliv.com/search?query=${query}`;
    }

    if (name.includes("google play")) {
      return `https://play.google.com/store/search?q=${query}&c=movies`;
    }

    const providerDomains = [
      { keywords: ["lionsgate"], domain: "lionsgateplay.com" },
      { keywords: ["aha"], domain: "aha.video" },
      { keywords: ["hoichoi"], domain: "hoichoi.tv" },
      { keywords: ["sun nxt"], domain: "sunnxt.com" },
      { keywords: ["mx player"], domain: "mxplayer.in" },
      { keywords: ["eros now"], domain: "erosnow.com" },
      { keywords: ["shemaroo"], domain: "shemaroome.com" },
      { keywords: ["hungama"], domain: "hungama.com" }
    ];

    const matchedProvider = providerDomains.find((provider) =>
      provider.keywords.some((keyword) => name.includes(keyword))
    );

    if (matchedProvider) {
      const googleQuery = encodeURIComponent(
        `site:${matchedProvider.domain} "${title}"`
      );

      return `https://www.google.com/search?q=${googleQuery}`;
    }

    const fallbackQuery = encodeURIComponent(
      `"${title}" "${providerName}" India movie`
    );

    return `https://www.google.com/search?q=${fallbackQuery}`;
  }

  // OPEN STREAMING PROVIDER
  handleProviderClick(event) {
    const url = event.currentTarget.dataset.url;

    if (!url) {
      this.showToast(
        "Unable to open platform",
        "The streaming platform URL is missing.",
        "error"
      );
      return;
    }

    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname) {
        throw new Error("Invalid external URL");
      }

      this[NavigationMixin.Navigate]({
        type: "standard__webPage",
        attributes: {
          url: parsedUrl.href
        }
      });
    } catch (error) {
      this.showToast(
        "Unable to open platform",
        "The streaming platform URL is invalid.",
        "error"
      );
    }
  }

  // LOAD TRAILER, PROVIDERS AND SIMILAR MOVIES
  async loadMovieExtras(movieId) {
    this.isLoadingExtras = true;

    try {
      const [videosResponse, providersResponse, similarResponse] =
        await Promise.all([
          getMovieVideos({ movieId }).catch(() => null),
          getMovieWatchProviders({ movieId }).catch(() => null),
          getSimilarMovies({
            movieId,
            pageNumber: 1
          }).catch(() => null)
        ]);

      if (
        !this.selectedMovie ||
        Number(this.selectedMovie.id) !== Number(movieId)
      ) {
        return;
      }

      // TRAILER
      if (videosResponse) {
        const videoData = JSON.parse(videosResponse);
        const videos = videoData.results || [];

        const trailer =
          videos.find(
            (item) =>
              item.site === "YouTube" &&
              item.type === "Trailer" &&
              item.official
          ) ||
          videos.find(
            (item) => item.site === "YouTube" && item.type === "Trailer"
          );

        if (trailer && trailer.key) {
          this.trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
        }
      }

      // INDIA STREAMING PROVIDERS
      if (providersResponse) {
        const providerData = JSON.parse(providersResponse);
        const india = providerData.results?.IN;

        if (india) {
          this.watchProviderUrl = india.link || "";

          const groups = [
            { key: "flatrate", label: "Stream" },
            { key: "rent", label: "Rent" },
            { key: "buy", label: "Buy" }
          ];

          const collected = [];

          groups.forEach((group) => {
            (india[group.key] || []).forEach((provider) => {
              collected.push({
                key: `${group.key}-${provider.provider_id}`,
                name: provider.provider_name,
                type: group.label,
                link: this.getProviderSearchUrl(
                  provider.provider_name,
                  this.selectedMovie.title
                )
              });
            });
          });

          this.watchProviders = collected;

          this.providerMessage = collected.length
            ? ""
            : "No streaming providers are listed for India right now.";
        }
      }

      // SIMILAR MOVIES
      if (similarResponse) {
        const similarData = JSON.parse(similarResponse);

        this.similarMovies = (similarData.results || [])
          .slice(0, 6)
          .map((movie) => ({
            id: movie.id,
            title: movie.title || "Untitled Movie",

            year: movie.release_date
              ? movie.release_date.substring(0, 4)
              : "N/A",

            rating: movie.vote_average ? movie.vote_average.toFixed(1) : "N/A",

            genre:
              (movie.genre_ids || [])
                .map((id) => this.genreMap[id])
                .filter(Boolean)
                .join(" • ") || "Movie",

            image: movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : fightclub,

            overview: movie.overview || "No description available."
          }));
      }
    } catch (error) {
      this.showToast(
        "Some movie information is unavailable",
        "The movie details are available, but some extra information could not be loaded.",
        "warning"
      );
    } finally {
      if (
        this.selectedMovie &&
        Number(this.selectedMovie.id) === Number(movieId)
      ) {
        this.isLoadingExtras = false;
      }
    }
  }

  // LOAD USER REVIEW
  async loadMyReview(movieId) {
    try {
      const review = await getMyReview({ movieId });

      if (
        !this.selectedMovie ||
        Number(this.selectedMovie.id) !== Number(movieId)
      ) {
        return;
      }

      this.savedReview = review;

      if (review) {
        this.reviewRating = String(review.rating);
        this.reviewText = review.reviewText || "";
      }
    } catch (error) {
      if (
        this.selectedMovie &&
        Number(this.selectedMovie.id) === Number(movieId)
      ) {
        this.showToast(
          "Review could not be loaded",
          error.body?.message || error.message || "Please try again.",
          "error"
        );
      }
    }
  }

  handleRatingChange(event) {
    this.reviewRating = event.target.value;
  }

  handleReviewChange(event) {
    this.reviewText = event.target.value;
  }

  // SAVE USER REVIEW
  async handleSaveReview() {
    const rating = Number(this.reviewRating);

    if (!rating || rating < 1 || rating > 10) {
      this.showToast(
        "Rating required",
        "Enter a rating between 1 and 10.",
        "warning"
      );
      return;
    }

    if (!this.selectedMovie) {
      return;
    }

    this.isSavingReview = true;

    try {
      this.savedReview = await saveMyReview({
        movieId: Number(this.selectedMovie.id),
        movieTitle: this.selectedMovie.title,
        rating,
        reviewText: this.reviewText
      });

      this.showToast(
        "Review saved",
        "Your rating and review have been saved to Salesforce.",
        "success"
      );
    } catch (error) {
      this.showToast(
        "Unable to save review",
        error.body?.message || error.message || "Please try again.",
        "error"
      );
    } finally {
      this.isSavingReview = false;
    }
  }

  // CLOSE MOVIE DETAILS
  handleCloseMovie() {
    this.showMovieDetails = false;
    this.selectedMovie = null;

    this.trailerUrl = "";
    this.watchProviders = [];
    this.watchProviderUrl = "";
    this.similarMovies = [];

    this.savedReview = null;
  }
}
