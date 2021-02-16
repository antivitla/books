(function () {
  const ru = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
    'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k',
    'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya',
  };

  window.slug = function (text = '') {
    return text
      .toLowerCase()
      // clear html entities
      .replace(/&\w+;/g, '')
      // replace '. ' with '---'
      .replace(/\.\s+/g, '---')
      // replace any other whitespace with '-'
      .replace(/\s+/g, '-')
      // split by char
      .split('')
      // translit
      .map(char => (ru[char] || char))
      .join('')
      .replace(/[^\w-]/g, '');
  }
}());