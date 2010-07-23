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
                                 $("#password").val(),
                                 function(success, xhr) {
                                     if (success)
                                        return;

                                     if (xhr.status == 401) {
                                         $("#signin-error").text("Wrong username or password");
                                     } else {
                                         $("#signin-error").text("Twitter seems to be having a problem");
                                     }
                                 });
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
        
        $(this._viewElement).find('.autofontsize').autoFontSize();      
    }
});