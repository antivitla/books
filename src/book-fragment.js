(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  }

  // Window
  else if (!name) {
    console.error('No name for root export of', factory.name, factory().name);
  } else if (root[name]) {
    console.warn('Already exported to root', name);
  } else {
    root[name] = factory();
  }

} (this, 'HTMLBookFragmentElement', function () {
  'use strict';

  // Element can be switched 'off' from the DOM, taking no computing resources,
  // thus increasing performance. This is done through wrapping/unwrapping element content
  // with '<template>' tag. Switch is getter/setter 'active' property. This is
  // what HTMLBookFragmentElement is about.

  class HTMLBookFragmentElement extends HTMLElement {
    constructor () {
      super();
      this.attachShadow({mode: 'open'});
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: none;
          }
          :host([active]) {
            display: block;
          }
        </style>
        <slot></slot>
      `;
    }

    // Public properties

    get active () { return this.getBooleanAttribute('active'); }
    set active (active) { this.setBooleanAttribute('active', active); }

    get src () { return this.getAttribute('src'); }
    set src (src) {
      if (src !== this.src) {
        this.setAttribute('src', src);
      }
    }

    get complete () { return !this.src || !this.loading; }

    // Lifecycle callbacks

    static get observedAttributes () {
      return ['active', 'src'];
    }

    attributeChangedCallback (name, previousValue, value) {
      // Main activation/deactivation switch
      if (name === 'active' && value !== previousValue) {
        const isActive = this.active;
        const isWrapped = (
          this.children.length === 1 &&
          this.children[0].constructor.name === 'HTMLTemplateElement'
        );
        if (!isActive && !isWrapped) {
          this.innerHTML = `<template>${this.innerHTML}</template>`;
        } else if (isActive && isWrapped) {
          this.innerHTML = this.innerHTML.slice('<template>'.length, -1 * '</template>'.length);
        }
      }

      // In case of remote content, fetch it
      else if (name === 'src' && value !== previousValue) {
        this.loading = true;
        fetch(this.src, {
          headers: {
            'Content-Type': 'text/html'
          }
        }).then(response => response.text()).then(html => {
          // Initially we want <body> content, if it was wrapped in it.
          const contentHTML = html.split(/<body[^>]*>/).slice(-1)[0].split('</body>')[0];
          const templateElement = document.createElement('template');
          templateElement.innerHTML = contentHTML;
          // If a 'src-selector' is set, we want more specific elements inside.
          const selector = this.getAttribute('src-selector');
          if (selector) {
            templateElement.content.replaceChildren(
              ...templateElement.content.querySelectorAll(selector)
            );
          }
          // Now we should just insert content. If we are inactive, insert as a <template>
          this.replaceChildren(this.active ? templateElement.content : templateElement);
        }).catch(error => {
          console.error(error);
        }).finally(() => {
          this.loading = false;
          this.dispatchEvent(new CustomEvent('load', {bubbles: true}));
        });
      }
    }

    // Utils

    getBooleanAttribute (name) {
      const attr = this.getAttribute(name);
      return attr === 'true' || attr === '' || (attr && attr !== 'false');
    }

    setBooleanAttribute (name, value) {
      const attr = this.getAttribute(name);
      if ((attr === null || attr === undefined) && value) {
        this.setAttribute(name, '')
      } else if (attr !== null && attr !== undefined && !value) {
        this.removeAttribute(name);
      }
    }
  }

  customElements.define('book-fragment', HTMLBookFragmentElement);

  return HTMLBookFragmentElement;

}));
