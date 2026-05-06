import {
  CONTROL_STYLE_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR,
  TEXTLIKE_ELEMENT_TYPE
} from '../../../../dataset/constant/Element'
import { EDITOR_COMPONENT } from '../../../../dataset/constant/Editor'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { EditorComponent } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { DeepRequired } from '../../../../interface/Common'
import {
  IControlContext,
  IControlInstance,
  IControlRuleOption,
  IDatePickerAdapter
} from '../../../../interface/Control'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement } from '../../../../interface/Element'
import { omitObject, pickObject } from '../../../../utils'
import { formatElementContext } from '../../../../utils/element'
import { Draw } from '../../Draw'
import { DatePicker } from '../../particle/date/DatePicker'
import { Control } from '../Control'

export class DateControl implements IControlInstance {
  private draw: Draw
  private element: IElement
  private control: Control
  private isPopup: boolean
  private datePicker: DatePicker | null
  private options: DeepRequired<IEditorOption>
  private adapter: IDatePickerAdapter | undefined | null
  private adapterContainer: HTMLDivElement | null
  private nativeInput: HTMLInputElement | null

  constructor(element: IElement, control: Control) {
    const draw = control.getDraw()
    this.draw = draw
    this.options = draw.getOptions()
    this.element = element
    this.control = control
    this.isPopup = false
    this.datePicker = null
    this.adapter = (this.options as any).datePickerAdapter || null
    this.adapterContainer = null
    this.nativeInput = null
  }

  public setElement(element: IElement) {
    this.element = element
  }

  public getElement(): IElement {
    return this.element
  }

  public getIsPopup(): boolean {
    if (this.nativeInput?.isConnected) {
      return true
    }
    if (this.adapter) {
      return this.adapter.isVisible() ?? false
    }
    return this.isPopup
  }

  public getValueRange(context: IControlContext = {}): [number, number] | null {
    const elementList = context.elementList || this.control.getElementList()
    const { startIndex } = context.range || this.control.getRange()
    const startElement = elementList[startIndex]
    let preIndex = startIndex
    while (preIndex > 0) {
      const preElement = elementList[preIndex]
      if (
        preElement.controlId !== startElement.controlId ||
        preElement.controlComponent === ControlComponent.PREFIX ||
        preElement.controlComponent === ControlComponent.PRE_TEXT
      ) {
        break
      }
      preIndex--
    }
    let nextIndex = startIndex + 1
    while (nextIndex < elementList.length) {
      const nextElement = elementList[nextIndex]
      if (
        nextElement.controlId !== startElement.controlId ||
        nextElement.controlComponent === ControlComponent.POSTFIX ||
        nextElement.controlComponent === ControlComponent.POST_TEXT
      ) {
        break
      }
      nextIndex++
    }
    if (preIndex === nextIndex) return null
    return [preIndex, nextIndex - 1]
  }

  public getValue(context: IControlContext = {}): IElement[] {
    const elementList = context.elementList || this.control.getElementList()
    const range = this.getValueRange(context)
    if (!range) return []
    const data: IElement[] = []
    const [startIndex, endIndex] = range
    for (let i = startIndex; i <= endIndex; i++) {
      const element = elementList[i]
      if (element.controlComponent === ControlComponent.VALUE) {
        data.push(element)
      }
    }
    return data
  }

  public setValue(
    data: IElement[],
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ): number {
    if (
      !options.isIgnoreDisabledRule &&
      this.control.getIsDisabledControl(context)
    ) {
      return -1
    }
    const elementList = context.elementList || this.control.getElementList()
    const range = context.range || this.control.getRange()
    this.control.shrinkBoundary(context)
    const { startIndex, endIndex } = range
    const draw = this.control.getDraw()
    if (startIndex !== endIndex) {
      draw.spliceElementList(elementList, startIndex + 1, endIndex - startIndex)
    } else {
      this.control.removePlaceholder(startIndex, context)
    }
    const startElement = elementList[startIndex]
    const anchorElement =
      (startElement.type &&
        !TEXTLIKE_ELEMENT_TYPE.includes(startElement.type)) ||
      startElement.controlComponent === ControlComponent.PREFIX ||
      startElement.controlComponent === ControlComponent.PRE_TEXT
        ? pickObject(startElement, [
            'control',
            'controlId',
            ...CONTROL_STYLE_ATTR
          ])
        : omitObject(startElement, ['type'])
    const start = range.startIndex + 1
    for (let i = 0; i < data.length; i++) {
      const newElement: IElement = {
        ...anchorElement,
        ...data[i],
        controlComponent: ControlComponent.VALUE
      }
      formatElementContext(elementList, [newElement], startIndex, {
        editorOptions: this.options
      })
      draw.spliceElementList(elementList, start + i, 0, [newElement])
    }
    return start + data.length - 1
  }

