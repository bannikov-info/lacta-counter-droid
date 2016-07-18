(function () {
  'use strict';

  angular
      .module('App', ['ngMaterial', 'mdLetterAvatar', 'lacta-counter'])
      .config(function($mdThemingProvider, $mdIconProvider){

          $mdIconProvider
              .defaultIconSet("./assets/svg/avatars.svg", 128)
              .icon("menu"       , "./assets/svg/menu.svg"        , 24)
              .icon("share"      , "./assets/svg/share.svg"       , 24)
              .icon("google_plus", "./assets/svg/google_plus.svg" , 512)
              .icon("hangouts"   , "./assets/svg/hangouts.svg"    , 512)
              .icon("twitter"    , "./assets/svg/twitter.svg"     , 512)
              .icon("phone"      , "./assets/svg/phone.svg"       , 512)
              .icon('lactation:add', './assets/svg/ic_add_white_24px.svg', 24)
              .icon('lactation:add-done', './assets/svg/ic_done_white_24px.svg', 48);

              $mdThemingProvider.theme('default')
                  .primaryPalette('light-blue')
                  .accentPalette('pink');

      });
})();
;(function(){
  'use strict';

  // Prepare the 'users' module for subsequent registration of controllers and delegates
  angular.module('lacta-counter', ['angular-websql']);


})();
;(function(){
  'use strict';

  // Prepare the 'users' module for subsequent registration of controllers and delegates
  angular.module('lacta-counter')
         .controller('LactationsCtrl', LactationsController);

  LactationsController.$inject = ['$scope', 'Lactations', '$log'];
  function LactationsController($scope, Lactations, $log) {
    var self = this;

    $scope.lactations = [];
    self.selected = null;

    Lactations.getAllLactations()
              .then(
                function (lactations) {
                  // debugger;
                  $scope.lactations = lactations;
                },
                function (err) {
                  $log.error(err.message);
                }
              );
    self.addNewLactation = function (dateTime, breast) {
      var ts = angular.isDate(dateTime)
               ? dateTime.getTime()
               : Date.now();
      Lactations.addLactation(ts, breast || null).then(
        function (rowsAffected) {
          if(rowsAffected > 0){
            $scope.lactations.push({timeStamp: ts, breast: breast});
          }
        },
        function (err) {
          log.error(err.message);
        }
      );
    };

    self.removeLactation = function (item) {
      var idx = angular.isNumber(item)
                ? item
                : $scope.lactations.indexOf(item);

      if(idx >= 0 && angular.isObject($scope.lactations[idx])){
        var id = $scope.lactations[idx].timeStamp;

        Lactations.removeLactation(id).then(
          function (rowsAffected) {
            if(rowsAffected > 0){
              $scope.lactations.splice(idx, 1);
            }
          },
          function(err){
            $log.error(err.message);
          }
        );
      }


    };
    self.removeSelected = function(){
      self.removeLactation(self.selected);
      self.setSelected(null);
    };
    self.setSelected = function (item) {
      if(self.selected === item){
        self.selected = null;
        return;
      };

      self.selected = item;
    }
  }


})();
;(function(){
  'use strict';

  // Prepare the 'users' module for subsequent registration of controllers and delegates
  angular.module('lacta-counter')
         .service('Lactations', LactationsService)
         .service('LactationDB', LactationDB);

  LactationsService.$inject = ['$q', '$webSql', 'LactationDB'];
  function LactationsService($q, $webSql, LactationDB) {
    // var lactations = LactationDB.getAllLactations();

    return {
      getAllLactations: function(){
        return LactationDB.getAllLactations().then(function (rows) {
          return $q.when(Array.prototype.map.call(rows, function (row) {
            return row;
          }));
        });
      },
      addLactation: function (timeStamp, breast) {
        return LactationDB.addLactation({timeStamp: timeStamp, breast: breast});
      },
      removeLactation: function (id){
        return LactationDB.removeLactation({timeStamp: id});
      }
    };

  }

  LactationDB.$inject = ['$window', '$log', '$q'];
  function LactationDB($window, $log, $q){
    return {
      openDb: function () {
        var def = $q.defer();
        try {
          var db = openDatabase('Lactations', '', 'A list of lactations.', 5*1024*1024);

          if(db === null){
            def.reject(new Error('Не удалось подключиться к базе данных.'));
          }else if(db.version === ''){
            db.changeVersion('', '0.1',
              function (tx) {
                $log.info('Инициализация БД версии 0.1.')
                $log.info('Создание таблицы Lactations.')
                tx.executeSql("CREATE TABLE Lactations (timeStamp REAL UNIQUE NOT NULL, breast TEXT)", []);
              },
              def.reject.bind(def),
              def.resolve.bind(def, db)
            );
          }else{
            def.resolve(db);
          }

        } catch (e) {
          def.reject(e);
        };

        return def.promise;
      },
      getAllLactations: function(){

        return this.openDb().then(
          function (db) {
            var def = $q.defer();

            db.readTransaction(function(tx) {
              tx.executeSql("SELECT * FROM Lactations", [],
                function (tx, data) {
                  def.resolve(data.rows)
                },
                function (tx, err) {
                  def.reject(err);
                }
              );
            });

            return def.promise;
          }
        )
      },
      addLactation: function(lactationFields){
        if(!angular.isObject(lactationFields)){
          throw new TypeError('Параметр lactationFields должен быть объектом.');
        };

        return this.openDb().then(
          function (db) {
            var def = $q.defer();

            db.transaction(function(tx) {
              tx.executeSql("insert into lactations (timestamp, breast) values (?, ?)", [lactationFields.timeStamp, lactationFields.breast],
                function (tx, data) {
                  def.resolve(data.rowsAffected)
                },
                function (tx, err) {
                  def.reject(err);
                }
              );
            });

            return def.promise;
          }
        )
      },
      removeLactation: function(whereObj){
        if(!angular.isObject(whereObj)){
          throw new TypeError('Параметр whereObj должен быть объектом.');
        };

        return this.openDb().then(
          function (db) {
            var def = $q.defer();

            db.transaction(function(tx) {
              tx.executeSql("delete from lactations where timeStamp = ?", [whereObj.timeStamp],
                function (tx, data) {
                  def.resolve(data.rowsAffected)
                },
                function (tx, err) {
                  def.reject(err);
                }
              );
            });

            return def.promise;
          }
        )
      }
    }
  }

})();
;(function(){
  'use strict';

  // Prepare the 'users' module for subsequent registration of controllers and delegates
  angular.module('users', [ 'ngMaterial' ]);


})();
;(function(){

  angular
       .module('users')
       .controller('UserController', [
          'userService', '$mdSidenav', '$mdBottomSheet', '$timeout', '$log',
          UserController
       ]);

  /**
   * Main Controller for the Angular Material Starter App
   * @param $scope
   * @param $mdSidenav
   * @param avatarsService
   * @constructor
   */
  function UserController( userService, $mdSidenav, $mdBottomSheet, $timeout, $log ) {
    var self = this;

    self.selected     = null;
    self.users        = [ ];
    self.selectUser   = selectUser;
    self.toggleList   = toggleUsersList;
    self.makeContact  = makeContact;

    // Load all registered users

    userService
          .loadAllUsers()
          .then( function( users ) {
            self.users    = [].concat(users);
            self.selected = users[0];
          });

    // *********************************
    // Internal methods
    // *********************************

    /**
     * Hide or Show the 'left' sideNav area
     */
    function toggleUsersList() {
      $mdSidenav('left').toggle();
    }

    /**
     * Select the current avatars
     * @param menuId
     */
    function selectUser ( user ) {
      self.selected = angular.isNumber(user) ? $scope.users[user] : user;
    }

    /**
     * Show the Contact view in the bottom sheet
     */
    function makeContact(selectedUser) {

        $mdBottomSheet.show({
          controllerAs  : "vm",
          templateUrl   : './src/users/view/contactSheet.html',
          controller    : [ '$mdBottomSheet', ContactSheetController],
          parent        : angular.element(document.getElementById('content'))
        }).then(function(clickedItem) {
          $log.debug( clickedItem.name + ' clicked!');
        });

        /**
         * User ContactSheet controller
         */
        function ContactSheetController( $mdBottomSheet ) {
          this.user = selectedUser;
          this.items = [
            { name: 'Phone'       , icon: 'phone'       , icon_url: 'assets/svg/phone.svg'},
            { name: 'Twitter'     , icon: 'twitter'     , icon_url: 'assets/svg/twitter.svg'},
            { name: 'Google+'     , icon: 'google_plus' , icon_url: 'assets/svg/google_plus.svg'},
            { name: 'Hangout'     , icon: 'hangouts'    , icon_url: 'assets/svg/hangouts.svg'}
          ];
          this.contactUser = function(action) {
            // The actually contact process has not been implemented...
            // so just hide the bottomSheet

            $mdBottomSheet.hide(action);
          };
        }
    }

  }

})();
;(function(){
  'use strict';

  angular.module('users')
         .service('userService', ['$q', UserService]);

  /**
   * Users DataService
   * Uses embedded, hard-coded data model; acts asynchronously to simulate
   * remote data service call(s).
   *
   * @returns {{loadAll: Function}}
   * @constructor
   */
  function UserService($q){
    var users = [
      {
        name: 'Lia Lugo',
        avatar: 'svg-1',
        content: 'I love cheese, especially airedale queso. Cheese and biscuits halloumi cauliflower cheese cottage cheese swiss boursin fondue caerphilly. Cow port-salut camembert de normandie macaroni cheese feta who moved my cheese babybel boursin. Red leicester roquefort boursin squirty cheese jarlsberg blue castello caerphilly chalk and cheese. Lancashire.'
      },
      {
        name: 'George Duke',
        avatar: 'svg-2',
        content: 'Zombie ipsum reversus ab viral inferno, nam rick grimes malum cerebro. De carne lumbering animata corpora quaeritis. Summus brains sit​​, morbo vel maleficia? De apocalypsi gorger omero undead survivor dictum mauris.'
      },
      {
        name: 'Gener Delosreyes',
        avatar: 'svg-3',
        content: "Raw denim pour-over readymade Etsy Pitchfork. Four dollar toast pickled locavore bitters McSweeney's blog. Try-hard art party Shoreditch selfies. Odd Future butcher VHS, disrupt pop-up Thundercats chillwave vinyl jean shorts taxidermy master cleanse letterpress Wes Anderson mustache Helvetica. Schlitz bicycle rights chillwave irony lumberhungry Kickstarter next level sriracha typewriter Intelligentsia, migas kogi heirloom tousled. Disrupt 3 wolf moon lomo four loko. Pug mlkshk fanny pack literally hoodie bespoke, put a bird on it Marfa messenger bag kogi VHS."
      },
      {
        name: 'Lawrence Ray',
        avatar: 'svg-4',
        content: 'Scratch the furniture spit up on light gray carpet instead of adjacent linoleum so eat a plant, kill a hand pelt around the house and up and down stairs chasing phantoms run in circles, or claw drapes. Always hungry pelt around the house and up and down stairs chasing phantoms.'
      },
      {
        name: 'Ernesto Urbina',
        avatar: 'svg-5',
        content: 'Webtwo ipsum dolor sit amet, eskobo chumby doostang bebo. Bubbli greplin stypi prezi mzinga heroku wakoopa, shopify airbnb dogster dopplr gooru jumo, reddit plickers edmodo stypi zillow etsy.'
      },
      {
        name: 'Gani Ferrer',
        avatar: 'svg-6',
        content: "Lebowski ipsum yeah? What do you think happens when you get rad? You turn in your library card? Get a new driver's license? Stop being awesome? Dolor sit amet, consectetur adipiscing elit praesent ac magna justo pellentesque ac lectus. You don't go out and make a living dressed like that in the middle of a weekday. Quis elit blandit fringilla a ut turpis praesent felis ligula, malesuada suscipit malesuada."
      }
    ];

    // Promise-based API
    return {
      loadAllUsers : function() {
        // Simulate async nature of real remote calls
        return $q.when(users);
      }
    };
  }

})();
