
var userPattern = /(@)([a-zA-Z0-9_]+)(:?)/g;
var hashPattern = /(\#)([a-zA-Z0-9]+)/g;

var flickrPattern = /http:\/\/flic\.kr\/p\/([a-zA-Z0-9]+)/g;

function TwitterPage() {
    this._init();
}

$.extend(TwitterPage.prototype, Page.prototype, {
    _init: function() {
        Page.prototype._init.call(this);
        this._tag = 'twitter';

        this._tweetStrip = new TweetStrip();

        var me = this;
        window.addEventListener("MoveToPreviousItem", function() {
            if (me._tweetStrip.isVisible())
                return;
                
            twitter.previousTweet();
            if (me.isOnScreen()) {
                me._updateView();
            }
        }, false);

        window.addEventListener("MoveToNextItem", function() {
            if (me._tweetStrip.isVisible())
                return;
            
            twitter.nextTweet();
            if (me.isOnScreen()) {
                me._updateView();
            }
        }, false);
        
        window.addEventListener("GoButtonPressed", function() {
            if (me._active) {
                me._toggleTweetStrip();
            }
        }, false);

        $(document).bind('refreshed', function() {
            me._updateItemCount();
        });

        $("#status").change(function() {
            me._onStatusChanged();
        });
        
        $("#status").keyup(function() {
            me._onStatusChanged();
        });

        $("#status-update-button").click(function() {
            me._postTweet();
        });
    },
        
    _toggleTweetStrip: function() {
        if (this._tweetStrip.isVisible()) {
            this._tweetStrip.hide();
            this._updateView();
        } else {
            this._tweetStrip.show();
        }
    },
    
    _onStatusChanged: function() {
        this._updateCharCount();
        this._updateStatusHeader();
        this._shortenUrls();
    },

    setView: function(view, detail) {
        Page.prototype.setView.call(this, view, detail);

        if (this._view != OpenChannel.View.CHANNEL) {
            this._tweetStrip.hide();
        }
        
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

    _setPostStatus: function(text) {
        if (!text || text.length == 0) {
            $("#post-status").stop().animate({ 'opacity': '0.0' }, 'slow');
            return;
        }
        
        $("#post-status").html(text);
        $("#post-status").stop().animate({ 'opacity': '1.0' }, 'slow');
    },

    _postTweet: function() {
        var text = $("#status").val();
        if (text.length == 0)
            return;
            
        if (this._replyTweet && text.indexOf("@" + this._replyTweet.user.screen_name) != 0) {
            delete this._replyTweet;
        }

        this._setPostStatus("Updating your status...");

        var me = this;
        twitter.updateStatus({
            status: text,
            replyTo: me._replyTweet,

            success: function(data) {
                me._setPostStatus("");
                $("#status").val("").change();
            },

            error: function(xhr) {
                console.log("TWITTER: failed to tweet: " + xhr.status);
                me._setPostStatus("Unable to post your tweet!");
            },

        });

    },

    _fadeInCurrentTweet: function() {
        var tweet = twitter.getCurrentTweet();
        if (!tweet)
           return;

        var box = $(this._viewElement).find('.tweetbox');

        renderTweet({
           box: box,
           tweet: tweet,
           showPhotos: (this._view == OpenChannel.View.CHANNEL),
           linkify: (this._view == OpenChannel.View.FOCUS)
        });

        $(box).find(".autofontsize").autoFontSize();

        box.children().hide();
        box.children().fadeIn();
    },
    
    _popup: function(target, content) {
        var offset = $(target).offset();
        
        var popup = document.createElement('div');
        $(popup).addClass('popup');
        $(popup).css({
            left: offset.left,
            top: offset.top - $(target).height() - 6,
        });
        
        $(popup).append(content);        
        $(document.body).append(popup);
        return popup;
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
            
            renderTweet({
                box: box,
                tweet: tweet,
                linkify: true,
                showAvatars: true,
                showControls: true,
                showPhotos: true,
            });
            
            $(box).find(".reply-button").click(function(e) {
                e.preventDefault();
                $("#status").val("@" + tweet.user.screen_name + " " + $("#status").val()).change().focus();
                
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
            
            $(box).find("a").hover(function() {
                var longUrl = shorturls.getExpandedUrl(this.href);
                if (longUrl) {
                    this._popupElement = me._popup(this, longUrl);
                }
            }, function() {
                if (this._popupElement) {
                    $(this._popupElement).remove();
                    delete this._popupElement;
                }
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
    
    _updateStatusHeader: function() {
        var text = $("#status").val();
        
        var parts = /^@([a-zA-Z0-9]+)(:?)/.exec(text);
        var matches = text.match(userPattern);
        if (parts && parts.length > 1) {
            $("#status-header-message").text("Reply to " + parts[1]);
        } else {
            $("#status-header-message").text("What's happening?");
        }
    },

    _updateCharCount: function() {
        var charCount = twitter.MAX_CHARS - parseInt($("#status").val().length);
        if (charCount < 20) {
            $("#status-charcount").addClass("warning");
        } else {
            $("#status-charcount").removeClass("warning");
        }

        $("#status-charcount").html(charCount);
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
                    $("#status").val(text).change();
                }
            });
        }
    },

    _updateView: function() {
        $(this._viewElement).width(this._width);
        $(this._viewElement).height(this._height);

        if (this._view == OpenChannel.View.CARD ||
            this._view == OpenChannel.View.CHANNEL) {
                

            var box = $(this._viewElement).find('.tweetbox');
            
            box.children().stop();
            if (box.children().size() == 0) {
                this._fadeInCurrentTweet();
                return;
            }

            var me = this;
            box.children().fadeOut('slow', function() {
                me._fadeInCurrentTweet();
            });
        } else {
            this._updateCharCount();
            this._updateTweetList();
        }
    },
});
