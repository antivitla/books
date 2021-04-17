(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./binary-search'));
  }

  // Window
  else if (!name) {
    console.error('No name for root export', factory.name, factory(root.BinarySearch).name);
  } else if (root[name]) {
    console.warn('Already exported to root', name);
  } else {
    root[name] = factory(root.BinarySearch);
  }

} (this, 'HTMLBookScrollPositionElement', function (BinarySearch) {
  'use strict';

  class HTMLBookScrollPositionElement extends HTMLElement {
    constructor() {
      super();
      this.handleScrollBinded = this.handleScroll.bind(this);
    }

    cleanupTasks = [];

    complete = false;

    MAX_NESTED_DEPTH = 2;

    static get observedAttributes () {
      return ['for'];
    }

    get for () {
      return document.getElementById(this.getAttribute('for'));
    }

    get position () {
      return this.getPosition();
    }

    set position (position) {
      this.setPosition(position);
    }

    initFor (id) {
      const target = document.getElementById(id);
      if (target) {
        target.addEventListener('scroll', this.handleScrollBinded);
        this.cleanupTasks.push(() => {
          target.removeEventListener('scroll', this.handleScrollBinded);
        });
        return true;
      }
    }

    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'for') {
        if (newValue && newValue !== oldValue) {
          while (this.cleanupTasks.length) this.cleanupTasks.pop()();
          this.complete = this.initFor(newValue);
        }
      }
    }

    connectedCallback () {
      if (!this.complete) {
        this.complete = this.initFor(this.getAttribute('for'));
      }
      if (!this.complete) {
        document.addEventListener('DOMContentLoaded', () => {
          this.complete = this.initFor(this.getAttribute('for'));
        });
      }
    }

    disconnectedCallback () {
      while (this.cleanupTasks.length) {
        this.cleanupTasks.pop()();
      }
    }

    handleScroll (event) {
      const delta = event.target.scrollTop - (this.previousScrollTop || 0);
      this.previousScrollTop = event.target.scrollTop;
      // Threshold emit
      if (!this.emitPositionChangeThreshold) {
        this.emitPositionChange();
        this.emitPositionChangeThreshold = setTimeout(() => {
          this.emitPositionChange();
          delete this.emitPositionChangeThreshold;
        }, 100);
      }
    }

    emitPositionChange () {
      this.dispatchEvent(new CustomEvent('change', {
        bubbles: true,
        detail: this.position
      }));
    }

    getPosition () {
      if (!this.for) return [0];
      // Set margin at which element considered to be focused & 'visible'
      const margin = parseFloat(this.getAttribute('margin') || 0.05) * this.for.offsetHeight;
      // Get current focused & 'visible' element's position inside DOM tree
      const position = [];
      let container = this.for;
      while (container.children.length) {
        let i = this.getVisibleElementIndex(container, margin)
        position.push(i);
        container = container.children[i];
        // Exit at max depth === 2
        if (position.length >= this.MAX_NESTED_DEPTH) {
          break;
        }
      }
      // Add relative top margin of the target element
      const rect = container.getBoundingClientRect();
      position.push(rect.top / rect.height);
      // Element's position in DOM is an array of indexes,
      // and last item in array is always it's top margin relative to viewport:
      // [1, 2, -1.456788]
      return position;
    }

    setPosition (position) {
      this.for.activateChild(position[0]);
      let i = 0;
      let target = this.for;
      while (i < position.length && i < this.MAX_NESTED_DEPTH) {
        if (target.children && target.children[position[i]]) {
          target = target.children[position[i]]
          i += 1;
        } else {
          break;
        }
      }
      if (i < position.length) {
        console.log('shift remained', position);
      }
      target.scrollIntoView(true);
      // Shift?
    }

    getVisibleElementIndex(container, margin) {
      const children = Array.from(container.children);
      const visibleChildren = children.filter(child => child.getClientRects().length);
      const index = BinarySearch(visibleChildren, null, (child, value, index) => {
        const rect = child.getBoundingClientRect();
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
      return children.indexOf(visibleChildren[index]);
    }
  }

  customElements.define('book-scroll-position', HTMLBookScrollPositionElement);

  return HTMLBookScrollPositionElement;
}));
