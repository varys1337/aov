import ChaosiumCanvasInterface from './chaosium-canvas-interface.mjs'

export default class ChaosiumCanvasInterfaceDrawingToggle extends ChaosiumCanvasInterface {
  /**
   *
   */
  static get PERMISSIONS () {
    return {
      [CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT]: 'OWNERSHIP.INHERIT',
      [CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE]: 'OWNERSHIP.NONE',
      [CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED]: 'OWNERSHIP.LIMITED',
      [CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER]: 'OWNERSHIP.OBSERVER',
      [CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]: 'OWNERSHIP.OWNER'
    }
  }

  /**
   *
   */
  static get icon () {
    return 'fa-solid fa-pencil'
  }

  /**
   *
   */
  static get triggerButtons () {
    const buttons = super.triggerButtons
    buttons[ChaosiumCanvasInterfaceDrawingToggle.triggerButton.Both] = 'AOV.ChaosiumCanvasInterface.Buttons.Both'
    return buttons
  }

  /**
   *
   */
  static get triggerButton () {
    const button = super.triggerButton
    button.Both = 20
    return button
  }

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    return {
      triggerButton: new fields.NumberField({
        choices: ChaosiumCanvasInterfaceDrawingToggle.triggerButtons,
        initial: ChaosiumCanvasInterfaceDrawingToggle.triggerButton.Left,
        label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.Button.Title',
        hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.Button.Hint'
      }),
      action: new fields.NumberField({
        choices: ChaosiumCanvasInterface.actionToggles,
        initial: ChaosiumCanvasInterface.actionToggle.Off,
        label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.Action.Title',
        hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.Action.Hint',
        required: true
      }),
      drawingUuids: new fields.SetField(
        new fields.DocumentUUIDField({
          type: 'Drawing'
        }),
        {
          label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.Drawing.Title',
          hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.Drawing.Hint'
        }
      ),
      journalEntryUuids: new fields.SetField(
        new fields.DocumentUUIDField({
          type: 'JournalEntry'
        }),
        {
          label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.JournalEntry.Title',
          hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.JournalEntry.Hint'
        }
      ),
      permissionDocument: new fields.NumberField({
        choices: Object.keys(ChaosiumCanvasInterfaceDrawingToggle.PERMISSIONS).reduce((c, k) => { c[k] = game.i18n.localize(ChaosiumCanvasInterfaceDrawingToggle.PERMISSIONS[k]); return c }, {}),
        initial: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
        label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.PermissionDocument.Title',
        hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.PermissionDocument.Hint',
        required: true
      }),
      permissionDocumentHide: new fields.NumberField({
        choices: Object.keys(ChaosiumCanvasInterfaceDrawingToggle.PERMISSIONS).reduce((c, k) => { c[k] = game.i18n.localize(ChaosiumCanvasInterfaceDrawingToggle.PERMISSIONS[k]); return c }, {}),
        initial: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.PermissionDocumentHide.Title',
        hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.PermissionDocumentHide.Hint',
        required: true
      }),
      journalEntryPageUuids: new fields.SetField(
        new fields.DocumentUUIDField({
          type: 'JournalEntryPage'
        }),
        {
          label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.JournalEntryPage.Title',
          hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.JournalEntryPage.Hint'
        }
      ),
      permissionPage: new fields.NumberField({
        choices: Object.keys(ChaosiumCanvasInterfaceDrawingToggle.PERMISSIONS).reduce((c, k) => { c[k] = game.i18n.localize(ChaosiumCanvasInterfaceDrawingToggle.PERMISSIONS[k]); return c }, {}),
        initial: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
        label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.PermissionPage.Title',
        hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.PermissionPage.Hint',
        required: true
      }),
      permissionPageHide: new fields.NumberField({
        choices: Object.keys(ChaosiumCanvasInterfaceDrawingToggle.PERMISSIONS).reduce((c, k) => { c[k] = game.i18n.localize(ChaosiumCanvasInterfaceDrawingToggle.PERMISSIONS[k]); return c }, {}),
        initial: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.PermissionPageHide.Title',
        hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.PermissionPageHide.Hint',
        required: true
      }),
      regionBehaviorUuids: new fields.SetField(
        new fields.DocumentUUIDField({
          type: 'RegionBehavior'
        }),
        {
          label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.RegionBehavior.Title',
          hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.RegionBehavior.Hint'
        }
      ),
      regionButton: new fields.NumberField({
        choices: ChaosiumCanvasInterface.triggerButtons,
        initial: ChaosiumCanvasInterface.triggerButton.Right,
        label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.TriggerButton.Title',
        hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.TriggerButton.Hint'
      }),
      regionUuids: new fields.SetField(
        new fields.DocumentUUIDField({
          type: 'Region'
        }),
        {
          label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.TriggerRegionUuids.Title',
          hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.TriggerRegionUuids.Hint'
        }
      ),
      triggerAsButton: new fields.NumberField({
        choices: ChaosiumCanvasInterface.triggerButtons,
        initial: ChaosiumCanvasInterface.triggerButton.Left,
        label: 'AOV.ChaosiumCanvasInterface.DrawingToggle.TriggerAsButton.Title',
        hint: 'AOV.ChaosiumCanvasInterface.DrawingToggle.TriggerAsButton.Hint'
      })
    }
  }

  /**
   *
   * @param source
   */
  static migrateData (source) {
    if (typeof source.triggerButton === 'undefined' && source.regionUuids?.length) {
      source.triggerButton = ChaosiumCanvasInterfaceDrawingToggle.triggerButton.Both
    }
    if (typeof source.toggle !== 'undefined' && typeof source.action === 'undefined') {
      source.action = (source.toggle ? ChaosiumCanvasInterface.actionToggle.On : ChaosiumCanvasInterface.actionToggle.Off)
    }
    return source
  }

  /**
   *
   */
  async _handleMouseOverEvent () {
    return game.user.isGM
  }

  /**
   *
   * @param button
   */
  async #handleClickEvent (button) {
    let toggle = false
    switch (this.action) {
      case ChaosiumCanvasInterface.actionToggle.On:
        toggle = true
        break
      case ChaosiumCanvasInterface.actionToggle.Toggle:
        {
          const firstUuid = this.drawingUuids.first()
          if (firstUuid) {
            const doc = await fromUuid(firstUuid)
            toggle = doc.hidden
          }
        }
        break
    }
    for (const uuid of this.drawingUuids) {
      const doc = await fromUuid(uuid)
      if (doc) {
        await doc.update({ hidden: !toggle })
      } else {
        console.error('Drawing ' + uuid + ' not loaded')
      }
    }
    const permissionDocument = (!toggle ? this.permissionDocumentHide : this.permissionDocument)
    const permissionPage = (!toggle ? this.permissionPageHide : this.permissionPage)
    for (const uuid of this.journalEntryUuids) {
      const doc = await fromUuid(uuid)
      if (doc) {
        await doc.update({ 'ownership.default': permissionDocument })
      } else {
        console.error('Journal Entry ' + uuid + ' not loaded')
      }
    }
    for (const uuid of this.journalEntryPageUuids) {
      const doc = await fromUuid(uuid)
      if (doc) {
        await doc.update({ 'ownership.default': permissionPage })
      } else {
        console.error('Journal Entry Page ' + uuid + ' not loaded')
      }
    }
    for (const uuid of this.regionBehaviorUuids) {
      const doc = await fromUuid(uuid)
      if (doc) {
        await doc.update({ disabled: !toggle })
      } else {
        console.error('Region Behavior ' + uuid + ' not loaded')
      }
    }
    if (this.triggerButton === ChaosiumCanvasInterfaceDrawingToggle.triggerButton.Both) {
      for (const uuid of this.regionUuids) {
        setTimeout(() => {
          if (button === this.regionButton) {
            if (this.triggerAsButton === ChaosiumCanvasInterface.triggerButton.Right) {
              game.aov.ClickRegionRightUuid(uuid)
            } else if (this.triggerAsButton === ChaosiumCanvasInterface.triggerButton.Left) {
              game.aov.ClickRegionLeftUuid(uuid)
            }
          }
        }, 100)
      }
    }
  }

  /**
   *
   */
  async _handleLeftClickEvent () {
    if ([ChaosiumCanvasInterfaceDrawingToggle.triggerButton.Both, ChaosiumCanvasInterface.triggerButton.Left].includes(this.triggerButton)) {
      this.#handleClickEvent(ChaosiumCanvasInterface.triggerButton.Left)
    }
  }

  /**
   *
   */
  async _handleRightClickEvent () {
    if ([ChaosiumCanvasInterfaceDrawingToggle.triggerButton.Both, ChaosiumCanvasInterface.triggerButton.Right].includes(this.triggerButton)) {
      this.#handleClickEvent(ChaosiumCanvasInterface.triggerButton.Right)
    }
  }
}
