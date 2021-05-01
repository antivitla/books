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
            min-height: var(--book-scrollbar-thumb-min-height, 50px);
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
      this.handleMouseThumbBinded = this.handleMouseThumb.bind(this);
      this.handleMouseTrackBinded = this.handleMouseTrack.bind(this);
    }

    cleanupTasks = [];
    complete = false;
    initUrlComplete = false;

    DEFAULT_POSITION = [0];
    DEFAULT_DEBOUNCE = 0;
    DEFAULT_THRESHOLD = 0;
    DEFAULT_SCROLL_FASTER = 'page';

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

    get positionInScrollbar () {
      return this.calculatePositionInScrollbar(this.scrollbarThumbPositionPx)
    }

    set positionInScrollbar (position) {

      // Set thumb size
      const thumbMinPx = this.scrollbarThumbMinHeightPx;
      const thumbSizePx = this.scrollbarThumbPoints * this.scrollbarPointSizePx;
      this.setScrollbarThumbElementSizePx(Math.max(thumbMinPx, thumbSizePx));

      // Set thumb position
      const positionPoint = this.scrollbarTrackModel[position[0]] + position[1];
      const totalPoints = this.scrollbarTotalPoints;
      const trackSizePx = this.scrollbarTrackSizePx;
      this.setScrollbarThumbElementPositionPx(trackSizePx * positionPoint / totalPoints);
    }

    get initScrollbarComplete () {
      return Boolean(this.scrollbarTrackElement && this.scrollbarThumbElement);
    }

    // Scrollbar data
    get scrollbarTrackModel () {
      if (!this.__scrollbarTrackModel) {
        this.__scrollbarTrackModel = this.calculateScrollTrackModel();
      }
      return this.__scrollbarTrackModel;
    }
    get scrollbarThumbPoints () {
      if (!this.__scrollbarThumbPoints) {
        this.__scrollbarThumbPoints = this.calculateScrollThumbSizePoints();
      }
      return this.__scrollbarThumbPoints;
    }
    get scrollbarTotalPoints () {
      return this.scrollbarTrackModel[this.scrollbarTrackModel.length - 1];
    }
    get scrollbarTrackFullSizePx () {
      if (!this.__scrollbarTrackFullSizePx) {
        this.__scrollbarTrackFullSizePx = this.scrollbarTrackElement.getBoundingClientRect().height;
      }
      return this.__scrollbarTrackFullSizePx;
    }
    get scrollbarTrackSizePx () {
      if (!this.__scrollbarTrackSizePx) {
        const thumbSizePx = this.scrollbarThumbPoints * this.scrollbarPointSizePx;
        this.__scrollbarTrackSizePx = this.scrollbarTrackFullSizePx - (
          thumbSizePx < this.scrollbarThumbMinHeightPx
            ? this.scrollbarThumbMinHeightPx - thumbSizePx
            : 0
        );
      }
      return this.__scrollbarTrackSizePx;
    }
    get scrollbarThumbMinHeightPx () {
      if (!this.__scrollbarThumbMinHeightPx) {
        this.__scrollbarThumbMinHeightPx = parseInt(
          getComputedStyle(this.scrollbarThumbElement).minHeight, 10
        );
      }
      return this.__scrollbarThumbMinHeightPx;
    }
    get scrollbarThumbSizePx () {
      if (!this.__scrollbarThumbSizePx) {
        this.__scrollbarThumbSizePx = Math.max(
          this.scrollbarThumbMinHeightPx,
          this.scrollbarThumbPoints * this.scrollbarPointSizePx
        );
      }
      return this.__scrollbarThumbSizePx;
    }
    get scrollbarPointSizePx () {
      return this.scrollbarTrackFullSizePx / this.scrollbarTotalPoints;
    }
    get scrollbarThumbPositionPx () {
      return this.__scrollbarThumbPositionPx;
    }
    get scrollbarTrackElementRect () {
      if (!this.__scrollbarTrackElementRect) {
        this.__scrollbarTrackElementRect = this.scrollbarTrackElement.getBoundingClientRect();
      }
      return this.__scrollbarTrackElementRect;
    }

    setScrollbarThumbElementSizePx (size) {
      this.scrollbarThumbElement.style.height = `${size}px`;
    }
    setScrollbarThumbElementPositionPx (y) {
      this.__scrollbarThumbPositionPx = y;
      this.scrollbarThumbElement.style.top = `${y}px`;
    }

    clearScrollbarCache () {
      delete this.__scrollbarTrackModel;
      delete this.__scrollbarThumbPoints;
      // delete this.__scrollbarTotalPoints;
      delete this.__scrollbarTrackFullSizePx;
      delete this.__scrollbarTrackSizePx;
      delete this.__scrollbarThumbMinHeightPx;
      delete this.__scrollbarThumbSizePx;
      // delete this.__scrollbarPointSizePx;
      delete this.__scrollbarTrackElementRect;
    }

    get scrollDebounce () {
      return parseInt(this.getAttribute('scroll-debounce') || this.DEFAULT_DEBOUNCE, 10);
    }

    get scrollThreshold () {
      return parseInt(this.getAttribute('scroll-threshold') || this.DEFAULT_THRESHOLD, 10);
    }

    get scrollFaster () {
      return this.getAttribute('scroll-faster') || this.DEFAULT_SCROLL_FASTER;
    }

    attributeChangedCallback (name, oldValue, newValue) {
      if (['for', 'type'].indexOf(name) > -1 && newValue && newValue !== oldValue) {
        // Init DOM for different control types
        if (name === 'type') {
          if (['scrollbar', 'toc', 'running'].indexOf(newValue) > -1) {
            // remove old controls
            for(let el of this.shadowRoot.querySelectorAll('.control')) el.remove();
            // add new ones
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

        // Init scrollbar
        if (this.controlType === 'scrollbar' && this.scrollbarThumbElement) {
          // Refresh on resize
          window.addEventListener('resize', this.handleResizeBinded);
          this.cleanupTasks.push(() => {
            window.removeEventListener('resize', this.handleResizeBinded);
          });
          // Drag thumb
          this.scrollbarThumbElement.addEventListener('mousedown', this.handleMouseThumbBinded);
          document.addEventListener('mouseup', this.handleMouseThumbBinded);
          document.addEventListener('mousemove', this.handleMouseThumbBinded);
          this.cleanupTasks.push(() => {
            this.scrollbarThumbElement.removeEventListener('mousedown', this.handleMouseThumbBinded);
            document.removeEventListener('mouseup', this.handleMouseThumbBinded);
            document.removeEventListener('mousemove', this.handleMouseThumbBinded);
          });
          // Track click
          this.scrollbarTrackElement.addEventListener('click', this.handleMouseTrackBinded);
          this.cleanupTasks.push(() => {
            this.scrollbarTrackElement.removeEventListener('click', this.handleMouseTrackBinded);
          });
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
      const position = event.detail;
      // Control type 'url': apply position to url hash (when when ready)
      if (this.controlType === 'url' && this.initUrlComplete) {
        this.positionInUrl = position;
      }
      // Control type: 'scrollbar': apply position to bar track
      else if (
        this.controlType === 'scrollbar' &&
        this.initScrollbarComplete &&
        !this.__dragPending
      ) {
        this.positionInScrollbar = position;
      }
    }

    handleKey (event) {
      if (event.code.match(/home|end|pageup|pagedown/i)) {
        this.scrollTo(event.code.toLowerCase());
        event.preventDefault();
        event.stopPropagation();
      }
    }

    handleResize () {
      clearTimeout(this.__resizeTimeout);
      this.__resizeTimeout = setTimeout(() => {
        this.clearScrollbarCache();
      }, 500);
    }

    handleMouseTrack (event) {
      // If clicked on scrollbar track, scroll page down/up,
      // depending on click position relative to thumb
      if (event.target === this.scrollbarTrackElement) {
        if (this.scrollFaster === 'position') {
          const offsetY = event.clientY - this.scrollbarTrackElement.getBoundingClientRect().top;
          this.scrollTo(this.calculatePositionInScrollbar(offsetY));
        } else {
          const offsetDelta = event.clientY - this.scrollbarThumbElement.getBoundingClientRect().top;
          this.scrollTo(offsetDelta > 0 ? 'pagedown' : 'pageup');
        }
      }
    }

    handleMouseThumb (event) {
      // Early exit
      if (event.type === 'mousemove' && !this.__dragPending) {
        return;
      }

      // Perform drag calculations
      else if (event.type === 'mousemove' && this.__dragPending) {
        // Move up or down depending on mouse move delta
        let delta;
        let top;
        if (
          typeof this.__dragPreviousClientY !== 'undefined' &&
          typeof this.__dragPreviousTop !== 'undefined'
        ) {
          delta = event.clientY - this.__dragPreviousClientY;
          top = this.__dragPreviousTop + delta;
        } else {
          const currentTop = this.scrollbarThumbElement.getBoundingClientRect().top
          delta = event.clientY - currentTop;
          top = currentTop + delta;
        }
        this.__dragPreviousClientY = event.clientY;

        // Truncate 'y' position, taking thumb shift relative to mouse pointer into account
        let correction = this.__dragShift + this.scrollbarTrackElementRect.top;
        if (top - correction < 0) {
          top = correction;
        } else if (top - correction  > this.scrollbarTrackFullSizePx - this.scrollbarThumbSizePx) {
          top = this.scrollbarTrackFullSizePx - this.scrollbarThumbSizePx + correction;
        }
        this.__dragPreviousTop = top; // keep mouse position (not thumb position)

        // Move thumb
        this.setScrollbarThumbElementPositionPx(top - correction);

        // Scroll book (with threshold or debounce)
        if (this.scrollThreshold) {
          if (!this.__dragThreshold) {
            this.__dragThreshold = setTimeout(() => {
              this.scrollTo(this.positionInScrollbar);
              delete this.__dragThreshold;
            }, this.scrollThreshold);
          }
        } else if (this.scrollDebounce) {
          clearTimeout(this.__dragThreshold);
          this.__dragThreshold = setTimeout(() => {
            this.scrollTo(this.positionInScrollbar);
            delete this.__dragThreshold;
          }, this.scrollDebounce);
        }
      }

      // Start drag (potentially)
      else if (event.type === 'mousedown') {
        this.scrollElement.style.userSelect = 'none'; // prevent accidental text selecting
        this.__dragPending = true;
        this.__dragShift = event.clientY - this.scrollbarThumbElement.getBoundingClientRect().top;
      }

      // Stop drag
      else if (event.type === 'mouseup') {
        this.scrollElement.style.userSelect = null;
        delete this.__dragPending;
        delete this.__dragShift;
        delete this.__dragPreviousClientY;
        delete this.__dragPreviousTop;
      }
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

    calculatePositionInScrollbar (px) {
      if (typeof px === 'undefined') {
        px = this.scrollbarThumbPositionPx;
      }
      let positionRelative = px / this.scrollbarTrackSizePx;
      let positionPoints = positionRelative * this.scrollbarTotalPoints;
      let positionShift = positionPoints % 1;
      let fragment = 0;
      while (this.scrollbarTrackModel[fragment] < positionPoints) {
        fragment += 1;
      }
      let position = [
        fragment ? fragment - 1 : 0,
        Math.floor(positionPoints) - this.scrollbarTrackModel[fragment ? fragment - 1 : 0],
        -1 * positionShift
      ];
      return position;
    }

    scrollTo (position) {
      // Normally position is an array of indexes,
      // but can be a string ('top', 'bottom', etc)
      if (Array.isArray(position)) {

        // If too much fragments, scroll to bottom
        if (position[0] && position[0] >= this.scrollElement.children.length) {
          this.scrollTo('end');
          return;
        }

        // If at top, use scrollTp('top') to have precise auto-shift
        if (position[0] === 0 && position[1] === 0 && position[2] === 0) {
          this.scrollTo('home');
          return;
        }

        // If at bottom, use scrollTo('bottom') to have precise auto-shift
        const model = this.scrollbarTrackModel;
        if (
          position[0] === model.length - 2 &&
          position[1] >= model[model.length - 2] - model[model.length - 3]
        ) {
          this.scrollTo('end');
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
      else if (position === 'home') {
        this.scrollPositionElement.position = [0];
      }

      // Scroll to bottom
      else if (position === 'end') {
        const lastFragmentIndex = this.scrollElement.children.length - 1;
        const lastFragment = this.scrollElement.lastElementChild;
        const lastElementIndex = lastFragment.active
          ? lastFragment.children.length - 1
          : lastFragment.children[0].content.children.length - 1;
        this.scrollPositionElement.position = [lastFragmentIndex, lastElementIndex, -1]
      }

      // Scroll page up
      else if (position === 'pageup') {
        this.scrollElement.scrollBy(0, -0.9 * this.scrollElement.offsetHeight);
      }

      // Scroll page down
      else if (position === 'pagedown') {
        this.scrollElement.scrollBy(0, 0.9 * this.scrollElement.offsetHeight);
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
