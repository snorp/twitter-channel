var state = {
    width: 0,
    height: 0,
    view: null,
};

const CHANNEL_NAME = "twitter";
const CHANNEL_VERSION = "0.1";
const CHANNEL_ENGINE_GUID = "litl_twitter";
const CHANNEL_TITLE = "Twitter";
const CHANNEL_FAVICON = "http://twitter.com/favicon.ico";

var pages = {};
var activePage = null;

function activatePage(page) {
    if (activePage) {
        activePage.setActive(false);
    }

    activePage = page;

    if (activePage) {
        activePage.setActive(true);
    }
}

$(document).ready(function() {
    pages.login = new LoginPage();
    pages.twitter = new TwitterPage();

    $(document).bind('auth-started', function() {
        console.log("TWITTER: auth was started");
    });

    $(document).bind('auth-completed', function() {
        console.log("TWITTER: auth completed");
        twitter.verifyCredentials();
        twitter.checkRateLimit();
    });

    $(document).bind('auth-invalid', function() {
        console.log("TWITTER: auth is not valid!");
        twitter.clearAuth();
        activatePage(pages.login);
    });

    $(document).bind('auth-valid', function() {
        console.log("TWITTER: auth is now valid");
        twitter.refresh();
    });

    $(document).bind('refreshed', function() {
        console.log("TWITTER: refresh complete");
        activatePage(pages.twitter);
    });

    openchannel.hello({
        name: CHANNEL_NAME,
        version: CHANNEL_VERSION,
        hasOptions: "false",
        channelEngineGuid: CHANNEL_ENGINE_GUID });

    openchannel.setTitle(CHANNEL_TITLE);
    openchannel.setFaviconUrl(CHANNEL_FAVICON);

    if (twitter.isAuthenticated()) {
        twitter.verifyCredentials();
    } else {
        activatePage(pages.login);
    }
});

