import ChaosiumCanvasInterface from "./chaosium-canvas-interface.mjs";

export default class ChaosiumCanvasInterfaceOpenDocument extends ChaosiumCanvasInterface {
  static get PERMISSIONS () {
    return {
      ALWAYS: 'AOV.ChaosiumCanvasInterface.Permission.Always',
      DOCUMENT: 'AOV.ChaosiumCanvasInterface.Permission.Document',
      SEE_TILE: 'AOV.ChaosiumCanvasInterface.Permission.SeeTile',
      GM: 'AOV.ChaosiumCanvasInterface.Permission.GM'
    }
  }

  static get icon () {
    return 'fa-solid fa-book-atlas'
  }

  static defineSchema () {
    const fields = foundry.data.fields
    return {
      triggerButton: new fields.NumberField({
        choices: ChaosiumCanvasInterface.triggerButtons,
        initial: ChaosiumCanvasInterface.triggerButton.Left,
        label: 'AOV.ChaosiumCanvasInterface.OpenDocument.Button.Title',
        hint: 'AOV.ChaosiumCanvasInterface.OpenDocument.Button.Hint'
      }),
      permission: new fields.StringField({
        blank: false,
        choices: Object.keys(ChaosiumCanvasInterfaceOpenDocument.PERMISSIONS).reduce((c, k) => { c[k] = game.i18n.localize(ChaosiumCanvasInterfaceOpenDocument.PERMISSIONS[k]); return c }, {}),
        initial: 'GM',
        label: 'AOV.ChaosiumCanvasInterface.OpenDocument.Permission.Title',
        hint: 'AOV.ChaosiumCanvasInterface.OpenDocument.Permission.Hint',
        required: true
      }),
      documentUuid: new fields.DocumentUUIDField({
        label: 'AOV.ChaosiumCanvasInterface.OpenDocument.Document.Title',
        hint: 'AOV.ChaosiumCanvasInterface.OpenDocument.Document.Hint'
      }),
      pageId: new fields.DocumentIdField({
        initial: undefined,
        label: 'AOV.ChaosiumCanvasInterface.OpenDocument.Page.Title',
        hint: 'AOV.ChaosiumCanvasInterface.OpenDocument.Page.Hint'
      }),
      anchor: new fields.StringField({
        initial: '',
        label: 'AOV.ChaosiumCanvasInterface.OpenDocument.Anchor.Title',
        hint: 'AOV.ChaosiumCanvasInterface.OpenDocument.Anchor.Hint'
      }),
      showPlayers: new fields.BooleanField({
        initial: false,
        label: 'AOV.ChaosiumCanvasInterface.OpenDocument.showPlayers.Title',
        hint: 'AOV.ChaosiumCanvasInterface.OpenDocument.showPlayers.Hint'
      }),
      tileUuid: new fields.DocumentUUIDField({
        label: 'AOV.ChaosiumCanvasInterface.OpenDocument.Tile.Title',
        hint: 'AOV.ChaosiumCanvasInterface.OpenDocument.Tile.Hint',
        type: 'Tile'
      })
    }
  }

  async _handleMouseOverEvent () {
    switch (this.permission) {
      case 'ALWAYS':
        return true
      case 'GM':
        return game.user.isGM
      case 'DOCUMENT':
        if (game.user.isGM) {
          return true
        }
        if (this.documentUuid) {
          return (await fromUuid(this.documentUuid)).testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) ?? false
        }
        break
      case 'SEE_TILE':
        if (game.user.isGM) {
          return true
        }
        if (this.tileUuid && this.documentUuid) {
          return !(await fromUuid(this.tileUuid)).hidden && ((await fromUuid(this.documentUuid)).testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) ?? false)
        }
        break
    }
    return false
  }

  async #handleClickEvent () {
    let doc = await fromUuid(this.documentUuid)
      if (this.pageId) {
        const page = doc.pages.get(this.pageId)
        if (page) {
          doc = page
        }
      }
    if (doc?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) {
      if (doc instanceof JournalEntryPage) {
        doc.parent.sheet.render(true, { pageId: doc.id, anchor: this.anchor })
        if (this.showPlayers) {
          if (doc.type === "image") {
            let users = game.users.filter(u => !u.isSelf).map(u => u.id);
            foundry.documents.collections.Journal.showImage(doc.src, {
              users,
              title: doc.name,
              showTitle: false,
              uuid: doc.uuid
            });
          }
        }
      } else {
        doc.sheet.render(true)
      }
    } else {
      console.error('Document ' + this.documentUuid + ' not loaded')
    }
  }

  async _handleLeftClickEvent () {
    if (this.documentUuid && this.triggerButton === ChaosiumCanvasInterface.triggerButton.Left) {
      this.#handleClickEvent()
    }
  }

  async _handleRightClickEvent () {
    if (this.documentUuid && this.triggerButton === ChaosiumCanvasInterface.triggerButton.Right) {
      this.#handleClickEvent()
    }
  }
}
