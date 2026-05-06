# 使用 Ant Design Vue DatePicker 作为日期选择器

编辑器通过 `IDatePickerAdapter` 接口支持接入第三方日期选择器库。本文提供一份基于 **Ant Design Vue** 的完整适配器实现示例，供 Vue 3 项目参考。

## 前置条件

确保你的项目已安装以下依赖：

```bash
npm install vue@^3 ant-design-vue dayjs
```

## 适配器实现

```typescript
import { createApp, h } from 'vue'
import { DatePicker } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { IDatePickerAdapter, IDatePickerContext } from '@hufe921/canvas-editor'

export function createAntDatePickerAdapter(): IDatePickerAdapter {
  let app: ReturnType<typeof createApp> | null = null

  return {
    awake(context: IDatePickerContext) {
      // 1. 标记为编辑器内部组件，避免点击弹层内部时被判定为外部点击而销毁
      context.container.setAttribute('editor-component', 'popup')
      context.container.style.zIndex = '9999'

      // 2. 隐藏 DatePicker 自带的输入框触发器，仅保留下拉面板
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

      // 3. 解析当前值
      const initialValue = context.value
        ? dayjs(context.value, context.dateFormat)
        : null

      // 4. 挂载 Ant Design Vue DatePicker
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

### 关键点说明

- **`context.container`**：编辑器已经准备好的 HTML 容器，弹层应挂载在此容器内。编辑器会自动计算并设置容器的绝对定位，适配器无需再覆盖为 `fixed` 或手动设置 `left` / `top`。
- **`editor-component` 属性**：必须为容器添加 `editor-component` 属性，否则点击弹层内部会被编辑器判定为外部点击而立即销毁。
- **`context.dateFormat`**：日期格式字符串，来自控件配置中的 `control.dateFormat`。
- **`context.onSubmit(dateString)`**：用户确认日期后必须调用，将格式化后的字符串回传给编辑器。
- **`'onUpdate:open'`**：点击取消或面板外部关闭时，只需卸载 Vue 应用即可，**不要**调用 `context.onSubmit('')`，否则会清空控件已有值。
- **`destroy()`**：当控件失焦或被销毁时调用，必须卸载 Vue 应用并清理变量，防止内存泄漏。

## 传入编辑器

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
          placeholder: '请选择日期'
        }
      }
    ]
  },
  {
    datePickerAdapter: antAdapter
  }
)
```

完成上述步骤后，点击编辑器内的日期控件即可唤起 Ant Design Vue 的日期选择器。