  public clearSelect(
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ): number {
    const { isIgnoreDisabledRule = false, isAddPlaceholder = true } = options
    if (!isIgnoreDisabledRule && this.control.getIsDisabledControl(context)) {
      return -1
    }
    const range = this.getValueRange(context)
    if (!range) return -1
    const [leftIndex, rightIndex] = range
    if (!~leftIndex || !~rightIndex) return -1
    const elementList = context.elementList || this.control.getElementList()
    const draw = this.control.getDraw()
    draw.spliceElementList(
      elementList,
      leftIndex + 1,
      rightIndex - leftIndex,
      [],
      {
        isIgnoreDeletedRule: options.isIgnoreDeletedRule
      }
    )
    if (isAddPlaceholder) {
      this.control.addPlaceholder(leftIndex, context)
    }
    return leftIndex
  }

  public setSelect(
    date: string,
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ) {
    if (
      !options.isIgnoreDisabledRule &&
      this.control.getIsDisabledControl(context)
    ) {
      return
    }
    const elementList = context.elementList || this.control.getElementList()
    const range = context.range || this.control.getRange()
    const valueElement = this.getValue(context)[0]
    const styleElement = valueElement
      ? pickObject(valueElement, EDITOR_ELEMENT_STYLE_ATTR)
      : pickObject(elementList[range.startIndex], CONTROL_STYLE_ATTR)
    const prefixIndex = this.clearSelect(context, {
      isAddPlaceholder: false,
      isIgnoreDeletedRule: options.isIgnoreDeletedRule
    })
    if (!~prefixIndex) return
    const propertyElement = omitObject(
      elementList[prefixIndex],
      EDITOR_ELEMENT_STYLE_ATTR
    )
    const start = prefixIndex + 1
    const draw = this.control.getDraw()
    for (let i = 0; i < date.length; i++) {
      const newElement: IElement = {
        ...styleElement,
        ...propertyElement,
        type: ElementType.TEXT,
        value: date[i],
        controlComponent: ControlComponent.VALUE
      }
      formatElementContext(elementList, [newElement], prefixIndex, {
        editorOptions: this.options
      })
      draw.spliceElementList(elementList, start + i, 0, [newElement])
    }
    if (!context.range) {
      const newIndex = start + date.length - 1
      this.control.repaintControl({
        curIndex: newIndex
      })
      this.control.emitControlContentChange({
        context
      })
    }
  }

  public keydown(evt: KeyboardEvent): number | null {
    if (this.control.getIsDisabledControl()) {
      return null
    }
    const elementList = this.control.getElementList()
    const range = this.control.getRange()
    this.control.shrinkBoundary()
    const { startIndex, endIndex } = range
    const startElement = elementList[startIndex]
    const endElement = elementList[endIndex]
    const draw = this.control.getDraw()
    if (evt.key === KeyMap.Backspace) {
      if (startIndex !== endIndex) {
        draw.spliceElementList(
          elementList,
          startIndex + 1,
          endIndex - startIndex
        )
        const value = this.getValue()
        if (!value.length) {
          this.control.addPlaceholder(startIndex)
        }
        return startIndex
      } else {
        if (
          startElement.controlComponent === ControlComponent.PREFIX ||
          startElement.controlComponent === ControlComponent.PRE_TEXT ||
          endElement.controlComponent === ControlComponent.POSTFIX ||
          endElement.controlComponent === ControlComponent.POST_TEXT ||
          startElement.controlComponent === ControlComponent.PLACEHOLDER
        ) {
          return this.control.removeControl(startIndex)
        } else {
          draw.spliceElementList(elementList, startIndex, 1)
          const value = this.getValue()
          if (!value.length) {
            this.control.addPlaceholder(startIndex - 1)
          }
          return startIndex - 1
        }
      }
    } else if (evt.key === KeyMap.Delete) {
      if (startIndex !== endIndex) {
        draw.spliceElementList(
          elementList,
          startIndex + 1,
          endIndex - startIndex
        )
        const value = this.getValue()
        if (!value.length) {
          this.control.addPlaceholder(startIndex)
        }
        return startIndex
      } else {
        const endNextElement = elementList[endIndex + 1]
        if (
          ((startElement.controlComponent === ControlComponent.PREFIX ||
            startElement.controlComponent === ControlComponent.PRE_TEXT) &&
            endNextElement.controlComponent === ControlComponent.PLACEHOLDER) ||
          endNextElement.controlComponent === ControlComponent.POSTFIX ||
          endNextElement.controlComponent === ControlComponent.POST_TEXT ||
          startElement.controlComponent === ControlComponent.PLACEHOLDER
        ) {
          return this.control.removeControl(startIndex)
        } else {
          draw.spliceElementList(elementList, startIndex + 1, 1)
          const value = this.getValue()
          if (!value.length) {
            this.control.addPlaceholder(startIndex)
          }
          return startIndex
        }
      }
    }
    return endIndex
  }

  public cut(): number {
    if (this.control.getIsDisabledControl()) {
      return -1
    }
    this.control.shrinkBoundary()
    const { startIndex, endIndex } = this.control.getRange()
    if (startIndex === endIndex) {
      return startIndex
    }
    const draw = this.control.getDraw()
    const elementList = this.control.getElementList()
    draw.spliceElementList(elementList, startIndex + 1, endIndex - startIndex)
    const value = this.getValue()
    if (!value.length) {
      this.control.addPlaceholder(startIndex)
    }
    return startIndex
  }

