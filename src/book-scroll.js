(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./binary-search'));
  }

  // Window
  else if (!name) {
    console.error('No name for root export for', factory.name, factory().name);
  } else if (root[name]) {
    console.warn('Root', name, 'already exported');
  } else {
    root[name] = factory(/*root.BinarySearch*/);
  }

} (this, 'HTMLBookScrollElement', function (/*BinarySearch*/) {
  'use strict';

  class HTMLBookScrollElement extends HTMLElement {

    DEFAULT = {
      activationMargin: '2000px 0px',
      currentViewMargin: 0.05
    };

    constructor () {
      super();
      this.attachShadow({mode: 'open'});
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            overflow: auto;
            height: 100vh;
          }
        </style>
        <div class="book-scroll-sentinel top"></div>
        <slot></slot>
        <div class="book-scroll-sentinel bottom"></div>
      `;
    }

    static get observedAttributes () {
      return ['activation-margin'];
    }

    getBooleanAttribute (name) {
      const attr = this.getAttribute(name);
      return attr === 'true' || attr === '' || (attr && attr !== 'false') || attr === name;
    }

    setBooleanAttribute (name, value) {
      const attr = this.getAttribute(name);
      if ((attr === null || attr === undefined) && value) {
        this.setAttribute(name, '')
      } else if (attr !== null && attr !== undefined && !value) {
        this.removeAttribute(name);
      }
    }

    // Is set like regular margin px: '2000px 0px'
    get activationMargin () {
      return this.getAttribute('activation-margin');
    }
    set activationMargin (margin) {
      if (typeof margin === 'number') {
        this.setAttribute('activation-margin', `${margin}px 0px`);
      } else {
        this.setAttribute('activation-margin', margin);
      }
    }

    // Is set relatively to current view height: 0.1, for example
    get currentViewMargin () {
      return parseFloat(this.getAttribute('current-view-margin') || this.DEFAULT.currentViewMargin, 10)
    }
    set currentViewMargin (margin) {
      this.setAttribute('current-view-margin', margin);
    }

    // Ignore intersection for predictable scroll manipulations
    get ignoreIntersection () {
      return this.getBooleanAttribute('ignore-intersection');
    }
    set ignoreIntersection (value) {
      this.setBooleanAttribute('ignore-intersection');
    }

    connectedCallback () {
      this.activationMargin = this.activationMargin || this.DEFAULT.activationMargin;
      this.currentViewMargin = this.currentViewMargin || this.DEFAULT.currentViewMargin;
      this.addEventListener('book-scroll-intersection', this.handleScrollIntersection);
      if (!this.observeSentinel) {
        this.initSentinelIntersectionObserver();
      }
    }

    disconnectedCallback () {
      if (this.observeSentinel) {
        this.observeSentinel.disconnect();
        delete this.observeSentinel;
      }
    }

    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'activation-margin' && newValue !== oldValue) {
        this.initSentinelIntersectionObserver();
      }
    }

    initSentinelIntersectionObserver () {
      if (this.observeSentinel) {
        this.observeSentinel.disconnect();
        delete this.observeSentinel;
      }
      this.observeSentinel = new IntersectionObserver(this.onSentinelIntersection.bind(this), {
        root: this,
        rootMargin: this.activationMargin,
        threshold: 0
      });
      this.observeSentinel.observe(this.shadowRoot.querySelector('.book-scroll-sentinel.top'));
      this.observeSentinel.observe(this.shadowRoot.querySelector('.book-scroll-sentinel.bottom'));
    }

    onSentinelIntersection (entries) {
      if (this.ignoreIntersection) {
        return;
      }
      entries.forEach(entry => {
        this.dispatchEvent(new CustomEvent('book-scroll-intersection', {
          bubbles: true,
          detail: {
            enter: entry.isIntersecting,
            leave: !entry.isIntersecting,
            top: Boolean(entry.target.className.match(/top/)),
            bottom: Boolean(entry.target.className.match(/bottom/))
          }
        }));
      });
    }

    handleScrollIntersection ({detail}) {
      if (this.ignoreIntersection) {
        return;
      }
      if (detail.enter) {
        this.handleScrollEnter({detail});
      } else if (detail.leave) {
        this.handleScrollLeave({detail});
      } else {
        console.warn('Incorrect combination', detail);
      }
    }

    handleScrollEnter ({detail}) {
      // If no fragments at all, or we hit first top active,
      // or we hit last bottom active, request new fragment
      if (
        !this.children.length ||
        (detail.top && this.children[0].getAttribute('active') !== null) ||
        (detail.bottom && this.children[this.children.length - 1].getAttribute('active') !== null)
      ) {
        this.dispatchEvent(new CustomEvent(`book-scroll-${detail.top ? 'previous' : 'next'}`, {
          bubbles: true
        }));
      }

      // Otherwise find target fragment to activate
      else {
        const fragments = Array.from(this.children);
        if (detail.bottom) fragments.reverse();
        let target = fragments[0]; // default target is just first fragment in the list
        const cursor = fragments.find(fragment => fragment.getAttribute('active') !== null);

        // If there are active fragments, target will be previous/next to it
        // (depending on triggered top/bottom sentinel). Previous/next
        // should be, since if there aren't, we already checked that above for
        // 2 reasons: no fragments at all, or active already first/last in list.
        if (cursor) {
          target = cursor[`${detail.top ? 'previous' : 'next'}ElementSibling`];
        }

        // (1) Get info for scroll correction
        const scrollTop = this.scrollTop;
        const scrollHeight = this.scrollHeight;

        // (2) Activate
        target.active = true;

        // (3) Correct scroll, if target was above view
        const position = target.getBoundingClientRect();
        if (position.top < 0) {
          this.scrollTop = scrollTop + this.scrollHeight - scrollHeight;
        }

        // Watch full enter to trigger enter of others
        // (check method description)
        this.addEnterObserverTo(target);
      }
    }

    handleScrollLeave ({detail}) {
      const fragments = Array.from(this.children);
      if (detail.bottom) fragments.reverse();
      const cursor = fragments.find(fragment => fragment.getAttribute('active') !== null);

      // Watch until fully leave
      if (cursor) {
        this.addLeaveObserverTo(cursor, this.handleFullLeave.bind(this));
      }
    }

    handleFullLeave (target, position) {
      // (1) Get info for scroll correction
      const scrollTop = this.scrollTop;
      const scrollHeight = this.scrollHeight;

      // (2) Deactivate
      target.active = false; // 2) deactivate

      // (3) Correct scroll, if target was above current view
      if (position.bottom < 0) {
        this.scrollTop = scrollTop + this.scrollHeight - scrollHeight;
      }
    }

    // Handle small fragments: if fragment is smaller then scroll step (~100px),
    // then after next scroll step top sentinel will be again in intersecting
    // inside viewport, thus won't trigger event, thus stops activating any
    // fragments left. We need to add listener for small fragments, which observe when
    // fragment become fully visible, and emit sentinel intersection event manually.
    // This is required only once per fragment enter.
    addEnterObserverTo (target) {
      if (!target.observeEnter) {
        target.observeEnter = new IntersectionObserver(entries => {
          if (this.ignoreIntersection) {
            return;
          }
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio === 1) {
              // Disable after use
              this.removeEnterObserverFrom(target);

              // Get info to decide where to trigger event (at top or bottom)
              const position = target.getBoundingClientRect();
              const top = position.top < 0;
              const bottom = position.bottom > 0

              // Trigger event instead of silent sentinel (explained above)
              this.dispatchEvent(new CustomEvent('book-scroll-intersection', {
                bubbles: true,
                detail: {enter: true, leave: false, top, bottom, target}
              }));
            }
          });
        }, {
          root: this,
          rootMargin: this.activationMargin,
          threshold: [0, 1]
        });
        target.observeEnter.observe(target);
      }
    }

    // When element start leaving view activation borders (with activationMargin),
    // we want to wait until it fully leave it. So we setup
    // observer to watch this event once, and only then
    // deactivate fragment.
    addLeaveObserverTo (target, onLeave) {
      if (!target.observeLeave) {
        target.observeLeave = new IntersectionObserver(entries => {
          if (this.ignoreIntersection) {
            return;
          }
          entries.forEach(entry => {
            if (!entry.isIntersecting) {
              // Disable after use
              this.removeLeaveObserverFrom(target);

              // Get info to decide where to trigger event (top or bottom).
              // Get it before removal.
              const position = target.getBoundingClientRect(); // get position info beforehand
              const top = position.bottom < 0;
              const bottom = position.bottom > 0;

              // Trigger user's callback (likely to remove fragment)
              onLeave(target, position);

              // After removal, our sentinel will remain non-intersected,
              // thus no event will be emitted, thus no new deactivation
              // will happen. We need to manually trigger 'intersection'
              // event at the moment fragment is deactivated.
              this.dispatchEvent(new CustomEvent('book-scroll-intersection', {
                bubbles: true,
                detail: {enter: false, leave: true, top, bottom, target}
              }));
            }
          });
        }, {
          root: this,
          rootMargin: this.activationMargin,
          threshold: 0
        });
        target.observeLeave.observe(target);
      }
    }

    removeEnterObserverFrom (target) {
      if (target.observeEnter) {
        target.observeEnter.disconnect();
        delete target.observeEnter;
      }
    }

    removeLeaveObserverFrom (target) {
      if (target.observeLeave) {
        target.observeLeave.disconnect();
        delete target.observeLeave;
      }
    }
  }

  customElements.define('book-scroll', HTMLBookScrollElement);

  return HTMLBookScrollElement;

}));
