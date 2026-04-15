# Product Details Block

## Overview

The Product Details block provides comprehensive product detail page functionality using multiple @dropins/storefront-pdp containers. It handles product display, configuration, cart operations, wishlist integration, and SEO optimization with dynamic mode switching between add and update operations.

## Integration

| Configuration Key       | Type   | Default   | Description                                                    | Required | Side Effects                                                                                                 |
| ----------------------- | ------ | --------- | -------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `grid-ordering-enabled` | string | `'false'` | Enables Grid Ordering functionality for configurable products. | No       | When enabled, product variants are displayed in a grid with quantity inputs and bulk add-to-cart capability. |

### URL Parameters

- `itemUid` - Item UID for cart update mode (when present, enables update mode instead of add mode)
- `optionsUIDs` - Product option UIDs for wishlist context (empty string treated as base product with no options)

<!-- ### Local Storage

No localStorage keys are used by this block. -->

### Events

#### Event Listeners

- `events.on('pdp/valid', callback)` - Listens for product configuration validity changes to enable/disable add to cart button
- `events.on('pdp/values', callback)` - Listens for product option value changes to update wishlist context
- `events.on('wishlist/alert', callback)` - Listens for wishlist action alerts to show notifications
- `events.on('cart/data', callback)` - Listens for cart data changes to determine update mode
- `events.on('aem/lcp', callback)` - Listens for AEM LCP event to set JSON-LD and meta tags

<!-- #### Event Emitters

No events are emitted by this block. -->

## Behavior Patterns

### Page Context Detection

- **Add Mode**: When no itemUid in URL, operates in add-to-cart mode
- **Update Mode**: When itemUid in URL, operates in update-cart mode with different button text and behavior
- **Product Configuration**: Validates product options and enables/disables add to cart button accordingly
- **Customizable Options**: Renders custom options (text fields, dropdowns, checkboxes, etc.) if available on the product
- **Wishlist Context**: Updates wishlist context based on current product configuration

### User Interaction Flows

1. **Initialization**: Block renders product gallery, header, price, customizable options, configurable options, quantity, and action buttons
2. **Product Configuration**: Users can select product options and enter customizable option values with real-time validation
3. **Add to Cart**: Users can add products with custom options to cart or update existing cart items
4. **Wishlist Management**: Users can add/remove products from wishlist
5. **Image Gallery**: Users can view product images in desktop thumbnail or mobile carousel format
6. **SEO Optimization**: Sets JSON-LD structured data and meta tags for search engines

### Customizable Options Data Sources

Customizable options are resolved in this order:

1. Core GraphQL query (`CustomizableProductInterface`)
2. Catalog Service product options fallback
3. Product attribute override (`ac_customizable_options` or `ac_customizable` JSON)
4. Site config override (`commerce-customizable-options` in `config.json`)

When using overrides, each option/value must include the actual option UIDs expected by cart mutations.

Example `config.json` shape:

```json
{
  "public": {
    "default": {
      "commerce-customizable-options": {
        "sit8008": [
          {
            "uid": "<customizable_option_uid>",
            "label": "Package",
            "required": true,
            "type": "drop_down",
            "values": [
              {
                "uid": "<customizable_option_value_uid>",
                "label": "Option A"
              }
            ]
          }
        ]
      }
    }
  }
}
```

### Error Handling

- **Configuration Errors**: If product configuration is invalid, disables add to cart button
- **API Errors**: If cart operations fail, shows error alerts with dismiss functionality
- **Image Rendering Errors**: If product images fail to load, the image slots handle fallback behavior
- **JSON-LD Errors**: If structured data generation fails, falls back to basic meta tags
- **Fallback Behavior**: Always falls back to appropriate mode based on URL parameters and cart state
