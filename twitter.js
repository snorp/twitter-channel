var accessor = {
    consumerKey   : "at3MbXWyhdYfD2IBDuoIQ",
    consumerSecret: "vz40oso6VWwQEH1IzQz8Uk6kBHDwYI9GsfvS5WnZc",
    serviceProvider: {
        signatureMethod     : "HMAC-SHA1",
        requestTokenURL     : "http://api.twitter.com/oauth/request_token",
        userAuthorizationURL: "http://api.twitter.com/oauth/authorize",
        accessTokenURL      : "https://api.twitter.com/oauth/access_token"
    }
};

const REALM = "Twitter API";

const TIMELINE_URL = "http://api.twitter.com/1/statuses/home_timeline.json";
const MENTIONS_URL = "http://api.twitter.com/1/statuses/mentions.json";
const VERIFY_CREDS_URL = "http://api.twitter.com/1/account/verify_credentials.json";
const RATE_LIMIT_URL = "http://api.twitter.com/1/account/rate_limit_status.json";
const STATUS_UPDATE_URL = "http://api.twitter.com/1/statuses/update.json";
const RETWEET_URL = "http://api.twitter.com/1/statuses/retweet/";

const REFRESH_INTERVAL = (1000 * 60 * 5); // 5 minutes
const MAX_TWEETS = 20;

const MAX_DUMP_DEPTH = 10;

function dumpObj(obj, name, indent, depth) {
      if (depth > MAX_DUMP_DEPTH) {
             return indent + name + ": <Maximum Depth Reached>\n";
      }
      if (typeof obj == "object") {
             var child = null;
             var output = indent + name + "\n";
             indent += "\t";
             for (var item in obj)
             {
                   try {
                          child = obj[item];
                   } catch (e) {
                          child = "<Unable to Evaluate>";
                   }
                   if (typeof child == "object") {
                          output += dumpObj(child, item, indent, depth + 1);
                   } else {
                          output += indent + item + ": " + child + "\n";
                   }
             }
             return output;
      } else {
             return obj;
      }
}

function dump(obj) {
    console.log(dumpObj(obj, "", 0, 0));
}

function Twitter() {
    this._init();
}

