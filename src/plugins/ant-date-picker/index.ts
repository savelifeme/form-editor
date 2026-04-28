/**
 * Ant Design Vue DatePicker 插件
 *
 * 将 Ant Design Vue 的 DatePicker/RangePicker/TimePicker 集成到 canvas-editor
 * 的日期控件中。支持多种选择器类型，通过 control.extension.antPickerType 标识。
 */
import { createApp, h } from 'vue'
import { DatePicker, TimePicker } from 'ant-design-vue'
import dayjs, { Dayjs } from 'dayjs'
import Editor, {
  ControlType,
  ElementType,
  IDatePickerAdapter,
  IDatePickerContext
} from '../../editor'

/** 扩展类型，标识 Ant DatePicker 的类型 */
export type AntPickerType =
  | 'date'
  | 'datetime'
  | 'range'
  | 'datetime-range'
  | 'year'
  | 'year-range'
  | 'month'
  | 'month-range'
  | 'time'
  | 'time-range'
  | 'datetime-hour'
  | 'datetime-hour-minute'

/** 范围值的分隔符 */
export const RANGE_SEPARATOR = ' ~ '

/** 控件 extension 中存放 Ant DatePicker 配置的字段名 */
export const ANT_PICKER_EXTENSION_KEY = 'antPickerType'

/** 扩展命令类型 */
export type CommandWithAntDatePicker = Editor['command'] & {
  executeInsertAntDatePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntDateTimePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntRangePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntDateTimeRangePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntYearPicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntYearRangePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntMonthPicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntMonthRangePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntTimePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntTimeRangePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntDateTimeHourPicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
  executeInsertAntDateTimeHourMinutePicker(payload?: {
    dateFormat?: string; placeholder?: string; value?: string
  }): void
}

// ================================================================
// 内部工具
// ================================================================

/** 判断日期格式是否含时间组件（时:分:秒） */
function hasTimeFormat(dateFormat?: string): boolean {
  return /[HhmsS]/.test(dateFormat || '')
}

/** 解析范围值字符串为 [start, end] Dayjs 数组 */
function parseRangeValue(
  value: string,
  dateFormat: string
): [Dayjs | null, Dayjs | null] {
  if (!value) return [null, null]
  const parts = value.split(RANGE_SEPARATOR)
  if (parts.length !== 2) return [null, null]
  const start = dayjs(parts[0].trim(), dateFormat)
  const end = dayjs(parts[1].trim(), dateFormat)
  return [
    start.isValid() ? start : null,
    end.isValid() ? end : null
  ]
}

/** 占位文本映射 */
function getPlaceholder(pickerType: AntPickerType): string {
  const map: Record<AntPickerType, string> = {
    date: '请选择日期',
    datetime: '请选择日期时间',
    range: '请选择日期范围',
    'datetime-range': '请选择日期时间范围',
    year: '请选择年份',
    'year-range': '请选择年份范围',
    month: '请选择月份',
    'month-range': '请选择月份范围',
    time: '请选择时间',
    'time-range': '请选择时间范围',
    'datetime-hour': '请选择日期（时）',
    'datetime-hour-minute': '请选择日期（时:分）'
  }
  return map[pickerType] || '请选择日期'
}

/** 默认日期格式映射 */
function getDefaultFormat(pickerType: AntPickerType): string {
  const map: Record<AntPickerType, string> = {
    date: 'YYYY-MM-DD',
    datetime: 'YYYY-MM-DD HH:mm:ss',
    range: 'YYYY-MM-DD',
    'datetime-range': 'YYYY-MM-DD HH:mm:ss',
    year: 'YYYY',
    'year-range': 'YYYY',
    month: 'YYYY-MM',
    'month-range': 'YYYY-MM',
    time: 'HH:mm:ss',
    'time-range': 'HH:mm:ss',
    'datetime-hour': 'YYYY-MM-DD HH',
    'datetime-hour-minute': 'YYYY-MM-DD HH:mm'
  }
  return map[pickerType]
}

/** 是否为范围类型 */
function isRangeType(pickerType: AntPickerType): boolean {
  return pickerType.includes('range')
}

// ================================================================
// CSS 注入
// ================================================================

const PICKER_CSS = `
.ant-picker {
  opacity: 0 !important;
  pointer-events: none !important;
  width: 280px !important;
  min-height: 40px !important;
  position: relative !important;
  padding: 0 !important;
  border: none !important;
  margin: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.ant-picker-range {
  width: 320px !important;
}
.ant-picker-dropdown {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
}
`

function injectPickerCss(container: HTMLDivElement) {
  if (container.querySelector('[data-ant-picker-style]')) return
  const style = document.createElement('style')
  style.setAttribute('data-ant-picker-style', '')
  style.textContent = PICKER_CSS
  container.appendChild(style)
}

