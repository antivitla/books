require('./book-part.js');

test('book-part is valid element', () => {
  document.body.innerHTML =
    '<book-part></book-part>';
  expect(document.querySelector('book-part') instanceof HTMLElement).toBe(true);
});

test('book-part imports part', () => {
  document.body.innerHTML =
    '<book-part src="part.html"></book-part>';
});

test.todo('book-part imports book part into DOM (\'show\'), if focused');
test.todo('book-part imports book part into template (\'hide\'), if not focused');
test.todo('book-part watches its own \'focused\' attribute and show/hide book part accordingly');