Twitter.prototype = {
    MAX_CHARS: 140,
    
    _init: function() {
        this._index = 0;
        this._tweets = [];

        this._restore();

        var me = this;
        window.addEventListener("PropertyChanged", function(event) {
            var name = event.name;
            var value = event.value;
            if (name == 'account.accessToken') {
                me._accessToken = value;
            } else if (name == 'account.accessTokenSecret') {
                me._accessTokenSecret = value;
            }
        }, false);
    },

    isAuthenticated: function() {
        return (this._accessToken != null);
    },

    clearAuth: function() {
        this._requestToken = null;
        this._requestTokenSecret = null;
        this._accessToken = null;
        this._accessTokenSecret = null;
        this._userId = null;
        this._screenName = null;
        this._pin = null;
    },

    startAuth: function() {
        var message = {
            method: "POST",
            action: accessor.serviceProvider.requestTokenURL,
            parameters: [],
        };

        OAuth.completeRequest(message, accessor);
        var authorizationHeader = OAuth.getAuthorizationHeader(REALM, message.parameters);

        var me = this;
        $.ajax({
            type: message.method,
            url: message.action,

            beforeSend: function(xhr) {
                xhr.setRequestHeader("Authorization", authorizationHeader);
            },

            success: function(data, textStatus, xhr) {
                if (!data) {
                    console.log("TWITTER: got no auth start data");
                    return;
                }

                var results = OAuth.decodeForm(data);
                me._requestToken = OAuth.getParameter(results, "oauth_token");
                me._requestTokenSecret = OAuth.getParameter(results, "oauth_token_secret");

                var url = accessor.serviceProvider.userAuthorizationURL + "?" + data;
                openchannel.openUrl(url);
                $(document).trigger('auth-started');
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("TWITTER: failed to start auth: " + xhr.responseText);
            },
        });
    },

    /* This is the old OAuth implementation
    completeAuth: function(pin) {

        var message = {
            method: "POST",
            action: accessor.serviceProvider.accessTokenURL,
            parameters: [['oauth_verifier', pin]]
        };

        OAuth.completeRequest(message, {
            consumerKey: accessor.consumerKey,
            consumerSecret: accessor.consumerSecret,
            token: this._requestToken,
            tokenSecret: this._requestTokenSecret
        });

        authorizationHeader = OAuth.getAuthorizationHeader(REALM, message.parameters);

        var me = this;
        $.ajax({
            type: message.method,
            url: message.action,

            beforeSend: function(xhr) {
                xhr.setRequestHeader("Authorization", authorizationHeader);
            },

            success: function(data, textStatus, xhr) {
                var results = OAuth.decodeForm(data);

                me._accessToken = OAuth.getParameter(results, "oauth_token");
                me._accessTokenSecret = OAuth.getParameter(results, "oauth_token_secret");
                me._userId = OAuth.getParameter(results, "user_id");
                me._screenName = OAuth.getParameter(results, "screen_name");
                me._save();

                console.log("TWITTER: auth successful for user: " + me._screenName);

                $(document).trigger('auth-completed');
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("TWITTER: failed to complete auth");
                me._notifyAuthInvalid();
            }
        });
    },
    */
    
    completeAuth: function(username, password, callback) {

        var message = {
            method: "POST",
            action: accessor.serviceProvider.accessTokenURL,
            parameters: [['x_auth_username', username], ['x_auth_password', password],
                         ['x_auth_mode', 'client_auth']],
        };

        OAuth.completeRequest(message, {
            consumerKey: accessor.consumerKey,
            consumerSecret: accessor.consumerSecret,
        });

        var me = this;
        $.ajax({
            type: message.method,
            url: message.action,
            
            data: OAuth.formEncode(message.parameters),

            success: function(data, textStatus, xhr) {
                var results = OAuth.decodeForm(data);

                me._accessToken = OAuth.getParameter(results, "oauth_token");
                me._accessTokenSecret = OAuth.getParameter(results, "oauth_token_secret");
                me._userId = OAuth.getParameter(results, "user_id");
                me._screenName = OAuth.getParameter(results, "screen_name");
                me._save();

                console.log("TWITTER: auth successful for user: " + me._screenName);

                if (callback) {
                    callback(true, xhr);
                }
                
                $(document).trigger('auth-completed');
            },

            error: function(xhr, textStatus, errorThrown) {
                if (callback) {
                    callback(false, xhr);
                }
                me._notifyAuthInvalid();
            }
        });
    },

    _signedAjax: function(args) {
        if (!this.isAuthenticated()) {
            this._notifyAuthInvalid();
            return;
        }

        var message = {
            method: args.method || "GET",
            action: args.url,
            parameters: [],
        };

        var data = null;
        if (message.method == "GET") {
            message.action = OAuth.addToURL(message.action, args.parameters);
        } else {
            message.parameters = args.parameters;
            data = OAuth.formEncode(args.parameters);
        }

        OAuth.completeRequest(message, {
            consumerKey: accessor.consumerKey,
            consumerSecret: accessor.consumerSecret,
            token: this._accessToken,
            tokenSecret: this._accessTokenSecret
        });

        var authorizationHeader = OAuth.getAuthorizationHeader(REALM, message.parameters);

        var me = this;
        $.ajax({
            type: message.method,
            url: message.action,

            data: data,
            dataType: args.dataType || 'json',

            beforeSend: function(xhr) {
                xhr.setRequestHeader("Authorization", authorizationHeader);
            },

            complete: function(xhr, textStatus) {
                if (xhr.status == 401) {
                    me._notifyAuthInvalid();
                }
            },

            success: function(data, textStatus, xhr) {
                if (args.success) {
                    args.success(data, textStatus, xhr);
                }
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("TWITTER: error code: " + xhr.status);
                if (xhr.status == 401) {
                    me._notifyAuthInvalid();
                }

                if (args.error) {
                    args.error(xhr, textStatus, errorThrown);
                }
            },
        });
    },

    _save: function() {
        var data = {};
        for (var prop in this) {
            if (typeof(this[prop]) != "function") {
                data[prop] = this[prop];
            }
        }

        localStorage.setItem("cachedData", JSON.stringify(data));

        if (this._accessToken && this._accessTokenSecret) {
            openchannel.setProperties({
                'account.accessToken': this._accessToken,
                'account.accessTokenSecret': this._accessTokenSecret
            });
        }
    },

    _restore: function() {
        var jsonData = localStorage.getItem("cachedData");
        if (jsonData) {
            var data = JSON.parse(jsonData);
            for (var prop in data) {
                this[prop] = data[prop];
            }
        }
        
        this._stopRefreshTimeout();
    },

    _adjustIndex: function(direction) {
        
        if (!this._tweets || this._tweets.length == 0 ||
            this._index >= this._tweets.length) {
            this._index = 0;
        } else if (this._index < 0) {
            this._index = (this._tweets.length - 1);
        }
        
        $(document).trigger('current-tweet-changed');
    },
    
    _expandUrls: function() {
        for (var i = 0; i < this._tweets.length; i++) {
            var urls = findUrls(this._tweets[i].text);
            shorturls.fetch(urls);
        }
    },

    _mergeTweets: function() {
        if (!this._mentions)
            this._mentions = [];

        if (!this._timeline)
            this._timeline = [];

        var tweetHash = {};
        $.each(this._timeline.concat(this._mentions), function(i, tweet) {
            tweetHash[tweet.id] = tweet;
        });

        this._tweets = [];
        for (var id in tweetHash) {
            this._tweets.push(tweetHash[id]);
        }

        this._tweets.sort(function(a, b) {
            return b.id - a.id;
        });

        this._tweets = this._tweets.splice(0, MAX_TWEETS);
        
        this._expandUrls();
        this._adjustIndex();

        $(document).trigger('refreshed');
    },

    _stopRefreshTimeout: function() {
        if (this._refreshTimeoutId) {
            clearInterval(this._refreshTimeoutId);
            delete this._refreshTimeoutId;
        }
    },

    _startRefreshTimeout: function() {
        if (!this._refreshTimeoutId) {
            var me = this;
            this._refreshTimeoutId = setInterval(function() {
                me.refresh();
            }, REFRESH_INTERVAL);
        }
    },

    _notifyAuthValid: function() {
        this._startRefreshTimeout();
        $(document).trigger('auth-valid');
    },

    _notifyAuthInvalid: function() {
        this._stopRefreshTimeout();
        $(document).trigger('auth-invalid');
    },

    _refreshTweetList: function(url, prop) {
        var parameters = {};
        if (this[prop] && this[prop].length > 0) {
            parameters = { 'since_id': this[prop][0].id.toString() };
        }
        
        console.log("TWITTER: Refreshing " + prop);

        var me = this;
        this._signedAjax({
            url: url,

            parameters: parameters,

            success: function(data, textStatus, xhr) {
                if (me[prop]) {
                    me[prop] = data.concat(me[prop]);
                } else {
                    me[prop] = data;
                }

                me._save();
                me._mergeTweets();
                
                me._startRefreshTimeout();
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("TWITTER: fetch error on: " + this.url);
                $(document).trigger('refresh-error');
            },
        });
    },

    refresh: function() {
        this._refreshTweetList(TIMELINE_URL, '_timeline');
        this._refreshTweetList(MENTIONS_URL, '_mentions');
    },

    verifyCredentials: function() {
        var me = this;
        this._signedAjax({
            url: VERIFY_CREDS_URL,

            success: function(data, textStatus, xhr) {
                console.log("TWITTER: auth valid for : " + data.screen_name);
                me._notifyAuthValid();
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("TWITTER: fetch error on: " + this.url);
                me._notifyAuthInvalid();
            },
        });
    },

    checkRateLimit: function() {
        var me = this;
        this._signedAjax({
            url: RATE_LIMIT_URL,

            success: function(data, textStatus, xhr) {
                console.log("TWITTER: have " + data.remaining_hits +  " left");
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("TWITTER: failed to get rate limit status: " + xhr.status);
            },
        });

    },

    getTweets: function() {
        return this._tweets;
    },
    
    getIndex: function() {
        return this._index;  
    },

    getCurrentTweet: function() {
        if (!this._tweets)
            return null;

        return this._tweets[this._index];
    },

    nextTweet: function() {
        this._index = this._index + 1;
        this._adjustIndex();
        return this.getCurrentTweet();
    },

    previousTweet: function() {
        this._index = this._index - 1;
        this._adjustIndex();
        return this.getCurrentTweet();
    },

    seekTweet: function(tweet) {
        var me = this;
        $.each(this._tweets, function(i, t) {
            if (tweet.id == t.id) {
                me._index = i;
            }
        });
    },

    updateStatus: function(args) {
        var data = {
            status: args.status,
        };

        if (args.replyTo) {
            data.in_reply_to_status_id = args.replyTo.id;
        }

        var me = this;
        this._signedAjax({
            method: 'POST',
            url: STATUS_UPDATE_URL,

            parameters: data,

            success: function(data, textStatus, xhr) {
                args.success(data);
                me._tweets.unshift(data);
                $(document).trigger('refreshed');
            },

            error: function(xhr, textStatus, errorThrown) {
                args.error(xhr);
            },
        });
    },
    
    retweet: function(args) {        
        var me = this;
        this._signedAjax({
            method: 'POST',
            url: RETWEET_URL + args.tweet.id + ".json",

            success: function(data, textStatus, xhr) {
                args.success(data);
                me._tweets.unshift(data);
                $(document).trigger('refreshed');
            },

            error: function(xhr, textStatus, errorThrown) {
                args.error(xhr);
            },
        });
    }
};

var twitter = new Twitter();
