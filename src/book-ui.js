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
    });
  }

  function setupBookHeaderPanel (bookHeader, bookScroll) {
    let scrollTop = bookScroll.scrollTop;
    // Show/hide on scroll up/down
    bookScroll.addEventListener('scroll', event => {
      if (event.target.scrollTop < 50) {
        bookHeader.classList.remove('active');
        return;
      }
      let delta = bookScroll.scrollTop - scrollTop;
      scrollTop = scrollTop + delta;
      if (delta < -5) {
        bookHeader.classList.add('active');
      } else if (delta > 5) {
        bookHeader.classList.remove('active');
      }
    });
    // Hide on click on nav
    bookHeader.addEventListener('click', event => {
      setTimeout(() => {
        bookHeader.classList.remove('active');
      }, 150);
    });
    // Hide on click outside
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
