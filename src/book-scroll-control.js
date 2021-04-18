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
      this.attachShadow({mode: 'open'});
      this.shadowRoot.innerHTML = `
        <style>
          :root[type="url"] {
            display: none;
          }
        </style>
      `;
      this.handleChangeBinded = this.handleChange.bind(this);
    }

    cleanupTasks = [];
    complete = false;
    initUrlComplete = false;
    // initScrollbarComplete = false;

    DEFAULT_POSITION = [0];

    static get observedAttributes () {
      return ['for'];
    }

    get scrollElement () {
      if (this.getAttribute('for')) {
        return document.getElementById(this.getAttribute('for'));
      }
    }

    get scrollPositionElement () {
      if (this.getAttribute('for')) {
        return document.querySelector(`book-scroll-position[for="${this.getAttribute('for')}"]`)
      }
    }

    get controlType () {
      return this.getAttribute('type');
    }

    get positionInUrl () {
      const hash = location.hash.replace(/^#/, '');
      if (hash) {
        const temp = new URL(location.origin);
        temp.search = hash;
        const position = decodeURIComponent(temp.searchParams.get('position') || '')
          .split(',')
          .map(item => item.trim())
          .filter(item => item)
          .map(item => {
            const int = parseInt(item.trim(), 10);
            const float = parseFloat(item.trim());
            return int === float ? int : float;
          });
        return position.length ? position : this.DEFAULT_POSITION;
      } else {
        return this.DEFAULT_POSITION;
      }
    }

    set positionInUrl (position) {
      const hash = location.hash.replace(/^#/, '');
      const temp = new URL(location.origin);
      temp.search = hash;
      temp.searchParams.set('position', position.join(','));
      const url = new URL(location.href);
      url.hash = temp.search;
      history.replaceState({position: position}, null, url.href);
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
      }, {once: true});
    }

    disconnectedCallback () {
      while(this.cleanupTasks.length) this.cleanupTasks.pop()();
    }

    init () {
      if (this.scrollElement && this.scrollPositionElement) {
        // Cleanup old
        while(this.cleanupTasks.length) this.cleanupTasks.pop()();
        // Add new
        const target = this.scrollPositionElement;
        target.addEventListener('change', this.handleChangeBinded);
        // Add cleanup action
        this.cleanupTasks.push(() => {
          target.removeEventListener('change', this.handleChangeBinded);
        });
        // Additional tasks when book scroll fragments are all complete
        const children = Array.from(this.scrollElement.children);
        const checkComplete = () => {
          if (!children.filter(child => !child.complete).length) {
            this.scrollElement.removeEventListener('load', checkComplete);
            this.scrollElementCompletedCallback();
            return true;
          }
        }
        if (!checkComplete()) {
          this.scrollElement.addEventListener('load', checkComplete);
        }
        // Notify success
        return true;
      }
    }

    handleChange (event) {
      // Normalize float to 3 digits after dot ('.000')
      const position = event.detail.map(n => {
        return Math.abs(n % 1) > 0 ? n.toFixed(3) : n;
      });
      // Control type 'url': apply position to url hash (when when ready)
      if (this.controlType === 'url' && this.initUrlComplete) {
        this.positionInUrl = position;
      }
      // Control type: 'scrollbar': apply position to bar track
      else if (this.controlType === 'scrollbar') {
        console.log('apply to scrollbar');
      }
    }

    scrollElementCompletedCallback () {
      // Emit initial scroll position
      this.scrollPositionElement.emitPositionChange();
      // Control type 'url': get position from url and scroll to it
      if (this.controlType === 'url') {
        const checkComplete = () => {
          if (document.readyState === 'complete') {
            this.scrollPositionElement.position = this.positionInUrl;
            this.initUrlComplete = true;
            document.removeEventListener('readystatechange', checkComplete);
            return true;
          }
        }
        if (!checkComplete()) {
          document.addEventListener('readystatechange', checkComplete);
        }
      }
      // Control type 'scrollbar': ...
      else if (this.controlType === 'scrollbar') {
        //
      }
    }
  }

  customElements.define('book-scroll-control', HTMLBookScrollControlElement);

  return HTMLBookScrollControlElement;
}));
