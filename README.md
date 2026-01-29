# Strapi Plugin: Field Clearer

A Strapi v5 plugin that provides a convenient UI to clear/delete field data from content types. Perfect for managing test data, clearing relations, or resetting component arrays.

## Features

- Clear any field type: relations, components, media, text, enumerations, etc.
- Support for nested fields inside components (e.g., `coupons.freebies`)
- Target specific component indices (e.g., `coupons[1].freebies` to clear only the 2nd coupon's freebies)
- Preview before delete - see exactly what will be removed
- Bulk mode - clear multiple fields at once
- Favorites - save frequently used field paths
- Full audit logging
- Secure - requires admin authentication and configurable content type whitelist

## Installation

```bash
npm install strapi-plugin-field-clearer
# or
yarn add strapi-plugin-field-clearer
```

## Configuration

Add the plugin configuration to your `config/plugins.js` (or `config/plugins.ts`):

```javascript
module.exports = {
  'field-clearer': {
    enabled: true,
    config: {
      // Specify which content types can use the Field Clearer
      allowedContentTypes: [
        'api::cart.cart',
        'api::collection.collection',
        'api::product.product',
        // Add your content types here
      ],
    },
  },
};
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `allowedContentTypes` | `string[]` | Yes | Array of content type UIDs that can use the Field Clearer. Format: `api::collection-name.collection-name` |

## Usage

1. Navigate to any configured content type in the Strapi admin panel
2. Open a document (entry)
3. Click the "Clear Field" button in the right panel
4. Enter the field path you want to clear

### Field Path Examples

| Path | Description |
|------|-------------|
| `coupons` | Clear all coupons (entire field) |
| `coupons.freebies` | Clear freebies from ALL coupons |
| `coupons[0].freebies` | Clear freebies from the 1st coupon only |
| `coupons[1].freebies` | Clear freebies from the 2nd coupon only |
| `coupons[0,2].freebies` | Clear freebies from 1st and 3rd coupons |
| `image` | Clear a media field |
| `tags` | Clear a relation field |

### Modes

#### Single Mode
- Enter a field path
- Preview what will be deleted
- Confirm deletion

#### Bulk Mode
- Add multiple field paths
- Preview all at once
- Clear all selected fields in one operation

### Favorites
- Save frequently used field paths
- Quick access from the favorites section
- Validated before saving (ensures field exists)

## Security

- All endpoints require admin authentication
- Content types must be explicitly whitelisted in configuration
- Input validation on all field paths
- Full audit logging of all clear operations

## API Endpoints

The plugin exposes these endpoints (all require admin authentication):

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/field-clearer/config` | Get plugin configuration |
| `POST` | `/field-clearer/preview-field` | Preview what will be deleted |
| `POST` | `/field-clearer/clear-field` | Clear the specified field |

## Requirements

- Strapi v5.x
- Node.js 18+

## Development

```bash
# Build the plugin
npm run build

# Watch for changes during development
npm run watch

# Link for local development
npm run watch:link
```

## License

MIT

## Author

Akshay Golakiya
