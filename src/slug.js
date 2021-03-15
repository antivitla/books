(function (root, name, factory) {

  // Commonjs
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }

  // Window
  else if (!name) {
    throw new Error('Provide name for root export');
  } else {
    root[name] = factory();
  }

  // Run in terminal
  if (typeof process !== 'undefined' && process.argv[2]) {
    const slug = factory();
    process.argv.slice(2).forEach(entry => {
      console.log(slug(entry));
    });
  }
  
}(this, 'Slug', function () {
  'use strict';

  const locale = {
    ru: {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
      'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k',
      'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
      'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
      'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
      'э': 'e', 'ю': 'yu', 'я': 'ya',
    }
  };

  function slug (text = '', lang = 'ru') {
    return text
      .toLowerCase()
      // clear html entities
      .replace(/&\w+;/g, '')
      // replace '. ' or ', ' with '--'
      .replace(/(\.|,)\s+/g, '--')
      // replace '.' with '-'
      .replace(/\./g, '-')
      // replace '/' with '--'
      .replace(/\/+|\\+/g, '--')
      // replace any other whitespace with '-'
      .replace(/\s+/g, '-')
      // remove starting and ending '-'
      .replace(/(^-+)|(-+$)/g, '')
      // split by char
      .split('')
      // translit
      .map(char => (locale[lang][char] || char))
      .join('')
      .replace(/[^\w-]/g, '');
  };

  return slug;

}));
