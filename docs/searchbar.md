# Webflow CMS Searchbar

A lightweight, zero-dependency client-side search widget for Webflow CMS collections. Fetches collection items once via a REST API, caches them in `localStorage`, and filters entirely in the browser on every keystroke.

## Files

| File | Purpose |
|------|---------|
| `src/searchbar.js` | Core library + `WebflowCMS` public API |
| `src/searchbar.css` | All widget styles (CSS custom properties, responsive) |
| `dist/searchbar.min.js` | Minified JS — include in Webflow page |
| `dist/searchbar.min.css` | Minified CSS — include in Webflow page |

## Quick Start

### 1. Add the HTML

Place this markup anywhere on your Webflow page:

```html
<div class="search-container">
  <input id="searchInput" type="text" placeholder="Search..." />
  <div id="searchResults"></div>
</div>
```

### 2. Include the assets

In the Webflow page `<head>`:

```html
<link rel="stylesheet" href="/your-cdn/searchbar.min.css" />
```

Before the closing `</body>`:

```html
<script src="/your-cdn/searchbar.min.js"></script>
```

### 3. Initialize

Call `WebflowCMS.init()` after the script loads:

```html
<script>
  WebflowCMS.init({
    collection: 'hr-glossaries',
    fields: ['name', 'slug', 'summary', 'meta-description'],
    saveTo: 'glossaryData',
    search: {
      input: '#searchInput',
      results: '#searchResults',
    },
  });
</script>
```

## Configuration

### `WebflowCMS.init(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collection` | `string` | **required** | Webflow CMS collection slug |
| `fields` | `string[]` | `['name','slug']` | Fields to fetch from the API |
| `apiBase` | `string` | `https://webflow-cms-api-ten.vercel.app` | Base URL of the CMS proxy API |
| `ttl` | `number` | `600000` (10 min) | Cache lifetime in milliseconds |
| `saveTo` | `string` | — | Saves the raw items array to `window[saveTo]` for external use |
| `search` | `object` | — | Search widget config (see below) |
| `title` | `function` | `i => i.fieldData.name` | Returns the display title for an item |
| `url` | `function` | appends `slug` to current path | Returns the href for an item |
| `onLoad` | `function` | — | Called with `items[]` after the collection loads |

### `search` sub-options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `input` | `string` | **required** | CSS selector for the `<input>` element |
| `results` | `string` | **required** | CSS selector for the results container |
| `searchFields` | `string[]` | — | `fieldData` keys to search across; falls back to `title()` if omitted |
| `minQuery` | `number` | `2` | Minimum characters before search triggers |
| `debounce` | `number` | `120` | Keystroke debounce delay in milliseconds |
| `maxResults` | `number` | `50` | Maximum number of results to render |

## Caching

Items are stored in `localStorage` under the key `wfcms:<collection>:<fields>`. On the next page load, if the entry is still within `ttl`, no network request is made. The cache is invalidated automatically after `ttl` expires.

To bust the cache manually (e.g. in DevTools):

```js
localStorage.removeItem('wfcms:hr-glossaries:name,slug,summary,meta-description');
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `↓` / `↑` | Move highlight through results |
| `Enter` | Navigate to the highlighted result |
| `Escape` | Close the results dropdown |

## CSS Custom Properties

Override these on `:root` (or any ancestor element) to theme the widget:

```css
:root {
  --search-purple: #9d72ff;        /* accent / highlight bg */
  --search-purple-tint: #e6e0ff;   /* reserved for future use */
  --search-white: #ffffff;
  --search-light-grey: #f6f6f6;    /* hover / stats bar bg */
  --search-dark-grey: #656565;     /* secondary text */
  --search-border-grey: #d9d9d9;   /* input / dropdown border */
  --search-text: #151515;          /* primary text */
}
```

## Advanced Usage

### Custom title and URL

```js
WebflowCMS.init({
  collection: 'blog-posts',
  fields: ['name', 'slug', 'category'],
  search: { input: '#searchInput', results: '#searchResults' },
  title: function (item) {
    return item.fieldData.name + ' — ' + item.fieldData.category;
  },
  url: function (item) {
    return '/blog/' + item.fieldData.slug;
  },
});
```

### Accessing raw data after load

```js
WebflowCMS.init({
  collection: 'hr-glossaries',
  fields: ['name', 'slug', 'summary'],
  saveTo: 'glossaryData',
  onLoad: function (items) {
    console.log('Loaded', items.length, 'items');
  },
});
// Later: window.glossaryData holds the full array
```

### Searching across multiple fields

```js
WebflowCMS.init({
  collection: 'hr-glossaries',
  fields: ['name', 'slug', 'summary', 'meta-description'],
  search: {
    input: '#searchInput',
    results: '#searchResults',
    searchFields: ['name', 'summary', 'meta-description'],
  },
});
```

## Build

```bash
npm run build
```

Outputs minified JS and CSS to `dist/`.
