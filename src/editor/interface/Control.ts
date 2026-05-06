import { FlexDirection, LocationPosition } from '../dataset/enum/Common'
import {
  ControlType,
  ControlIndentation,
  ControlState
} from '../dataset/enum/Control'
import { EditorZone } from '../dataset/enum/Editor'
import { MoveDirection } from '../dataset/enum/Observer'
import { RowFlex } from '../dataset/enum/Row'
import { IDrawOption } from './Draw'
import { IElement } from './Element'
import { IPositionContext } from './Position'
import { IRange } from './Range'
import { IRow, IRowElement } from './Row'

export interface IValueSet {
  value: string
  code: string
}

export interface IControlSelect {
  code: string | null
  valueSets: IValueSet[]
  isMultiSelect?: boolean
  multiSelectDelimiter?: string
  selectExclusiveOptions?: {
    inputAble?: boolean
  }
}

export interface IControlCheckbox {
  code: string | null
  min?: number
  max?: number
  flexDirection: FlexDirection
  valueSets: IValueSet[]
}

export interface IControlRadio {
  code: string | null
  flexDirection: FlexDirection
  valueSets: IValueSet[]
}

export interface IControlDate {
  dateFormat?: string
}

export interface IControlNumber {
  numberExclusiveOptions?: {
    calculatorDisabled?: boolean
  }
}

export interface IControlHighlightRule {
  keyword: string
  alpha?: number
  backgroundColor?: string
}

export interface IControlHighlight {
  ruleList: IControlHighlightRule[]
  id?: string
  conceptId?: string
}

export interface IControlRule {
  deletable?: boolean
  disabled?: boolean
  pasteDisabled?: boolean
  hide?: boolean
}

export interface IControlBasic {
  type: ControlType
  value: IElement[] | null
  placeholder?: string
  conceptId?: string
  groupId?: string
  prefix?: string
  postfix?: string
  minWidth?: number
  underline?: boolean
  border?: boolean
  extension?: unknown
  indentation?: ControlIndentation
  rowFlex?: RowFlex
  preText?: string
  postText?: string
}

export interface IControlStyle {
  font?: string
  size?: number
  bold?: boolean
  highlight?: string
  italic?: boolean
  strikeout?: boolean
}

export type IControl = IControlBasic &
  IControlRule &
  Partial<IControlStyle> &
  Partial<IControlSelect> &
  Partial<IControlCheckbox> &
  Partial<IControlRadio> &
  Partial<IControlDate> &
  Partial<IControlNumber>

export interface IControlOption {
  placeholderColor?: string
  bracketColor?: string
  prefix?: string
  postfix?: string
  borderWidth?: number
  borderColor?: string
  activeBackgroundColor?: string
  disabledBackgroundColor?: string
  existValueBackgroundColor?: string
  noValueBackgroundColor?: string
}

export interface IControlInitOption {
  index: number
  isTable?: boolean
  trIndex?: number
  tdIndex?: number
  tdValueIndex?: number
}

export interface IControlInitResult {
  newIndex: number
}

export interface IControlInstance {
  setElement(element: IElement): void
  getElement(): IElement
  getValue(context?: IControlContext): IElement[]
  setValue(
    data: IElement[],
    context?: IControlContext,
    options?: IControlRuleOption
  ): number
  keydown(evt: KeyboardEvent): number | null
  cut(): number
  awake?(): void
  getIsReadonlyInput?(): boolean
}

export interface IControlContext {
  range?: IRange
  elementList?: IElement[]
}

export interface IControlRuleOption {
  isIgnoreDisabledRule?: boolean // 忽略禁用校验规则
  isIgnoreDeletedRule?: boolean // 忽略删除校验规则
  isAddPlaceholder?: boolean // 是否添加占位符
}

export interface IGetControlValueOption {
  id?: string
  groupId?: string
  conceptId?: string
  areaId?: string
}

export type IGetControlValueResult = (Omit<IControl, 'value'> & {
  value: string | null
  innerText: string | null
  zone: EditorZone
  elementList?: IElement[]
})[]

export interface ISetControlValueOption {
  id?: string
  groupId?: string
  conceptId?: string
  areaId?: string
  value: string | IElement[] | null
  isSubmitHistory?: boolean
}

export interface ISetControlExtensionOption {
  id?: string
  groupId?: string
  conceptId?: string
  areaId?: string
  extension: unknown
}

export type ISetControlHighlightOption = IControlHighlight[]

export type ISetControlProperties = {
  id?: string
  groupId?: string
  conceptId?: string
  areaId?: string
  properties: Partial<Omit<IControl, 'value'>>
  isSubmitHistory?: boolean
}

export type IRepaintControlOption = Pick<
  IDrawOption,
  'curIndex' | 'isCompute' | 'isSubmitHistory' | 'isSetCursor'
>

export interface IControlChangeOption {
  context?: IControlContext
  controlElement?: IElement
  controlValue?: IElement[]
}

export interface INextControlContext {
  positionContext: IPositionContext
  nextIndex: number
}

export interface IInitNextControlOption {
  direction?: MoveDirection
}

export interface ILocationControlOption {
  position: LocationPosition
}

export interface ISetControlRowFlexOption {
  row: IRow
  rowElement: IRowElement
  availableWidth: number
  controlRealWidth: number
}

export interface IControlChangeResult {
  state: ControlState
  control: IControl
  controlId: string
}

export interface IControlContentChangeResult {
  control: IControl
  controlId: string
}

export interface IDestroyControlOption {
  isEmitEvent?: boolean
}

export interface IRemoveControlOption {
  id?: string
  conceptId?: string
}

/**
 * Context object provided to date picker adapters when activated.
 * Contains all necessary information for rendering and positioning an external date picker.
 */
export interface IDatePickerContext {
  /** Container element positioned at the correct location for rendering the date picker */
  container: HTMLDivElement
  /** Current date value as a string */
  value: string
  /** Left position (in pixels) for the date picker popup */
  left: number
  /** Top position (in pixels) for the date picker popup */
  top: number
  /** Optional date format string (e.g., 'YYYY-MM-DD HH:mm:ss') */
  dateFormat?: string
  /** Optional extension data from the control (e.g., picker type config) */
  extension?: unknown
  /** Callback to submit the selected date value */
  onSubmit: (date: string) => void
}

/**
 * Interface for external date picker implementations.
 * Allows third-party date picker libraries to integrate with the canvas editor's date control.
 */
export interface IDatePickerAdapter {
  /**
   * Called when the date control is activated (user clicks/focuses the date control).
   * Initialize and render the external date picker using the provided context.
   * @param context - Context object containing container, value, position, and callback
   */
  awake(context: IDatePickerContext): void

  /**
   * Called when the date control is deactivated or destroyed.
   * Clean up resources (destroy the picker instance, remove event listeners, etc.)
   */
  destroy(): void

  /**
   * Called to check if the date picker popup is currently visible.
   * @returns true if the picker is visible, false otherwise
   */
  isVisible(): boolean
}
