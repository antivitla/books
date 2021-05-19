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

} (this, 'HTMLBookReaderElement', function (HTMLBookElement) {
  'use strict';

  class HTMLBookReaderElement extends HTMLBookElement {
    constructor () {
      super();
    }


    // Properties

    get for () {
      return this.getAttribute('for');
    }

    get indexDepth () {
      return this.getAttribute('index-depth');
    }

    // get preloadFonts () {
    //   return (this.getAttribute('preload-fonts') || '').split(/\s*,\s*/g);
    // }


    // DOM references

    get runningPanelElement () {
      return this.querySelector('.book-running-panel');
    }

    get indexPanelElement () {
      return this.querySelector('.book-index-panel');
    }

    get bookScrollElement () {
      return this.getCached('bookScrollElement');
    }


    // Lifecycle callbacks

    static get observedAttributes () {
      return ['for'/*, 'preload-fonts'*/];
    }

    attributeChangedCallback (name, previousValue, value) {
      if (previousValue !== value && this.hasConnected) {
        switch (name) {
          case 'for':
            this.bookReferenceChangedCallback(this.for);
            break;
          /*case 'preload-fonts':
            this.preloadFontsCallback(this.preloadFonts);
            break;*/
          default:
            break;
        }
      }
    }

    connectedCallback () {
      super.connectedCallback();
      // Do not open running panel at start scroll
      this.ignoreRunningPanelToggle(1000);
      // Do init
      if (this.for) this.bookReferenceChangedCallback(this.for);
      /*if (this.preloadFonts) this.preloadFontsCallback(this.preloadFonts);*/
    }

    disconnectedCallback () {
      super.disconnectedCallback();
      this.cleanup();
    }

    bookReferenceChangedCallback (id) {
      this.innerHTML = this.readerHTML(id);
      this.awaitElement(`#${id}`).then(element => {
        this.setCached('bookScrollElement', element);
        // Setup running component
        this.listen('scroll', this.bookScrollElement, this.runningPanelHandleScroll);
        this.listen('click', this.runningPanelElement, this.runningPanelHandleRunningClick);
        this.listen('click', document, this.runningPanelHandleBookClick);
        // Setup index component
        this.listen('click', document, this.indexPanelDocumentClick);
      });
    }

    /*preloadFontsCallback (fonts) {
      const template = document.createElement('template');
      template.innerHTML = `
        <div class="preload-fonts" style="position: fixed; z-index: -1; pointer-events: none; visibility: hidden;">
          ${'x'.repeat(fonts.length).split('').map((x, index) => {
            return '<div style="font-family: ' + fonts[index] + '">&nbsp;</div>';
          }).join('')}
        </div>
      `;
      document.body.append(template.content.cloneNode(true));
    }*/


    // Component: index

    indexPanelDocumentClick (event) {
      if (event.target.closest('.book-index-toggle')) {
        this.indexPanelToggle();
      } else if (
        event.target.closest('.book-index-panel book-control') ||
        !event.target.closest('.book-index-panel')
      ) {
        this.indexPanelToggle(false);
      }
      // Do not toggle running panel if clicked on index
      if (event.target.closest('.book-index-panel book-control')) {
        this.ignoreRunningPanelToggle(500);
      }
    }

    indexPanelToggle (toggle) {
      this.indexPanelElement.classList.toggle('active', toggle);
    }

    indexComponentHTML (id) {
      return `
        <aside class="book-index-panel">
          <book-control for="${id}" type="index" index-depth="${this.indexDepth}"></book-control>
        </aside>
      `;
    }


    // Component: running

    runningPanelHandleRunningClick (event) {
      setTimeout(() => {
        this.runningPanelToggle(false);
      }, 100);
    }

    runningPanelHandleBookClick (event) {
      // Exit if ignore
      if (this.getCached('ignoreRunningPanelToggle')) {
        return;
      }
      if (event.target.closest(`book-scroll[id="${this.for}"]`)) {
        this.runningPanelToggle();
      } else if (!event.target.closest(`.book-running-panel`)) {
        this.runningPanelToggle(false);
      }
    }

    runningPanelHandleScroll (event) {
      // Exit if ignore
      if (this.getCached('ignoreRunningPanelToggle')) {
        return;
      }
      const bookScrollTop = this.bookScrollElement.scrollTop;
      // Or hide if near page start
      if (bookScrollTop < 50) {
        this.runningPanelToggle(false);
        return;
      }
      // Or show depending on scroll direction
      const delta = bookScrollTop - this.getCached('bookScrollTop') || 0;
      this.setCached('bookScrollTop', bookScrollTop);
      if (delta < -5) {
        this.runningPanelToggle(true);
      } else if (delta > 5) {
        this.runningPanelToggle(false);
      }
    }

    runningPanelToggle (toggle) {
      this.runningPanelElement.classList.toggle('active', toggle);
    }

    ignoreRunningPanelToggle (ms) {
      this.setCached('ignoreRunningPanelToggle', true);
      setTimeout(() => {
        this.setCached('ignoreRunningPanelToggle', false);
      }, ms);
    }

    runningComponentHTML (id) {
      return `
        <nav class="book-running-panel">
          <button class="book-action material-icons book-action-left book-index-toggle">toc</button>
          <book-control for="${id}" type="running" running-depth="3"></book-control>
        </nav>
      `;
    }


    // Render

    readerHTML (id) {
      return [
        'running',
        'index',
        'url',
        'keyboard',
        'scrollbar',
        'position'
      ].map(component => this[`${component}ComponentHTML`](id)).join('');
    }

    keyboardComponentHTML (id) {
      return `<book-control for="${id}" type="keyboard"></book-control>`
    }

    urlComponentHTML (id) {
      return `<book-control for="${id}" type="url"></book-control>`;
    }

    scrollbarComponentHTML (id) {
      return `<book-control for="${id}" type="scrollbar"></book-control>`;
    }

    positionComponentHTML (id) {
      return `<book-position for="${id}" depth="2" margin="0.1"></book-position>`;
    }
  }

  customElements.define('book-reader', HTMLBookReaderElement);

  return HTMLBookReaderElement;
}))
