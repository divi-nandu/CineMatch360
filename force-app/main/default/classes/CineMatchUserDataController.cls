public with sharing class CineMatchUserDataController {
  public class MovieDTO {
    @AuraEnabled
    public String recordId;
    @AuraEnabled
    public Integer id;
    @AuraEnabled
    public String title;
    @AuraEnabled
    public String year;
    @AuraEnabled
    public String genre;
    @AuraEnabled
    public String rating;
    @AuraEnabled
    public String image;
    @AuraEnabled
    public String overview;
  }

  public class ReviewDTO {
    @AuraEnabled
    public String recordId;
    @AuraEnabled
    public Decimal rating;
    @AuraEnabled
    public String reviewText;
    @AuraEnabled
    public Datetime createdDate;
  }

  @AuraEnabled
  public static List<MovieDTO> getWatchlist() {
    List<CineMatch_Watchlist__c> records = [
      SELECT
        Id,
        TMDB_Movie_ID__c,
        Title__c,
        Year__c,
        Genre__c,
        Rating__c,
        Poster_URL__c,
        Overview__c
      FROM CineMatch_Watchlist__c
      WHERE CreatedById = :UserInfo.getUserId()
      WITH USER_MODE
      ORDER BY CreatedDate DESC
    ];

    List<MovieDTO> results = new List<MovieDTO>();

    for (CineMatch_Watchlist__c recordItem : records) {
      MovieDTO movie = new MovieDTO();
      movie.recordId = recordItem.Id;
      movie.id = recordItem.TMDB_Movie_ID__c.intValue();
      movie.title = recordItem.Title__c;
      movie.year = recordItem.Year__c;
      movie.genre = recordItem.Genre__c;
      movie.rating = recordItem.Rating__c == null
        ? 'N/A'
        : String.valueOf(recordItem.Rating__c.setScale(1));
      movie.image = recordItem.Poster_URL__c;
      movie.overview = recordItem.Overview__c;
      results.add(movie);
    }

    return results;
  }

  @AuraEnabled
  public static void addToWatchlist(
    Integer movieId,
    String title,
    String year,
    String genre,
    Decimal rating,
    String image,
    String overview
  ) {
    if (movieId == null || movieId <= 0 || String.isBlank(title)) {
      throw new AuraHandledException('Movie information is incomplete.');
    }

    List<CineMatch_Watchlist__c> existing = [
      SELECT Id
      FROM CineMatch_Watchlist__c
      WHERE TMDB_Movie_ID__c = :movieId AND CreatedById = :UserInfo.getUserId()
      WITH USER_MODE
      LIMIT 1
    ];

    if (!existing.isEmpty()) {
      return;
    }

    CineMatch_Watchlist__c entry = new CineMatch_Watchlist__c(
      TMDB_Movie_ID__c = movieId,
      Title__c = title.left(255),
      Year__c = String.isBlank(year) ? null : year.left(4),
      Genre__c = String.isBlank(genre) ? null : genre.left(255),
      Rating__c = rating,
      Poster_URL__c = String.isBlank(image) ? null : image.left(255),
      Overview__c = String.isBlank(overview) ? null : overview.left(32000)
    );

    Database.insert(entry, AccessLevel.USER_MODE);
  }

  @AuraEnabled
  public static void removeFromWatchlist(String recordId) {
    if (String.isBlank(recordId)) {
      throw new AuraHandledException('Watchlist record ID is required.');
    }

    List<CineMatch_Watchlist__c> entries = [
      SELECT Id
      FROM CineMatch_Watchlist__c
      WHERE Id = :recordId AND CreatedById = :UserInfo.getUserId()
      WITH USER_MODE
      LIMIT 1
    ];

    if (!entries.isEmpty()) {
      Database.delete(entries[0], AccessLevel.USER_MODE);
    }
  }

  @AuraEnabled
  public static ReviewDTO getMyReview(Integer movieId) {
    if (movieId == null || movieId <= 0) {
      return null;
    }

    List<CineMatch_Review__c> reviews = [
      SELECT Id, Rating__c, User_Review__c, CreatedDate
      FROM CineMatch_Review__c
      WHERE TMDB_Movie_ID__c = :movieId AND CreatedById = :UserInfo.getUserId()
      WITH USER_MODE
      ORDER BY CreatedDate DESC
      LIMIT 1
    ];

    if (reviews.isEmpty()) {
      return null;
    }

    ReviewDTO result = new ReviewDTO();
    result.recordId = reviews[0].Id;
    result.rating = reviews[0].Rating__c;
    result.reviewText = reviews[0].User_Review__c;
    result.createdDate = reviews[0].CreatedDate;

    return result;
  }

  @AuraEnabled
  public static ReviewDTO saveMyReview(
    Integer movieId,
    String movieTitle,
    Decimal rating,
    String reviewText
  ) {
    if (movieId == null || movieId <= 0 || String.isBlank(movieTitle)) {
      throw new AuraHandledException('Movie information is incomplete.');
    }

    if (rating == null || rating < 1 || rating > 10) {
      throw new AuraHandledException('Please enter a rating between 1 and 10.');
    }

    if (reviewText != null && reviewText.length() > 2000) {
      throw new AuraHandledException(
        'Your review must be 2,000 characters or fewer.'
      );
    }

    List<CineMatch_Review__c> existing = [
      SELECT Id
      FROM CineMatch_Review__c
      WHERE TMDB_Movie_ID__c = :movieId AND CreatedById = :UserInfo.getUserId()
      WITH USER_MODE
      LIMIT 1
    ];

    CineMatch_Review__c reviewRecord;

    if (existing.isEmpty()) {
      reviewRecord = new CineMatch_Review__c(TMDB_Movie_ID__c = movieId);
    } else {
      reviewRecord = existing[0];
    }

    reviewRecord.Movie_Title__c = movieTitle.left(255);
    reviewRecord.Rating__c = rating;
    reviewRecord.User_Review__c = reviewText;

    if (reviewRecord.Id == null) {
      Database.insert(reviewRecord, AccessLevel.USER_MODE);
    } else {
      Database.update(reviewRecord, AccessLevel.USER_MODE);
    }

    CineMatch_Review__c saved = [
      SELECT Id, Rating__c, User_Review__c, CreatedDate
      FROM CineMatch_Review__c
      WHERE Id = :reviewRecord.Id
      WITH USER_MODE
      LIMIT 1
    ];

    ReviewDTO result = new ReviewDTO();
    result.recordId = saved.Id;
    result.rating = saved.Rating__c;
    result.reviewText = saved.User_Review__c;
    result.createdDate = saved.CreatedDate;

    return result;
  }
}
