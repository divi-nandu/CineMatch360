import { LightningElement, api } from "lwc";

import getPopularMovies from "@salesforce/apex/CineMatchTMDBService.getPopularMovies";

import fallbackImage from "@salesforce/resourceUrl/fightclub";

export default class TrendingMovies extends LightningElement {
  movies = [];
  isLoading = true;
  errorMessage = "";

  @api watchlistIds = [];

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
    this.loadMovies();
  }

  async loadMovies() {
    this.isLoading = true;
    this.errorMessage = "";

    try {
      const response = await getPopularMovies({
        pageNumber: 1
      });

      const data = JSON.parse(response);

      this.movies = (data.results || []).map((movie) => ({
        id: movie.id,
        title: movie.title || "Untitled Movie",

        rating: movie.vote_average ? movie.vote_average.toFixed(1) : "N/A",

        year: movie.release_date ? movie.release_date.substring(0, 4) : "N/A",

        genreIds: movie.genre_ids || [],

        genre:
          (movie.genre_ids || [])
            .map((id) => this.genreMap[id])
            .filter(Boolean)
            .join(" • ") || "Movie",

        image: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : fallbackImage,

        overview: movie.overview || "No description available.",
        popularity: movie.popularity || 0
      }));
    } catch (error) {
      this.movies = [];

      this.errorMessage =
        error.body?.message ||
        error.message ||
        "Unable to load movies from TMDB.";
    } finally {
      this.isLoading = false;
    }
  }

  get displayMovies() {
    return this.movies.map((movie) => {
      const isInWatchlist = (this.watchlistIds || []).some(
        (id) => Number(id) === Number(movie.id)
      );

      return {
        ...movie,
        isInWatchlist,
        buttonClass: isInWatchlist ? "watchlist-add added" : "watchlist-add"
      };
    });
  }

  get hasMovies() {
    return this.movies.length > 0;
  }

  handleViewDetails(event) {
    const movieId = Number(event.currentTarget.dataset.id);

    const movie = this.movies.find((item) => Number(item.id) === movieId);

    if (movie) {
      this.dispatchEvent(
        new CustomEvent("openmoviedetails", {
          detail: movie,
          bubbles: true,
          composed: true
        })
      );
    }
  }

  handleAddToWatchlist(event) {
    const movieId = Number(event.currentTarget.dataset.id);

    const movie = this.movies.find((item) => Number(item.id) === movieId);

    if (!movie) {
      return;
    }

    const alreadyAdded = (this.watchlistIds || []).some(
      (id) => Number(id) === movieId
    );

    if (!alreadyAdded) {
      this.dispatchEvent(
        new CustomEvent("addtowatchlist", {
          detail: movie,
          bubbles: true,
          composed: true
        })
      );
    }
  }
}
