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
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

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

          /* Running */

          :host([type="running"]) {
            display: block;
            padding-right: 20px;
          }

          .running-breadcrumbs {
            font-size: small;
            text-align: center;
            margin-bottom: 0.5rem;
          }

          .running-breadcrumbs:empty {
            display: none;
          }

          .running-breadcrumbs header {
            display: inline;
            cursor: pointer;
          }

          .running-breadcrumbs header:hover {
            text-decoration: underline;
          }

          .running-breadcrumbs header .prefix:after {
            content: '. ';
          }

          .running-breadcrumbs .divider:after {
            content: ' — '
          }

          .running-header {
            text-align: center;
          }

          .running-header:empty:after {
            content: '';
            display: block;
            width: 24px;
            height: 24px;
            border: solid 2px #303030;
            border-right-color: transparent;
            border-radius: 50%;
            box-sizing: border-box;
            margin: 3px auto;
            animation: spin 0.5s linear infinite;
          }

          .running-header .prefix:after {
            content: '. ';
          }

          /* Index */

          :host([type="index"]) {
            display: block;
            background-color: var(--book-index-background-color, transparent);
            color: var(--book-index-color, inherit);
            font-size: var(--book-index-font-size, inherit);
            line-height: var(--book-index-line-height, 1.375);
          }

          .index:empty:after {
            content: '';
            display: block;
            width: 24px;
            height: 24px;
            border: solid 2px #303030;
            border-right-color: transparent;
            border-radius: 50%;
            box-sizing: border-box;
            margin: 3px auto;
            animation: spin 0.5s linear infinite;
          }

          .index ul {
            padding: 0;
            margin: 0;
          }

          .index li {
            list-style: none;
            margin: 0.5rem 0;
          }

          .index header {
            cursor: pointer;
          }

          .index header:hover {
            /* text-decoration: underline; */
            /* border-left: inset solid 2px; */
          }

          .index li header {
            padding-left: 0.75rem;
          }

          .index li li header {
            padding-left: 1.5rem;
          }

          .index li li li header {
            padding-left: 2.25rem;
          }

          .index li li li li header {
            padding-left: 3rem;
          }

          .index li li li li li header {
            padding-left: 3.75rem;
          }

          .index li li li li li li header {
            padding-left: 4.5rem;
          }

          .index header .author {
            display: block;
            font-size: 75%;
          }

          .index header .prefix {
            display: block;
            font-size: 75%;
          }

          /*

          .index-entry {
            list-style: none;
            margin-bottom: 0.5rem;
            cursor: pointer;
          }

          .index-entry[data-depth="1"] {
            margin-left: 0rem;
          }

          .index-entry[data-depth="2"] {
            margin-left: 0.25rem;
          }

          .index-entry[data-depth="3"] {
            margin-left: 0.5rem;
          }

          .index-entry[data-depth="4"] {
            margin-left: 1rem;
            font-size: 87.5%;
          }

          .index-entry[data-depth="5"] {
            margin-left: 1.25rem;
            font-size: 75%;
          }

          .index-entry[data-depth="6"] {
            margin-left: 1.5rem;
            font-size: 62.5%;
          }

          .index-entry-prefix {
            font-size: 75%;
          }

          .index-entry-author {
            font-size: 75%;
          }

          */
        </style>
        <template type="scrollbar">
          <div class="control scrollbar-track">
            <div class="scrollbar-thumb"></div>
          </div>
        </template>
        <template type="index">
          <div class="control index"></div>
        </template>
        <template type="running">
          <div class="control running">
            <div class="running-breadcrumbs"></div>
            <div class="running-header"></div>
          </div>
        </template>
      `;

      // Bind handlers
      this.handleChangeBinded = this.handleChange.bind(this);
      this.handleKeyBinded = this.handleKey.bind(this);
      this.handleResizeBinded = this.handleResize.bind(this);
      this.handleMouseThumbBinded = this.handleMouseThumb.bind(this);
      this.handleMouseTrackBinded = this.handleMouseTrack.bind(this);
      this.handleClickPositionElementBinded = this.handleClickPositionElement.bind(this);
    }

    cleanupTasks = [];
    complete = false;
    initUrlComplete = false;
    runningTimeout = 100;
    resizeTimeout = 500;

    DEFAULT_POSITION = [0];
    DEFAULT_DEBOUNCE = 0;
    DEFAULT_THRESHOLD = 0;
    DEFAULT_SCROLL_FASTER = 'page';
    DEFAULT_RUNNING_DEPTH = 2;


    // Public properties

    get controlType () {
      return this.getAttribute('type');
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

    get runningDepth () {
      return parseInt(this.getAttribute('running-depth') || this.DEFAULT_RUNNING_DEPTH, 10);
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
      return this.calculatePositionInScrollbar(this.scrollbarThumbPositionPx);
    }

    set positionInScrollbar (position) {
      const thumbMinPx = this.scrollbarThumbMinHeightPx;
      const thumbSizePx = this.scrollbarThumbPoints * this.scrollbarPointSizePx;
      this.setScrollbarThumbElementSizePx(Math.max(thumbMinPx, thumbSizePx));
      const positionPoint = this.scrollbarTrackModel[position[0]] + position[1];
      const totalPoints = this.scrollbarTotalPoints;
      const trackSizePx = this.scrollbarTrackSizePx;
      this.setScrollbarThumbElementPositionPx(trackSizePx * positionPoint / totalPoints);
    }

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

    get indexModelPromise () {
      if (!this.__indexModelPromise) {
        if (!this.__indexModel) {
          this.__indexModelPromise = this.calculateIndexModel().then(model => {
            this.__indexModel = model;
            return this.__indexModel;
          });
        } else {
          this.__indexModelPromise = new Promise(resolve => resolve(this.__indexModel));
        }
      }
      return this.__indexModelPromise;
    }

    get indexModelTreePromise () {
      if (!this.__indexModelTreePromise) {
        if (!this.__indexModelTree) {
          this.__indexModelTreePromise = this.indexModelPromise.then(model => {
            this.__indexModelTree = this.calculateIndexModelTree(model);
            return this.__indexModelTree;
          });
        } else {
          this.__indexModelTreePromise = new Promise(resolve => resolve(this.__indexModelTree));
        }
      }
      return this.__indexModelTreePromise;
    }


    // DOM references

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

    get indexElement () {
      return this.shadowRoot.querySelector('.index');
    }

    get runningHeaderElement () {
      return this.shadowRoot.querySelector('.running-header');
    }

    get runningBreadcrumbsElement () {
      return this.shadowRoot.querySelector('.running-breadcrumbs');
    }


    // Public methods

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


    // Lifecycle callbacks

    static get observedAttributes () {
      return ['for', 'type'];
    }

    attributeChangedCallback (name, oldValue, newValue) {
      if (['for', 'type'].indexOf(name) > -1 && newValue && newValue !== oldValue) {
        // Init DOM for different control types
        if (name === 'type') {
          if (['scrollbar', 'index', 'running'].indexOf(newValue) > -1) {
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
      // Init requires scrollElement and scrollPositionElement
      // to be present. We try to init at key time points, hoping
      // to have them in DOM. At last, if they wont, we setup
      // waiting each second until they appear.
      // 1. Setup right away
      if (!this.complete) this.complete = this.setupCallback();
      // 2. If failed, setup on DOM ready
      if (!this.complete && document.readyState === 'loading') {
        document.addEventListener('readystatechange', () => this.connectedCallback(), {once: true});
      }
      // 3. If failed, just wait on timeout
      if (!this.complete && document.readyState !== 'loading') {
        setTimeout(() => this.connectedCallback(), 800 + Math.floor(Math.random() * 400));
      }
    }

    disconnectedCallback () {
      this.cleanup();
    }

    setupCallback () {
      if (this.scrollElement && this.scrollPositionElement) {
        this.cleanup();

        // Common
        this.listen('change', this.scrollPositionElement, this.handleChangeBinded);

        // Type: keyboard
        if (this.controlType === 'keyboard') {
          this.listen('keyup', document, this.handleKeyBinded);
        }

        // Type: scrollbar
        else if (this.controlType === 'scrollbar' && this.scrollbarThumbElement) {
          this.listen('resize', window, this.handleResizeBinded);
          this.listen('mousedown', this.scrollbarThumbElement, this.handleMouseThumbBinded);
          this.listen('mouseup', document, this.handleMouseThumbBinded);
          this.listen('mousemove', document, this.handleMouseThumbBinded);
          this.listen('click', this.scrollbarTrackElement, this.handleMouseTrackBinded);
        }

        // Type: index
        else if (this.controlType === 'index' && this.indexElement) {
          this.listen('click', this.indexElement, this.handleClickPositionElementBinded);
        }

        // Type: running
        else if (this.controlType === 'running') {
          this.listen(
            'click', this.runningBreadcrumbsElement, this.handleClickPositionElementBinded
          );
        }

        // Setup callback when all fragments with DOM are loaded
        const children = Array.from(this.scrollElement.children);
        const checkComplete = () => {
          if (!children.filter(child => !child.complete).length) {
            this.scrollElement.removeEventListener('load', checkComplete);
            this.fragmentsCompletedCallback();
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

    fragmentsCompletedCallback () {
      // 1. State: only fragments DOM ready, styles are not ready

      // Type: scrollbar
      if (this.controlType === 'scrollbar') {
        this.__scrollbarTrackModel = this.calculateScrollTrackModel();
      }

      // Type: index
      else if (this.controlType === 'index') {
        this.indexModelPromise.then(model => {
          // this.renderIndex(model, this.indexElement);
        });
        this.indexModelTreePromise.then(tree => {
          this.renderIndexTree(tree, this.indexElement);
        });
      }

      // 2. State: when resolved, DOM and styles will be ready
      (function () {
        return new Promise(resolve => {
          const check = () => {
            if (document.readyState === 'complete') {
              document.removeEventListener('readystatechange', check);
              resolve();
              return true;
            }
          }
          if (!check()) document.addEventListener('readystatechange', check);
        });
      }()).then(() => {

        // Type: url
        if (this.controlType === 'url') {
          this.scrollTo(this.positionInUrl);
          this.initUrlComplete = true;
        }

        // Common
        this.scrollPositionElement.emitPositionChange();
      });
    }

    cleanup () {
      while(this.cleanupTasks.length) this.cleanupTasks.pop()();
    }

    listen (event, element, callback) {
      element.addEventListener(event, callback);
      this.cleanupTasks.push(() => {
        element.removeEventListener(event, callback);
      });
    }


    // Events

    handleChange (event) {
      const position = event.detail;

      // Type: url (set position to url)
      if (this.controlType === 'url' && this.initUrlComplete) {
        this.positionInUrl = position;
      }

      // Type: scrollbar (set thumb position on scrollbar)
      else if (
        this.controlType === 'scrollbar' &&
        Boolean(this.scrollbarTrackElement && this.scrollbarThumbElement) &&
        !this.__dragPending
      ) {
        this.positionInScrollbar = position;
      }

      // Type: running (render running header & breadcrumbs)
      else if (this.controlType === 'running') {
        delete this.__runningTimeoutId;
        this.__runningTimeoutId = setTimeout(() => {
          this.indexModelPromise.then(model => {
            const running = this.calculateRunningFromIndexModel(model, position);
            this.renderHeader(running.header, this.runningHeaderElement);
            this.renderBreadcrumbs(running.breadcrumbs, this.runningBreadcrumbsElement);
          });
        }, this.runningTimeout);
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
      clearTimeout(this.__resizeTimeoutId);
      this.__resizeTimeoutId = setTimeout(() => {
        this.clearScrollbarCache();
      }, this.resizeTimeout);
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

        // Render thumb
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

    handleClickPositionElement (event) {
      const positionElement = event.target.closest('[data-position]');
      if (event.type === 'click' && positionElement) {
        let position = this.parsePosition(positionElement.getAttribute('data-position'));
        if (position.length) {
          this.scrollTo(position);
        } else {
          console.warn(new Error('Bad position'));
        }
      }
    }


    // Expensive calculations

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
          opacity: '0'
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

    calculateRunningFromIndexModel (model, position) {
      // Calculate header
      let headerIndex = model.findIndex((item, i) => {
        return (
          item.position[0] <= position[0] &&
          item.position[1] <= position[1] &&
          (
            !model[i + 1] ||
            model[i + 1].position[0] > position[0] ||
            (model[i + 1].position[0] === position[0] && model[i + 1].position[1] > position[1])
          )
        );
      });
      while (model[headerIndex].depth > this.runningDepth) headerIndex -= 1;
      const runningHeader = model[headerIndex];

      // Calculate breadcrumbs
      let depth = runningHeader.depth;
      let runningBreadcrumbs = []
      while (depth > 0 && headerIndex > 0) {
        headerIndex -= 1;
        if (
          model[headerIndex].depth < (runningBreadcrumbs.length
            ? runningBreadcrumbs.slice(-1)[0].depth
            : runningHeader.depth)
        ) {
          runningBreadcrumbs.push(model[headerIndex]);
          depth -= 1;
        }
      }

      return {header: runningHeader, breadcrumbs: runningBreadcrumbs.reverse()};
    }

    async calculateIndexModel () {
      // map headers to position
      // map position to headers
      // have a tree of headers
      const headers = []; // Resulting headers list
      const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']; // index tags
      const fragmentsTotal = this.scrollElement.children.length;
      let fragmentPosition = 0; // Position[0]
      for await (let fragmentElement of this.scrollElement.children) {
        const fragment = fragmentElement.active
          ? fragmentElement
          : fragmentElement.children[0].content;
        for await (let tag of tags) {
          for await (let header of fragment.querySelectorAll(tag)) {
            await new Promise(resolve => {
              header.classList.add('index');
              setTimeout(() => resolve(), 5);
            });
          }
        }
        // Collect headers in their order
        for (let header of fragment.querySelectorAll('.index')) {
          let headerParent = header;
          let headerPosition = -1; // Position[1]
          while (headerPosition === -1 && headerParent !== fragment) {
            headerPosition = Array.prototype.indexOf.call(fragment.children, headerParent);
            headerParent = header.parentElement;
          }
          headers.push({
            depth: parseInt(header.tagName.match(/\d+/)[0] || 1, 10),
            title: header.textContent,
            prefix: header.closest('header')?.querySelector('.prefix')?.textContent,
            author: header.closest('header')?.querySelector('.author')?.textContent,
            position: [fragmentPosition, headerPosition]
          });
        }
        fragmentPosition += 1;
        // this.dispatchEvent(new CustomEvent('book-scroll-control:index-loading-progress', {
        //   bubbles: true,
        //   detail: {
        //     current: fragmentPosition,
        //     total: fragmentsTotal
        //   }
        // }));
      }
      return headers;
    }

    calculateIndexModelTree (model) {
      const tree = {root: true, children: []};
      let branch = tree;
      function prev () {
        return branch.children[branch.children.length - 1];
      }
      model.forEach((header, index) => {
        let prev = branch.children[branch.children.length - 1];
        // Rules:
        // Next header is either:
        // - same depth
        // - next depth (always +1, not more)
        // - lower depth, parent. This one should find nearest same depth in ancestors
        if (index === 0 || header.depth === prev.depth) {
          branch.children.push(header);
          header.parent = branch;
        } else if (header.depth > prev.depth) {
          prev.children = [header];
          header.parent = prev;
          branch = prev;
        } else if (header.depth < prev.depth) {
          // let parent = header.parent;
          while (header.depth <= branch.depth && branch.parent) branch = branch.parent;
          branch.children.push(header);
          header.parent = branch;
        }
      });
      return tree;
      console.log(tree);
    }


    // Utils

    parsePosition (string) {
      return (string || '').split(',').map(i => {
        let float = parseFloat(i);
        let int = parseInt(i, 10);
        if (float === int) return int;
        else return float;
      });
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


    // Render methods

    setScrollbarThumbElementSizePx (size) {
      this.scrollbarThumbElement.style.height = `${size}px`;
    }

    setScrollbarThumbElementPositionPx (y) {
      this.__scrollbarThumbPositionPx = y;
      this.scrollbarThumbElement.style.top = `${y}px`;
    }

    renderIndex (model, element) {
      const indexElement = document.createDocumentFragment();
      const template = document.createElement('template');
      model.forEach(header => {
        template.innerHTML = this.branchHTML(header);
        indexElement.append(template.content);
      });
      element.replaceChildren(indexElement);
    }

    renderIndexTree (tree, element) {
      const template = document.createElement('template');
      template.innerHTML = `<ul>${
        tree.children.map(branch => this.branchHTML(branch)).join('')
      }</ul>`;
      element.replaceChildren(template.content);
    }

    renderHeader (header, element) {
      const template = document.createElement('template');
      template.innerHTML = this.headerHTML(header);
      element.replaceChildren(template.content);
    }

    renderBreadcrumbs (breadcrumbs, element) {
      const template = document.createElement('template');
      template.innerHTML = breadcrumbs
        .map(header => this.headerHTML(header))
        .join('<span class="divider"></span>');
      element.replaceChildren(template.content);
    }

    branchHTML (branch) {
      if (!branch.children || !branch.children.length) {
        return `<li>${this.headerHTML(branch)}</li>`;
      } else {
        return `<li>${this.headerHTML(branch)}<ul>${
          branch.children.map(child => this.branchHTML(child)).join('')
        }</ul></li>`;
      }
    }

    headerHTML (header) {
      return `<header data-position="${header.position.join(',')} data-depth="${header.depth}">${
        ['author', 'prefix', 'title'].map(item => {
          return header[item] ? `<span class="${item}">${header[item]}</span>` : '';
        }).join('')
      }</header>`;
    }
  }

  customElements.define('book-scroll-control', HTMLBookScrollControlElement);

  return HTMLBookScrollControlElement;
}));
