@IsTest
private class CineMatchTMDBServiceTest {
  private class TMDBMock implements HttpCalloutMock {
    public HttpResponse respond(HttpRequest request) {
      HttpResponse response = new HttpResponse();
      response.setStatusCode(200);
      response.setHeader('Content-Type', 'application/json');
      response.setBody('{"page":1,"total_pages":1,"results":[]}');
      return response;
    }
  }

  @IsTest
  static void testMovieEndpoints() {
    Test.setMock(HttpCalloutMock.class, new TMDBMock());

    Test.startTest();
    String popular = CineMatchTMDBService.getPopularMovies(1);
    String genre = CineMatchTMDBService.getMoviesByGenre(28, 1);
    String searchResult = CineMatchTMDBService.searchMovies('Batman Begins', 1);
    String videos = CineMatchTMDBService.getMovieVideos(550);
    String providers = CineMatchTMDBService.getMovieWatchProviders(550);
    String similar = CineMatchTMDBService.getSimilarMovies(550, 1);
    Test.stopTest();

    System.assert(popular.contains('"results"'));
    System.assert(genre.contains('"results"'));
    System.assert(searchResult.contains('"results"'));
    System.assert(videos.contains('"results"'));
    System.assert(providers.contains('"results"'));
    System.assert(similar.contains('"results"'));
  }

  @IsTest
  static void testInvalidMovieId() {
    try {
      CineMatchTMDBService.getMovieVideos(0);
      System.assert(false, 'Expected an exception for an invalid movie ID.');
    } catch (AuraHandledException expectedException) {
      System.assert(expectedException.getMessage() != null);
    }
  }
}
