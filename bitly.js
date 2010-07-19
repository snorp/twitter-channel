const BITLY_LOGIN = "snorp";
const BITLY_API_KEY = "R_0c6bfcf1034687b05cec3a4bf3a400ec";

const BITLY_SHORTEN_URL = "http://api.bit.ly/v3/shorten";

function Bitly() {
    this._init();
}

Bitly.prototype = {
    
    _init: function() {
        this._shortUrls = {};
    },
    
    shorten: function(url, callback) {
        console.log("shortening: " + url);
        
        if (url in this._shortUrls) {
            callback(this._shortUrls[url]);
            return;
        }
        
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
                console.log("Got short url: " + data.data.url);
                me._shortUrls[url] = shortUrl;
                callback(shortUrl);
            },

            error: function(xhr, textStatus, errorThrown) {
                console.log("Failed to shorten url: " + xhr.status);
                callback(null);
            },
        })
    },
}

var bitly = new Bitly();