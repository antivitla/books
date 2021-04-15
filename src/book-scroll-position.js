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

} (this, 'HTMLBookScrollPositionElement', function () {
  'use strict';

  class HTMLBookScrollPositionElement extends HTMLElement {
    constructor() {
      super();
    }

    get for () {
      return document.getElementById(this.getAttribute('for'));
    }

    get position () {
      return [5, -0.1];
    }
  }

  customElements.define('book-scroll-position', HTMLBookScrollPositionElement);

  return HTMLBookScrollPositionElement;
}));
