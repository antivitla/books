(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./book-element'));
  }

  // Window
  else if (!name) {
    console.error('No name for root export of', factory.name, factory(root.HTMLBookElement).name);
  } else if (root[name]) {
    console.warn('Already exported to root', name);
  } else {
    root[name] = factory(root.HTMLBookElement);
  }

} (this, 'HTMLBookControlElement', function (HTMLBookElement) {
  'use strict';

  class HTMLBookControlElement extends HTMLBookElement {
    constructor () {
      super();
    }

    // Properties

    get for () { return this.getAttribute('for'); }

    get controlType () { return this.getAttribute('type'); }


    // DOM references

    get bookScrollElement () {
      return this.getCached('bookScrollElement', () => {
        return document.getElementById(this.for);
      });
    }

    get bookPositionElement () {
      return this.getCached('bookPositionElement', () => {
        return document.querySelector(`book-position[for="${this.for}"]`);
      });
    }


    // Lifecycle callbacks

    static get observedAttributes () { return ['for', 'type']; }

    attributeChangedCallback (name, previousValue, value) {
      if (value !== previousValue && this.isConnected) {
        switch (name) {
          case 'for':
            this.bookReferenceChangedCallback(value);
            break;
          case 'type':
            this.controlTypeChangedCallback(value);
            break;
          default:
            break;
        }
      }
    }

    connectedCallback () {
      this.listen('change', document, this.handlePositionChange);
      if (this.for) this.bookReferenceChangedCallback(this.for);
      if (this.controlType) this.controlTypeChangedCallback(this.controlType);
    }

    disconnectedCallback () {
      this.cleanup();
    }

    bookReferenceChangedCallback (id) {
      // Clear cached book* elements
      this.deleteCached(['bookScrollElement', 'bookPositionElement']);

      // Await bookPosition element
      this.awaitElement(`book-position[for="${id}"]`)
        .then(element => this.setCached('bookPositionElement', element));

      // Await new bookScroll element
      this.awaitElement(`#${id}`)
        // Replace bookScroll in cache
        .then(element => this.setCached('bookScrollElement', element))
        // Wait for new bookScroll element's content available
        .then(element => this.awaitChildrenComplete(element))
        // Calculate models of bookScroll content
        // .then(() => {
        //   this.bookModelAvailableCallback();
        // })
        // Wait for document styled
        .then(() => this.awaitStyled())
        .then(() => this.bookStyledCallback());
    }

    controlTypeChangedCallback (type) {
      this.cleanup('type');
      switch (type) {
        case 'url':
          this.shadowRoot.innerHTML = this.typeUrlShadowHTML;
          break;
        case 'keyboard':
          this.shadowRoot.innerHTML = this.typeKeyboardShadowHTML;
          this.listen('keyup', document, this.handleKeyup, 'type');
          break;
        case 'scrollbar':
          this.shadowRoot.innerHTML = this.typeScrollbarShadowHTML;
          break;
        default:
          break;
      }
    }

    bookModelAvailableCallback () {
      console.warn('Base method to override when book models are ready');
    }

    bookStyledCallback () {
      switch (this.controlType) {
        case 'url':
          let position = this.calculatePositionFromUrl();
          if (position) this.scrollTo(position);
          this.typeUrlComplete = true;
          break;
        default:
          break;
      }
    }


    // Event handlers

    handlePositionChange ({ detail: position, target }) {
      if (target === this.bookPositionElement) {
        this.setCached('position', position);
        switch (this.controlType) {
          case 'url':
            if (this.typeUrlComplete) {
              this.renderUrl(this.calculateUrlFromPosition(position));
            }
            break;
          default:
            break;
        }
      }
    }

    handleKeyup (event) {
      if (event.code.match(/home|end|pageup|pagedown/i)) {
        this.scrollTo(event.code.toLowerCase());
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }


    // Main scroll method

    scrollTo (position) {
      console.log('scroll to:', position);
    }


    // Type: url

    typeUrlComplete = false;

    typeUrlShadowHTML = `
      <style>
        :host([type="url"]) {
          display: none;
        }
      </style>
    `;

    calculatePositionFromUrl () {
      let url = new URL(location.href);
      let hash = url.hash.replace(/^#/, '');
      if (hash) {
        let t = new URL(url.origin);
        t.search = hash;
        return this.parsePosition(decodeURIComponent(t.searchParams.get('position')));
      }
    }

    calculateUrlFromPosition (position) {
      let hash = location.hash.replace(/^#/, '');
      let t = new URL(location.origin);
      t.search = hash;
      t.searchParams.set('position', position.join(','));
      let url = new URL(location.href);
      url.hash = t.search;
      return url;
    }

    renderUrl (url) { history.replaceState(null, null, url.href); }



    // Type: keyboard

    typeKeyboardShadowHTML = `
      <style>
        :host([type="keyboard"]) {
          display: none;
        }
      </style>
    `;


    // Type: scrollbar

    typeScrollbarShadowHTML = ``;

    calculatePositionFromScrollbar () {
      //
    }

    calculateScrollbarFromPosition (position) {
      //
    }


    // Utils

    awaitChildrenComplete (parent) {
      return new Promise(resolve => {
        const check = () => {
          if (!Array.prototype.filter.call(parent.children, child => !child.complete).length) {
            parent.removeEventListener('load', check);
            resolve();
            return true;
          }
        };
        if (!check()) parent.addEventListener('load', check);
      });
    }

    parsePosition (position) {
      let array;
      if (!position) array = [0];
      else if (typeof position === 'number') array = [position];
      else if (typeof position === 'string') array = position.split(/,\s*|\s+/g);
      else if (Array.isArray(position)) array = position;
      else throw new Error('invalid position', position);
      return array.map(i => typeof i === 'string' ? i.trim() : i).map(i => {
        let float = parseFloat(i);
        let int = parseInt(i, 10);
        if (isNaN(int) || isNaN(float)) return 0;
        else if (float === int) return int;
        else return float;
      });
    }
  }

  customElements.define('book-control', HTMLBookControlElement);

  return HTMLBookControlElement;

}));
