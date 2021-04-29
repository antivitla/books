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
    DEFAULT_DEPTH = 2;
    DEFAULT_MARGIN = 0.05;

    static get observedAttributes () {
      return ['for'];
    }

    get scrollElement () {
      if (this.getAttribute('for')) {
        return document.getElementById(this.getAttribute('for'));
      }
    }

    get depth () {
      return parseInt(this.getAttribute('depth'), 10) || this.DEFAULT_DEPTH;
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

    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'for' && newValue && newValue !== oldValue) {
        this.complete = this.init();
      }
    }

    connectedCallback () {
      if (!this.complete) this.complete = this.init();
      if (!this.complete) document.addEventListener('DOMContentLoaded', () => {
        this.complete = this.init();
      });
    }

    disconnectedCallback () {
      while (this.cleanupTasks.length) this.cleanupTasks.pop()();
    }

    init () {
      if (this.scrollElement) {
        // Cleanup old
        while (this.cleanupTasks.length) this.cleanupTasks.pop()();
        // Add new
        const target = this.scrollElement;
        target.addEventListener('scroll', this.handleScrollBinded);
        // Add cleanup
        this.cleanupTasks.push(() => {
          target.removeEventListener('scroll', this.handleScrollBinded)
        });
        // Notify success
        return true;
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
      if (!this.scrollElement) return [0];
      // Set margin at which element considered to be focused & 'visible'
      const margin = this.margin * this.scrollElement.offsetHeight;
      const contextRect = this.scrollElement.getBoundingClientRect();
      // Get current focused & 'visible' element's position inside DOM tree
      const position = [];
      let container = this.scrollElement;
      while (container && container.children.length) {
        let i = this.getVisibleElementIndex(container, margin, contextRect);
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
      position.push(rect.height ? ((rect.top - contextRect.top) / rect.height) : 0);
      // Element's position in DOM is an array of indexes,
      // and last item in array is always it's top margin relative to viewport:
      // [1, 2, -1.456788]
      return position;
    }

    setPosition (position) {
      this.scrollElement.activateChild(position[0]);
      let i = 0;
      let target = this.scrollElement;
      while (i < position.length && i < this.depth) {
        if (target.children && target.children[position[i]]) {
          target = target.children[position[i]]
          i += 1;
        } else {
          break;
        }
      }
      // Scroll to target
      // target.scrollIntoView(true);
      this.scrollElement.scrollTop = target.offsetTop;
      // Scroll more to match shift
      if (i < position.length) {
        this.scrollElement.scrollTop += Math.round(-1 * position[i] * target.offsetHeight);
      }
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
  }

  customElements.define('book-scroll-position', HTMLBookScrollPositionElement);

  return HTMLBookScrollPositionElement;
}));
