// Copyright 2010 litl, LLC. All Rights Reserved.

if (typeof(OpenChannel) == 'undefined') {
    var OpenChannel = {};
    
    OpenChannel.View = {
        CARD: 'CARD',
        FOCUS: 'FOCUS',
        CHANNEL: 'CHANNEL'
    };

    OpenChannel.ViewDetail = {
        OFFSCREEN: 'OFFSCREEN',
        NORMAL: 'NORMAL',
        SELECTOR: 'SELECTOR',
        SCREENSAVER: 'SCREENSAVER'
    };
}

function SimulatedOpenChannel() {
    this._init();
}

SimulatedOpenChannel.prototype = {
    _init: function() {
        console.log("initting OpenChannel");
        
        this._itemCount = 0;
        this._loadProperties();

        var me = this;
        setTimeout(function() {
            for (var prop in me._props) {
                me._dispatchEvent(window, "PropertyChanged", {
                    name: prop,
                    value: me._props[prop]
                });
            }

            me._dispatchEvent(window, "Initialized", {});
            me.setView(OpenChannel.View.CHANNEL);
        }, 1000);

        setInterval(function() {
            me._moveNext();
        }, 5000);

        $(document).keydown(function(event) {
            switch (event.which) {
                case 36:
                    me.setView(OpenChannel.View.FOCUS);
                    break;
                case 35:
                    me.setView(OpenChannel.View.CHANNEL);
                    break;
                case 27:
                    me.setView(OpenChannel.View.CARD);
                    break;
            }
        });
    },
    
    _getOrCreateBorder: function(id) {
        var border = $("#" + id);
        if (border.length > 0)
            return border;
        
        var element = document.createElement('div');
        $(document.body).append(element);
        
        border = $(element);
        border.attr({ 'id': id });
        border.css({ 'position': 'absolute',
                     'top': '0',
                     'right': '0',
                     'left': '0',
                     'bottom': '0',
                     'z-order': '10',
                     'opacity': '0.5',
                     'backgroundColor': 'yellow' });
        return border;
    },

    _resizeBorders: function(width, height) {
        var right = this._getOrCreateBorder('openchannel-border-right');
        var bottom = this._getOrCreateBorder('openchannel-border-bottom');
        
        right.css({ 'left': width });
        bottom.css({ 'top': height,
                     'width': width });
    },

    // only for chrome extension
    setView: function(view) {
        var width = view == OpenChannel.View.CARD ? 284 : 1280;
        var height = view == OpenChannel.View.CARD ? 178 : 730;
        
        this._resizeBorders(width, height);

        this._view = view;
        this._dispatchEvent(window, "ViewChanged", {
            view: view,
            details: "NORMAL",
            width: width,
            height: height
        });
    },

    _moveNext: function() {
        if (this._itemCount == 0 || this._view == OpenChannel.View.FOCUS)
            return;

        this._dispatchEvent(window, "MoveToNextItem", {});
    },

    _loadProperties: function() {
        var jsonData = localStorage.getItem("properties");
        if (jsonData) {
            this._props = JSON.parse(jsonData);
        } else {
            this._props = {};
        }
    },

    _saveProperties: function() {
        localStorage.setItem("properties", JSON.stringify(this._props));
    },

    _dispatchEvent: function(elt, eventName, data) {
        data = data || {};
        var evt = document.createEvent("Event");
        evt.initEvent(eventName, true, false);
        for (var key in data) {
            evt[key] = data[key];
        }
        elt.dispatchEvent(evt);
    },

    VIDEO_PLAYING: "PLAYING",
    VIDEO_PAUSED: "PAUSED",

    hello: function(args) {

    },

    openUrl: function(url) {
        window.open(url);
    },

    setTitle: function(title) {
        document.title = title;
    },

    setItemCount: function(count) {
        this._itemCount = count;
    },

    setFaviconUrl: function(url) {
        var link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = url;
        document.getElementsByTagName('head')[0].appendChild(link);
    },

    setProperties: function(props) {
        for (var prop in props) {
            this._props[prop] = props[prop];
        }

        this._saveProperties();
    },

    setVideoStatus: function(showingVideo, videoStatus) {

    },

    enableScreensaver: function() {

    },

    disableScreensaver: function() {

    },

    enableWheel: function() {

    },

    disableWheel: function() {

    },

    openOptions: function() {

    },

    closeOptions: function() {

    },

    fetchRandomMedia: function(desiredMedia, desiredCount) {
    }
};

if (typeof(openchannel) == 'undefined' ||
    window.location.href.indexOf('chrome-extension://') == 0) {
    var openchannel = new SimulatedOpenChannel();
}