(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  }

  // Window
  else if (!name) {
    console.error('No name for root export', factory.name, factory().name);
  } else if (root[name]) {
    console.warn('Already exported to root', name);
  } else {
    root[name] = factory();
  }

} (this, 'HTMLBookScrollControlElement', function () {
  'use strict';

  class HTMLBookScrollControlElement extends HTMLElement {
    constructor () {
      super();
      this.handleChangeBinded = this.handleChange.bind(this);
    }

    cleanupTasks = [];
    complete = false;

    static get observedAttributes () {
      return ['for'];
    }

    get forScroll () {
      if (this.getAttribute('for')) {
        return document.getElementById(this.getAttribute('for'));
      }
    }

    get forScrollPosition () {
      if (this.getAttribute('for')) {
        return document.querySelector(`book-scroll-position[for="${this.getAttribute('for')}"]`)
      }
    }

    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'for') {
        if (newValue && newValue !== oldValue) {
          this.complete = this.init();
        }
      }
    }

    connectedCallback () {
      if (!this.complete) this.complete = this.init();
      if (!this.complete) document.addEventListener('DOMContentLoaded', () => {
        this.complete = this.init();
      });
    }

    disconnectedCallback () {
      while(this.cleanupTasks.length) this.cleanupTasks.pop()();
    }

    init () {
      if (this.forScroll && this.forScrollPosition) {
        // Cleanup old
        while(this.cleanupTasks.length) this.cleanupTasks.pop()();
        // Add new
        const target = this.forScrollPosition;
        target.addEventListener('change', this.handleChangeBinded);
        // Add cleanup action
        this.cleanupTasks.push(() => {
          target.removeEventListener('change', this.handleChangeBinded);
        });
        // Initial set position
        const fragments = Array.from(this.forScroll.children);
        if (fragments.filter(child => !child.complete).length) {
          this.forScroll.addEventListener('load', () => {
            if (!fragments.filter(child => !child.complete).length) {
              this.forScrollPosition.emitPositionChange();
            }
          })
        }
        // Notify success
        return true;
      }
    }

    handleChange (event) {
      this.innerText = event.detail.map(f => {
        if (Math.abs(f % 1) > 0) {
          return f.toFixed(3);
        } else {
          return f;
        }
      }).join(', ');
    }
  }

  customElements.define('book-scroll-control', HTMLBookScrollControlElement);

  return HTMLBookScrollControlElement;
}));
