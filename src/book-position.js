(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./book-element'),
      require('./binary-search')
    );
  }

  // Window
  else if (!name) {
    console.error('No name for root export of', factory.name, factory(
      root.HTMLBookElement,
      root.BinarySearch
    ).name);
  } else if (root[name]) {
    console.warn('Already exported to root', name);
  } else {
    root[name] = factory(
      root.HTMLBookElement,
      root.BinarySearch
    );
  }

} (this, 'HTMLBookPositionElement', function (HTMLBookElement, BinarySearch) {
  'use strict';

  class HTMLBookPositionElement extends HTMLBookElement {
    constructor() {
      super();
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: none;
          }
          :host([debug]) {
            display: block;
            position: fixed;
            border-bottom: dashed var(--book-text-highlight-color) 2px;
            width: 100%;
            left: 0;
            pointer-events: none;
            filter: brightness(1.25);
          }
        </style>
      `;
    }

    emitPositionTimeout = 200;
    waitSetupTimeout = 800;
    DEFAULT_DEPTH = 2;
    DEFAULT_MARGIN = 0.05;


    // Public properties

    get for () { return this.getAttribute('for'); }

    get depth () { return parseInt(this.getAttribute('depth') || this.DEFAULT_DEPTH, 10); }

    get margin () { return parseFloat(this.getAttribute('margin') || this.DEFAULT_MARGIN); }

    get debug () { return this.getBooleanAttribute('debug'); }


    // DOM references

    get scrollElement () {
      return this.getCached('scrollElement', () => {
        return document.getElementById(this.for);
      });
    }

    get scrollElementRect () {
      return this.getCached('scrollElementRect', () => {
        return this.scrollElement.getBoundingClientRect();
      });
    }


    // Lifecycle callbacks

    static get observedAttributes () {
      return ['for'];
    }

    attributeChangedCallback (name, previousValue, value) {
      if (name === 'for' && value && value !== previousValue && this.isConnected) {
        this.bookReferenceChangedCallback(value);
      }
    }

    connectedCallback () {
      if (this.for) this.bookReferenceChangedCallback(this.for);
    }

    disconnectedCallback () {
      this.cleanup();
    }

    bookReferenceChangedCallback (id) {
      this.cleanup();
      this.awaitElement(`#${id}`).then(element => {
        this.setCached('scrollElement', element);
        if (this.debug) {
          this.style.top = `${
            this.scrollElementRect.top + this.scrollElementRect.height * this.margin
          }px`;
        }
        this.listen('scroll', element, this.handleScroll);
      });
    }


    // Events

    handleScroll (event) {
      // Emit position with threshold
      if (!this.__emitPositionTimeoutId) {
        this.emitPositionChange();
        this.__emitPositionTimeoutId = setTimeout(() => {
          this.emitPositionChange();
          delete this.__emitPositionTimeoutId;
        }, this.emitPositionTimeout);
      }
    }

    emitPositionChange () {
      this.dispatchEvent(new CustomEvent('change', {
        bubbles: true,
        detail: this.getPosition()
      }));
    }


    // Public methods

    getPosition () {
      // Set margin at which element considered to be focused & 'visible'
      const margin = this.margin * this.scrollElementRect.height;
      // Get current focused & 'visible' element's position inside DOM tree
      const position = [];
      let container = this.scrollElement;
      while (container && container.childElementCount) {
        let i = this.calculateVisibleElementIndex(container, margin, this.scrollElementRect);
        if (i < 0) {
          break;
        }
        position.push(i);
        container = container.children[i];
        // Exit at defined depth (2 by default)
        if (position.length >= this.depth) {
          break;
        }
      }
      // Add relative top margin of the target element
      const rect = container.getBoundingClientRect();
      position.push(rect.height ? ((this.scrollElementRect.top - rect.top) / rect.height) : 0);
      // Element's position in DOM is an array of indexes,
      // and last item in array is always it's top margin relative to viewport:
      // [1, 2, -1.456788]
      return position;
    }

    setPosition (position) {
      this.scrollElement.activateChild(position[0]);
      // Get target element
      let i = 0;
      let target = this.scrollElement;
      if (position.length === 1) position.push(0); // normalize
      while (i < position.length && i < this.depth) {
        if (target.children && target.children[position[i]]) {
          target = target.children[position[i]]
          i += 1;
        } else {
          break;
        }
      }
      // Scroll to target element
      let scrollTop = target.offsetTop;
      // Scroll less to match visibility margin
      scrollTop -= this.margin * this.scrollElementRect.height
      // If needed, scroll more to match specified shift
      if (i < position.length) {
        scrollTop += position[i] * target.offsetHeight;
      }
      this.scrollElement.scrollTop = scrollTop;
    }


    // Expensive calculations

    calculateVisibleElementIndex(container, margin, contextRect) {
      const children = Array.from(container.children);
      const visibleChildren = children.filter(child => child.getClientRects().length);
      const index = BinarySearch(visibleChildren, null, (child, value, index) => {
        const childRect = child.getBoundingClientRect();
        const rect = {};
        if (contextRect) {
          rect.top = childRect.top - contextRect.top;
          rect.bottom = childRect.bottom - contextRect.top;
        } else {
          rect = childRect;
        }
        // If first element and is lower (than viewport border),
        // or last element and is higher,
        // or intersecting viewport border
        if (
          (index === 0 && rect.top >= margin) ||
          (index === visibleChildren.length - 1 && rect.bottom <= margin) ||
          (rect.top <= margin && rect.bottom > margin)
        ) {
          return 0;
        }
        // If totally higher than viewport border
        else if (rect.bottom <= margin) {
          return -1;
        }
        // Detect 'holes' in position (e.g caused by margins between elements),
        // which may be catched by comparing with previous element's position.
        else if (
          rect.top >= margin &&
          child.previousElementSibling?.getBoundingClientRect().bottom <= margin
        ) {
          return 0;
        }
        // rect.top > 0
        else {
          return 1;
        }
      });
      return children.indexOf(visibleChildren[index < 0 ? Math.abs(index) - 1 : index]);
    }
  }

  customElements.define('book-position', HTMLBookPositionElement);

  return HTMLBookPositionElement;
}));
