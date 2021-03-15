(function (root, name, factory) {

  // Commonjs
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./slug'));
  }

  // Window
  else if (!name) {
    console.error('No name for root export for', factory.name, factory(root.Slug).name);
  } else if (root[name]) {
    console.warn('Root', name, 'already exported');
  } else {
    root[name] = factory(root.Slug);
  }

} (this, 'HTMLBookFragmentElement', function (Slug) {
  'use strict';

  class HTMLBookFragmentElement extends HTMLElement {
    constructor () {
      super();
      this.attachShadow({mode: 'open'});
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: none;
          }
          :host([active]:not([active="false"])) {
            display: block;
          }
        </style>
        <slot></slot>
      `;
    }

    static get observedAttributes () {
      return ['active', 'src'];
    }

    get active () {
      return this.getBooleanAttribute('active');
    }

    set active (active) {
      this.setBooleanAttribute('active', active);
      // this.dispatchEvent(new CustomEvent('book-fragment-active', {
      //   bubbles: true,
      //   detail: {
      //     active: active
      //   }
      // }));
    }

    connectedCallback () {
      // if (!this.id) {
      //   this.id = 'random' + parseInt(Math.random() * 100000, 10);
      // }
    }

    attributeChangedCallback (name, previousValue, newValue) {
      if (name === 'active') {
        if (!this.getBooleanAttribute('active') && !this.isWrapped()) {
          this.innerHTML = `<template>${this.innerHTML}</template>`;
        } else if (this.getBooleanAttribute('active') && this.isWrapped()) {
          this.innerHTML = this.innerHTML.slice('<template>'.length, -1 * '</template>'.length);
        }
      } else if (name === 'src') {
        fetch(newValue, {
          headers: {
            'Content-Type': 'text/html'
          }
        }).then(response => response.text()).then(html => {
          const rawHTML = html.split(/<body[^>]*>/).slice(-1)[0].split('</body>')[0];
          const template = document.createElement('template');
          template.innerHTML = rawHTML;

          // Extract elements with selector, if provided
          const selector = this.getAttribute('src-selector');
          if (selector) {
            const elements = Array.from(template.content.querySelectorAll(selector));
            template.content.replaceChildren();
            elements.forEach(element => template.content.append(element));
          }

          if (this.active) {
            this.replaceChildren(template.content);
          } else {
            this.replaceChildren(template);
          }
          this.dispatchEvent(new CustomEvent('book-fragment-loaded', {
            bubbles: true
          }))
        });
      }
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

    isWrapped () {
      return this.children.length === 1 && this.children[0].constructor.name === 'HTMLTemplateElement';
    }
  }

  customElements.define('book-fragment', HTMLBookFragmentElement);

  return HTMLBookFragmentElement;

}));
