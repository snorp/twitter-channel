var accessor = {
    consumerKey   : "at3MbXWyhdYfD2IBDuoIQ",
    consumerSecret: "vz40oso6VWwQEH1IzQz8Uk6kBHDwYI9GsfvS5WnZc",
    serviceProvider: {
        signatureMethod     : "HMAC-SHA1",
        requestTokenURL     : "http://api.twitter.com/oauth/request_token",
        userAuthorizationURL: "http://api.twitter.com/oauth/authorize",
        accessTokenURL      : "http://api.twitter.com/oauth/access_token"
    }
};

const TIMELINE_URL = "http://api.twitter.com/1/statuses/home_timeline.json";
const MENTIONS_URL = "http://api.twitter.com/1/statuses/mentions.json";
const VERIFY_CREDS_URL = "http://api.twitter.com/1/account/verify_credentials.json";
const RATE_LIMIT_URL = "http://api.twitter.com/1/account/rate_limit_status.json";

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
    _init: function() {
        this._index = 0;
        this._restore();
        this._mergeTweets();
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
        var authorizationHeader = OAuth.getAuthorizationHeader("", message.parameters);

        console.log("TWITTER: starting auth");

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

        authorizationHeader = OAuth.getAuthorizationHeader("", message.parameters);

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
                $(document).trigger('auth-invalid');
            }
        });
    },

    _signedAjax: function(args) {
        if (!this.isAuthenticated()) {
            $(document).trigger('auth-invalid');
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
            data = args.parameters;
        }

        OAuth.completeRequest(message, {
            consumerKey: accessor.consumerKey,
            consumerSecret: accessor.consumerSecret,
            token: this._accessToken,
            tokenSecret: this._accessTokenSecret
        });

        var authorizationHeader = OAuth.getAuthorizationHeader("", message.parameters);
        console.log("TWITTER: " + authorizationHeader);
        console.log("TWITTER: requesting: " + message.action);

        $.ajax({
            type: message.method,
            url: message.action,

            data: data,
            dataType: args.dataType || 'json',

            beforeSend: function(xhr) {
                xhr.setRequestHeader("Authorization", authorizationHeader);
            },

            complete: function(xhr, textStatus) {
                console.log("TWITTER: signed result: " + xhr.status);
                console.log("TWITTER: signed response: " + xhr.responseText);

                if (xhr.status == 401) {
                    $(document).trigger('auth-invalid');
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
                    $(document).trigger('auth-invalid');
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
    },

    _restore: function() {
        var jsonData = localStorage.getItem("cachedData");
        if (jsonData) {
            var data = JSON.parse(jsonData);

            for (var prop in data) {
                this[prop] = data[prop];
            }
        }
    },

    _adjustIndex: function(direction) {
        if (!this._tweets || this._tweets.length == 0 ||
            this._index >= this._tweets.length) {
            this._index = 0;
        } else if (this._index < 0) {
            this._index = (this._tweets.length - 1);
        }
    },

    _mergeTweets: function() {
        if (!this._mentions)
            this._mentions = [];

        if (!this._timeline)
            this._timeline = [];

        this._tweets = this._timeline.concat(this._mentions);

        this._tweets.sort(function(a, b) {
            return b.id - a.id;
        });

        this._adjustIndex();

        $(document).trigger('refreshed');
    },

    _refreshTweetList: function(url, prop) {
        var parameters = {};
        if (this[prop] && this[prop].length > 0) {
            parameters = { 'since_id': this[prop][0].id.toString() };
        }

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
                console.log("TWITTER: wtf! " + xhr.responseText);
                console.log("TWITTER: auth valid for : " + data.screen_name);
                $(document).trigger('auth-valid');
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("TWITTER: fetch error on: " + this.url);
                $(document).trigger('auth-invalid');
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
};

var twitter = new Twitter();
