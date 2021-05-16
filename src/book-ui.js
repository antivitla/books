(function () {
  function setupBookIndexPanel (bookIndex) {
    document.addEventListener('click', event => {
      if (event.target.closest('.book-index-toggle')) {
        bookIndex.classList.toggle('active');
      } else if (
        event.target.closest('.book-index book-control') ||
        !event.target.closest('.book-index')
      ) {
        bookIndex.classList.remove('active');
      }
      // Do not toggle book running nav header, if we clicked on book index
      if (event.target.closest('book-control')) {
        let runningPanel = document.querySelector('.book-running-panel');
        if (runningPanel) {
          runningPanel.ignoreActivation = true;
          setTimeout(() => {
            delete runningPanel.ignoreActivation;
          }, 500);
        }
      }
    });
  }

  function setupBookRunningPanel (bookRunning, bookScroll) {
    let scrollTop = bookScroll.scrollTop;
    // Show/hide on scroll up/down
    bookScroll.addEventListener('scroll', event => {
      if (bookRunning.ignoreActivation) {
        return;
      }
      if (event.target.scrollTop < 50) {
        bookRunning.classList.remove('active');
        return;
      }
      let delta = bookScroll.scrollTop - scrollTop;
      scrollTop = scrollTop + delta;
      if (delta < -5) {
        bookRunning.classList.add('active');
      } else if (delta > 5) {
        bookRunning.classList.remove('active');
      }
    });
    // Hide on click on nav
    bookRunning.addEventListener('click', event => {
      setTimeout(() => {
        bookRunning.classList.remove('active');
      }, 150);
    });
    // Hide on click outside
    document.addEventListener('click', event => {
      if (bookRunning.ignoreActivation) {
        return;
      }
      if (event.target.closest('.book-scroll')) {
        bookRunning.classList.toggle('active');
      } else if (!event.target.closest('.book-header')) {
        bookRunning.classList.remove('active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const bookIndex = document.querySelector('.book-index-panel');
    if (bookIndex) setupBookIndexPanel(bookIndex);
    const bookRunning = document.querySelector('.book-running-panel');
    const bookScroll = document.querySelector('.book-scroll');
    if (bookRunning && bookScroll) setupBookRunningPanel(bookRunning, bookScroll);
  });
}());
