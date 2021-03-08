function customHtmlPage(body, assets = []) {
  return `
    <!doctype html>
    <html lang="en">
    <head>
      <title></title>
      ${
        assets
          .filter(asset => asset.match(/\.js$/))
          .map(asset => `<script src="../src/${asset}"></script>`)
          .join('')
      }
    </head>
    <body>
      ${body}
    </body>
    </html>`;
}

function isRendered(element) {
  return (
    element instanceof HTMLElement
      ? element
      : element.get(0)
  ).getClientRects().length > 0;
}

module.exports = {
  customHtmlPage,
  isRendered
};