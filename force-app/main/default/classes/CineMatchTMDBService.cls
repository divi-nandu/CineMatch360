public with sharing class CineMatchTMDBService {
  @AuraEnabled
  public static String getPopularMovies(Integer pageNumber) {
    Integer page = getValidPage(pageNumber);
    return sendRequest('/3/movie/popular?language=en-US&page=' + page);
  }

  @AuraEnabled
  public static String getMoviesByGenre(Integer genreId, Integer pageNumber) {
    if (genreId == null) {
      throw new AuraHandledException('Please select a valid movie genre.');
    }
    Integer page = getValidPage(pageNumber);
    return sendRequest(
      '/3/discover/movie?language=en-US&with_genres=' +
        genreId +
        '&page=' +
        page
    );
  }

  @AuraEnabled
  public static String searchMovies(String searchTerm, Integer pageNumber) {
    if (String.isBlank(searchTerm)) {
      return getPopularMovies(pageNumber);
    }
    Integer page = getValidPage(pageNumber);
    String encodedSearch = EncodingUtil.urlEncode(searchTerm, 'UTF-8');
    return sendRequest(
      '/3/search/movie?language=en-US&query=' + encodedSearch + '&page=' + page
    );
  }

  @AuraEnabled
  public static String getMoviesByQuickFilter(
    String filterKey,
    Integer pageNumber
  ) {
    if (String.isBlank(filterKey)) {
      throw new AuraHandledException('Please select a discovery filter.');
    }

    Integer page = getValidPage(pageNumber);

    String endpoint = '/3/discover/movie?language=en-US&page=' + page;

    if (filterKey == 'under2hours') {
      endpoint += '&with_runtime.lte=120&sort_by=popularity.desc';
    } else if (filterKey == 'topRated') {
      endpoint += '&sort_by=vote_average.desc&vote_count.gte=300';
    } else if (filterKey == 'hiddenGems') {
      endpoint +=
        '&sort_by=vote_average.desc' +
        '&vote_average.gte=7' +
        '&vote_count.gte=100' +
        '&vote_count.lte=1000';
    } else if (filterKey == 'family') {
      endpoint += '&with_genres=10751&sort_by=popularity.desc';
    } else if (filterKey == 'weekend') {
      endpoint += '&sort_by=popularity.desc';
    } else {
      throw new AuraHandledException('Invalid discovery filter.');
    }

    return sendRequest(endpoint);
  }

  @AuraEnabled
  public static String getMovieVideos(Integer movieId) {
    validateMovieId(movieId);
    return sendRequest('/3/movie/' + movieId + '/videos?language=en-US');
  }

  @AuraEnabled
  public static String getMovieWatchProviders(Integer movieId) {
    validateMovieId(movieId);
    return sendRequest('/3/movie/' + movieId + '/watch/providers');
  }

  @AuraEnabled
  public static String getSimilarMovies(Integer movieId, Integer pageNumber) {
    validateMovieId(movieId);
    Integer page = getValidPage(pageNumber);
    return sendRequest(
      '/3/movie/' + movieId + '/similar?language=en-US&page=' + page
    );
  }

  private static Integer getValidPage(Integer pageNumber) {
    return pageNumber == null || pageNumber < 1 ? 1 : pageNumber;
  }

  private static void validateMovieId(Integer movieId) {
    if (movieId == null || movieId <= 0) {
      throw new AuraHandledException('A valid movie ID is required.');
    }
  }

  private static String sendRequest(String endpoint) {
    HttpRequest request = new HttpRequest();
    request.setEndpoint('callout:TMDB_API' + endpoint);
    request.setMethod('GET');
    request.setTimeout(120000);

    HttpResponse response = new Http().send(request);
    if (response.getStatusCode() == 200) {
      return response.getBody();
    }

    throw new AuraHandledException(
      'TMDB request failed. HTTP status: ' + response.getStatusCode()
    );
  }
}
