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
            height: 50px;
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
    }

    cleanupTasks = [];
    complete = false;
    initUrlComplete = false;
    scrollbarTrackModel = [0];

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

      const thumbPoints = this.thumbPoints || 1;
      const totalPoints = this.scrollbarTrackModel.slice(-1)[0];
      const trackPoints = totalPoints - thumbPoints;
      const positionPoint = this.scrollbarTrackModel[position[0]] + position[1];
      const trackSizePx = this.scrollbarTrackElement.getBoundingClientRect().height;
      const pointSizePx = trackSizePx / totalPoints;

      // console.log(
      //   'Scroll info\n',
      //   'Total:', totalPoints,
      //   'thumb:', thumbPoints,
      //   'position:', positionPoint,
      //   'point size:', pointSizePx
      // );

      // Set thumb size
      this.scrollbarThumbElement.style.height = `${thumbPoints * pointSizePx}px`;
      // Set thumb position
      this.scrollbarThumbElement.style.top = `${trackSizePx * positionPoint / totalPoints}px`;
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
          this.scrollPositionElement.position = this.positionInUrl;
          this.initUrlComplete = true;
        }
        // Control type 'scrollbar':
        else if (this.controlType === 'scrollbar') {
          this.calculateScrollTrackModel();
          this.calculateScrollThumbSizePoints();
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
      else if (
        this.controlType === 'scrollbar' &&
        this.scrollbarTrackElement &&
        this.scrollbarThumbElement &&
        this.scrollbarTrackModel.slice(-1)[0] > 0
      ) {
        this.positionInScrollbar = position;
      }
    }

    calculateScrollTrackModel () {
      this.scrollbarTrackModel = [0];
      for (let fragment of this.scrollElement.children) {
        const count = fragment.active
          ? fragment.children.length
          : fragment.children[0].content.children.length;
        this.scrollbarTrackModel.push(this.scrollbarTrackModel.slice(-1)[0] + count);
      }
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
      this.thumbPoints = accumulatedCount;
    }
  }

  customElements.define('book-scroll-control', HTMLBookScrollControlElement);

  return HTMLBookScrollControlElement;
}));
