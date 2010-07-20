jQuery.fn.autoFontSize = function() {
    this.each(function(i, element) {        
        if ($(element).innerHeight() == 0) {
            // element has not been shown yet!
            return;
        }
        
        if (!$(element).data('defaultFontSize')) {
            $(element).data('defaultFontSize', $(element).css('font-size'));
        } else {
            // reset to default first
            $(element).css('font-size', $(element).data('defaultFontSize'));
        }

        if ($(element).height() > 500) {
            var fontSize = 125;
        } else {
            var fontSize = 75;
        }

        if ($("#ruler").size() == 0) {
            $(document.body).append("<div id='ruler'></div>");
            $("#ruler").css({
                position: 'absolute',
                top: 0,
                left: 0,
                margin: 0,
                padding: 0,
                visibility: 'hidden',
                height: 'auto'
            });
        }

        $("#ruler").width($(element).innerWidth());
        $("#ruler").html($(element).html());

        var start = new Date().getTime();
        do {
            fontSize = fontSize - 1;
            $("#ruler").css({ fontSize: fontSize });
        } while ($("#ruler").height() > $(element).innerHeight());

        $("#ruler").remove();

        var end = new Date().getTime();

        //console.log("TWITTER: font sizing took: " + (end - start));

        $(element).css({ fontSize: fontSize });
    });
    
    return this;
};

