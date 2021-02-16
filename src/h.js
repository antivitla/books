(function () {
  function parseSelector(selector = '') {
    return {
      tag: selector
        .match(/^[\w-]+/)?.[0],
      class: selector
        .match(/\.[\w-]+/g)
        ?.map(item => item.replace(/^\./, ''))
        .join(' '),
      id: selector
        .match(/#[\w-]+/)
        ?.replace(/^#/, '')[0],
    };
  }

  window.h = function (selector = '', content = '', properties = {}) {
    const parsed = Object.assign(parseSelector(selector), properties);
    const attributes = Object.keys(parsed)
      .filter(key => key !== 'tag')
      .map(attr => parsed[attr] ? `${' '}${attr}="${parsed[attr]}"` : '')
      .filter(attr => attr)
      .join('');

    return `<${parsed.tag}${attributes}>${
      Array.isArray(content) ? content.join('') : content
    }</${parsed.tag}>`;
  };
}());