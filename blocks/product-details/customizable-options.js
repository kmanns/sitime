import { h, Fragment } from '@dropins/tools/preact.js';
import {
  useCallback, useState, useEffect,
} from '@dropins/tools/preact-hooks.js';
import { events } from '@dropins/tools/event-bus.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import { CORE_FETCH_GRAPHQL } from '../../scripts/commerce.js';

const CORE_CUSTOMIZABLE_OPTIONS_QUERY = `
  query GetCustomizableOptions($sku: String!) {
    products(filter: { sku: { eq: $sku } }) {
      items {
        __typename
        sku
        ... on CustomizableProductInterface {
          options {
            __typename
            uid
            option_id
            title
            required
            sort_order
            ... on CustomizableDropDownOption {
              value {
                uid
                option_type_id
                title
                sort_order
                price
                price_type
              }
            }
            ... on CustomizableRadioOption {
              value {
                uid
                option_type_id
                title
                sort_order
                price
                price_type
              }
            }
            ... on CustomizableCheckboxOption {
              value {
                uid
                option_type_id
                title
                sort_order
                price
                price_type
              }
            }
            ... on CustomizableMultipleOption {
              value {
                uid
                option_type_id
                title
                sort_order
                price
                price_type
              }
            }
          }
        }
      }
    }
  }
`;

const CS_OPTIONS_FALLBACK_QUERY = `
  query GetCatalogServiceOptions($sku: String!) {
    products(skus: [$sku]) {
      sku
      options {
        id
        title
        required
        type
        values {
          id
          title
          pricing {
            type
            value
          }
        }
      }
    }
  }
`;

function mapOptionType(typeName = '', fallbackType = '') {
  const source = (typeName || fallbackType || '').toLowerCase();

  if (source.includes('dropdown') || source === 'drop_down' || source === 'select') return 'drop_down';
  if (source.includes('radio')) return 'radio';
  if (source.includes('checkbox') || source.includes('multiple')) return 'checkbox';
  if (source.includes('field') || source === 'text') return 'text';
  if (source.includes('area') || source === 'textarea') return 'area';
  if (source.includes('file')) return 'file';
  if (source.includes('date_time') || source.includes('datetime')) return 'date_time';
  if (source.includes('date')) return 'date';
  if (source.includes('time')) return 'time';

  return '';
}

function normalizeCoreOptions(rawOptions = []) {
  return rawOptions
    .map((option) => {
      const type = mapOptionType(option.__typename);
      if (!type) return null;

      return {
        uid: option.uid || String(option.option_id),
        label: option.title,
        required: !!option.required,
        type,
        values: (option.value || []).map((value) => ({
          uid: value.uid || String(value.option_type_id),
          label: value.title,
          price: value.price != null
            ? {
              type: value.price_type,
              value: value.price,
            }
            : null,
        })),
      };
    })
    .filter(Boolean);
}

function normalizeCsOptions(rawOptions = []) {
  return rawOptions
    .map((option) => {
      const type = mapOptionType('', option.type);
      if (!type) return null;

      return {
        uid: option.id || option.title,
        label: option.title,
        required: !!option.required,
        type,
        values: (option.values || []).map((value) => ({
          uid: value.id || value.title,
          label: value.title,
          price: value.pricing?.value != null
            ? {
              type: value.pricing.type,
              value: value.pricing.value,
            }
            : null,
        })),
      };
    })
    .filter(Boolean);
}

