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

} (this, 'HTMLBookControlElement', function (HTMLBookElement) {
  'use strict';

  class HTMLBookControlElement extends HTMLBookElement {
    constructor () {
      super();
    }

    DEFAULT = {
      dragDebounce: 200,
      dragThreshold: 100
    };

    // Properties

    get for () { return this.getAttribute('for'); }

    get controlType () { return this.getAttribute('type'); }

    get dragDebounce () {
      return parseInt(this.getAttribute('drag-debounce') || this.DEFAULT.dragDebounce, 10);
    }

    get dragThreshold () {
      return parseInt(this.getAttribute('drag-threshold') || this.DEFAULT.dragThreshold, 10);
    }

    get scrollFaster () { return this.getAttribute('scroll-faster'); }

    get debug () { return this.getBooleanAttribute('debug'); }

    get trackModel () {
      return this.getCached('trackModel', () => this.calculateTrackModel());
    }

    get indexModel () {
      return this.getCached('indexModel', () => this.calculateIndexModel());
    }

    get indexTreeModel () {
      return this.getCached('indexTreeModel', () => this.calculateIndexTreeModel());
    }

    get bookPosition () {
      return this.getCached('bookPosition', () => this.bookPositionElement.getPosition());
    }


    // DOM references

    get bookScrollElement () {
      return this.getCached('bookScrollElement', () => {
        return document.getElementById(this.for);
      });
    }

    get bookPositionElement () {
      return this.getCached('bookPositionElement', () => {
        return document.querySelector(`book-position[for="${this.for}"]`);
      });
    }


    // Lifecycle callbacks

    static get observedAttributes () { return ['for', 'type']; }

    attributeChangedCallback (name, previousValue, value) {
      if (value !== previousValue && this.isConnected) {
        switch (name) {
          case 'for':
            this.bookReferenceChangedCallback(value);
            break;
          case 'type':
            this.controlTypeChangedCallback(value);
            break;
          default:
            break;
        }
      }
    }

    connectedCallback () {
      this.listen('change', document, this.handlePositionChange);
      if (this.for) this.bookReferenceChangedCallback(this.for);
      if (this.controlType) this.controlTypeChangedCallback(this.controlType);
      // Collect and cleanup props set by 'setCached'
      this.cleanupTasks.push(() => this.deleteCached([
        'bookScrollElement',
        'bookPositionElement',
        'bookPosition',
        'trackModel',
        'indexModel',
        'indexTreeModel',
        'typeScrollbarThumbInitialHeight',
        'typeScrollbarThumbMinHeight',
        'typeScrollbarThumbIsDistorted',
        'typeScrollbarDragClientY',
        'typeScrollbarDragTop',
        'typeScrollbarDragThreshold',
        'typeScrollbarDragDebounce',
        'typeScrollbarHandleResizeTimeout',
        'typeScrollbarThumbTop'
      ]));
    }

    disconnectedCallback () {
      this.cleanup();
    }

    bookReferenceChangedCallback (id) {
      // Clear cached book* elements
      this.deleteCached(['bookScrollElement', 'bookPositionElement']);

      // Await bookPosition element
      this.awaitElement(`book-position[for="${id}"]`)
        .then(element => this.setCached('bookPositionElement', element))
        .then(element => {
          if (this.controlType === 'scrollbar') {
            this.typeScrollbarHideNative(id);
          }
        });

      // Await new bookScroll element
      this.awaitElement(`#${id}`)
        // Replace bookScroll in cache
        .then(element => this.setCached('bookScrollElement', element))
        // Wait for new bookScroll element's content available
        .then(element => this.awaitChildrenComplete(element))
        // Calculate book models
        .then(() => {
          this.deleteCached(['trackModel', 'indexModel', 'indexTreeModel']);
          // For given book id there might be already saved models. Since
          // book is not expected to change, this might be calculated only once per book
          ['track', 'index', 'indexTree'].forEach(name => {
            let model;
            const key = `${this.for}--${name}`;
            if (!localStorage.getItem(key)) {
              model = this[`calculate${name.replace(/^./, name.charAt(0).toUpperCase())}Model`]();
              // localStorage.setItem(key, JSON.stringify(model));
            } else {
              model = JSON.parse(localStorage.getItem(key));
            }
            this.setCached(`${name}Model`, model);
          });
          // Now all models should be ready
          this.bookModelAvailableCallback();
        })
        // Wait for document styled
        .then(() => this.awaitStyled())
        .then(() => this.bookStyledCallback());
    }

    controlTypeChangedCallback (type) {
      this.cleanup('type');
      switch (type) {
        case 'url':
          this.shadowRoot.innerHTML = this.typeUrlShadowHTML; // change template
          break;
        case 'keyboard':
          this.shadowRoot.innerHTML = this.typeKeyboardShadowHTML; // change template
          this.listen('keyup', document, this.typeKeyboardHandleKeyup, 'type');
          break;
        case 'scrollbar':
          this.shadowRoot.innerHTML = this.typeScrollbarShadowHTML; // change template
          if (this.for) this.typeScrollbarHideNative(this.for);
          this.listen('mousedown',
            this.typeScrollbarThumbElement, this.typeScrollbarHandleMousedown, 'type'
          );
          this.listen('mouseup', document, this.typeScrollbarHandleMouseup, 'type');
          this.listen('mousemove', document, this.typeScrollbarHandleMousemove, 'type');
          this.listen('resize', window, this.typeScrollbarHandleResize, 'type');
          this.listen('click',
            this.typeScrollbarTrackElement, this.typeScrollbarHandleClick, 'type'
          );
          break;
        default:
          break;
      }
    }

    bookModelAvailableCallback () {
      console.warn('Base method to override when book models are ready');
    }

    bookStyledCallback () {
      switch (this.controlType) {
        case 'url':
          let position = this.calculatePositionFromUrl();
          if (position) this.scrollTo(position);
          this.typeUrlComplete = true;
          break;
        default:
          break;
      }
    }


    // Event handlers

    handlePositionChange ({ detail: bookPosition, target }) {
      if (target === this.bookPositionElement) {
        this.setCached('bookPosition', bookPosition);
        switch (this.controlType) {
          case 'url':
            if (this.typeUrlComplete) {
              this.renderUrl(this.calculateUrlFromPosition(bookPosition));
            }
            break;
          case 'scrollbar':
            if (!this.typeScrollbarDragInProgress) {
              this.renderScrollbar(this.calculateScrollbarFromPosition(bookPosition));
            }
            break;
          default:
            break;
        }
      }
    }


    // Main scroll method

    scrollTo (position) {
      // Normally position is an array of indexes,
      // but can be a string ('top', 'bottom', etc)
      if (Array.isArray(position)) {

        // If too much fragments, scroll to bottom
        if (position[0] && position[0] >= this.bookScrollElement.childElementCount) {
          this.scrollTo('end');
          return;
        }

        // If at top, use scrollTp('top') to have precise auto-shift
        if (position[0] === 0 && position[1] === 0 && position[2] === 0) {
          this.scrollTo('home');
          return;
        }

        // Shortcut model
        const model = this.trackModel;

        // If at bottom, use scrollTo('bottom') to have precise auto-shift
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
        while (p[1] && model[p[0] + 1] && p[1] > model[p[0] + 1]) {
          p[1] -= model[p[0] + 1];
          p[0] += 1;
        }

        // Perform scroll
        this.bookPositionElement.setPosition(p);
      }

      // Scroll to top
      else if (position === 'home') {
        const shift = 1000;  // big shift to ensure real top
        this.bookPositionElement.setPosition([0, 0, shift]);
      }

      // Scroll to bottom
      else if (position === 'end') {
        const lastFragmentIndex = this.bookScrollElement.childElementCount - 1;
        const lastFragment = this.bookScrollElement.lastElementChild;
        const lastElementIndex = lastFragment.active
          ? lastFragment.childElementCount - 1
          : lastFragment.children[0].content.childElementCount - 1;
        const shift = -1000;  // big shift to ensure real bottom
        this.bookPositionElement.setPosition([lastFragmentIndex, lastElementIndex, shift]);
      }

      // Scroll page up
      else if (position === 'pageup') {
        this.bookScrollElement.scrollBy(0, -0.9 * this.bookScrollElement.offsetHeight);
      }

      // Scroll page down
      else if (position === 'pagedown') {
        this.bookScrollElement.scrollBy(0, 0.9 * this.bookScrollElement.offsetHeight);
      }

      // Bad position warn
      else {
        console.warn('invalid scroll position');
      }
    }


    // Calculated models and other expensive calculations

    calculateTrackModel () {
      const trackModel = [0];
      for (let fragment of this.bookScrollElement.children) {
        const count = fragment.active
          ? fragment.childElementCount
          : fragment.children[0].content.childElementCount;
        trackModel.push(trackModel[trackModel.length - 1] + count);
      }
      return trackModel;
    }

    calculateIndexModel () {
      const index = [];
      // Go through each fragment and collect headers. If fragment is inactive, we shoul
      // go into template
      Array.prototype.forEach.call(this.bookScrollElement.children, (child, childIndex, arr) => {
          const fragment = child.active ? child : child.children[0].content;
          const fragmentActive = child.active;
          const fragmentIndex = childIndex;
          Array.prototype.forEach.call(fragment.querySelectorAll('h1,h2,h3,h4,h5,h6'), header => {
            let headerParent = header;
            while (fragmentActive
              ? headerParent.parentElement !== fragment
              : headerParent.parentNode !== child.children[0].content
            ) {
              headerParent = fragmentActive
                ? headerParent.parentElement
                : headerParent.parentNode;
            }
            const headerIndex = Array.prototype.indexOf.call(fragment.children, headerParent);
            const complexHeader = header.closest('header');
            index.push({
              title: header.textContent,
              position: [fragmentIndex, headerIndex],
              depth: parseInt(header.tagName.replace(/^(h|H)/, ''), 10),
              prefix: complexHeader?.querySelector('.prefix')?.textContent,
              author: complexHeader?.querySelector('.author')?.textContent
            });
          });
        }
      );
      return index;
    }

    calculateIndexTreeModel () {
      const tree = {root: true, children: []};
      let branch = tree; // workhorse
      this.indexModel.forEach((header, index) => {
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
          while (header.depth <= branch.depth && branch.parent) branch = branch.parent;
          branch.children.push(header);
          header.parent = branch;
        }
      });
      function removeCircular (item) {
        delete item.parent;
        item.children?.map(child => removeCircular(child));
        return item;
      }
      return removeCircular(tree);
    }


    // Type: url

    typeUrlComplete = false;

    get typeUrlShadowHTML () {
      return `
        <style>
          :host([type="url"]) {
            display: none;
          }
        </style>
      `;
    }

    calculatePositionFromUrl () {
      let url = new URL(location.href);
      let hash = url.hash.replace(/^#/, '');
      if (hash) {
        let t = new URL(url.origin);
        t.search = hash;
        return this.parsePosition(decodeURIComponent(t.searchParams.get('position')));
      }
    }

    calculateUrlFromPosition (position) {
      let hash = location.hash.replace(/^#/, '');
      let t = new URL(location.origin);
      t.search = hash;
      t.searchParams.set('position', position.join(','));
      let url = new URL(location.href);
      url.hash = t.search;
      return url;
    }

    renderUrl (url) { history.replaceState(null, null, url.href); }


    // Type: keyboard

    get typeKeyboardShadowHTML () {
      return `
        <style>
          :host([type="keyboard"]) {
            display: none;
          }
        </style>
      `;
    }

    typeKeyboardHandleKeyup (event) {
      if (event.code.match(/home|end|pageup|pagedown/i)) {
        this.scrollTo(event.code.toLowerCase());
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }


    // Type: scrollbar

    typeScrollbarDragInProgress = false;

    get typeScrollbarShadowHTML () {
      return `
        <style>
          :host([type="scrollbar"]) {
            display: block;
            position: fixed;
            z-index: 1000;
            top: 4px;
            right: 4px;
            bottom: 4px;
            width: 12px;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
          }
          .scrollbar-track {
            display: block;
            position: relative;
            width: 100%;
            height: 100%;
            user-select: none;
          }
          .scrollbar-thumb {
            position: absolute;
            width: 100%;
            min-height: var(--book-scrollbar-thumb-min-height, 88px);
            right: 0px;
            top: 0px;
            border-radius: 4px;
            cursor: pointer;
            background-color: rgba(0, 0, 0, 0.625);
            user-select: none;
          }
          :host([type="scrollbar"]:hover),
          :host(.scrollbar-drag) {
            width: 24px;
          }
          .scrollbar-ruler {
            width: 100%;
            pointer-events: none;
          }
          .scrollbar-ruler-unit {
            position: absolute;
            left: calc(50%);
            width: 0px;
            box-shadow: 0px 0px 0px 1px var(--book-text-highlight-color);
            filter: brightness(1.25);
          }
          .scrollbar-ruler-unit:first-child,
          .scrollbar-ruler-unit:last-child {
            left: 4px;
            width: calc(100% - 8px);
          }
        </style>
        <div class="scrollbar-track"><div class="scrollbar-thumb"></div></div>
      `;
    }

    get typeScrollbarTrackElement () {
      return this.getCached('typeScrollbarTrackElement', () => {
        return this.shadowRoot.querySelector('.scrollbar-track');
      }, 'type');
    }

    get typeScrollbarThumbElement () {
      return this.getCached('typeScrollbarThumbElement', () => {
        return this.shadowRoot.querySelector('.scrollbar-thumb');
      }, 'type');
    }

    get typeScrollbarRulerElement () {
      // Do not cache, since ruler is added in real-time
      return this.typeScrollbarTrackElement.querySelector('.scrollbar-ruler');
    }

    get typeScrollbarTrackRect () {
      return this.getCached('typeScrollbarTrackRect', () => {
        return this.typeScrollbarTrackElement.getBoundingClientRect();
      }, 'type');
    }

    get typeScrollbarTrackPoints () {
      return this.trackModel[this.trackModel.length - 1];
    }

    get typeScrollbarThumbPoints () {
      return this.getCached('typeScrollbarThumbPoints', () => {
        return this.calculateScrollbarThumbPoints();
      }, 'type');
    }

    get typeScrollbarThumbHeight () {
      return this.getCached('typeScrollbarThumbHeight', () => {
        const minHeight = parseInt(getComputedStyle(this.typeScrollbarThumbElement).minHeight, 10);
        const pointHeight = this.typeScrollbarTrackRect.height / this.typeScrollbarTrackPoints;
        const height = this.typeScrollbarThumbPoints.total * pointHeight;
        this.setCached('typeScrollbarThumbInitialHeight', height);
        this.setCached('typeScrollbarThumbMinHeight', minHeight);
        this.setCached('typeScrollbarThumbIsDistorted', height < minHeight);
        return Math.max(minHeight, height);
      }, 'type');
    }

    typeScrollbarHandleMousedown (event) {
      this.typeScrollbarDragInProgress = true;
      this.bookScrollElement.style.userSelect = 'none'; // prevent text selection during drag
      this.classList.add('scrollbar-drag');
      this.setCached(
        'typeScrollbarDragShiftY',
        event.clientY - this.typeScrollbarThumbElement.getBoundingClientRect().top
      );
    }

    typeScrollbarHandleMouseup () {
      this.typeScrollbarDragInProgress = false;
      this.bookScrollElement.style.userSelect = null; // restore text selection
      this.classList.remove('scrollbar-drag');
      this.deleteCached([
        'typeScrollbarDragShiftY',
        'typeScrollbarDragClientY',
        'typeScrollbarDragTop'
      ]);
    }

    typeScrollbarHandleMousemove (event) {
      if (this.typeScrollbarDragInProgress) {
        // Move up or down depending on mouse move delta
        let delta;
        let top;
        const dragShiftY = this.getCached('typeScrollbarDragShiftY');
        const dragClientY = this.getCached('typeScrollbarDragClientY');
        const dragTop = this.getCached('typeScrollbarDragTop');
        if (dragClientY !== undefined && dragTop !== undefined) {
          delta = event.clientY - dragClientY;
          top = dragTop + delta;
        } else {
          const currentTop = this.typeScrollbarThumbElement.getBoundingClientRect().top;
          delta = event.clientY - currentTop;
          top = currentTop + delta;
        }
        this.setCached('typeScrollbarDragClientY', event.clientY);

        // Truncate 'y' position, taking thumb shift relative to mouse pointer into account
        let rect = this.typeScrollbarTrackRect;
        let correction = dragShiftY + rect.top;
        if (top - correction < 0) {
          top = correction;
        } else if (top - correction > rect.height - this.typeScrollbarThumbHeight) {
          top = rect.height - this.typeScrollbarThumbHeight + correction;
        }
        this.setCached('typeScrollbarDragTop', top); // keep mouse position (not thumb position)

        // Render thumb position
        this.renderScrollbar({thumb: {top: top - correction}});

        // Scroll book either with debounce or threshold
        if (this.getAttribute('drag-threshold')) {
          if (!this.getCached('typeScrollbarDragThreshold')) {
            this.setCached('typeScrollbarDragThreshold', setTimeout(() => {
              this.deleteCached('typeScrollbarDragThreshold');
              this.scrollTo(this.calculatePositionFromScrollbar());
            }, this.dragThreshold))
          }
        } else {
          clearTimeout(this.getCached('typeScrollbarDragDebounce'));
          this.setCached('typeScrollbarDragDebounce', setTimeout(() => {
            this.deleteCached('typeScrollbarDragDebounce');
            this.scrollTo(this.calculatePositionFromScrollbar());
          }, this.dragDebounce));
        }
      }
    }

    typeScrollbarHandleResize () {
      clearTimeout(this.getCached('typeScrollbarHandleResizeTimeout'));
      this.setCached('typeScrollbarHandleResizeTimeout', setTimeout(() => {
        this.deleteCached([
          'typeScrollbarTrackRect',
          'typeScrollbarThumbPoints',
          'typeScrollbarThumbHeight',
        ]);
        this.renderScrollbar(this.calculateScrollbarFromPosition(
          this.bookPositionElement.getPosition()
        ));
      }, 200));
    }

    typeScrollbarHandleClick (event) {
      // If clicked on scrollbar track, scroll page down/up,
      // depending on click position relative to thumb
      if (event.target === this.typeScrollbarTrackElement) {
        if (this.scrollFaster === 'position') {
          const trackTop = this.typeScrollbarTrackElement.getBoundingClientRect().top;
          const offsetY = event.clientY - trackTop;
          this.scrollTo(this.calculatePositionFromScrollbar(offsetY));
        } else {
          const thumbTop = this.typeScrollbarThumbElement.getBoundingClientRect().top;
          const offsetDelta = event.clientY - thumbTop;
          this.scrollTo(offsetDelta > 0 ? 'pagedown' : 'pageup');
        }
      }
    }

    typeScrollbarHideNative (id) {
      const styleId = `hide-native-scrollbar-for-${id}`;
      if (!document.getElementById(styleId)) {
        document.head.innerHTML += `
          <style id="${styleId}">
            book-scroll#${id} {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            book-scroll#${id}::-webkit-scrollbar {
              display: none;
            }
          </style>
        `;
        this.cleanupTasks.push(['type', () => {
          const styleElement = document.getElementById(styleId);
          if (styleElement) styleElement.remove();
        }])
      }
    }

    calculatePositionFromScrollbar (top) {
      if (top === undefined) top = this.getCached('typeScrollbarThumbTop');
      const relative = top / this.typeScrollbarTrackRect.height;
      const points = relative * this.typeScrollbarTrackPoints;
      const shift = -1 * (points % 1); // position[2]
      let fragment = 0;
      while (this.trackModel[fragment] < points) fragment += 1;
      fragment = fragment ? fragment - 1 : 0; // position[0]
      const child = Math.floor(points) - this.trackModel[fragment]; // position[1]
      return [fragment, child, shift];
    }

    calculateScrollbarFromPosition (position) {
      const trackPoints = this.typeScrollbarTrackPoints;
      const thumbPoints = this.typeScrollbarThumbPoints;
      const thumbHeight = this.typeScrollbarThumbHeight;
      const currentPoint = this.trackModel[position[0]] + position[1];

      let baseTop = 0;
      let trackHeight = this.typeScrollbarTrackRect.height;
      // If thumb size is distorted (intially too small, so we use min-height)
      // correct track height and base top position.
      if (this.getCached('typeScrollbarThumbIsDistorted')) {
        let thumbMinHeight = this.getCached('typeScrollbarThumbMinHeight');
        let thumbInitialHeight = this.getCached('typeScrollbarThumbInitialHeight');
        let thumbDelta = thumbMinHeight - thumbInitialHeight;
        baseTop = thumbDelta * thumbPoints.ratioAbove;
        trackHeight = trackHeight - thumbDelta;
      }
      return {
        thumb: {
          height: thumbHeight,
          top: baseTop + (trackHeight * currentPoint / trackPoints),
          translateY: -1 * thumbHeight * thumbPoints.ratioAbove
        },
        track: {
          baseTop: baseTop,
          height: trackHeight
        }
      };
    }

    calculateScrollbarThumbPoints () {
      // Single function for both calculations (above and below margin)
      const calculatePoints = (screenHeight, margin, direction) => {
        const sampleHeight = screenHeight * (direction > 0 ? margin : 1 - margin);
        let cursorFragment = this.bookScrollElement[
          `${direction > 0 ? 'first' : 'last'}ElementChild`
        ];
        let cursorClone;
        let cursorCloneHeight= 0;
        let comparedHeight = 0;
        let points = 0;
        let started = Date.now();
        while(cursorFragment && comparedHeight < sampleHeight && Date.now() - started < 5000) {
          cursorClone = cursorFragment.cloneNode(true);
          cursorClone.setAttribute('data-id', cursorClone.id);
          cursorClone.removeAttribute('id');
          cursorClone.active = true; // render content
          Object.assign(cursorClone.style, {
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '100%',
            backgroundColor: 'brown',
            opacity: '0',
            pointerEvents: 'none'
          });
          this.bookScrollElement.append(cursorClone);
          // Calculate
          cursorCloneHeight = cursorClone.offsetHeight;
          comparedHeight += cursorCloneHeight;
          if (comparedHeight < sampleHeight) {
            points += cursorClone.childElementCount;
            cursorFragment = cursorFragment[
              `${direction > 0 ? 'next' : 'previous'}ElementSibling`
            ];
          } else {
            let child = cursorClone[`${direction > 0 ? 'first' : 'last'}ElementChild`];
            const baseHeight = comparedHeight - (direction > 0 ? cursorCloneHeight : 0);
            const checkHeightBefore = () => {
              return direction > 0
                ? child.offsetTop + child.offsetHeight
                : -1 * child.offsetTop;
            }
            while (child && baseHeight + checkHeightBefore() < sampleHeight) {
              points += 1;
              child = child[`${direction > 0 ? 'next' : 'previous'}ElementSibling`];
            }
            const checkHeightAfter = () => {
              return direction > 0
                ? child.offsetTop
                : -1 * (child.offsetTop + child.offsetHeight);
            }
            // We may want to do corrections
            if (direction < 0 && baseHeight + checkHeightAfter() < sampleHeight) {
              points += 1;
            }
          }
          cursorClone.remove(); // cleanup
        }
        return points;
      }

      const height = this.bookScrollElement.offsetHeight;
      const margin = this.bookPositionElement.margin;
      const above = calculatePoints(height, margin, 1);
      const below = calculatePoints(height, margin, -1);
      const total = above + below;
      const ratioAbove = above / total;
      const ratioBelow = below / total;
      return { above, below, total, ratioAbove, ratioBelow };
    }

    renderScrollbar ({ thumb = {}, track = {} } = {}) {
      const style = this.typeScrollbarThumbElement.style;

      if (thumb.height !== undefined) {
        style.height = `${thumb.height}px`;
      }
      if (thumb.top !== undefined) {
        this.setCached('typeScrollbarThumbTop', thumb.top);
        style.top = `${thumb.top}px`
      }
      if (thumb.translateY !== undefined) {
        style.transform = `translateY(${thumb.translateY}px)`;
      }

      // Add track ruler if needed
      if (this.debug && !this.typeScrollbarRulerElement) {
        let t = document.createElement('template');
        const points = this.typeScrollbarTrackPoints;
        t.innerHTML = `
          <div class="scrollbar-ruler">
            ${
              'x'.repeat(points + 1).split('').map((point, i) => {
                return '<div class="scrollbar-ruler-unit" style="top: '
                  + (track.baseTop + i * (track.height / points))
                  +'px"></div>';
              }).join('')
            }
          </div>
        `;
        this.typeScrollbarTrackElement.append(t.content.cloneNode(true));
      }
    }


    // Utils

    awaitChildrenComplete (parent) {
      return new Promise(resolve => {
        const check = (event) => {
          if (
            parent.childElementCount &&
            !Array.prototype.filter.call(parent.children, child => !child.complete).length
          ) {
            parent.removeEventListener('load', check);
            resolve();
            return true;
          }
        };
        if (!check()) parent.addEventListener('load', check);
      });
    }

    parsePosition (position) {
      let array;
      if (!position) array = [0];
      else if (typeof position === 'number') array = [position];
      else if (typeof position === 'string') array = position.split(/,\s*|\s+/g);
      else if (Array.isArray(position)) array = position;
      else throw new Error('invalid position', position);
      return array.map(i => typeof i === 'string' ? i.trim() : i).map(i => {
        let float = parseFloat(i);
        let int = parseInt(i, 10);
        if (isNaN(int) || isNaN(float)) return 0;
        else if (float === int) return int;
        else return float;
      });
    }
  }

  customElements.define('book-control', HTMLBookControlElement);

  return HTMLBookControlElement;

}));
