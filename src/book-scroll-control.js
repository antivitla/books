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
          /* Url */
          :host([type="url"]) {
            display: none;
          }
          /* Scrollbar */
          :host([type="scrollbar"]) {
            display: block;
            position: fixed;
            z-index: 1000;
            top: 0px;
            right: 0px;
            bottom: 0px;
            width: 20px;
            background-color: whitesmoke;
          }
          .scrollbar-track {
            display: block;
            position: relative;
            width: 20px;
            height: calc(100% - 0px);
            margin-right: 0px;
            margin-left: auto;
            background-color: rgba(230, 230, 230, 1);
          }
          .scrollbar-thumb {
            position: absolute;
            width: 100%;
            box-sizing: border-box;
            min-height: var(--book-scrollbar-thumb-min-height, 20px);
            top: 0%;
            right: 0px;
            border: solid #e6e6e6 4px;
            border-radius: 10px;
            background-color: rgba(0, 0, 0, 0.5);
            cursor: pointer;
          }
        </style>
        <!-- Scrollbar -->
        <template type="scrollbar">
          <div class="control scrollbar-track">
            <div class="scrollbar-thumb"></div>
          </div>
        </template>
        <!-- Table of contents -->
        <template type="toc">
          <div class="control toc"></div>
        </template>
        <!-- Running (header) -->
        <template type="running">
          <div class="control running"></div>
        </template>
      `;
      this.handleChangeBinded = this.handleChange.bind(this);
      this.handleKeyBinded = this.handleKey.bind(this);
      this.handleResizeBinded = this.handleResize.bind(this);
    }

    cleanupTasks = [];
    complete = false;
    initUrlComplete = false;

    DEFAULT_POSITION = [0];

    static get observedAttributes () {
      return ['for', 'type'];
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

    get scrollbarTrackElement () {
      return this.shadowRoot.querySelector('.scrollbar-track');
    }

    get scrollbarThumbElement () {
      return this.shadowRoot.querySelector('.scrollbar-thumb');
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
      history.replaceState({position: position.slice(0)}, null, url.href);
    }

    set positionInScrollbar (position) {

      // Set thumb size
      const thumbMinPx = this.scrollbarThumbMinHeightPx;
      const thumbSizePx = this.scrollbarThumbPoints * this.scrollbarPointSizePx;
      this.scrollbarThumbElement.style.height = `${Math.max(thumbMinPx, thumbSizePx)}px`;

      // Set thumb position
      const totalPoints = this.scrollbarTotalPoints;
      const positionPoint = this.scrollbarTrackModel[position[0]] + position[1];
      const trackSizePx = this.scrollbarTrackSizePx - (
        thumbSizePx < thumbMinPx ? thumbMinPx - thumbSizePx : 0
      );
      this.scrollbarThumbElement.style.top = `${trackSizePx * positionPoint / totalPoints}px`;
    }

    get initScrollbarComplete () {
      return Boolean(this.scrollbarTrackElement && this.scrollbarThumbElement);
    }

    // Scrollbar data
    get scrollbarThumbPoints () {
      if (!this.__scrollbarThumbPoints) {
        this.__scrollbarThumbPoints = this.calculateScrollThumbSizePoints();
      }
      return this.__scrollbarThumbPoints;
    }
    get scrollbarTrackModel () {
      if (!this.__scrollbarTrackModel) {
        this.__scrollbarTrackModel = this.calculateScrollTrackModel();
      }
      return this.__scrollbarTrackModel;
    }
    get scrollbarTotalPoints () {
      return this.scrollbarTrackModel[this.scrollbarTrackModel.length - 1];
    }
    get scrollbarThumbMinHeightPx () {
      if (!this.__scrollbarThumbMinHeightPx) {
        this.__scrollbarThumbMinHeightPx = parseInt(
          getComputedStyle(this.scrollbarThumbElement).minHeight, 10
        );
      }
      return this.__scrollbarThumbMinHeightPx;
    }
    get scrollbarTrackSizePx () {
      if (!this.__scrollbarTrackSizePx) {
        this.__scrollbarTrackSizePx = this.scrollbarTrackElement.getBoundingClientRect().height;
      }
      return this.__scrollbarTrackSizePx;
    }
    get scrollbarPointSizePx () {
      return this.scrollbarTrackSizePx / this.scrollbarTotalPoints;
    }

    clearScrollbarCache () {
      delete this.__scrollbarThumbPoints;
      delete this.__scrollbarTrackModel;
      delete this.__scrollbarThumbMinHeightPx;
      delete this.__scrollbarTrackSizePx;
    }

    attributeChangedCallback (name, oldValue, newValue) {
      if (['for', 'type'].indexOf(name) > -1 && newValue && newValue !== oldValue) {
        // Init DOM for different control types
        if (name === 'type') {
          // remove old controls
          for(let el of this.shadowRoot.querySelectorAll('.control')) el.remove();
          // add new ones
          if (['scrollbar', 'index', 'running'].indexOf(newValue) > -1) {
            this.shadowRoot.append(
              this.shadowRoot.querySelector(`template[type="${newValue}"]`).content.cloneNode(true)
            );
          }
        }
        // Redo main init
        this.initUrlComplete = false;
        this.complete = false;
        this.connectedCallback();
      }
    }

    connectedCallback () {
      if (!this.complete) {
        this.complete = this.init();
      }
      if (!this.complete && document.readyState === 'loading') {
        document.addEventListener(
          'readystatechange',
          () => this.connectedCallback(),
          {once: true}
        );
      }
      if (!this.complete && document.readyState !== 'loading') {
        setTimeout(
          () => this.connectedCallback(),
          800 + Math.floor(Math.random() * 400)
        );
      }
    }

    disconnectedCallback () {
      while(this.cleanupTasks.length) this.cleanupTasks.pop()();
    }

    init () {
      if (this.scrollElement && this.scrollPositionElement) {
        // Setup main position change handler
        while(this.cleanupTasks.length) this.cleanupTasks.pop()();
        const target = this.scrollPositionElement;
        target.addEventListener('change', this.handleChangeBinded);
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

        // Init keyboard shortcuts
        if (this.controlType === 'keyboard') {
          document.addEventListener('keyup', this.handleKeyBinded);
          this.cleanupTasks.push(() => {
            document.removeEventListener('keyup', this.handleKeyBinded);
          });
        }

        // Refresh scrollbar items
        if (this.controlType === 'scrollbar') {
          window.addEventListener('resize', this.handleResizeBinded);
          this.cleanupTasks.push(() => {
            window.removeEventListener('resize', this.handleResizeBinded);
          })
        }
        // Notify success
        return true;
      }
    }

    scrollElementCompletedCallback () {
      (function () {
        return new Promise(resolve => {
          const check = () => {
            if (document.readyState === 'complete') {
              document.removeEventListener('readystatechange', check);
              resolve();
              return true;
            }
          }
          if (!check()) {
            document.addEventListener('readystatechange', check);
          }
        })
      }()).then(() => {
        // Control type 'url': get position from url and scroll to it
        if (this.controlType === 'url') {
          this.scrollTo(this.positionInUrl);
          this.initUrlComplete = true;
        }
        
        // Update position controls
        this.scrollPositionElement.emitPositionChange();
      });
    }

    handleChange (event) {
      // Normalize float to 3 digits after dot ('.000')
      const position = event.detail;
      // Control type 'url': apply position to url hash (when when ready)
      if (this.controlType === 'url' && this.initUrlComplete) {
        this.positionInUrl = position;
      }
      // Control type: 'scrollbar': apply position to bar track
      else if (this.controlType === 'scrollbar' && this.initScrollbarComplete) {
        this.positionInScrollbar = position;
      }
    }

    handleKey (event) {
      if (event.code.match(/home/i)) {
        this.scrollTo('top');
      }

      else if (event.code.match(/end/i)) {
        this.scrollTo('bottom');
      }
    }

    handleResize () {
      clearTimeout(this.__resizeTimeout);
      this.__resizeTimeout = setTimeout(() => {
        this.clearScrollbarCache();
      }, 500);
    }

    calculateScrollTrackModel () {
      let scrollbarTrackModel = [0];
      for (let fragment of this.scrollElement.children) {
        const count = fragment.active
          ? fragment.children.length
          : fragment.children[0].content.children.length;
        scrollbarTrackModel.push(scrollbarTrackModel.slice(-1)[0] + count);
      }
      return scrollbarTrackModel;
    }

    calculateScrollThumbSizePoints () {
      const screenHeight = this.scrollElement.offsetHeight * (1 - this.scrollPositionElement.margin);
      // First, if fragments are smaller then screen,
      // accumulate their children count
      let cursorFragment = this.scrollElement.lastElementChild;
      let cursorClone;
      let cursorCloneHeight = 0;
      let accumulatedHeight = 0;
      let accumulatedCount = 0;
      let fragmentCount = 0;
      let cursorChild;
      while (cursorFragment && accumulatedHeight < screenHeight) {
        cursorClone = cursorFragment.cloneNode(true);
        cursorClone.setAttribute('data-id', cursorClone.id);
        cursorClone.removeAttribute('id');
        cursorClone.classList.add('measure');
        cursorClone.active = true;
        Object.assign(cursorClone.style, {
          position: 'absolute',
          bottom: '0px',
          left: '0px',
          width: '100%',
          backgroundColor: 'brown',
          opacity: '0.5'
        });
        this.scrollElement.append(cursorClone);
        cursorCloneHeight = cursorClone.offsetHeight;
        accumulatedHeight += cursorCloneHeight;
        if (accumulatedHeight < screenHeight) {
          accumulatedCount += cursorClone.children.length;
          cursorFragment = cursorFragment.previousElementSibling;
        } else {
          // Second, when screen height is filled,
          // count items inside last fragment
          let child = cursorClone.lastElementChild;
          while (child && accumulatedHeight - child.offsetTop <= screenHeight) {
            accumulatedCount += 1;
            child = child.previousElementSibling;
          }
          accumulatedCount += 1;
        }
        cursorClone.remove();
      }
      return accumulatedCount;
    }

    scrollTo (position) {
      // Normally position is anarray of indexes, but can be a string ('top', 'bottom', etc)
      if (Array.isArray(position)) {
        // If more than fragments, scroll to bottom
        if (position[0] && position[0] >= this.scrollElement.children.length) {
          this.scrollTo('bottom');
          return;
        }

        // If elements more then in current fragment,
        // then take next fragment and continue count
        let p = position.slice(0);
        while (p[1] && this.scrollbarTrackModel[p[0] + 1] && p[1] > this.scrollbarTrackModel[p[0] + 1]) {
          p[1] -= this.scrollbarTrackModel[p[0] + 1];
          p[0] += 1;
        }

        // Perform scroll
        this.scrollPositionElement.position = p;
      }

      // Scroll to top
      else if (position === 'top') {
        this.scrollPositionElement.position = [0];
      }

      // Scroll to bottom
      else if (position === 'bottom') {
        const lastFragmentIndex = this.scrollElement.children.length - 1;
        const lastFragment = this.scrollElement.lastElementChild;
        const lastElementIndex = lastFragment.active
          ? lastFragment.children.length - 1
          : lastFragment.children[0].content.children.length - 1;
        this.scrollPositionElement.position = [lastFragmentIndex, lastElementIndex, -1]
      }

      // Bad position warn
      else {
        console.warn('invalid scroll position');
      }
    }
  }

  customElements.define('book-scroll-control', HTMLBookScrollControlElement);

  return HTMLBookScrollControlElement;
}));
