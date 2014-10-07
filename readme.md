## [View the Trained to Thrill demo](https://jakearchibald.github.io/trained-to-thrill/)

##Instructions:

1. Make sure you've enabled experimental web platform features in Chrome
1. Click the above link
1. Check the console for `◕‿◕` to confirm a service worker was registered
1. Turn off your network connection via wifi or Chrome DevTools [Device Mode](https://developer.chrome.com/devtools/docs/device-mode#network-conditions)
1. Reload the page! OMG
1. Try other stuff.
1. Read the [service worker source js](https://github.com/jakearchibald/trained-to-thrill/blob/master/www/static/js-unmin/sw/index.js)

## Hack on the code

### Prerequisites

First, install [node](http://nodejs.org). Then do this:

    $ sudo apt-get install ruby     # or whatever your platform does
    $ sudo gem install sass         # or however your platform does ruby gems
    $ npm install gulp gulp-install
    $ node
    > var gulp = require('gulp');
    > var install = require('gulp-install');
    > gulp.src(['./package.json']).pipe(install());

### Running

    $ gulp

The server will be running at
[http://localhost:3000/trained-to-thrill/](http://localhost:3000/trained-to-thrill/
)

## Testing

### Additional Prerequisites

    $ sudo apt-get install python-pip  # or whatever your platform does
    $ sudo pip install -U seleniu

Download the latest release of [Chrome
Driver](http://chromedriver.storage.googleapis.com/index.html) and put
it somewhere on your PATH.
