(function () {
  function setupBookIndexPanel (bookIndex) {
    document.addEventListener('click', event => {
      if (event.target.closest('.book-index-toggle')) {
        bookIndex.classList.toggle('active');
      } else if (
        event.target.closest('.book-index book-scroll-control') ||
        !event.target.closest('.book-index')
      ) {
        bookIndex.classList.remove('active');
      }
    });
  }

  var bookHeader = {
    activateTimeout: 300
  };

  function setupBookHeaderPanel (bookHeader, bookScroll) {
    let scrollTop = bookScroll.scrollTop;
    bookScroll.addEventListener('scroll', event => {
      if (event.target.scrollTop < 50) {
        bookHeader.classList.remove('active');
        return;
      }
      let delta = bookScroll.scrollTop - scrollTop;
      scrollTop = scrollTop + delta;
      if (delta < 0) {
        clearTimeout(bookHeader.activateTimeoutId);
        bookHeader.activateTimeoutId = setTimeout(() => {
          bookHeader.classList.add('active');
        }, bookHeader.activateTimeout)
      } else if (delta > 0){
        bookHeader.classList.remove('active');
      }
    });
    bookHeader.addEventListener('click', event => {
      setTimeout(() => {
        bookHeader.classList.remove('active');
      }, 150);
    });
    document.addEventListener('click', event => {
      if (event.target.closest('.book-scroll')) {
        bookHeader.classList.toggle('active');
      } else if (!event.target.closest('.book-header')) {
        bookHeader.classList.remove('active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const bookIndex = document.querySelector('.book-index');
    if (bookIndex) setupBookIndexPanel(bookIndex);

    const bookHeader = document.querySelector('.book-header');
    const bookScroll = document.querySelector('.book-scroll');
    if (bookHeader && bookScroll) setupBookHeaderPanel(bookHeader, bookScroll);
  });
}());
