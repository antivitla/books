const HTMLBookReaderElement = require('./book-reader');

describe('book-reader', () => {
  let bookReader;

  beforeEach(() => {
    bookReader = document.createElement('book-reader');
    window.bookOptions = {
      id: 'book-id',
      src: {
        prefix: 'prefix/',
        postfix: '.html',
        list: ['fragment-1', 'fragment-2']
      }
    }
    bookReader.setAttribute('options', 'bookOptions')
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('not present initially in dom', () => {
  });

  test('not called init method until inserted into dom', () => {
    bookReader.optionsChangedCallback = jest.fn();
    expect(document.querySelector('book-reader')).toBeFalsy();
    expect(bookReader.optionsChangedCallback.mock.calls.length).toEqual(0);
    document.body.append(bookReader);
    expect(bookReader.optionsChangedCallback.mock.calls.length).toEqual(1);
    expect(document.querySelector('book-reader')).toBeTruthy();
  });

  test('created panels', () => {
    document.body.append(bookReader);
    expect(document.querySelector('book-reader .book-running-panel')).toBeTruthy();
    expect(document.querySelector('book-reader .book-index-panel')).toBeTruthy();
  })
});
