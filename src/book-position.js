(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./binary-search'));
  }

  // Window
  else if (!name) {
    console.error('No name for root export of', factory.name, factory(root.BinarySearch).name);
  } else if (root[name]) {
    console.warn('Already exported to root', name);
  } else {
    root[name] = factory(root.BinarySearch);
  }

} (this, 'HTMLBookPositionElement', function (BinarySearch) {
  'use strict';

  class HTMLBookPositionElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: 'open'});
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: none;
          }
        </style>
      `;
    }

    complete = false;
    cleanupTasks = [];
    emitPositionTimeout = 100;
    waitSetupTimeout = 800;
    DEFAULT_DEPTH = 2;
    DEFAULT_MARGIN = 0.05;


    // Public properties

    get depth () {
      return parseInt(this.getAttribute('depth') || this.DEFAULT_DEPTH, 10);
    }

    get margin () {
      return parseFloat(this.getAttribute('margin') || this.DEFAULT_MARGIN);
    }

    get position () {
      return this.getPosition();
    }
    set position (position) {
      this.setPosition(position);
    }


    // DOM references

    get scrollElement () {
      if (!this.__scrollElement && this.getAttribute('for')) {
        this.__scrollElement = document.getElementById(this.getAttribute('for'));
      }
      return this.__scrollElement;
    }

    get scrollElementRect () {
      if (!this.__scrollElementRect) {
        this.__scrollElementRect = this.scrollElement.getBoundingClientRect();
      }
      return this.__scrollElementRect;
    }


    // Lifecycle callbacks

    static get observedAttributes () {
      return ['for'];
    }

    attributeChangedCallback (name, previousValue, value) {
      if (name === 'for' && value && value !== previousValue) {
        this.setupCallback();
      }
    }

    connectedCallback () {
      this.setupCallback();
    }

    disconnectedCallback () {
      this.cleanup();
    }

    setupCallback () {
      // try to setup
      this.complete = this.setup();
      // if failed, wait for a better moment
      if (!this.complete && document.readyState === 'loading') {
        document.addEventListener('readystatechange', () => this.setupCallback(), {once: true});
      } else if (!this.complete && document.readyState !== 'loading') {
        setTimeout(() => this.setupCallback(), this.waitSetupTimeout);
      }
    }

    setup () {
      this.cleanup();
      if (this.scrollElement) {
        this.listen('scroll', this.scrollElement, this.handleScroll);
        return true;
      }
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
        detail: this.position
      }));
    }


    // Expensive calculations

    getPosition () {
      let d = Date.now();
      // Set margin at which element considered to be focused & 'visible'
      const margin = this.margin * this.scrollElementRect.height;
      // Get current focused & 'visible' element's position inside DOM tree
      const position = [];
      let container = this.scrollElement;
      while (container && container.children.length) {
        let i = this.getVisibleElementIndex(container, margin, this.scrollElementRect);
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
      position.push(rect.height ? ((rect.top - this.scrollElementRect.top) / rect.height) : 0);
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
      if (position.length === 1) position.push(0);
      while (i < position.length && i < this.depth) {
        if (target.children && target.children[position[i]]) {
          target = target.children[position[i]]
          i += 1;
        } else {
          break;
        }
      }
      // Scroll to target element
      // target.scrollIntoView(true);
      this.scrollElement.scrollTop = target.offsetTop;
      // Scroll more to match margin
      const margin = i < position.length ? position[i] : this.margin;
      this.scrollElement.scrollTop += Math.round(-1 * margin * target.offsetHeight);
    }

    getVisibleElementIndex(container, margin, contextRect) {
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
  }

  customElements.define('book-position', HTMLBookPositionElement);

  return HTMLBookPositionElement;
}));
