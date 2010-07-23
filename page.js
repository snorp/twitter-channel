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
    
    _log: function(message) {
        console.log(this._tag + ": " + message);
    },

    _ensureViewElement: function() {
        this._viewElement = null;
        
        if (!this._tag) {
            console.log("You must set a tag!");
            return;
        }

        if (!this._view) {
            console.log("No view is set");
            return;
        }

        var id = this._tag + "-" + this._view.toLowerCase();
        if ($("#" + id).size() == 0) {
            // Create a new view element
            $(document.body).append('<div id="' + id + '" class="view-container"></div>');
        }

        this._viewElement = $("#" + id).get(0);
    },

    setView: function(view, detail) {
        if (this._viewElement) {
            $(this._viewElement).hide();
        }

        this._view = view;
        this._viewDetail = detail;

        if (this._view) {
            this._ensureViewElement();

            if (this._active) {
                $(this._viewElement).show();
            }

            if (this._width)
                $(this._viewElement).width(this._width);

            if (this._height)
                $(this._viewElement).height(this._height);
        }
    },

    getView: function() {
        return this._view;
    },

    setActive: function(active) {
        if (active && this._view) {
            $(this._viewElement).show();
        } else if (!active && this._view) {
            $(this._viewElement).hide();
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