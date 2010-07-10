
var userPattern = /@([a-zA-Z0-9]+) /g;
var hashPattern = /\#([a-zA-Z0-9]+)/g;
var linkPattern = /https?:\/\/.* /g;

/* base class for other pages */
function Page() {
    this._init();
}

Page.prototype = {

    _init: function(view, active) {
        this._view = null;
        this._active = false;
        this._tag = null;

        var me = this;
        window.addEventListener("ViewChanged", function(event) {
            me._width = event.width;
            me._height = event.height;
            me.setView(event.view);
        }, false);
    },

    _getViewElement: function() {
        if (!this._tag) {
            console.log("You must set a tag!");
            return null;
        }

        if (!this._view) {
            console.log("No view is set");
            return null;
        }

        var id = this._tag + "-" + this._view.toLowerCase();
        if ($("#" + id).size() == 0) {
            // Create a new view element
            $(document.body).append('<div id="' + id + '" class="view-container"></div>');
        }


        return "#" + id;
    },

    setView: function(view) {
        if (this._view) {
            $(this._getViewElement()).hide();
        }

        this._view = view;

        if (this._view) {

            if (this._active) {
                $(this._getViewElement()).show();
            }

            if (this._width)
                $(this._getViewElement()).width(this._width);

            if (this._height)
                $(this._getViewElement()).height(this._height);
        }
    },

    getView: function() {
        return this._view;
    },

    setActive: function(active) {
        if (active && this._view) {
            $(this._getViewElement()).show();
        } else if (!active && this._view) {
            $(this._getViewElement()).hide();
        }

        this._active = active;
    },

    getActive: function() {
        return this._active;
    },
};

function LoginPage() {
    this._init();
}

$.extend(LoginPage.prototype, Page.prototype, {
    _init: function() {
        Page.prototype._init.call(this);
        this._tag = 'login';

        $("#login-link").click(function(e) {
            e.preventDefault();
            twitter.startAuth();
        });

        $("#login_pin_form").submit(function(e) {
            e.preventDefault();
            twitter.completeAuth($("#login_pin").val());
            return false;
        });
    },
});

function TwitterPage() {
    this._init();
}

$.extend(TwitterPage.prototype, Page.prototype, {
    _init: function() {
        Page.prototype._init.call(this);
        this._tag = 'twitter';

        var me = this;
        window.addEventListener("MoveToPreviousItem", function() {
            twitter.previousTweet();
            me._updateView();
        }, false);

        window.addEventListener("MoveToNextItem", function() {
            twitter.nextTweet();
            me._updateView();
        }, false);

        $(document).bind('refreshed', function() {
            me._updateItemCount();
        });
    },

    setView: function(view) {
        Page.prototype.setView.call(this, view);

        if (this._active) {
            this._updateView();
        }
    },

    setActive: function(active) {
        Page.prototype.setActive.call(this, active);

        if (active) {
            this._updateView();
        }

        this._updateItemCount();
    },

    _updateItemCount: function() {
        if (this._active) {
            openchannel.setItemCount(twitter.getTweets().length);
        } else {
            openchannel.setItemCount(0);
        }
    },

    _getTweetbox: function() {
        var view = this._getViewElement();
        if ($(view).find(".tweetbox").size() == 0) {
            var box = document.createElement('div');
            $(box).addClass('tweetbox');
            $(view).append(box);
        }

        return $(view).find(".tweetbox");
    },

    _linkifyScreenName: function(screenName) {
        return '<a href="http://twitter.com/' + screenName + '">' + screenName + '</a>';
    },

    _linkifyUrls: function(text){
        text = text.replace(
            /((https?\:\/\/)|(www\.))(\S+)(\w{2,4})(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/gi,
            function(url){
                var full_url = url;
                if (!full_url.match('^https?:\/\/')) {
                    full_url = 'http://' + full_url;
                }
                return '<a target="_blank" href="' + full_url + '">' + url + '</a>';
            });
        return text;
    },

    _linkifyText: function(text) {
        var html = this._linkifyUrls(text);
        html = html.replace(userPattern, "<a href='http://twitter.com/$1' target='_blank'>@$1</a> ");
        html = html.replace(hashPattern, "<a href='http://twitter.com/search?q=%23$1' target='_blank'>#$1</a>");
        return html;
    },

    _renderTweet: function(tweet) {
        var screenName = tweet.user.screen_name;
        var text = tweet.text;
        if (this._view == OpenChannel.View.FOCUS) {
            text = this._linkifyText(tweet.text);
            screenName = this._linkifyScreenName(screenName);
        }

        var html = '<div class="tweet_text autofontsize"><strong>' + screenName + '</strong> ' +
            text + '</div><div class="tweet_footer autofontsize"><span class="message">' +
            prettyDate(tweet.created_at) + ' via ' + tweet.source + '</span></div>';

        this._getTweetbox().html(html);
    },

    _fadeInCurrentTweet: function() {
        var view = this._getViewElement();

        var tweet = twitter.getCurrentTweet();
        if (!tweet)
           return;

        this._renderTweet(tweet);

        $(view).find(".autofontsize").autoFontSize();

        var box = this._getTweetbox();
        box.children().hide();
        box.children().fadeIn();
    },

    _updateView: function() {
        var view = this._getViewElement();

        $(view).width(this._width);
        $(view).height(this._height);

        var box = $(view).find('.tweetbox');
        if (box.size() == 0) {
            this._fadeInCurrentTweet();
            return;
        }

        var me = this;
        box.children().fadeOut('slow', function() {
            me._fadeInCurrentTweet();
        });
    },
});
