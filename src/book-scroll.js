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
    root[name] = factory(root.BinarySearch);
  }

} (this, 'HTMLBookScrollElement', function (BinarySearch) {
  'use strict';

  class HTMLBookScrollElement extends HTMLElement {
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

    // get ignoreIntersection () {
    //   return this.getBooleanAttribute('ignore-intersection');
    // }
    //
    // set ignoreIntersection (ignore) {
    //   this.setAttribute('ignore-intersection', ignore ? 'true' : 'false');
    // }

    // Is set like regular margin px: '2000px 0px 2000px 0px'
    get activationMargin () {
      return this.getAttribute('activation-margin')
    }
    set activationMargin (margin) {
      this.setAttribute('activation-margin', margin);
    }

    // Is set relatively to current view height: 0.1, for example
    get currentViewMargin () {
      return parseFloat(this.getAttribute('current-view-margin') || 0, 10)
    }
    set currentViewMargin (margin) {
      this.setAttribute('current-view-margin', margin);
    }

    connectedCallback () {
      this.activationMargin = this.activationMargin || '2000px 0px 2000px 0px';
      this.currentViewMargin = this.currentViewMargin || 0.1;
      // this.initSentinelIntersectionObserver();
      this.addEventListener('book-scroll-intersection', this.handleScrollIntersection);
      this.addEventListener('scroll', this.debounceEmitScrollPosition);
    }

    disconnectedCallback () {
      if (this.observeSentinel) {
        this.observeSentinel.disconnect();
        delete this.observeSentinel;
      }
      this.removeEventListener('scroll', this.debounceEmitScrollPosition);
    }

    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'activation-margin' && newValue !== oldValue) {
        this.initSentinelIntersectionObserver();
      }
    }

    initSentinelIntersectionObserver () {
      if (this.observeSentinel) {
        this.observeSentinel.disconnect();
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
      // if (this.ignoreIntersection) {
      //   this.ignoreIntersection = false;
      //   return;
      // }
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
      if (detail.enter) {
        this.handleScrollEnter({detail});
      } else if (detail.leave) {
        this.handleScrollLeave({detail});
      } else {
        console.warn('Incorrect combination', detail);
      }
    }

    handleScrollEnter ({detail}) {
      // If no sections at all, or we hit first top active,
      // or we hit last bottom active, request new section
      if (
        !this.children.length ||
        (detail.top && this.children[0].getAttribute('active') !== null) ||
        (detail.bottom && this.children[this.children.length - 1].getAttribute('active') !== null)
      ) {
        this.dispatchEvent(new CustomEvent(`book-scroll-${detail.top ? 'previous' : 'next'}`, {
          bubbles: true
        }));
      }

      // Otherwise find target section to activate
      else {
        const sections = Array.from(this.children);
        if (detail.bottom) sections.reverse();
        let target = sections[0]; // default target is just first section in the list
        const cursor = sections.find(section => section.getAttribute('active') !== null);

        // If there are active sections, target will be previous/next to it
        // (depending on triggered top/bottom sentinel). Previous/next
        // should be, since if there aren't, we already checked that above for
        // 2 reasons: no sections at all, or active already first/last in list.
        if (cursor) {
          target = cursor[`${detail.top ? 'previous' : 'next'}ElementSibling`];
        }

        // (1) Get info for scroll correction
        const scrollTop = this.scrollTop;
        const scrollHeight = this.scrollHeight;

        // (2) Activate
        target.setAttribute('active', '');

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
      const sections = Array.from(this.children);
      if (detail.bottom) sections.reverse();
      const cursor = sections.find(section => section.getAttribute('active') !== null);

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
      target.removeAttribute('active'); // 2) deactivate

      // (3) Correct scroll, if target was above current view
      if (position.bottom < 0) {
        this.scrollTop = scrollTop + this.scrollHeight - scrollHeight;
      }
    }

    // Handle small sections: if section is smaller then scroll step (~100px),
    // then after next scroll step top sentinel will be again in intersecting
    // inside viewport, thus won't trigger event, thus stops activating any
    // sections left. We need to add listener for small sections, which observe when
    // section become fully visible, and emit sentinel intersection event manually.
    // This is required only once per section enter.
    addEnterObserverTo (target) {
      if (!target.observeEnter) {
        target.observeEnter = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio === 1) {
              // Disable after use
              target.observeEnter.disconnect();
              delete target.observeEnter;

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
    // deactivate section.
    addLeaveObserverTo (target, onLeave) {
      if (!target.observeLeave) {
        target.observeLeave = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) {
              // Disable after use
              target.observeLeave.disconnect();
              delete target.observeLeave;

              // Get info to decide where to trigger event (top or bottom).
              // Get it before removal.
              const position = target.getBoundingClientRect(); // get position info beforehand
              const top = position.bottom < 0;
              const bottom = position.bottom > 0;

              // Trigger user's callback (likely to remove section)
              onLeave(target, position);

              // After removal, our sentinel will remain non-intersected,
              // thus no event will be emitted, thus no new deactivation
              // will happen. We need to manually trigger 'intersection'
              // event at the moment section is deactivated.
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

    // addNextSection (section) {
    //   this.append(section);
    //   this.addEnterObserverTo(section);
    //   this.addLeaveObserverTo(section, this.handleFullLeave.bind(this));
    // }
    //
    // addPreviousSection (section) {
    //   this.prepend(section);
    //   this.addEnterObserverTo(section);
    //   this.addLeaveObserverTo(section, this.handleFullLeave.bind(this));
    // }

    debounceEmitScrollPosition () {
      clearTimeout(this.__scrollStoppedTimeout__);
      this.__scrollStoppedTimeout__ = setTimeout(() => {
        this.dispatchEvent(new CustomEvent('book-scroll-position', {
          bubbles: true,
          detail: {
            position: this.getScrollPosition()
          }
        }));
      }, 200);
    }

    getScrollPosition () {
      const currentViewMargin = this.currentViewMargin * this.offsetHeight;
      const fragmentPosition = this.getScrollFragmentPosition(currentViewMargin);
      const fragmentChildPosition = this.getScrollFragmentChildPosition(
        currentViewMargin,
        fragmentPosition.element
      );
      return {
        fragment: fragmentPosition.element,
        fragmentChild: fragmentChildPosition.element,
        fragmentChildTop: fragmentChildPosition.top,
        index: [fragmentPosition.index, fragmentChildPosition.index],
      }
    }

    getScrollFragmentPosition (currentViewMargin = 0) {
      const activeFragments = Array.from(this.querySelectorAll('book-fragment[active]'));
      const scrollFragment = activeFragments.slice(
        BinarySearch(activeFragments, null, function (fragment, value, index) {
          const rect = fragment.getBoundingClientRect();
          if (rect.top <= currentViewMargin && rect.bottom > currentViewMargin) {
            return 0;
          } else if (rect.top > currentViewMargin) {
            return 1;
          } else if (rect.bottom <= currentViewMargin) {
            return -1;
          }
        })
      )[0];
      return {
        element: scrollFragment,
        index: Array.from(this.children).indexOf(scrollFragment)
      };
    }

    getScrollFragmentChildPosition (currentViewMargin = 0, fragment) {
      const fragmentChildren = Array.from(fragment.children);
      let rect;
      const fragmentChild = fragmentChildren.slice(
        BinarySearch(fragmentChildren, null, function (child, value, index) {
          rect = child.getBoundingClientRect();
          let result;

          // If first element and is lower (than viewport border),
          // or last element and is higher,
          // or intersecting viewport border
          if (
            (index === 0 && rect.top >= currentViewMargin) ||
            (index === fragmentChildren.length - 1 && rect.bottom <= currentViewMargin) ||
            (rect.top <= currentViewMargin && rect.bottom > currentViewMargin)
          ) {
            return 0;
          }

          // If totally higher than viewport border
          else if (rect.bottom <= currentViewMargin){
            return -1;
          }

          // Detect 'holes' in position (e.g caused by margins between elements),
          // which may be catched by comparing with previous element's position.
          else if (
            rect.top >= currentViewMargin &&
            child.previousElementSibling?.getBoundingClientRect().bottom <= currentViewMargin
          ) {
            return 0;
          }

          // rect.top > 0
          else {
            return 1;
          }
        })
      )[0];
      console.log(rect);
      return {
        element: fragmentChild,
        index: fragmentChildren.indexOf(fragmentChild),
        top: rect.top / this.offsetHeight
      };
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

    // open() {
    //   if (this.children.length) {
    //     this.addEnterObserverTo(this.children[0]);
    //     this.addLeaveObserverTo(this.children[0], this.handleFullLeave.bind(this));
    //     this.children[0].setAttribute('active', '');
    //   }
    // }
    //
    // close() {
    //   this.ignoreIntersection = true;
    //   Array.from(this.children).forEach(child => {
    //     if (child.observeLeave) {
    //       child.observeLeave.disconnect();
    //       delete child.observeLeave;
    //     }
    //     if (child.observeEnter) {
    //       child.observeEnter.disconnect();
    //       delete child.observeEnter;
    //     }
    //     child.removeAttribute('active');
    //   });
    // }

    // openAt(position = '') {
    //   console.log('attempt to scroll');
    //   // Abort if no children
    //   if (!this.children.length) {
    //     return;
    //   }
    //
    //   // Prepare position if format [section, element],
    //   // where 'section' is string id of the section,
    //   // and element is index of the element inside this section
    //   if (!Array.isArray(position)) {
    //     position = position.split(/\s*,\s*/g);
    //   }
    //   console.log(`#${position[0]}`);
    //   // var section = this.querySelector(`#${position[0]}`);
    //   // section.setAttribute('active', '');
    //   // setTimeout(() => {
    //   //   var element = section.children[position[1]];
    //   //   console.log(section, element);
    //   // })
    // }
  }

  customElements.define('book-scroll', HTMLBookScrollElement);

  return HTMLBookScrollElement;

}));
