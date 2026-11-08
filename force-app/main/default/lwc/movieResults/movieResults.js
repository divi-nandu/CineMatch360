import { LightningElement, api } from "lwc";

import getPopularMovies from "@salesforce/apex/CineMatchTMDBService.getPopularMovies";

import getMoviesByGenre from "@salesforce/apex/CineMatchTMDBService.getMoviesByGenre";

import searchMovies from "@salesforce/apex/CineMatchTMDBService.searchMovies";

import getMoviesByQuickFilter from "@salesforce/apex/CineMatchTMDBService.getMoviesByQuickFilter";

import fallbackImage from "@salesforce/resourceUrl/fightclub";

export default class MovieResults extends LightningElement {
  movies = [];
  isLoading = false;
  errorMessage = "";

  // Loading Skeleton Cards
  skeletonCards = [1, 2, 3, 4, 5, 6, 7, 8];

  searchTerm = "";
  selectedGenre = "";
  selectedSort = "popularity";
  minimumRating = "";
  quickFilter = "";
  currentPage = 1;
  totalPages = 1;

  _selectedMood = "";

  @api watchlistIds = [];

  sortOptions = [
    { label: "Most Popular", value: "popularity" },
    { label: "Top Rated", value: "rating" },
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" }
  ];

  ratingOptions = [
    { label: "All Ratings", value: "" },
    { label: "7.0 and above", value: "7" },
    { label: "8.0 and above", value: "8" },
    { label: "9.0 and above", value: "9" }
  ];

  genreOptions = [
    { label: "All Genres", value: "" },
    { label: "Action", value: "28" },
    { label: "Adventure", value: "12" },
    { label: "Animation", value: "16" },
    { label: "Comedy", value: "35" },
    { label: "Crime", value: "80" },
    { label: "Drama", value: "18" },
    { label: "Fantasy", value: "14" },
    { label: "Horror", value: "27" },
    { label: "Mystery", value: "9648" },
    { label: "Romance", value: "10749" },
    { label: "Sci-Fi", value: "878" },
    { label: "Thriller", value: "53" }
  ];

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
    53: "Thriller",
    99: "Documentary",
    36: "History",
    10751: "Family",
    10402: "Music",
    10752: "War",
    37: "Western"
  };

  moodGenreMap = {
    "Feel Good": 35,
    Emotional: 18,
    Thriller: 53,
    Action: 28
  };

  connectedCallback() {
    this.loadMovies();
  }

  @api
  get selectedMood() {
    return this._selectedMood;
  }

  set selectedMood(value) {
    const newMood = value || "";

    if (newMood !== this._selectedMood) {
      this._selectedMood = newMood;
      this.quickFilter = "";
      this.searchTerm = "";
      this.currentPage = 1;

      if (this.isConnected) {
        this.loadMovies();
      }
    }
  }

  get heading() {
    const selectedFilter = this.quickFilterOptions.find(
      (option) => option.value === this.quickFilter
    );

    if (selectedFilter) {
      return selectedFilter.heading;
    }

    if (this._selectedMood) {
      return `${this._selectedMood} Movies`;
    }

    return "Discover Movies";
  }

  get quickFilterOptions() {
    const options = [
      {
        value: "under2hours",
        label: "⏱ Under 2 Hours",
        heading: "Movies Under 2 Hours"
      },
      {
        value: "topRated",
        label: "⭐ Top Rated",
        heading: "Top Rated Movies"
      },
      {
        value: "hiddenGems",
        label: "💎 Hidden Gems",
        heading: "Hidden Gems"
      },
      {
        value: "family",
        label: "👨‍👩‍👧 Family Night",
        heading: "Family Night Movies"
      },
      {
        value: "weekend",
        label: "🎬 Weekend Watch",
        heading: "Weekend Watch"
      }
    ];

    return options.map((option) => ({
      ...option,
      className:
        this.quickFilter === option.value
          ? "quick-filter active"
          : "quick-filter"
    }));
  }

  get hasMovies() {
    return this.displayMovies.length > 0;
  }

  get displayMovies() {
    let result = this.movies.map((movie) => {
      const isInWatchlist = (this.watchlistIds || []).some(
        (id) => Number(id) === Number(movie.id)
      );

      return {
        ...movie,
        isInWatchlist,
        buttonClass: isInWatchlist ? "watchlist-add added" : "watchlist-add"
      };
    });

    if (this.selectedGenre) {
      result = result.filter((movie) =>
        movie.genreIds.includes(Number(this.selectedGenre))
      );
    }

    if (this.minimumRating) {
      result = result.filter(
        (movie) => Number(movie.rating) >= Number(this.minimumRating)
      );
    }

    result = [...result];

    if (this.selectedSort === "rating") {
      result.sort((a, b) => Number(b.rating) - Number(a.rating));
    } else if (this.selectedSort === "newest") {
      result.sort((a, b) => Number(b.year) - Number(a.year));
    } else if (this.selectedSort === "oldest") {
      result.sort((a, b) => Number(a.year) - Number(b.year));
    } else {
      result.sort((a, b) => b.popularity - a.popularity);
    }

    return result;
  }

  get previousDisabled() {
    return this.currentPage <= 1 || this.isLoading;
  }

  get nextDisabled() {
    return this.currentPage >= this.totalPages || this.isLoading;
  }

  async loadMovies() {
    this.isLoading = true;
    this.errorMessage = "";

    try {
      let response;

      if (this.searchTerm.trim()) {
        response = await searchMovies({
          searchTerm: this.searchTerm.trim(),
          pageNumber: this.currentPage
        });
      } else if (this.quickFilter) {
        response = await getMoviesByQuickFilter({
          filterKey: this.quickFilter,
          pageNumber: this.currentPage
        });
      } else {
        const moodGenre = this.moodGenreMap[this._selectedMood];

        if (moodGenre) {
          response = await getMoviesByGenre({
            genreId: moodGenre,
            pageNumber: this.currentPage
          });
        } else {
          response = await getPopularMovies({
            pageNumber: this.currentPage
          });
        }
      }

      const data = JSON.parse(response);

      this.totalPages = Math.max(1, Math.min(data.total_pages || 1, 500));

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
        "Unable to load movies. Please try again.";
    } finally {
      this.isLoading = false;
    }
  }

  handleQuickFilter(event) {
    const selectedFilter = event.currentTarget.dataset.filter;

    this.quickFilter =
      this.quickFilter === selectedFilter ? "" : selectedFilter;

    this.searchTerm = "";
    this._selectedMood = "";
    this.currentPage = 1;

    this.loadMovies();
  }

  handleSearchChange(event) {
    this.searchTerm = event.target.value;
  }

  handleSearchKeydown(event) {
    if (event.key === "Enter") {
      this.handleSearch();
    }
  }

  handleSearch() {
    this.quickFilter = "";
    this.currentPage = 1;
    this.loadMovies();
  }

  handleGenreChange(event) {
    this.selectedGenre = event.target.value;
  }

  handleSortChange(event) {
    this.selectedSort = event.target.value;
  }

  handleRatingFilterChange(event) {
    this.minimumRating = event.target.value;
  }

  handlePrevious() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadMovies();
    }
  }

  handleNext() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadMovies();
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
}
