
var userPattern = /(@)([a-zA-Z0-9]+)(:? )/g;
var hashPattern = /(\#)([a-zA-Z0-9]+)/g;

var flickrPattern = /http:\/\/flic\.kr\/p\/([a-zA-Z0-9]+)/g;

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
            me.setView(event.view, event.details);
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

    setView: function(view, detail) {
        if (this._view) {
            $(this._getViewElement()).hide();
        }

        this._view = view;
        this._viewDetail = detail;

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

    isOnScreen: function() {
        return this._active && this._viewDetail != OpenChannel.ViewDetail.OFFSCREEN;
    },
};

function SigninPage() {
    this._init();
}

$.extend(SigninPage.prototype, Page.prototype, {
    _init: function() {
        Page.prototype._init.call(this);
        this._tag = 'signin';

        $("#signin_form").submit(function(e) {
            e.preventDefault();
            twitter.completeAuth($("#username").val(),
                                 $("#password").val());
            return false;
        });
        
        $(document).bind('auth-invalid', function() {
            if ($("#username").val() != "") {
                $("#signin-error").text("Wrong username or password");
                $("#signin-error").show();
            }
        });
        
        $(document).bind('auth-valid', function() {
            $("#signin-error").hide();
        });
    },
    
    setView: function(view, detail) {
        Page.prototype.setView.call(this, view, detail);
        
        $(this._getViewElement()).autoFontSize();
    }
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
            if (me.isOnScreen()) {
                me._updateView();
            }
        }, false);

        window.addEventListener("MoveToNextItem", function() {
            twitter.nextTweet();
            if (me.isOnScreen()) {
                me._updateView();
            }
        }, false);

        $(document).bind('refreshed', function() {
            me._updateItemCount();
        });

        $("#status").keyup(function() {
            me._updateCharCount();
            me._shortenUrls();
        });

        $("#status-update-button").click(function() {
            me._postTweet();
        });
    },

    setView: function(view, detail) {
        Page.prototype.setView.call(this, view, detail);

        if (this.isOnScreen()) {
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

    _setPostStatus: function(text) {
        $("#post-status").html(text);
        $("#post-status").autoFontSize();
    },

    _postTweet: function() {
        var text = $("#status").val();
        if (text.length == 0)
            return;
            
        if (this._replyTweet && text.indexOf("@" + this._replyTweet.user.screen_name) != 0) {
            delete this._replyTweet;
        }

        this._setPostStatus("Sending your tweet...");

        var me = this;
        twitter.updateStatus({
            status: text,
            replyTo: me._replyTweet,

            success: function(data) {
                me._setPostStatus("");
                $("#status").val("");
            },

            error: function(xhr) {
                console.log("TWITTER: failed to tweet: " + xhr.status);
                me._setPostStatus("Unable to post your tweet!");
            },

        });

    },

    _linkifyScreenName: function(screenName) {
        return '<a target="_blank" href="http://twitter.com/' + screenName + '">' + screenName + '</a>';
    },

    _linkifyUrls: function(text){
        var urls = findUrls(text);
        for (var i = 0; i < urls.length; i++) {
            var url = urls[i];
            
            text = text.replace(urls[i], '<a target="_blank" href="' + url + '">' + url + '</a>');
        }

        return text;
    },

    _linkifyText: function(text) {
        var html = this._linkifyUrls(text);
        html = html.replace(userPattern, "$1<a href='http://twitter.com/$2' target='_blank'>$2</a>$3");
        html = html.replace(hashPattern, "$1<a href='http://twitter.com/search?q=%23$2' target='_blank'>$2</a>");
        return html;
    },

    _renderTweet: function(args) {
        
        var parentScreenName = null;
        var tweet = args.tweet;

        if (tweet.retweeted_status) {
            tweet = tweet.retweeted_status;
            parentScreenName = args.tweet.user.screen_name;
        }

        var screenName = tweet.user.screen_name;
        var text = tweet.text;

        if (args.linkify) {
            text = this._linkifyText(text);
            screenName = this._linkifyScreenName(screenName);
            
            if (parentScreenName) {
                parentScreenName = this._linkifyScreenName(parentScreenName);
            }
        }

        var t = $.template('\
            <div class="tweet-body"> \
                <div class="tweet-text autofontsize"> \
                    <strong>${screenName}</strong> ${text} \
                    <div class="tweet-photos"></div> \
                </div> \
                <div class="tweet-footer autofontsize"> \
                    <span class="message">${createdAt} via ${source} \
                        <a class="tweet-reply" href="${replyUrl}"> \
                            in reply to ${replyUser}</a> \
                    </span> \
                    <span class="retweet-message">(retweeted by ${retweetedBy})</span> \
                    <span class="tweet-controls"> \
                        <a class="reply-button" href="#">reply</a> \
                        <a class="retweet-button" href="#">retweet</a> \
                    </span> \
                </div> \
            </div>');

        $(args.box).html(t, {
            screenName: screenName,
            text: text,
            createdAt: prettyDate(tweet.created_at),
            source: tweet.source,
            replyUrl: "http://twitter.com/" + tweet.in_reply_to_screen_name +
                "/status/" + tweet.in_reply_to_status_id,
            replyUser: tweet.in_reply_to_screen_name,
            retweetedBy: parentScreenName ? parentScreenName : "",
        });
        
        if (parentScreenName) {
            $(args.box).find('.retweet-message').show();
        } else {
            $(args.box).find('.retweet-message').hide();
        }

        if (!tweet.in_reply_to_screen_name) {
            $(args.box).find(".tweet-reply").hide();
        }

        if (args.showAvatars) {
            t = $.template('<div class="tweet-avatar"><img src="${url}"></img></div>');
            $(args.box).prepend(t, {
                url: tweet.user.profile_image_url
            });
            
            $(args.box).find('.tweet-body').css('marginLeft', '62px');
        }
        
        var me = this;
        if (args.showPhotos) {
            var matches = tweet.text.match(flickrPattern);
            if (matches && matches.length > 0) {
                for (var i = 0; i < matches.length; i++) {
                    var match = flickrPattern.exec(matches[i]);
                
                    flickr.getSizes(base58_decode(match[1]), function(data) {
                        var size = data.sizes.size[0];
                        if (me._view == OpenChannel.View.CHANNEL) {
                            size = data.sizes.size[2];
                        }
                    
                        $(args.box).find('.tweet-photos').append('<a target="_blank" href="' + match[0] + '"><img src="' + size.source + '"></img></a>');
                    });
                }
            }
        }
    },

    _fadeInCurrentTweet: function() {
        var view = this._getViewElement();

        var tweet = twitter.getCurrentTweet();
        if (!tweet)
           return;

        var box = this._getTweetbox();

        this._renderTweet({
           box: box,
           tweet: tweet,
           showPhotos: (this._view == OpenChannel.View.CHANNEL),
           linkify: (this._view == OpenChannel.View.FOCUS)
        });

        $(box).find(".autofontsize").autoFontSize();

        box.children().hide();
        box.children().fadeIn();
    },

    _updateTweetList: function() {
        $("#twitter-focus-tweetlist").html("");

        var me = this;
        $.each(twitter.getTweets(), function(i, tweet) {
            var box = document.createElement('div');
            $(box).addClass('tweetlist-item');
            $(box).attr('id', 'tweetlist-item-' + tweet.id);
            $(box).hover(function() {
                $(box).find('.tweet-controls').addClass('active');
                twitter.seekTweet(tweet);
            }, function() {
                $(box).find('.tweet-controls').removeClass('active');
            });
            
            me._renderTweet({
                box: box,
                tweet: tweet,
                linkify: true,
                showAvatars: true,
                showControls: true,
                showPhotos: true,
            });
            
            $(box).find(".reply-button").click(function(e) {
                e.preventDefault();
                $("#status").val("@" + tweet.user.screen_name + " " + $("#status").val());
                $("#status").focus();
                
                var screenNameLen = tweet.user.screen_name.length + 2;
                $("#status").get(0).setSelectionRange(screenNameLen, screenNameLen);
                
                me._replyTweet = tweet;
            });
            
            $(box).find(".retweet-button").click(function(e) {
                e.preventDefault();
                twitter.retweet({
                    tweet: tweet,
                    
                    success: function(newtweet) {
                    },
                    
                    error: function() {
                        me._setPostStatus("Failed to retweet, try again in a moment.");
                    }
                });
            });

            $("#twitter-focus-tweetlist").append(box);
        });

        var current = twitter.getCurrentTweet();
        if (current) {
            var position = $("#tweetlist-item-" + current.id).position().top;
            var offset = $("#twitter-focus-tweetlist").position().top;
            $("#twitter-focus-tweetlist").scrollTop(position - offset);
        }

        $("#twitter-focus-tweetlist").find("a").attr('target', '_blank');
    },

    _updateCharCount: function() {
        var charCount = twitter.MAX_CHARS - parseInt($("#status").val().length);
        if (charCount < 20) {
            $("#charcount").addClass("warning");
        } else {
            $("#charcount").removeClass("warning");
        }

        $("#charcount").html(charCount);
    },
    
    _shortenUrls: function() {
        var urls = findUrls($("#status").val());
        
        for (var i = 0; i < urls.length; i++) {
            var url = urls[i];
                        
            // ugh
            if (url.indexOf("bit.ly") >= 0 || url.length < 25)
                continue;

            bitly.shorten(url, function(shortUrl) {
                if (shortUrl) {
                    var text = $("#status").val();
                    text = text.replace(url, shortUrl);
                    $("#status").val(text);
                }
            });
        }
    },

    _updateView: function() {
        var view = this._getViewElement();

        $(view).width(this._width);
        $(view).height(this._height);

        if (this._view == OpenChannel.View.CARD ||
            this._view == OpenChannel.View.CHANNEL) {

            var box = $(view).find('.tweetbox');
            if (box.size() == 0) {
                this._fadeInCurrentTweet();
                return;
            }

            var me = this;
            box.children().fadeOut('slow', function() {
                if (view == me._getViewElement()) {
                    me._fadeInCurrentTweet();
                }
            });
        } else {
            this._updateCharCount();
            this._updateTweetList();
        }
    },
});
