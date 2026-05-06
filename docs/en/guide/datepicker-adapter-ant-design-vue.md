# Using Ant Design Vue DatePicker as the Date Picker

The editor supports integrating third-party date picker libraries via the `IDatePickerAdapter` interface. This guide provides a complete implementation example based on **Ant Design Vue** for Vue 3 projects.

## Prerequisites

Make sure the following dependencies are installed in your project:

```bash
npm install vue@^3 ant-design-vue dayjs
```

## Adapter Implementation

```typescript
import { createApp, h } from 'vue'
import { DatePicker } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { IDatePickerAdapter, IDatePickerContext } from '@hufe921/canvas-editor'

export function createAntDatePickerAdapter(): IDatePickerAdapter {
  let app: ReturnType<typeof createApp> | null = null

  return {
    awake(context: IDatePickerContext) {
      // 1. Mark as an internal editor component so clicks inside the popup
      // are not treated as external clicks by GlobalEvent.clearSideEffect
      context.container.setAttribute('editor-component', 'popup')
      context.container.style.zIndex = '9999'

      // 2. Hide the built-in DatePicker input trigger and keep only the dropdown panel
      const style = document.createElement('style')
      style.textContent = `
        .ant-picker {
          opacity: 0 !important;
          pointer-events: none !important;
          width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
          padding: 0 !important;
          border: none !important;
          margin: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .ant-picker-dropdown {
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          transform: none !important;
        }
      `
      context.container.appendChild(style)

      // 3. Parse current value
      const initialValue = context.value
        ? dayjs(context.value, context.dateFormat)
        : null

      // 4. Mount Ant Design Vue DatePicker
      app = createApp({
        setup() {
          return () =>
            h(DatePicker, {
              open: true,
              showTime: true,
              format: context.dateFormat,
              value: initialValue?.isValid() ? initialValue : null,
              getPopupContainer: () => context.container,
              'onUpdate:open': (open: boolean) => {
                if (!open && app) {
                  app.unmount()
                  app = null
                }
              },
              onOk: (date: dayjs.Dayjs | null) => {
                const result = date?.isValid()
                  ? date.format(context.dateFormat || 'YYYY-MM-DD HH:mm:ss')
                  : ''
                context.onSubmit(result)
                if (app) {
                  app.unmount()
                  app = null
                }
              }
            })
        }
      })

      app.mount(context.container)
    },

    destroy() {
      if (app) {
        app.unmount()
        app = null
      }
    },

    isVisible() {
      return app !== null
    }
  }
}
```

### Key Points

- **`context.container`**: A ready-made HTML container provided by the editor. The editor already positions it absolutely, so the adapter should **not** override it to `fixed` or reassign `left` / `top`.
- **`editor-component` attribute**: You must add this attribute to the container; otherwise clicks inside the popup will be treated as external clicks and the control will be destroyed immediately.
- **`context.dateFormat`**: The date format string from the control configuration (`control.dateFormat`).
- **`context.onSubmit(dateString)`**: Must be called when the user confirms a date, passing the formatted string back to the editor.
- **`'onUpdate:open'`**: When the panel closes via cancel or outside click, simply unmount the Vue app. **Do not** call `context.onSubmit('')`, or the existing value will be cleared.
- **`destroy()`**: Called when the control blurs or is destroyed. You must unmount the Vue app and clean up variables to prevent memory leaks.

## Pass to the Editor

```typescript
import Editor from '@hufe921/canvas-editor'
import { createAntDatePickerAdapter } from './antDatePickerAdapter'

const antAdapter = createAntDatePickerAdapter()

new Editor(
  document.querySelector('.canvas-editor'),
  {
    main: [
      {
        value: '',
        type: 'control',
        control: {
          type: 'date',
          dateFormat: 'YYYY-MM-DD HH:mm:ss',
          placeholder: 'Please select a date'
        }
      }
    ]
  },
  {
    datePickerAdapter: antAdapter
  }
)
```

After completing the above steps, clicking the date control in the editor will open the Ant Design Vue date picker.
