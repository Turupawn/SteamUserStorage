var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , session = require('express-session')
  , SteamStrategy = require('passport-steam').Strategy
  , sqlite3 = require('sqlite3').verbose()
  , db = new sqlite3.Database('database.sqlite3')
  , jquery = require('jquery');

var jsdom=require('jsdom');
var request = require("request")
var Promise = require('promise')
var steam_api_key = "xxx"
var website_url="http://smackdown.club:3000"
//var website_url="http://localhost:3000"
//CREATE TABLE users (steamid TEXT, summary TEXT, games TEXT);
//var $=require('jquery')(jsdom.jsdom().createWindow());

//var XMLHttpRequest=require('xmlhttprequest').XMLHttpRequest;

//cross domain
//$.support.cors=true;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Steam profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new SteamStrategy({
    returnURL: website_url+'/auth/steam/return',
    realm: website_url,
    apiKey: steam_api_key
  },
  function(identifier, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {

      // To keep the example simple, the user's Steam profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Steam account with a user record in your database,
      // and return that user instead.

var summary=""
var games=""

      var promise_global = new Promise(function(resolve_global, reject) {
        var promise_player_summary = new Promise(function(resolve_player, reject) {
          var player_url = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key="+steam_api_key+"&steamids="+profile._json.steamid
          request(
          {
            url: player_url,
            json: true
          }, function (error, response, body)
          {
            summary=body.response.players[0]
            resolve_player(body.response.players[0].steamid)
          })
        })

        promise_player_summary.then(function(result) {


          this.steamid=result
          games_url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key="+steam_api_key+"&steamid="+steamid+"&format=json&include_appinfo=1"
          request({
            url: games_url,
            json: true
          }, function (error, response, body) {
            games=body.response.games
            resolve_global('')
          })


        })

      })

      promise_global.then(function(result) {
        exists = false
        db.all("SELECT steamid FROM users", function(err, rows)
        {
          rows.forEach(function (row)
          {
            if(row.steamid==profile._json.steamid)
            {
              exists = true
            }
          })
          if(!exists)
          {
            db.serialize(function()
            {
              var stmt = db.prepare("INSERT INTO users VALUES (?,?,?)");
              stmt.run(profile._json.steamid,JSON.stringify(summary),JSON.stringify(games));
              stmt.finalize();
            })
          }
        });

        profile.identifier = identifier;

        return done(null, profile);
      })
    });
  }
));

var app = express();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(session({
    secret: 'your secret',
    name: 'name of session id',
    resave: true,
    saveUninitialized: true}));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

app.get('/', function(req, res){

  db.all("SELECT * FROM users", function(err, rows)
  {
    res.render('index', { user: req.user, users: rows });
  });

});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// GET /auth/steam
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Steam authentication will involve redirecting
//   the user to steamcommunity.com.  After authenticating, Steam will redirect the
//   user back to this application at /auth/steam/return
app.get('/auth/steam',
  passport.authenticate('steam', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

// GET /auth/steam/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

app.listen(3000);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}