// ================================================================
// 适配器创建
// ================================================================

function createAntDatePickerAdapter(): IDatePickerAdapter {
  let app: ReturnType<typeof createApp> | null = null

  /** 创建延迟卸载的 onUpdate:open 处理器 */
  function createDeferredDestroy(open: boolean) {
    if (open || !app) return
    setTimeout(() => {
      if (app) {
        const _app = app
        app = null
        _app.unmount()
      }
    }, 0)
  }

  return {
    awake(context: IDatePickerContext) {
      context.container.setAttribute('editor-component', 'popup')
      context.container.style.zIndex = '9999'
      injectPickerCss(context.container)

      // 读取配置
      const extension = context.extension as Record<string, unknown> | undefined
      const pickerType: AntPickerType =
        (extension?.[ANT_PICKER_EXTENSION_KEY] as AntPickerType) || 'date'
      const hasTime = hasTimeFormat(context.dateFormat)
      const isRange = isRangeType(pickerType)

      // 解析值
      let startValue: Dayjs | null = null
      let endValue: Dayjs | null = null
      let singleValue: Dayjs | null = null
      if (isRange) {
        const parsed = parseRangeValue(
          context.value,
          context.dateFormat || getDefaultFormat(pickerType)
        )
        startValue = parsed[0]
        endValue = parsed[1]
      } else {
        singleValue = context.value
          ? dayjs(context.value, context.dateFormat)
          : null
        if (singleValue && !singleValue.isValid()) singleValue = null
      }

      // 统一的值格式化 + 提交
      const fmt = context.dateFormat || getDefaultFormat(pickerType)
      const submitRange = (dates: [Dayjs, Dayjs] | null) => {
        if (!dates || !dates[0]?.isValid() || !dates[1]?.isValid()) return
        context.onSubmit(dates[0].format(fmt) + RANGE_SEPARATOR + dates[1].format(fmt))
      }
      const submitSingle = (date: Dayjs | null) => {
        if (!date?.isValid()) return
        context.onSubmit(date.format(fmt))
      }

      // 创建 Vue 应用
      app = createApp({
        setup() {
          return () => {
            const commonProps: Record<string, unknown> = {
              open: true,
              getPopupContainer: () => context.container,
              'onUpdate:open': createDeferredDestroy
            }

            switch (pickerType) {
              // ========== 年份选择 ==========
              case 'year':
                return h(DatePicker.YearPicker as any, {
                  ...commonProps,
                  format: fmt,
                  value: singleValue,
                  onChange: (date: Dayjs | null) => {
                    submitSingle(date)
                    createDeferredDestroy(false)
                  }
                })

              // ========== 年份范围选择 ==========
              case 'year-range':
                return h(DatePicker.RangePicker as any, {
                  ...commonProps,
                  picker: 'year',
                  format: fmt,
                  value: startValue && endValue ? [startValue, endValue] : undefined,
                  onChange: (dates: [Dayjs, Dayjs] | null) => {
                    submitRange(dates)
                    createDeferredDestroy(false)
                  }
                })

              // ========== 月份选择 ==========
              case 'month':
                return h(DatePicker.MonthPicker as any, {
                  ...commonProps,
                  format: fmt,
                  value: singleValue,
                  onChange: (date: Dayjs | null) => {
                    submitSingle(date)
                    createDeferredDestroy(false)
                  }
                })

              // ========== 月份范围选择 ==========
              case 'month-range':
                return h(DatePicker.RangePicker as any, {
                  ...commonProps,
                  picker: 'month',
                  format: fmt,
                  value: startValue && endValue ? [startValue, endValue] : undefined,
                  onChange: (dates: [Dayjs, Dayjs] | null) => {
                    submitRange(dates)
                    createDeferredDestroy(false)
                  }
                })

              // ========== 时间选择 ==========
              case 'time':
                return h(TimePicker as any, {
                  ...commonProps,
                  format: fmt,
                  value: singleValue,
                  onChange: (time: Dayjs | null) => {
                    submitSingle(time)
                    createDeferredDestroy(false)
                  }
                })

              // ========== 时间范围选择 ==========
              case 'time-range':
                return h(TimePicker.TimeRangePicker as any, {
                  ...commonProps,
                  format: fmt,
                  value: startValue && endValue ? [startValue, endValue] : undefined,
                  onChange: (times: [Dayjs, Dayjs] | null) => {
                    submitRange(times)
                    createDeferredDestroy(false)
                  }
                })

              // ========== 日期时间+时 ==========
              case 'datetime-hour':
                return h(DatePicker as any, {
                  ...commonProps,
                  showTime: { format: 'HH' },
                  format: fmt,
                  value: singleValue,
                  onChange: (date: Dayjs | null) => {
                    if (!hasTime && date?.isValid()) submitSingle(date)
                  },
                  onOk: (date: Dayjs | null) => {
                    submitSingle(date)
                  }
                })

              // ========== 日期时间+时分 ==========
              case 'datetime-hour-minute':
                return h(DatePicker as any, {
                  ...commonProps,
                  showTime: { format: 'HH:mm' },
                  format: fmt,
                  value: singleValue,
                  onChange: (date: Dayjs | null) => {
                    if (!hasTime && date?.isValid()) submitSingle(date)
                  },
                  onOk: (date: Dayjs | null) => {
                    submitSingle(date)
                  }
                })

              // ========== 日期范围/日期时间范围 ==========
              case 'range':
              case 'datetime-range':
                return h(DatePicker.RangePicker as any, {
                  ...commonProps,
                  showTime: hasTime,
                  format: fmt,
                  value: startValue && endValue ? [startValue, endValue] : undefined,
                  onChange: (dates: [Dayjs, Dayjs] | null) => {
                    if (!hasTime) submitRange(dates)
                  },
                  onOk: (dates: [Dayjs, Dayjs] | null) => {
                    if (hasTime) submitRange(dates)
                  }
                })

              // ========== 默认：日期选择 ==========
              default:
                return h(DatePicker as any, {
                  ...commonProps,
                  showTime: hasTime,
                  format: fmt,
                  value: singleValue,
                  onChange: (date: Dayjs | null) => {
                    if (!hasTime) submitSingle(date)
                  },
                  onOk: (date: Dayjs | null) => {
                    if (hasTime) submitSingle(date)
                  }
                })
            }
          }
        }
      })

      app.mount(context.container)
    },

    destroy() {
      if (app) {
        const _app = app
        app = null
        _app.unmount()
      }
    },

    isVisible() {
      return app !== null
    }
  }
}

