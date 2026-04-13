# Cards List

## Overview

The `cards-list` block is a lightweight presentational block that applies card and button styling to authored column rows.

## DA.live integration and authoring structure

This block is not currently registered in `models/_component-definition.json` and has no `_cards-list.json` authoring contract. Treat it as a legacy/internal block rather than a DA.live sidebar component.

| DA.live Model Options | Value | Effect |
| --- | --- | --- |
| N/A | N/A | Default: authored as raw block markup; no dedicated sidebar model is defined. |

Document authoring example:

| Cards List |
| --- |
| image + text row content authored directly in block cells |

## Section Metadata Reference

This block does not currently use block-specific section metadata.

| key/field | possible values | effect |
| --- | --- | --- |
| N/A | N/A | Default: no section metadata is read by this block. |

## Metadata Precedence

Not applicable. The block has no metadata contract today.

## Behavior patterns

- Direct row children receive the `card-item` class.
- The first paragraph inside the second cell receives the `desc` class when present.
- All links inside the block receive the shared `button alt` classes.

## Accessibility notes

- Accessibility depends on the authored content structure and link text.
- Use meaningful link copy because all anchors are styled as call-to-action buttons.

## Troubleshooting

- If description styling does not appear, confirm the second cell contains a paragraph element.
- If button styling does not appear, confirm the authored content uses anchor tags rather than plain text.
