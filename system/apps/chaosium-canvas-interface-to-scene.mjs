import ChaosiumCanvasInterface from './chaosium-canvas-interface.mjs'

export default class ChaosiumCanvasInterfaceToScene extends ChaosiumCanvasInterface {
  /**
   *
   */
  static get PERMISSIONS () {
    return {
      ALWAYS: 'AOV.ChaosiumCanvasInterface.Permission.Always',
      GM: 'AOV.ChaosiumCanvasInterface.Permission.GM',
      SEE_TILE: 'AOV.ChaosiumCanvasInterface.Permission.SeeTile'
    }
  }

  /**
   *
   */
  static get icon () {
    return 'fa-solid fa-map'
  }

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    return {
      triggerButton: new fields.NumberField({
        choices: ChaosiumCanvasInterface.triggerButtons,
        initial: ChaosiumCanvasInterface.triggerButton.Left,
        label: 'AOV.ChaosiumCanvasInterface.ToScene.Button.Title',
        hint: 'AOV.ChaosiumCanvasInterface.ToScene.Button.Hint'
      }),
      permission: new fields.StringField({
        blank: false,
        choices: Object.keys(ChaosiumCanvasInterfaceToScene.PERMISSIONS).reduce((c, k) => { c[k] = game.i18n.localize(ChaosiumCanvasInterfaceToScene.PERMISSIONS[k]); return c }, {}),
        initial: 'GM',
        label: 'AOV.ChaosiumCanvasInterface.ToScene.Permission.Title',
        hint: 'AOV.ChaosiumCanvasInterface.ToScene.Permission.Hint',
        required: true
      }),
      sceneUuid: new fields.DocumentUUIDField({
        label: 'AOV.ChaosiumCanvasInterface.ToScene.Scene.Title',
        hint: 'AOV.ChaosiumCanvasInterface.ToScene.Scene.Hint',
        type: 'Scene'
      }),
      tileUuid: new fields.DocumentUUIDField({
        label: 'AOV.ChaosiumCanvasInterface.ToScene.Tile.Title',
        hint: 'AOV.ChaosiumCanvasInterface.ToScene.Tile.Hint',
        type: 'Tile'
      })
    }
  }

  /**
   *
   */
  async _handleMouseOverEvent () {
    switch (this.permission) {
      case 'ALWAYS':
        return true
      case 'GM':
        return game.user.isGM
      case 'SEE_TILE':
        if (game.user.isGM) {
          return true
        }
        if (this.tileUuid) {
          return !(await fromUuid(this.tileUuid)).hidden
        }
    }
    return false
  }

  /**
   *
   */
  async #handleClickEvent () {
    const doc = await fromUuid(this.sceneUuid)
    if (doc) {
      setTimeout(() => {
        doc.view()
      }, 100)
    } else {
      console.error('Scene ' + this.sceneUuid + ' not loaded')
    }
  }

  /**
   *
   */
  async _handleLeftClickEvent () {
    if (this.sceneUuid && this.triggerButton === ChaosiumCanvasInterface.triggerButton.Left) {
      this.#handleClickEvent()
    }
  }

  /**
   *
   */
  async _handleRightClickEvent () {
    if (this.sceneUuid && this.triggerButton === ChaosiumCanvasInterface.triggerButton.Right) {
      this.#handleClickEvent()
    }
  }
}
