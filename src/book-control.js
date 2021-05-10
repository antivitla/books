(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  }

  // Window
  else if (!name) {
    console.error('No name for root export of', factory.name, factory().name);
  } else if (root[name]) {
    console.warn('Already exported to root', name);
  } else {
    root[name] = factory();
  }

} (this, 'HTMLBookControlElement', function () {
  'use strict';

  class HTMLBookControlElement extends HTMLElement {
    constructor () {
      super();
      this.attachShadow({mode: 'open'});
      this.shadowRoot.innerHTML = `
        <template type="url">
          <style>
            :host {
              display: none;
            }
          </style>
        </template>
        <template type="keyboard">
          <style>
            :host {
              display: none;
            }
          </style>
        </template>
        <template type="scrollbar"></template>
        <template type="index"></template>
      `;
    }

    cleanupTasks = [];


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

    typeUrlShadowHTML = `
      <style>
        :host([type="url"]) {
          display: none;
        }
      </style>
    `;


    // Type: keyboard

    typeKeyboardShadowHTML = `
      <style>
        :host([type="keyboard"]) {
          display: none;
        }
      </style>
    `;


    // Type: scrollbar

    calculatePositionFromScrollbar () {
      //
    }

    calculateScrollbarFromPosition (position) {
      //
    }

    typeScrollbarShadowHTML = ``;


    // Utils

    listen (event, target, callback, group) {
      const callbackBinded = callback.bind(this);
      const cleanupTask = () => target.removeEventListener(event, callbackBinded);
      target.addEventListener(event, callbackBinded);
      this.cleanupTasks.push(group ? [group, cleanupTask] : cleanupTask);
    }

    cleanup (group) {
      if (group) {
        this.cleanupTasks = this.cleanupTasks.filter(task => {
          if (Array.isArray(task) && task[0] === group) {
            task[1]();
            return false;
          } else {
            return true;
          }
        });
      } else {
        while (this.cleanupTasks.length) {
          const task = this.cleanupTasks.shift();
          if (Array.isArray(task)) task[1]();
          else task();
        };
      }
    }

    awaitStyled () {
      return new Promise(resolve => {
        const check = () => {
          if (document.readyState === 'complete') {
            document.removeEventListener('readystatechange', check);
            resolve();
            return true;
          }
        };
        if (!check()) document.addEventListener('readystatechange', check);
      });
    }

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

    awaitElement (selector) {
      let element = document.querySelector(selector);
      if (element) return Promise.resolve(element);
      else {
        return new Promise(resolve => {
          let observer = new MutationObserver((mutations, observer) => {
            element = []
              .concat(...mutations.map(mutation => Array.from(mutation.addedNodes)))
              .filter(node => node.nodeType === Node.ELEMENT_NODE)
              .find(node => {
                return node.closest(selector) || node.querySelector(selector);
              });
            if (element) {
              observer.disconnect();
              resolve(element.closest(selector) || element.querySelector(selector));
            }
          });
          observer.observe(document.documentElement, {childList: true, subtree: true});
        });
      }
    }

    getCached (name, getter) {
      if (typeof this[`__${name}`] === 'undefined') this[`__${name}`] = getter && getter();
      return this[`__${name}`];
    }

    setCached (name, value) {
      this[`__${name}`] = value;
      return this[`__${name}`];
    }

    deleteCached (cached) {
      (Array.isArray(cached) ? cached : [cached]).forEach(name => delete this[`__${name}`]);
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
