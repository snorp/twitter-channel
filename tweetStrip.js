
function TweetStrip() {
    this._init();
}

TweetStrip.prototype = {
    
    _init: function() {
        this._visible = false;
        
        this._box = "#tweetstrip";
        
        var me = this;
        $(document).bind('refreshed', function() {
            me._refreshItems();
        });
        
        /*
        $(document).bind('current-tweet-changed', function() {
            me._updatePosition();
        });
        */
        
        window.addEventListener('WheelNextItem', function() {
            twitter.nextTweet();
            me._updatePosition();
        }, false);
        
        window.addEventListener('WheelPreviousItem', function() {
            twitter.previousTweet();
            me._updatePosition();
        }, false);
    },
    
    isVisible: function() {
        return this._visible;
    },
    
    show: function() {
        console.log("showing tweetstrip");
        this._visible = true;
        $(this._box).stop().animate({
            opacity: 1.0,
        });
        
        this._updatePosition();
        openchannel.enableWheel();
    },
    
    hide: function() {
        console.log("hiding tweetstrip");
        this._visible = false;
        $(this._box).stop().animate({
            opacity: 0.0,
        });
        
        openchannel.disableWheel();
    },
    
    _refreshItems: function() {
        $(this._box).children().remove();
        
        var tweets = twitter.getTweets();
        var boxWidth = 0;
        for (var i = 0; i < tweets.length; i++) {
            var itemBox = document.createElement('div');
            $(itemBox).attr('id', 'tweetstrip-item-' + tweets[i].id);
            $(itemBox).addClass('tweetstrip-item');
            $(this._box).append(itemBox);
            
            $(itemBox).css({
                left: i * $(itemBox).outerWidth(true),
            });
            
            boxWidth = $(itemBox).offset().left + $(itemBox).outerWidth(true);
            
            renderTweet({
               box: itemBox,
               tweet: tweets[i],
            });
        }
        
        $(this._box).width(boxWidth);
        $(this._box).find('.autofontsize').autoFontSize();
    },
    
    _updatePosition: function() {
        $(this._box).find('.selected').removeClass('selected');
        var selected = $(this._box).find('#tweetstrip-item-' + twitter.getCurrentTweet().id);
        selected.addClass('selected');

        var boxOffset = -$(this._box).offset().left;
        var visibleWidth = $(window).width();
        
        var itemOffset = selected.offset().left;
        var itemWidth = selected.outerWidth(true);
        
        console.log("visible width: " + visibleWidth);
        console.log("item position: " + itemOffset);
        
        if ((itemOffset + itemWidth) > visibleWidth) {
            boxOffset += (itemOffset +itemWidth - visibleWidth);
        } else if (itemOffset < 0) {
            boxOffset += itemOffset - parseInt($(selected).css('padding-left').replace('px', ''));
        }
        
        /*
        if ((boxOffset + visibleWidth) < itemOffset) {
            boxOffset = itemOffset;
        } else if ((boxOffset + visibleWidth) > itemOffset) {
            boxOffset = itemOffset - visibleWidth + itemWidth;
        }
        */
  
        console.log("Moving box to: " + boxOffset);
        
        $(this._box).stop().animate({
            opacity: 1.0,
            left: -boxOffset
        });
    },
}