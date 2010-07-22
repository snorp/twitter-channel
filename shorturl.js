const SHORTURL_EXPANDER_URL = 'http://litl-birdie.appspot.com/expand_shorturl';
const SHORTURL_PROVIDERS = ['http://bit.ly', 'http://is.gd', 'http://tinyurl.com'];

function ShortUrlExpander() {
    this._init();
}

ShortUrlExpander.prototype = {
    _init: function() {
        this._expandedUrls = {};
    },
    
    isShort: function(url) {
        for (var i = 0; i < SHORTURL_PROVIDERS.length; i++) {
            if (url.indexOf(SHORTURL_PROVIDERS[i]) == 0) {
                return true;
            }
        }
        
        return false;
    },
    
    fetch: function(urls) {
        for (var i = 0; i < urls.length; i++) {
            if (this.isShort(urls[i]))
                this.fetchOne(urls[i]);
        }
    },
    
    fetchOne: function(url, callback) {
        if (this.getExpandedUrl(url)) {
            callback(this.getExpandedUrl(url));
            return;
        }
        
        var me = this;
        $.ajax({
            method: 'GET',
            url: SHORTURL_EXPANDER_URL,

            data: {
                shortUrl: url
            },

            dataType: 'text',

            success: function(data) {
                me._expandedUrls[url] = data;
                if (callback)
                    callback(data);
            },

            error: function(data) {
                if (callback)
                    callback(null);
            }
        });  
    },
 
    getExpandedUrl: function(url) {
        return this._expandedUrls[url];
    },
}

var shorturls = new ShortUrlExpander();