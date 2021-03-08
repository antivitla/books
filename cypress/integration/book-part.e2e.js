const { customHtmlPage, isRendered } = require('./utils');

describe('book-part', () => {
  it('is displayed only if active', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-part>Hello</book-part>', ['book-part.js']));
      d.close();
    });
    cy.get('book-part').then($el => expect(isRendered($el)).not.to.be.true);
    cy.get('book-part').then($el => $el.get(0).active = true);
    cy.get('book-part').then($el => expect(isRendered($el)).to.be.true);
  });

  it('active -> inactive: wrap into template (should _not_ present in DOM)', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-part active><em>Hello</em></book-part>', ['book-part.js']));
      d.close();
    });
    cy.get('book-part > em').should('have.length', 1);
    cy.get('book-part').then($el => $el.get(0).active = false);
    cy.get('book-part > *').should('have.length', 1);
    cy.get('book-part > template').should('have.length', 1);
    cy.get('book-part > em').should('have.length', 0);
  });

  it('inactive -> active: unwrap from template (should _be_ present in DOM)', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-part><template><strong>Hey, man!</strong><strong>Me too.</strong></template></book-part>', ['book-part.js']));
      d.close();
    });
    cy.get('book-part > strong').should('have.length', 0);
    cy.get('book-part').then($el => $el.attr('active', ''));
    cy.get('book-part > strong').should('have.length', 2);
    cy.get('book-part > template').should('have.length', 0);
    cy.get('book-part').then($el => {
      expect($el.get(0).innerHTML).to.equal('<strong>Hey, man!</strong><strong>Me too.</strong>');
    });
  });

  it('active (with template) -> inactive: do nothing', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-part active><template><strong>Hey, man!</strong><strong>Me too.</strong></template></book-part>', ['book-part.js']));
      d.close();
    });
    cy.get('book-part > strong').should('have.length', 0);
    cy.get('book-part').then($el => $el.attr('active', false));
    cy.get('book-part > strong').should('have.length', 0);
    cy.get('book-part > template').should('have.length', 1);
    cy.get('book-part > *').should('have.length', 1);
  });

  it('inactive (without template) -> active: do nothing', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-part><strong>Hey, man!</strong><strong>Me too.</strong></book-part>', ['book-part.js']));
      d.close();
    });
    cy.get('book-part > strong').should('have.length', 2);
    cy.get('book-part').then($el => $el.attr('active', true));
    cy.get('book-part > strong').should('have.length', 2);
    cy.get('book-part > template').should('have.length', 0);
    cy.get('book-part > *').should('have.length', 2);
  });

  xit('multiple templates count as usual html');

  it('if supplied with src, fetch it into template, if inactive', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-part src="../cypress/fixtures/some-part.html"></book-part>', ['book-part.js']));
      d.close();
    });
    cy.get('book-part > *').should('have.length', 1);
    cy.get('book-part > template').should('have.length', 1);
    cy.get('book-part').then($el => $el.attr('active', ''));
    cy.get('book-part > p').should('have.length', 1);
    cy.get('book-part > a').contains('Some link');
  });

  it('if supplied with src, fetch it directly into DOM, if active', () => {
    cy.document().then(d => {
      d.write(customHtmlPage('<book-part active src="../cypress/fixtures/some-part.html"></book-part>', ['book-part.js']));
      d.close();
    });
    cy.get('book-part > p').should('have.length', 1);
    cy.get('book-part > a').contains('Some link');
    cy.get('book-part').then($el => $el.removeAttr('active'));
    cy.get('book-part > *').should('have.length', 1);
    cy.get('book-part > template').should('have.length', 1);
  });
});
