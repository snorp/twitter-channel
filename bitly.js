const BITLY_LOGIN = "litlbirdie";
const BITLY_API_KEY = "R_e88159067d133e566a117a4cf4555dd5";

const BITLY_SHORTEN_URL = "http://api.bit.ly/v3/shorten";
const BITLY_EXPAND_URL = "http://api.bit.ly/v3/expand";

function Bitly() {
    this._init();
}

Bitly.prototype = {
    
    _init: function() {
        this._shortUrls = {};
        this._longUrls = {};
    },
    
    shorten: function(url, callback) {
        if (url in this._shortUrls) {
            callback(this._shortUrls[url]);
            return;
        }
        
        console.log("shortening: " + url);
        
        var me = this;
        $.ajax({
            method: 'GET',
            url: BITLY_SHORTEN_URL,
            
            data: {
                login: BITLY_LOGIN,
                apiKey: BITLY_API_KEY,
                format: 'json',
                longUrl: url,
            },
            
            dataType: 'json',
            
            success: function(data, textStatus, xhr) {
                var shortUrl = data.data.url;
                me._shortUrls[url] = shortUrl;
                callback(shortUrl);
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("Failed to shorten url: " + xhr.status);
                callback(null);
            },
        })
    },
    
    expand: function(urls) {
        var urlsToExpand = [];
        var foundUrls = [];
        
        for (var i = 0; i < urls.length; i++) {
            var url = urls[i];
            if (!(url in this._longUrls) && url.indexOf('bit.ly') >= 0) {
                urlsToExpand.push(url);
            }
        }
        
        if (urlsToExpand.length == 0) {
            return;
        }
        
        var data = [
            { name: 'login', value: BITLY_LOGIN },
            { name: 'apiKey', value: BITLY_API_KEY },
            { name: 'format', value: 'json' },
        ];

        for (var i = 0; i < urlsToExpand.length; i++) {
            data.push({ name: 'shortUrl', value: urlsToExpand[i] });
        }
            
        var me = this;
        $.ajax({
            method: 'GET',
            url: BITLY_EXPAND_URL,

            data: data,
            dataType: 'json',

            success: function(data, textStatus, xhr) {
                for (var i = 0; i < data.data.expand.length; i++) {
                    var shortUrl = data.data.expand[i].short_url;
                    var longUrl = data.data.expand[i].long_url;
                    
                    console.log("expanded " + shortUrl + " to " + longUrl);
                    me._longUrls[shortUrl] = longUrl;
                    me._shortUrls[longUrl] = shortUrl;
                }
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("Failed to expand urls: " + xhr.status);
            },
        })
    },
    
    getExpandedUrl: function(url) {
        if (url in this._longUrls) {
            return this._longUrls[url];
        } else {
            return null;
        }
    },
}

var bitly = new Bitly();