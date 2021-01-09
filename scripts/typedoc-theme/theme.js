const MarkdownTheme = require('typedoc-plugin-markdown/dist/theme');
const { PageEvent } = require('typedoc/dist/lib/output/events');

exports.default = class DocusaurusTheme extends MarkdownTheme {
  /**
   * Escape characters for mdx support after render
   */
  static formatContents(contents) {
    return contents.replace(/\\</g, '&#60;').replace(/\\"/g, '&#34;');
  }

  constructor(renderer, basePath) {
    super(renderer, basePath);
    this.listenTo(renderer, PageEvent.END, this.onDocusaurusPageEnd, 1024);
  }

  onDocusaurusPageEnd(page) {
    page.contents = page.contents
      ? DocusaurusTheme.formatContents(page.contents)
      : '';
  }

  get entryFile() {
    return 'index.md';
  }

  get navigationEnabled() {
    return true;
  }

  get hideReflectionTitle() {
    return true;
  }
}
