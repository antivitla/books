require('./h');

const {h} = window;

test('Create element', () => {
  expect(h('section', 'Hello')).toEqual('<section>Hello</section>');
});

test('Nested element', () => {
  expect(h('header', [
    h('h1', 'Капитал'),
    h('p', 'Маркс'),
  ])).toEqual('<header><h1>Капитал</h1><p>Маркс</p></header>');
});

test('Parse attributes', () => {
  expect(h('header', [
    h('p', 'Маркс', {class: 'author subheader'}),
  ])).toEqual([
    '<header>',
    '<p class="author subheader">Маркс</p>',
    '</header>',
  ].join(''))
})

test('Parse class, id and other attributes', () => {
  expect(h('header', [
    h('h1', 'Капитал', {id: 'capital', class: 'my-class subheader'}),
    h('p.subheader.exclude-from-toc.red', 'Критика политической экономии'),
    h('p.author', 'Маркс'),
  ])).toEqual([
    '<header>',
    '<h1 class="my-class subheader" id="capital">Капитал</h1>',
    '<p class="subheader exclude-from-toc red">Критика политической экономии</p>',
    '<p class="author">Маркс</p>',
    '</header>',
  ].join(''));
});