export default function ProductCustomizableOptions({
  product = null,
  onOptionChange = () => {},
  onValidationChange = () => {},
  className = '',
}) {
  const [enteredOptions, setEnteredOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [customizableOptions, setCustomizableOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product?.sku) {
      setCustomizableOptions([]);
      setLoading(false);
      return;
    }

    const fetchCustomizableOptions = async () => {
      try {
        setLoading(true);

        const { data, errors: coreErrors } = await CORE_FETCH_GRAPHQL.fetchGraphQl(
          CORE_CUSTOMIZABLE_OPTIONS_QUERY,
          {
            method: 'GET',
            variables: { sku: product.sku },
          },
        );

        if (coreErrors?.length) {
          throw new Error(coreErrors.map((error) => error.message).join('; '));
        }

        const coreOptions = normalizeCoreOptions(data?.products?.items?.[0]?.options || []);

        if (coreOptions.length > 0) {
          console.debug('[pdp] Customizable options loaded from Core GraphQL:', coreOptions.length);
          setCustomizableOptions(coreOptions);
          return;
        }

        const csResponse = await pdpApi.fetchGraphQl(CS_OPTIONS_FALLBACK_QUERY, {
          method: 'GET',
          variables: { sku: product.sku },
        });

        const fallbackOptions = normalizeCsOptions(csResponse?.data?.products?.[0]?.options || []);
        console.debug('[pdp] Customizable options fallback from CS:', fallbackOptions.length);
        setCustomizableOptions(fallbackOptions);
      } catch (error) {
        console.warn('Failed to fetch customizable options:', error);
        setCustomizableOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomizableOptions();
  }, [product?.sku]);

  const handleOptionChange = useCallback((optionUid, value) => {
    setEnteredOptions((prev) => {
      const existing = prev.findIndex((opt) => opt.uid === optionUid);
      let updated;

      if (existing !== -1) {
        updated = prev.map((opt) => (opt.uid === optionUid ? { uid: optionUid, value } : opt));
      } else {
        updated = [...prev, { uid: optionUid, value }];
      }

      const currentValues = pdpApi.getProductConfigurationValues();
      pdpApi.setProductConfigurationValues({
        ...currentValues,
        enteredOptions: updated,
      });

      events.emit('pdp/values', { ...currentValues, enteredOptions: updated });
      onOptionChange(optionUid, value);
      return updated;
    });
  }, [onOptionChange]);

  useEffect(() => {
    const newErrors = {};

    customizableOptions.forEach((option) => {
      if (!option.required) return;

      const selected = enteredOptions.find((opt) => opt.uid === option.uid);
      const hasValue = Array.isArray(selected?.value)
        ? selected.value.length > 0
        : !!selected?.value;

      if (!hasValue) {
        newErrors[option.uid] = `${option.label} is required`;
      }
    });

    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [enteredOptions, customizableOptions, onValidationChange]);

  const renderOption = (option) => {
    const currentValue = enteredOptions.find((opt) => opt.uid === option.uid)?.value || '';
    const hasError = !!errors[option.uid];

    switch (option.type) {
      case 'text':
        return h('input', {
          type: 'text',
          className: `customizable-option__input ${hasError ? 'customizable-option__input--error' : ''}`,
          placeholder: option.label,
          value: currentValue,
          onChange: (e) => handleOptionChange(option.uid, e.target.value),
          required: option.required,
        });

      case 'area':
        return h('textarea', {
          className: `customizable-option__textarea ${hasError ? 'customizable-option__textarea--error' : ''}`,
          placeholder: option.label,
          value: currentValue,
          onChange: (e) => handleOptionChange(option.uid, e.target.value),
          required: option.required,
          rows: 4,
        });

      case 'file':
        return h('input', {
          type: 'file',
          className: `customizable-option__file ${hasError ? 'customizable-option__file--error' : ''}`,
          onChange: (e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleOptionChange(option.uid, file.name);
            }
          },
          required: option.required,
        });

      case 'drop_down':
        return h('select', {
          className: `customizable-option__select ${hasError ? 'customizable-option__select--error' : ''}`,
          value: currentValue,
          onChange: (e) => handleOptionChange(option.uid, e.target.value),
          required: option.required,
        }, [
          h('option', { value: '', disabled: true }, 'Select an option'),
          ...(option.values || []).map((value) => h('option', { value: value.uid }, value.label)),
        ]);

      case 'radio':
        return h('fieldset', { className: 'customizable-option__radio-group' }, [
          h('legend', {}, option.label),
          ...(option.values || []).map((value) => h('div', { className: 'customizable-option__radio' }, [
            h('input', {
              type: 'radio',
              id: `option-${option.uid}-${value.uid}`,
              name: option.uid,
              value: value.uid,
              checked: currentValue === value.uid,
              onChange: (e) => handleOptionChange(option.uid, e.target.value),
              required: option.required,
            }),
            h('label', { htmlFor: `option-${option.uid}-${value.uid}` }, value.label),
          ])),
        ]);

      case 'checkbox':
        return h('div', { className: 'customizable-option__checkbox-group' },
          (option.values || []).map((value) => {
            const selectedValues = Array.isArray(currentValue) ? currentValue : [];
            const isChecked = selectedValues.includes(value.uid);

            return h('div', { className: 'customizable-option__checkbox' }, [
              h('input', {
                type: 'checkbox',
                id: `option-${option.uid}-${value.uid}`,
                checked: isChecked,
                onChange: (e) => {
                  if (e.target.checked) {
                    handleOptionChange(option.uid, [...selectedValues, value.uid]);
                  } else {
                    handleOptionChange(option.uid, selectedValues.filter((uid) => uid !== value.uid));
                  }
                },
              }),
              h('label', { htmlFor: `option-${option.uid}-${value.uid}` }, value.label),
            ]);
          }));

      case 'date':
        return h('input', {
          type: 'date',
          className: `customizable-option__input ${hasError ? 'customizable-option__input--error' : ''}`,
          value: currentValue,
          onChange: (e) => handleOptionChange(option.uid, e.target.value),
          required: option.required,
        });

      case 'time':
        return h('input', {
          type: 'time',
          className: `customizable-option__input ${hasError ? 'customizable-option__input--error' : ''}`,
          value: currentValue,
          onChange: (e) => handleOptionChange(option.uid, e.target.value),
          required: option.required,
        });

      case 'date_time':
        return h('input', {
          type: 'datetime-local',
          className: `customizable-option__input ${hasError ? 'customizable-option__input--error' : ''}`,
          value: currentValue,
          onChange: (e) => handleOptionChange(option.uid, e.target.value),
          required: option.required,
        });

      default:
        return null;
    }
  };

  if (loading || customizableOptions.length === 0) {
    return null;
  }

  return h('div', { className: `customizable-options ${className}` }, [
    h('fieldset', { className: 'customizable-options__fieldset' }, [
      h('legend', { className: 'customizable-options__legend' }, 'Customizable Options'),
      h(Fragment, {},
        customizableOptions.map((option) => h('div', {
          className: `customizable-option ${errors[option.uid] ? 'customizable-option--invalid' : ''}`,
          key: option.uid,
        }, [
          h('label', { className: 'customizable-option__label' }, [
            option.label,
            option.required ? h('span', { className: 'customizable-option__required' }, ' *') : null,
          ]),
          renderOption(option),
          errors[option.uid] ? h('span', { className: 'customizable-option__error' }, errors[option.uid]) : null,
        ])),
      ),
    ]),
  ]);
}
