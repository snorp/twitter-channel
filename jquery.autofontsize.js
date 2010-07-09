jQuery.fn.autoFontSize = function() {
    console.log("SNORP: autofontsizing " + this.size());
    this.each(function(i, element) {
        if ($(element).innerHeight() == 0) {
            // element has not been shown yet!
            return;
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

        $(document.body).remove("#ruler");

        var end = new Date().getTime();

        console.log("SNORP: font sizing took: " + (end - start));

        $(element).css({ fontSize: fontSize });
    });
};

