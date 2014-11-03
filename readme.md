## [View the Trained to Thrill demo](https://jakearchibald.github.io/trained-to-thrill/)

##Instructions:

1. Open Chrome Canary
1. Click the above link
1. Check the console for `◕‿◕` to confirm a service worker was registered
1. Refresh the page - you're now running offline-first!
1. Turn off your network connection via wifi or Chrome DevTools [Device Mode](https://developer.chrome.com/devtools/docs/device-mode#network-conditions)
1. Reload the page! OMG STILL WORKS!!!1
1. Read the [service worker source js](https://github.com/jakearchibald/trained-to-thrill/blob/master/www/static/js-unmin/sw/index.js)

## Hack on the code

### Prerequisites

* [Node](http://nodejs.org/)
* [Ruby](https://www.ruby-lang.org/en/) - required for…
* [Sass](http://sass-lang.com/) `gem install sass` (>=3.3 required)

Then clone this repo & run:

```sh
npm install
```

### Running

```sh
npm start
```

The server will be running at
[http://localhost:3000/trained-to-thrill/](http://localhost:3000/trained-to-thrill/
)