  public getIsReadonlyInput(): boolean {
    return true
  }

  public awake() {
    if (
      this.getIsPopup() ||
      this.control.getIsDisabledControl() ||
      !this.control.getIsRangeWithinControl()
    ) {
      return
    }
    const position = this.control.getPosition()
    if (!position) return
    const elementList = this.draw.getElementList()
    const { startIndex } = this.control.getRange()
    const curElement = elementList[startIndex]
    if (
      !curElement ||
      curElement.controlId !== this.element.controlId ||
      curElement.controlComponent === ControlComponent.POSTFIX ||
      curElement.controlComponent === ControlComponent.POST_TEXT
    ) {
      return
    }
    if (this.adapter) {
      const context = this._buildAdapterContext(position)
      setTimeout(() => {
        if (!this.adapter || this.control.getIsDisabledControl()) return
        this.adapter.awake(context)
      }, 0)
    } else if ('showPicker' in HTMLInputElement.prototype) {
      this._awakeNativeDatePicker(position)
    } else {
      this.datePicker = new DatePicker(this.draw, {
        onSubmit: this._setDate.bind(this)
      })
      const value =
        this.getValue()
          .map(el => el.value)
          .join('') || ''
      const dateFormat = this.element.control?.dateFormat
      this.datePicker.render({
        value,
        position,
        dateFormat
      })
      this.isPopup = true
    }
  }

  public destroy() {
    if (this.nativeInput) {
      this.nativeInput.remove()
      this.nativeInput = null
    }
    if (this.adapter) {
      this.adapter.destroy()
      if (this.adapterContainer) {
        this.adapterContainer.remove()
        this.adapterContainer = null
      }
    } else {
      if (!this.isPopup) return
      this.datePicker?.destroy()
      this.isPopup = false
    }
  }

  private _buildAdapterContext(position: any) {
    if (!this.adapterContainer) {
      this.adapterContainer = document.createElement('div')
      this.adapterContainer.style.position = 'absolute'
      this.adapterContainer.style.zIndex = '9999'
      this.adapterContainer.style.overflow = 'visible'
      this.adapterContainer.style.minWidth = '280px'
      this.draw.getContainer().appendChild(this.adapterContainer)
    }
    const height = this.draw.getHeight()
    const pageGap = this.draw.getPageGap()
    const pageNo = position.pageNo ?? this.draw.getPageNo()
    const preY = pageNo * (height + pageGap)
    const left = position.coordinate.leftTop[0]
    const top = position.coordinate.leftTop[1] + preY + position.lineHeight
    this.adapterContainer.style.left = `${left}px`
    this.adapterContainer.style.top = `${top}px`
    const value =
      this.getValue()
        .map(el => el.value)
        .join('') || ''
    return {
      container: this.adapterContainer,
      value,
      left,
      top,
      dateFormat: this.element.control?.dateFormat,
      extension: this.element.control?.extension,
      onSubmit: this._setDate.bind(this)
    }
  }

  private _awakeNativeDatePicker(position: any) {
    if (this.nativeInput) {
      this.nativeInput.remove()
    }
    const input = document.createElement('input')
    const hasTime = /[HhmsS]/.test(this.element.control?.dateFormat || '')
    input.type = hasTime ? 'datetime-local' : 'date'
    input.style.position = 'fixed'
    input.style.opacity = '0'
    input.style.pointerEvents = 'none'
    input.style.width = '0'
    input.style.height = '0'
    input.style.border = 'none'
    input.style.padding = '0'
    const height = this.draw.getHeight()
    const pageGap = this.draw.getPageGap()
    const pageNo = position.pageNo ?? this.draw.getPageNo()
    const preY = pageNo * (height + pageGap)
    const left = position.coordinate.leftTop[0]
    const top = position.coordinate.leftTop[1] + preY + position.lineHeight
    input.style.left = `${left}px`
    input.style.top = `${top}px`
    input.setAttribute(EDITOR_COMPONENT, EditorComponent.POPUP)

    const currentValue = this.getValue()
      .map(el => el.value)
      .join('')
    if (currentValue) {
      const date = new Date(currentValue)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        if (hasTime) {
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          input.value = `${year}-${month}-${day}T${hours}:${minutes}`
        } else {
          input.value = `${year}-${month}-${day}`
        }
      }
    }

    const handleChange = () => {
      if (input.value) {
        const date = new Date(input.value)
        if (!isNaN(date.getTime())) {
          const formatted = DatePicker.formatDate(
            date,
            this.element.control?.dateFormat
          )
          this._setDate(formatted)
        }
      }
      this.destroy()
    }

    const handleBlur = () => {
      this.destroy()
    }

    input.addEventListener('change', handleChange, { once: true })
    input.addEventListener('blur', handleBlur, { once: true })

    document.body.appendChild(input)
    this.nativeInput = input

    try {
      input.showPicker()
    } catch {
      input.focus()
      input.click()
    }
  }

  private _setDate(date: string) {
    if (!date) {
      this.clearSelect()
    } else {
      this.setSelect(date)
    }
    this.destroy()
  }
}
