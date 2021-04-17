const { customHtmlPage } = require('./utils');

describe('book-scroll-position', () => {
  function page({
    count = 30,
    size = 10,
    margin = 1000,
    generateNext = false,
    generatePrevious = false
  } = {}) {
    let url = new URL('http://localhost:8887/cypress/integration/book-scroll-control.e2e.html');
    url.searchParams.set('count', count);
    url.searchParams.set('size', size);
    url.searchParams.set('margin', margin);
    url.searchParams.set('generateNext', generateNext);
    url.searchParams.set('generatePrevious', generatePrevious);
    return url.href;
  }

});
