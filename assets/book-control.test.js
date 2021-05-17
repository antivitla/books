const HTMLBookControlElement = require('./book-control');

describe('<book-control>', () => {
  let bookControl;

  beforeEach(() => {
    bookControl = document.createElement('book-control');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  })

  test('is defined and constructed', () => {
    expect(bookControl).toBeInstanceOf(HTMLBookControlElement);
  });

  describe('Cached properties', () => {
    test('initially cached property is undefined', () => {
      expect(bookControl.__myCached).toBeUndefined();
    });

    test('once supplied by factory, it is calculated', () => {
      expect(bookControl.getCached('myCached')).toBeUndefined();
      expect(bookControl.getCached('myCached', () => 5)).toEqual(5);
      expect(bookControl.getCached('myCached')).toEqual(5);
    });

    test('once cache is cleared, should be undefined again', () => {
      expect(bookControl.getCached('myCached', () => 5)).toEqual(5);
      expect(bookControl.getCached('myCached')).toEqual(5);
      bookControl.deleteCached('myCached');
      expect(bookControl.getCached('myCached')).toBeUndefined();
    });

    test('cached value factory should be called only once', () => {
      const factory = jest.fn(() => 67);
      // Call few times
      expect([1,2,3].map(() => bookControl.getCached('myCached', factory))).toEqual([67,67,67]);
      expect(factory.mock.calls.length).toEqual(1);
    });

    test('cache false, null, 0 and empty string', () => {
      expect(bookControl.getCached('cacheFalse', () => false)).toEqual(false);
      expect(bookControl.getCached('cacheNull', () => null)).toEqual(null);
      expect(bookControl.getCached('cache0', () => 0)).toEqual(0);
      expect(bookControl.getCached('cacheEmpty', () => '')).toEqual('');
    });

    test('cache can be set', () => {
      const factory = jest.fn(() => 61);
      expect(bookControl.getCached('myCached')).toBeUndefined();
      bookControl.setCached('myCached', 8);
      expect(bookControl.getCached('myCached', factory)).toEqual(8);
      expect(factory.mock.calls.length).toEqual(0);
    });

    test('cleanup should occur in cache', () => {
      bookControl.getCached('myCached', () => 67);
      bookControl.getCached('myCachedGrouped', () => 8, 'myGroup');
      bookControl.getCached('myCachedGrouped2', () => 2, 'myGroup');
      expect(bookControl.__myCached).toEqual(67);
      expect(bookControl.__myCachedGrouped).toEqual(8);
      expect(bookControl.__myCachedGrouped2).toEqual(2);
      bookControl.cleanup('myGroup');
      expect(bookControl.cleanupTasks.length).toEqual(1);
      expect(bookControl.__myCached).toEqual(67);
      expect(bookControl.__myCachedGrouped).toBeUndefined();
      expect(bookControl.__myCachedGrouped2).toBeUndefined();
      bookControl.cleanup();
      expect(bookControl.cleanupTasks.length).toEqual(0);
      expect(bookControl.__myCached).toBeUndefined();
    });
  });

  describe('DOM References', () => {
    /* We may have references to required elements, which may
    not be available at the moment we use them. We need a way to
    wait for their availability */

    test('wait for reference', () => {
      let element = bookControl.getCached('bookScrollElement', () => {
        return document.getElementById('book');
      });
      expect(element).toBeNull();
      setTimeout(() => {
        document.body.innerHTML += '<div id="book"></div>';
      }, 300);
      return bookControl.awaitElement('#book').then(book => {
        expect(book).toBeInstanceOf(HTMLElement);
      });
    });

    test('wait more complex selector', () => {
      let selector = 'p .my-class';
      expect(bookControl.getCached(selector, () => document.querySelector(selector))).toBeFalsy();
      setTimeout(() => {
        document.body.innerHTML += '<section><span class="my-class">Zik</span></section>';
      }, 200);
      setTimeout(() => {
        document.body.innerHTML += '<p><span class="my-class">Zok</span></p>';
      }, 200);
      return bookControl.awaitElement(selector).then(zok => {
        return expect(zok.closest(selector)).toEqual(zok);
      });
    });
  });

  describe('Cleanup', () => {
    test('executes cleanup', () => {
      let count = 0;
      bookControl.cleanupTasks.push(() => {
        count += 1;
      });
      bookControl.cleanupTasks.push(['grouped', () => {
        count += 1;
      }]);
      bookControl.cleanup();
      expect(bookControl.cleanupTasks.length).toEqual(0);
      expect(count).toEqual(2);
    });

    test('executes cleanup of the group', () => {
      let count = '';
      bookControl.cleanupTasks.push(function helloA () {
        count += 'a';
      });
      bookControl.cleanupTasks.push(['group1', () => {
        count += 'g11';
      }]);
      bookControl.cleanupTasks.push(['group1', () => {
        count += 'g12';
      }]);
      bookControl.cleanupTasks.push(['group2', () => {
        count += 'g2';
      }]);
      bookControl.cleanupTasks.push(['group3', () => {
        count += 'g3';
      }]);
      bookControl.cleanupTasks.push(function helloB () {
        count += 'b';
      });
      bookControl.cleanup('group1');
      expect(count).toEqual('g11g12');
      expect(bookControl.cleanupTasks.length).toEqual(4);
      bookControl.cleanup('group3');
      expect(bookControl.cleanupTasks.length).toEqual(3);
      bookControl.cleanup();
      expect(count).toEqual('g11g12g3ag2b');
      expect(bookControl.cleanupTasks.length).toEqual(0);
    });
  });

  test('listen', () => {
    let count = '';
    bookControl.listen('zok', document, () => count += 'zok');
    bookControl.listen('zak', document, () => count += 'zak', 'zik');
    expect(bookControl.cleanupTasks.length).toEqual(2);
    expect(bookControl.cleanupTasks[1][0]).toEqual('zik');
    bookControl.cleanup('zik');
    expect(bookControl.cleanupTasks.length).toEqual(1);
    expect(Array.isArray(bookControl.cleanupTasks[0])).toEqual(false);
  });

  test('parse position', () => {
    let p;
    p = '5,7,0.1';
    expect(bookControl.parsePosition(p)).toEqual([5,7,0.1]);
    p = '10,0';
    expect(bookControl.parsePosition(p)).toEqual([10,0]);
    p = '';
    expect(bookControl.parsePosition(p)).toEqual([0]);
    p = null;
    expect(bookControl.parsePosition(p)).toEqual([0]);
    p = ['1', undefined, 'undefined', '5', 0.1, '-0.6', 'null'];
    expect(bookControl.parsePosition(p)).toEqual([1,0,0,5,0.1,-0.6,0]);
  });
});