// ================================================================
// 插件注册
// ================================================================

function buildControlPayload(
  pickerType: AntPickerType,
  payload?: {
    dateFormat?: string
    placeholder?: string
    value?: string
  }
) {
  const dateFormat = payload?.dateFormat || getDefaultFormat(pickerType)
  return {
    type: ElementType.CONTROL as const,
    value: '',
    control: {
      type: ControlType.DATE,
      dateFormat,
      value: payload?.value
        ? [{ value: payload.value }]
        : null,
      placeholder: payload?.placeholder || getPlaceholder(pickerType),
      extension: {
        [ANT_PICKER_EXTENSION_KEY]: pickerType
      }
    }
  }
}

function registerCommand(
  command: CommandWithAntDatePicker,
  name: string,
  pickerType: AntPickerType,
  defaultFormat: string
) {
  (command as any)[name] = (payload?: {
    dateFormat?: string
    placeholder?: string
    value?: string
  }) => {
    command.executeInsertControl(
      buildControlPayload(pickerType, {
        dateFormat: payload?.dateFormat || defaultFormat,
        placeholder: payload?.placeholder,
        value: payload?.value
      })
    )
  }
}

export function antDatePickerPlugin(
  editor: Editor,
  options?: { dateFormat?: string }
) {
  // 1. 注册适配器
  const adapter = createAntDatePickerAdapter()
  editor.command.executeUpdateOptions({ datePickerAdapter: adapter })

  // 2. 注册各类型插入命令
  const command = editor.command as CommandWithAntDatePicker
  const optFmt = options?.dateFormat

  registerCommand(command, 'executeInsertAntDatePicker', 'date', optFmt || 'YYYY-MM-DD')
  registerCommand(command, 'executeInsertAntDateTimePicker', 'datetime', optFmt || 'YYYY-MM-DD HH:mm:ss')
  registerCommand(command, 'executeInsertAntRangePicker', 'range', 'YYYY-MM-DD')
  registerCommand(command, 'executeInsertAntDateTimeRangePicker', 'datetime-range', 'YYYY-MM-DD HH:mm:ss')
  registerCommand(command, 'executeInsertAntYearPicker', 'year', 'YYYY')
  registerCommand(command, 'executeInsertAntYearRangePicker', 'year-range', 'YYYY')
  registerCommand(command, 'executeInsertAntMonthPicker', 'month', 'YYYY-MM')
  registerCommand(command, 'executeInsertAntMonthRangePicker', 'month-range', 'YYYY-MM')
  registerCommand(command, 'executeInsertAntTimePicker', 'time', 'HH:mm:ss')
  registerCommand(command, 'executeInsertAntTimeRangePicker', 'time-range', 'HH:mm:ss')
  registerCommand(command, 'executeInsertAntDateTimeHourPicker', 'datetime-hour', 'YYYY-MM-DD HH')
  registerCommand(command, 'executeInsertAntDateTimeHourMinutePicker', 'datetime-hour-minute', 'YYYY-MM-DD HH:mm')
}

export default antDatePickerPlugin
