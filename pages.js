
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

    _createTweetbox: function(tweet) {
        var box = document.createElement('div');
        $(box).addClass('tweetbox');

        var html = '<div class="tweet_text autofontsize"><strong>' + tweet.user.screen_name + '</strong> ' +
            tweet.text + '</div><div class="tweet_footer autofontsize"><span class="message">' +
            prettyDate(tweet.created_at) + ' via ' + tweet.source + '</span></div>';

        $(box).html(html);

        return box;
    },

    _fadeInCurrentTweet: function() {
        var view = this._getViewElement();

        var tweet = twitter.getCurrentTweet();
        if (!tweet)
           return;

        var box = this._createTweetbox(tweet);
        $(view).append(box);
        $(box).find(".autofontsize").autoFontSize();
        $(box).hide();
        $(box).fadeIn();
    },

    _updateView: function() {
        var view = this._getViewElement();

        $(view).width(this._width);
        $(view).height(this._height);

        var oldbox = $(view).find('.tweetbox');
        if (oldbox.size() == 0) {
            this._fadeInCurrentTweet();
            return;
        }

        var me = this;
        oldbox.fadeOut('slow', function() {
            oldbox.remove();
            me._fadeInCurrentTweet();
        });
    },
});
