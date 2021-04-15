const { customHtmlPage, isRendered } = require('./utils');

describe('book-fragment', () => {
  it('is displayed only if active', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-fragment>Hello</book-fragment>', ['book-fragment.js']));
      d.close();
    });
    cy.get('book-fragment').then($el => expect(isRendered($el)).not.to.be.true);
    cy.get('book-fragment').then($el => $el.get(0).active = true);
    cy.get('book-fragment').then($el => expect(isRendered($el)).to.be.true);
  });

  it('active -> inactive: wrap into template (should _not_ present in DOM)', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-fragment active><em>Hello</em></book-fragment>', ['book-fragment.js']));
      d.close();
    });
    cy.get('book-fragment > em').should('have.length', 1);
    cy.get('book-fragment').then($el => $el.get(0).active = false);
    cy.get('book-fragment > *').should('have.length', 1);
    cy.get('book-fragment > template').should('have.length', 1);
    cy.get('book-fragment > em').should('have.length', 0);
  });

  it('inactive -> active: unwrap from template (should _be_ present in DOM)', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-fragment><template><strong>Hey, man!</strong><strong>Me too.</strong></template></book-fragment>', ['book-fragment.js']));
      d.close();
    });
    cy.get('book-fragment > strong').should('have.length', 0);
    cy.get('book-fragment').then($el => $el.attr('active', ''));
    cy.get('book-fragment > strong').should('have.length', 2);
    cy.get('book-fragment > template').should('have.length', 0);
    cy.get('book-fragment').then($el => {
      expect($el.get(0).innerHTML).to.equal('<strong>Hey, man!</strong><strong>Me too.</strong>');
    });
  });

  it('active (with template) -> inactive: do nothing', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-fragment active><template><strong>Hey, man!</strong><strong>Me too.</strong></template></book-fragment>', ['book-fragment.js']));
      d.close();
    });
    cy.get('book-fragment > strong').should('have.length', 0);
    cy.get('book-fragment').then($el => $el.attr('active', false));
    cy.get('book-fragment > strong').should('have.length', 0);
    cy.get('book-fragment > template').should('have.length', 1);
    cy.get('book-fragment > *').should('have.length', 1);
  });

  it('inactive (without template) -> active: do nothing', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-fragment><strong>Hey, man!</strong><strong>Me too.</strong></book-fragment>', ['book-fragment.js']));
      d.close();
    });
    cy.get('book-fragment > strong').should('have.length', 2);
    cy.get('book-fragment').then($el => $el.attr('active', true));
    cy.get('book-fragment > strong').should('have.length', 2);
    cy.get('book-fragment > template').should('have.length', 0);
    cy.get('book-fragment > *').should('have.length', 2);
  });

  it('if supplied with src, fetch it into template, if inactive', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-fragment src="../cypress/fixtures/some-section.html"></book-fragment>', ['book-fragment.js']));
      d.close();
    });
    cy.get('book-fragment > *').should('have.length', 1);
    cy.get('book-fragment > template').should('have.length', 1);
    cy.get('book-fragment').then($el => $el.attr('active', ''));
    cy.get('book-fragment > p').should('have.length', 1);
    cy.get('book-fragment > a').contains('Some link');
  });

  it('if supplied with src, fetch it directly into DOM, if active', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-fragment active src="../cypress/fixtures/some-section.html"></book-fragment>', ['book-fragment.js']));
      d.close();
    });
    cy.get('book-fragment > p').should('have.length', 1);
    cy.get('book-fragment > a').contains('Some link');
    cy.get('book-fragment').then($el => $el.removeAttr('active'));
    cy.get('book-fragment > *').should('have.length', 1);
    cy.get('book-fragment > template').should('have.length', 1);
  });

  describe('loading and complete logic', () => {
    it('if no src attribute, is complete right away', () => {
      cy.document().then(d => {
        d.write(customHtmlPage('<book-fragment><span>zok</span></book-fragment>', ['book-fragment.js']));
        d.close();
      });
      cy.get('book-fragment').then($el => {
        expect($el.get(0).complete).to.be.true;
      });
    });

    it('if src attribute present, is not complete initially, but complete after load event', done => {
      cy.document().then(d => {
        d.write(customHtmlPage('<book-fragment src="../cypress/fixtures/section-002.html></book-fragment>"', ['book-fragment.js']));
        d.close();
      });
      cy.get('book-fragment').then($el => {
        expect($el.get(0).complete).to.be.false;
        $el.get(0).addEventListener('load', () => {
          console.log('load', event);
          expect($el.get(0)).to.equal(event.target);
          expect(event.target.complete).to.be.true;
          done();
        });
      });
    });
  });

});
