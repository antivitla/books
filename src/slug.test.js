require('./slug');

const {slug} = window;

test('slug is imported', () => {
  expect(slug).toBeDefined();
});

test('slug replaces simple words', () => {
  expect(slug('привет')).toEqual('privet');
  expect(slug('hello')).toEqual('hello');
});

test('replace whitespace', () => {
  expect(slug('привет    как дела')).toEqual('privet-kak-dela')
});

test('replace punctuations and other non-word chars', () => {
  expect(slug('привет, как дела. &mdash; Спросил "зайчик».')).toEqual(
    'privet-kak-dela---sprosil-zaychik'
  );
});