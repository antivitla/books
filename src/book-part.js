class BookPartElement extends HTMLElement {
  constructor() {
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

  attributeChangedCallback(name, previousValue, newValue) {
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
        let content = html.split('<body>').slice(-1)[0].split('</body>')[0];
        if (this.active) {
          this.innerHTML = content;
        } else {
          this.innerHTML = `<template>${content}</template>`;
        }
      })
    }
  }

  static get observedAttributes() {
    return ['active', 'src'];
  }

  set active (active) {
    this.setBooleanAttribute('active', active);
  }

  get active () {
    return this.getBooleanAttribute('active');
  }

  getBooleanAttribute(name) {
    const attr = this.getAttribute(name);
    return attr !== null && attr !== undefined && attr !== 'false' && attr !== false;
  }

  setBooleanAttribute(name, value) {
    const attr = this.getAttribute(name);
    if ((attr === null || attr === undefined) && value) {
      this.setAttribute(name, '')
    } else if (attr !== null && attr !== undefined && !value) {
      this.removeAttribute(name);
    }
  }

  isWrapped() {
    return this.children.length === 1 && this.children[0].constructor.name === 'HTMLTemplateElement';
  }
}

window.customElements.define('book-part', BookPartElement);