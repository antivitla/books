const { customHtmlPage } = require('./utils');

describe('book-scroll-position', () => {
  function page({
    count = 30,
    size = 10,
    margin = 1000,
    generateNext = false,
    generatePrevious = false
  } = {}) {
    let url = new URL('http://localhost:8887/cypress/integration/book-scroll-position.e2e.html');
    url.searchParams.set('count', count);
    url.searchParams.set('size', size);
    url.searchParams.set('margin', margin);
    url.searchParams.set('generateNext', generateNext);
    url.searchParams.set('generatePrevious', generatePrevious);
    return url.href;
  }

  it('uses \'for\' attribute as target container id', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-scroll-position for="id1"></book-scroll-position><div id="id1">Some content</div>', ['book-scroll-position.js']));
      d.close();
    });
    cy.get('book-scroll-position').then($el => {
      expect($el.get(0).for).to.equal($el.get(0).getRootNode().getElementById('id1'));
    });
  });

  xit('for simple use-case return first depth children position', () => {
    cy.visit(page({size: 300, count: 10}));
    cy.get('book-scroll').then($el => {
      $el.get(0).children[4].scrollIntoView(); // HOW???
    });
    cy.get('book-scroll-position').then($el => {
      expect($el.get(0).position[0]).to.equal(5);
    });
  });
});
