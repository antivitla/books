
scrollToPosition (position) {
  // could be passed string '0, 1, 0.56'
  // or object { fragment: 0, child: 1, shift: 0.56}
  let fragment = 0;
  let child = 0;
  let shift = 0;
  if (typeof position === 'string') {
    position.split(',').map(item => item.trim()).forEach((value, index) => {
      if (index === 0) {
        fragment = parseInt(value, 10) || 0;
      } else if (index === 1) {
        child = parseInt(value, 10) || 0;
      } else if (index === 2) {
        shift = parseFloat(value);
      }
    });
  } else if (typeof position === 'object') {
    fragment = position.fragment || 0;
    child = position.child || 0;
    shift = position.shift || 0;
  }

  // Deactivate intersection detection
  this.ignoreIntersection = true;

  // Deactivate all other fragments
  Array.from(this.children).forEach(child => child.active = false);

  // Activate desired fragment
  this.children[fragment].active = true;

  // 1. Check if fragment height is lower then activation margin + scrollHeight.
  // If lower, activate more at bottom
  let scrollHeight = this.scrollHeight;
  let nextFragment = this.children[fragment].nextElementSibling;
  while (
    nextFragment &&
    this.scrollHeight < this.offsetHeight + parseInt(this.activationMargin, 10)
  ) {
    nextFragment.active = true;
    nextFragment = nextFragment.nextElementSibling;
  }

  // Check that if we scroll to target fragment bottom, there will be still
  // some fragments.
  if (nextFragment) {
    let total = 0;
    while (nextFragment && total < parseInt(this.activationMargin, 10)) {
      nextFragment.active = true;
      total += nextFragment.offsetHeight
      nextFragment = nextFragment.nextElementSibling;
    }
  }

  // 2. Check if delta scrollHeight with activated previous fragment
  // is lower then activation margin. If lower, activate more.
  scrollHeight = this.scrollHeight;
  let previousFragment = this.children[fragment].previousElementSibling;
  while (
    previousFragment &&
    this.scrollHeight - scrollHeight < parseInt(this.activationMargin, 10)
  ) {
    previousFragment.active = true;
    previousFragment = previousFragment.previousElementSibling;
  }

  // Activate intersection detection
  this.ignoreIntersection = false;

  // Compute and set scrollTop
  const target = this.children[fragment].children[child]; // shortcut
  this.scrollTop = target.offsetTop - (target.offsetHeight * shift);
}

debounceEmitScrollPosition () {
  clearTimeout(this.__scrollStoppedTimeout__);
  this.__scrollStoppedTimeout__ = setTimeout(() => {
    this.dispatchEvent(new CustomEvent('book-scroll-position', {
      bubbles: true,
      detail: this.getScrollPosition(),
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
    fragment: fragmentPosition.index,
    child: fragmentChildPosition.index,
    shift: fragmentChildPosition.shift,
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
  return {
    element: fragmentChild,
    index: fragmentChildren.indexOf(fragmentChild),
    shift: rect.top / rect.height
  };
}
