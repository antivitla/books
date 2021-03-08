class BookScrollElement extends HTMLElement {
  rootMargin = '1000px 0px 1000px 0px';
  scrollInfo = {};

  // ignoreIntersection = {};
  // deferredUpdateQueue = [];

  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = `
      <style>
        :host { 
          display: block;
          overflow: auto; 
          height: 100%;
        }
      </style>
      <div class="book-scroll-sentinel top"></div>
      <slot></slot>
      <div class="book-scroll-sentinel bottom"></div>
    `;
    // this.resetScrollInfo();
  }

  static get observedAttributes() {
    return ['margin'];
  }

  connectedCallback() {
    // this.resetScrollInfo();
    // this.addEventListener('scroll', this.observeScroll);
    // this.deferredUpdateQueue = [];
    // this.addEventListener('scroll-stopped', this.processDeferredUpdateQueue);
    this.addEventListener('book-scroll-intersection', this.handleScrollIntersection);
    this.initSentinelIntersectionObserver();
  }

  disconnectedCallback() {
    // this.removeEventListener('scroll', this.observeScroll);
    // this.removeEventListener('scroll-stopped', this.processDeferredUpdateQueue);
    this.observeSentinel.disconnect();
    delete this.observeSentinel;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'margin') {
      this.rootMargin = newValue;
      this.initSentinelIntersectionObserver();
    }
  }

  initSentinelIntersectionObserver() {
    if (this.observeSentinel) {
      this.observeSentinel.disconnect();
    }
    this.observeSentinel = new IntersectionObserver(this.onSentinelIntersection.bind(this), {
      root: this,
      rootMargin: this.rootMargin,
      threshold: 0
    });
    this.observeSentinel.observe(this.shadowRoot.querySelector('.book-scroll-sentinel.top'));
    this.observeSentinel.observe(this.shadowRoot.querySelector('.book-scroll-sentinel.bottom'));
  }

  onSentinelIntersection(entries) {
    // For example, when we insert new content, intersection
    // may be triggered when we correct scroll position. We need
    // to ignore intersections, caused by scroll corrections, or any
    // other manual cases. This is governed by the 'ignoreIntersection'
    // flag. Flag allow ignore once, then it is reset.

    entries.forEach(entry => {
      const detail = {
        enter: entry.isIntersecting,
        leave: !entry.isIntersecting,
        top: Boolean(entry.target.className.match(/top/)),
        bottom: Boolean(entry.target.className.match(/bottom/))
      };

      // When scroll down, allow only enter bottom and leave top.
      // When scroll up, allow only enter top and leave bottom.
      // Also allow anything at no scroll.

      // const scrollDown = this.scrollInfo.delta.top > 0;
      // const scrollUp = this.scrollInfo.delta.top < 0;
      // const noScroll = this.scrollInfo.delta.top === 0;
      // const enterBottom = detail.enter && detail.bottom;
      // const enterTop = detail.enter && detail.top;
      // const leaveTop = detail.leave && detail.top;
      // const leaveBottom = detail.leave && detail.bottom;

      // console.log(detail, this.scrollInfo.delta.top);

      // if (
      //   (scrollDown && (enterBottom || leaveTop)) ||
      //   (scrollUp && (enterTop || leaveBottom)) ||
      //   noScroll
      // ) {

      // console.log(
      //   'Intersection:',
      //   `${detail.enter ? 'enter' : 'leave'}`, `${detail.top ? 'top' : 'bottom'}`,
      //   '/ ratio', entry.intersectionRatio,
      //   '/ scroll delta', this.scrollInfo.delta.top,
      // );

      this.dispatchEvent(new CustomEvent('book-scroll-intersection', {
        bubbles: true,
        detail
      }));

      // }

    });
  }

  handleScrollIntersection({detail}) {
    if (detail.enter) {
      this.handleScrollEnter({detail});
    } else if (detail.leave) {
      this.handleScrollLeave({detail});
    } else {
      console.warn('Incorrect combination', detail);
    }
  }

  handleScrollEnter({detail}) {
    // If no parts at all, or we hit first top active,
    // or we hit last bottom active, request new part
    if (
      !this.children.length ||
      (detail.top && this.children[0].getAttribute('active') !== null) ||
      (detail.bottom && this.children[this.children.length - 1].getAttribute('active') !== null)
    ) {
      this.dispatchEvent(new CustomEvent(`book-scroll-${detail.top ? 'previous' : 'next'}`));
    }

    // Otherwise find target part to activate
    else {
      const parts = Array.from(this.children);
      if (detail.bottom) parts.reverse();
      let target = parts[0]; // default target is just first part in the list
      const cursor = parts.find(part => part.getAttribute('active') !== null);

      // If there are active parts, target will be previous/next to it
      // (depending on triggered top/bottom sentinel). Previous/next
      // should be, since if there aren't, we already checked that above for
      // 2 reasons: no parts at all, or active already first/last in list.
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

  handleScrollLeave({detail}) {
    const parts = Array.from(this.children);
    if (detail.bottom) parts.reverse();
    const cursor = parts.find(part => part.getAttribute('active') !== null);

    // Watch until fully leave
    this.addLeaveObserverTo(cursor, this.handleFullLeave.bind(this));
  }

  handleFullLeave(target, position) {
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

  // Handle small parts: if part is smaller then scroll step (~100px),
  // then after next scroll step top sentinel will be again in intersecting
  // inside viewport, thus won't trigger event, thus stops activating any
  // parts left. We need to add listener for small parts, which observe when
  // part become fully visible, and emit sentinel intersection event manually.
  // This is required only once per part enter.
  addEnterObserverTo(target) {
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
        rootMargin: this.rootMargin,
        threshold: [0, 1]
      });
      target.observeEnter.observe(target);
    }
  }

  // When element start leaving view borders (with rootMargin),
  // we want to wait until it fully leave it. So we setup
  // observer to watch this event once, and only then
  // deactivate part.
  addLeaveObserverTo(target, onLeave) {
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

            // Trigger user's callback (likely to remove part)
            onLeave(target, position);

            // After removal, our sentinel will remain non-intersected,
            // thus no event will be emitted, thus no new deactivation
            // will happen. We need to manually trigger 'intersection'
            // event at the moment part is deactivated.
            this.dispatchEvent(new CustomEvent('book-scroll-intersection', {
              bubbles: true,
              detail: {enter: false, leave: true, top, bottom, target}
            }));
          }
        });
      }, {
        root: this,
        rootMargin: this.rootMargin,
        threshold: 0
      });
      target.observeLeave.observe(target);
    }
  }

  addNextPart(part) {
    this.append(part);
    this.addEnterObserverTo(part);
    this.addLeaveObserverTo(part, this.handleFullLeave.bind(this));
  }

  addPreviousPart(part) {
    this.prepend(part);
    this.addEnterObserverTo(part);
    this.addLeaveObserverTo(part, this.handleFullLeave.bind(this));
  }
}

window.customElements.define('book-scroll', BookScrollElement);