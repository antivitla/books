const HTMLBookFragmentElement = require('../../src/book-fragment');

describe('book-scroll', () => {
  function customPage({count = 30, size = 10, margin = 1000, generateNext = false, generatePrevious = false} = {}) {
    return `http://localhost:8887/cypress/integration/book-scroll.e2e.html?count=${count}&size=${size}&margin=${margin}&generateNext=${generateNext}&generatePrevious=${generatePrevious}`;
  }

  beforeEach(() => {
    cy.viewport(480, 640);
  });

  it('has sentinels', () => {
    cy.visit(customPage({count: 10, size: 120}));
    cy.get('book-scroll').then($el => {
      expect($el.get(0).shadowRoot.querySelectorAll('.book-scroll-sentinel').length)
        .to.equal(2);
    });
    cy.get('.part').then($el => {
      expect($el.eq(0).outerHeight())
        .to.be.greaterThan(640);
    });
  });

  it('when scroll down, top sentinel signals exit respecting margin', done => {
    cy.visit(customPage({count: 10, size: 60, margin: 400}));
    cy.get('book-scroll').then($el => {
      const cb = ({detail}) => {
        if (detail.leave && detail.top) {
          $el.get(0).removeEventListener('book-scroll-intersection', cb);
          done();
        }
      }
      $el.get(0).addEventListener('book-scroll-intersection', cb);
    });
    cy.get('book-scroll').scrollTo(0, 401);
  });

  it('scroll down, then up', done => {
    cy.visit(customPage({count: 20, size: 30, margin: 700}));
    const promises = [];
    let enterTopCount = 0;
    let leaveBottomCount = 0;
    cy.get('book-scroll').then($el => {
      promises.push(new Promise(resolve => {
        $el.get(0).addEventListener('book-scroll-intersection', ({detail}) => {
          if (detail.leave && detail.top) resolve();
        });
      }));
      promises.push(new Promise(resolve => {
        $el.get(0).addEventListener('book-scroll-intersection', ({detail}) => {
          if (detail.enter && detail.bottom) resolve();
        });
      }));
      promises.push(new Promise(resolve => {
        $el.get(0).addEventListener('book-scroll-intersection', ({detail}) => {
          if (detail.leave && detail.bottom) {
            leaveBottomCount++;
            if (leaveBottomCount > 1) {
              resolve();
            }
          }
        });
      }));
      promises.push(new Promise(resolve => {
        $el.get(0).addEventListener('book-scroll-intersection', ({detail}) => {
          if (detail.enter && detail.top) {
            enterTopCount++;
            if (enterTopCount > 1) {
              resolve();
            }
          }
        });
      }));
      Promise.all(promises).then(() => {
        done();
      });
    });
    cy.wait(50);
    cy.get('book-scroll').scrollTo('bottom');
    cy.wait(50);
    cy.get('book-scroll').scrollTo('top');
  });

  it('issue \'next\' event if scroll hit last visible item', done => {
    cy.visit(customPage({count: 3, size: 110, margin: 100}));
    cy.get('book-scroll').then($el => {
      const cb = () => {
        $el.get(0).removeEventListener('book-scroll-next', cb);
        done();
      };
      $el.get(0).addEventListener('book-scroll-next', cb);
    });
    cy.wait(100);
    cy.get('book-scroll').scrollTo('bottom', {duration: 500});
    cy.wait(100);
    cy.get('book-scroll').scrollTo('bottom', {duration: 500});
    cy.wait(100);
    cy.get('book-scroll').scrollTo('bottom', {duration: 500});
    cy.wait(100);
    cy.get('book-scroll').scrollTo('bottom', {duration: 500});
    cy.wait(100);
    cy.get('book-scroll').scrollTo('bottom', {duration: 500});
  });

  it('issue \'prev\' event if scroll hit first visible item', done => {
    cy.visit(customPage({count: 3, size: 110, margin: 100}));
    cy.get('book-scroll').then($el => {
      const cb = () => {
        $el.get(0).removeEventListener('book-scroll-previous', cb);
        done();
      };
      $el.get(0).addEventListener('book-scroll-previous', cb);
    });
    cy.wait(100);
    cy.get('book-scroll').scrollTo('bottom', {duration: 100});
    cy.wait(200);
    cy.get('book-scroll').scrollTo('top', {duration: 100});
    cy.wait(500);
  });

  xit('while we scroll up/down visible content, new content appear', () => {
    cy.visit(customPage({count: 4, size: 110, margin: 200, generateNext: true}));
    cy.get('book-scroll > book-fragment').should('have.length', 4);
    cy.get('book-scroll').scrollTo('bottom');
    cy.wait(100);
    cy.get('book-scroll > book-fragment').should('have.length', 5);
  });

  it('when we scroll up/down, old content inactivates', () => {
    cy.visit(customPage({count: 10, size: 100, margin: 20, inactive: true}));
    cy.wait(100);
    cy.get('book-scroll > book-fragment[active]:first-child').should('have.length', 1);
    cy.get('book-scroll > book-fragment:last-child:not([active]').should('have.length', 1);
    cy.get('book-scroll').scrollTo('bottom');
    cy.wait(100);
    cy.get('book-scroll').scrollTo('bottom');
    cy.get('book-scroll > book-fragment[active]:first-child').should('have.length', 0);
  });

  it('emit \'book-scroll-position\' event on scroll end', done => {
    cy.visit(customPage({count: 10, size: 100, margin: 100}));
    cy.get('book-scroll').then($el => {
      $el.get(0).addEventListener('book-scroll-position', event => {
        let { fragment, fragmentChild, index } = event.detail.position;
        expect(fragment.constructor.name.match(/^HTML.+Element$/)).to.be.ok;
        expect(fragmentChild.constructor.name.match(/^HTML.+Element$/)).to.be.ok;
        expect(index[0]).to.be.finite;
        expect(index[1]).to.be.finite;
        done();
      });
    });
    cy.get('book-scroll').scrollTo(0, 300);
  });

});
