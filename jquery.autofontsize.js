const _JQUERY_AUTOFONTSIZE_INCREMENT = 3;

jQuery.fn.autoFontSize = function() {
    this.each(function(i, element) {        
        if ($(element).height() == 0) {
            // element has not been shown yet!
            return;
        }
        
        if (!$(element).data('defaultFontSize')) {
            $(element).data('defaultFontSize', $(element).css('font-size'));
        } else {
            // reset to default first
            $(element).css('font-size', $(element).data('defaultFontSize'));
        }
        

        var fontSize = 1;

        var ruler = document.createElement('div');
        $(ruler).css({
            position: 'absolute',
            top: 0,
            left: 0,
            margin: 0,
            padding: 0,
            visibility: 'hidden',
            height: 'auto',
            fontFamily: $(element).css('fontFamily'),
            fontWeight: $(element).css('fontWeight'),
            fontStyle: $(element).css('fontStyle'),
            fontSize: fontSize,
        });
        
        $(document.body).append(ruler);
        
        // set the ruler width and content to that of the target element
        $(ruler).width($(element).width()).html($(element).html());

        //console.time("autofontsize");
                
        while ($(ruler).width() <= $(element).width() && $(ruler).height() < $(element).height()) {
            fontSize = fontSize + _JQUERY_AUTOFONTSIZE_INCREMENT;
            $(ruler).css({ fontSize: fontSize });
        }
        
        // we overshoot, back it off by one step
        fontSize = fontSize - _JQUERY_AUTOFONTSIZE_INCREMENT;
        $(ruler).remove();

        //console.timeEnd("autofontsize");
        
        $(element).css({ fontSize: fontSize });
    });
    
    return this;
};

