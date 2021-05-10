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

} (this, 'HTMLBookElement', function () {
  'use strict';

  class HTMLBookElement extends HTMLElement {
    constructor () {
      super();
      this.attachShadow({ mode: 'open' });
    }

    cleanupTasks = [];

    listen (event, target, callback, group) {
      const callbackBinded = callback.bind(this);
      const cleanupTask = () => target.removeEventListener(event, callbackBinded);
      target.addEventListener(event, callbackBinded);
      this.cleanupTasks.push(group ? [group, cleanupTask] : cleanupTask);
    }

    cleanup (group) {
      if (group) {
        this.cleanupTasks = this.cleanupTasks.filter(task => {
          if (Array.isArray(task) && task[0] === group) {
            task[1]();
            return false;
          } else {
            return true;
          }
        });
      } else {
        while (this.cleanupTasks.length) {
          const task = this.cleanupTasks.shift();
          if (Array.isArray(task)) task[1]();
          else task();
        };
      }
    }

    getCached (name, getter) {
      if (typeof this[`__${name}`] === 'undefined') this[`__${name}`] = getter && getter();
      return this[`__${name}`];
    }

    setCached (name, value) {
      this[`__${name}`] = value;
      return this[`__${name}`];
    }

    deleteCached (cached) {
      (Array.isArray(cached) ? cached : [cached]).forEach(name => delete this[`__${name}`]);
    }

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

    awaitElement (selector) {
      let element = document.querySelector(selector);
      if (element) return Promise.resolve(element);
      else {
        return new Promise(resolve => {
          let observer = new MutationObserver((mutations, observer) => {
            element = []
              .concat(...mutations.map(mutation => Array.from(mutation.addedNodes)))
              .filter(node => node.nodeType === Node.ELEMENT_NODE)
              .find(node => {
                return node.closest(selector) || node.querySelector(selector);
              });
            if (element) {
              observer.disconnect();
              resolve(element.closest(selector) || element.querySelector(selector));
            }
          });
          observer.observe(document.documentElement, {childList: true, subtree: true});
        });
      }
    }

    awaitStyled () {
      return new Promise(resolve => {
        const check = () => {
          if (document.readyState === 'complete') {
            document.removeEventListener('readystatechange', check);
            resolve();
            return true;
          }
        };
        if (!check()) document.addEventListener('readystatechange', check);
      });
    }
  }

  return HTMLBookElement;
}))
