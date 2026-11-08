@IsTest
private class CineMatchUserDataControllerTest {
  private static void grantAccess() {
    PermissionSet accessSet = [
      SELECT Id
      FROM PermissionSet
      WHERE Name = 'CineMatch_User_Data_Access'
      LIMIT 1
    ];

    List<PermissionSetAssignment> existingAssignments = [
      SELECT Id
      FROM PermissionSetAssignment
      WHERE
        AssigneeId = :UserInfo.getUserId()
        AND PermissionSetId = :accessSet.Id
    ];

    if (existingAssignments.isEmpty()) {
      insert new PermissionSetAssignment(
        AssigneeId = UserInfo.getUserId(),
        PermissionSetId = accessSet.Id
      );
    }
  }

  @IsTest
  static void testWatchlistAndReview() {
    grantAccess();

    User currentUser = [
      SELECT Id
      FROM User
      WHERE Id = :UserInfo.getUserId()
    ];

    System.runAs(currentUser) {
      Test.startTest();

      CineMatchUserDataController.addToWatchlist(
        550,
        'Fight Club',
        '1999',
        'Drama • Thriller',
        8.8,
        'https://image.tmdb.org/t/p/w500/poster.jpg',
        'A movie overview.'
      );

      List<CineMatchUserDataController.MovieDTO> watchlist = CineMatchUserDataController.getWatchlist();

      System.assertEquals(1, watchlist.size());
      System.assertEquals(550, watchlist[0].id);
      System.assertEquals('Fight Club', watchlist[0].title);

      CineMatchUserDataController.addToWatchlist(
        550,
        'Fight Club',
        '1999',
        'Drama • Thriller',
        8.8,
        'https://image.tmdb.org/t/p/w500/poster.jpg',
        'A movie overview.'
      );

      System.assertEquals(
        1,
        CineMatchUserDataController.getWatchlist().size(),
        'Adding the same movie twice should not create a duplicate.'
      );

      CineMatchUserDataController.ReviewDTO savedReview = CineMatchUserDataController.saveMyReview(
        550,
        'Fight Club',
        9.0,
        'A brilliant psychological thriller.'
      );

      System.assertEquals(9.0, savedReview.rating);

      CineMatchUserDataController.ReviewDTO loadedReview = CineMatchUserDataController.getMyReview(
        550
      );

      System.assertEquals(
        'A brilliant psychological thriller.',
        loadedReview.reviewText
      );

      CineMatchUserDataController.saveMyReview(
        550,
        'Fight Club',
        9.5,
        'Updated personal review.'
      );

      System.assertEquals(
        1,
        [
          SELECT COUNT()
          FROM CineMatch_Review__c
          WHERE TMDB_Movie_ID__c = 550
        ]
      );

      CineMatchUserDataController.removeFromWatchlist(watchlist[0].recordId);

      System.assertEquals(0, CineMatchUserDataController.getWatchlist().size());

      Test.stopTest();
    }
  }
}
