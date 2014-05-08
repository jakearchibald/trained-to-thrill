(function() {
  var photosEl = document.querySelector('.photos');
  var refreshButton = document.querySelector('button.refresh');
  var errorEl = document.querySelector('.error-container');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/trained-to-thrill/static/js/sw.js', {
      scope: '/trained-to-thrill/*'
    });
  }

  function showSpinner(data) {
    refreshButton.classList.add('loading');
  }

  function hideSpinner(data) {
    refreshButton.classList.remove('loading');
  }

  function updatePage(data) {
    photosEl.innerHTML = photosTemplate(data);
  }

  function networkFetch() {
    return flickr.search('rail', {
      headers: {}
    });
  }

  function cachedFetch() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.active) {
      return flickr.search('rail', {
        headers: {'x-use-cache': 'true'}
      });
    }
    else {
      return Promise.reject(Error("No active serviceWorker"));
    }
  }

  function showConnectionError() {
    errorEl.style.display = 'block';
    errorEl.offsetWidth;
    errorEl.classList.add('show');
    setTimeout(function() {
      errorEl.classList.remove('show');
    }, 5000);
  }

  // Refresh button
  refreshButton.addEventListener('click', function(event) {
    this.blur();
    event.preventDefault();
    showSpinner();
    networkFetch().then(updatePage).catch(showConnectionError).then(hideSpinner);
  });

  // Initial load
  var networkWon = false;

  var networkFetchPromise = networkFetch().then(updatePage).then(function() {
    networkWon = true;
  });

  var cachedFetchPromise = cachedFetch().then(function(data) {
    if (!networkWon) {
      updatePage(data);
    }
  });

  networkFetchPromise.catch(function() {
    return cachedFetchPromise;
  }).catch(showConnectionError).then(hideSpinner);

  // Add classes to fade-in images
  document.addEventListener('load', function(event) {
    if (event.target.classList.contains('main-photo-img')) {
      event.target.parentNode.classList.add('loaded');
    }
  }, true);
}());