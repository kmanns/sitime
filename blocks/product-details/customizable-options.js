import { h, Fragment } from '@dropins/tools/preact.js';
import {
  useMemo, useCallback, useState, useEffect,
} from '@dropins/tools/preact-hooks.js';
import { events } from '@dropins/tools/event-bus.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';

/**
 * Custom component for rendering Adobe Commerce customizable options
 * Handles text fields, text areas, dropdowns, checkboxes, radio buttons, and date/time inputs
 */
export default function ProductCustomizableOptions({
  product = null,
  scope = '',
  onOptionChange = () => {},
  onValidationChange = () => {},
  className = '',
}) {
  const [enteredOptions, setEnteredOptions] = useState([]);
  const [errors, setErrors] = useState({});

  // Get customizable options from product
  const customizableOptions = useMemo(() => {
    if (!product?.customizableOptions?.length) return [];
    return product.customizableOptions;
  }, [product]);

  // Handle option value change
  const handleOptionChange = useCallback((optionUid, value) => {
    setEnteredOptions((prev) => {
      const existing = prev.findIndex((opt) => opt.uid === optionUid);
      let updated;

      if (existing !== -1) {
        updated = prev.map((opt) => (opt.uid === optionUid ? { uid: optionUid, value } : opt));
      } else {
        updated = [...prev, { uid: optionUid, value }];
      }

      // Update product configuration values
      const currentValues = pdpApi.getProductConfigurationValues();
      pdpApi.setProductConfigurationValues({
        ...currentValues,
        enteredOptions: updated,
      });

      // Emit event for product values change
      events.emit('pdp/values', { enteredOptions: updated });

      onOptionChange(optionUid, value);
      return updated;
    });
  }, [onOptionChange]);

  // Validate required options
  useEffect(() => {
    const newErrors = {};
    customizableOptions.forEach((option) => {
      if (option.required) {
        const hasValue = enteredOptions.some(
          (opt) => opt.uid === option.uid && opt.value !== '',
        );
        if (!hasValue) {
          newErrors[option.uid] = `${option.label} is required`;
        }
      }
    });
    setErrors(newErrors);
    onValidationChange(Object.keys(newErrors).length === 0);
  }, [enteredOptions, customizableOptions, onValidationChange]);

  // Return null if no customizable options
  if (!customizableOptions.length) {
    return null;
  }

  // Render individual option based on type
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
          ...(option.values || []).map((val) => h('option', { value: val.uid }, val.label)),
        ]);

      case 'radio':
        return h('fieldset', { className: 'customizable-option__radio-group' }, [
          h('legend', {}, option.label),
          ...(option.values || []).map((val) => h('div', { className: 'customizable-option__radio' }, [
            h('input', {
              type: 'radio',
              id: `option-${option.uid}-${val.uid}`,
              name: option.uid,
              value: val.uid,
              checked: currentValue === val.uid,
              onChange: (e) => handleOptionChange(option.uid, e.target.value),
              required: option.required,
            }),
            h('label', { htmlFor: `option-${option.uid}-${val.uid}` }, val.label),
          ])),
        ]);

      case 'checkbox':
        return h('div', { className: 'customizable-option__checkbox-group' }, 
          (option.values || []).map((val) => {
            const isChecked = Array.isArray(currentValue) 
              ? currentValue.includes(val.uid)
              : currentValue === val.uid;
            
            return h('div', { className: 'customizable-option__checkbox' }, [
              h('input', {
                type: 'checkbox',
                id: `option-${option.uid}-${val.uid}`,
                checked: isChecked,
                onChange: (e) => {
                  if (e.target.checked) {
                    const newValue = Array.isArray(currentValue)
                      ? [...currentValue, val.uid]
                      : [val.uid];
                    handleOptionChange(option.uid, newValue);
                  } else {
                    const newValue = Array.isArray(currentValue)
                      ? currentValue.filter((uid) => uid !== val.uid)
                      : '';
                    handleOptionChange(option.uid, newValue);
                  }
                },
              }),
              h('label', { htmlFor: `option-${option.uid}-${val.uid}` }, val.label),
            ]);
          })
        );

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
