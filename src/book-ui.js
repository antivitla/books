(function () {
  function setupBookIndexPanel () {
    const bookIndex = document.querySelector('.book-index');
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

  function setupBookHeaderPanel () {
    const bookHeader = document.querySelector('.book-header');
    const bookScroll = document.querySelector('.book-scroll');
    let scrollTop = bookScroll.scrollTop;
    bookScroll.addEventListener('scroll', event => {
      let delta = bookScroll.scrollTop - scrollTop;
      scrollTop = scrollTop + delta;
      if (delta < 0) {
        bookHeader.classList.add('active');
      } else if (delta > 0){
        bookHeader.classList.remove('active');
      }
    });
    bookHeader.addEventListener('click', event => {
      setTimeout(() => {
        bookHeader.classList.remove('active');
      }, 150);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupBookIndexPanel();
    setupBookHeaderPanel();
  })
}());
