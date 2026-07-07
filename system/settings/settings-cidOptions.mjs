const SETTINGS = {

  actorCID: {
    name: 'AOV.Settings.actorCID',
    hint: 'AOV.Settings.actorCIDHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  },

  actorItemCID: {
    name: 'AOV.Settings.actorItemCID',
    hint: 'AOV.Settings.actorItemCIDHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  }
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
export class AOVCIDSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['aov', 'sheet', 'settings'],
    id: 'cid-settings',
    actions: {
      reset: AOVCIDSettings.onResetDefaults
    },
    form: {
      handler: AOVCIDSettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false
    },
    position: {
      width: 550,
      height: 'auto'
    },
    tag: 'form',
    window: {
      title: 'AOV.Settings.cidOptions',
      contentClasses: ['standard-form']
    }
  }

  /**
   *
   */
  get title () {
    return `${game.i18n.localize(this.options.window.title)}`
  }

  static PARTS = {
    form: { template: 'systems/aov/templates/settings/cid-settings.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' }
  }


  /**
   *
   * @param options
   */
  async _prepareContext (options) {

    const optSet = {}
    for (const [k, v] of Object.entries(SETTINGS)) {
      optSet[k] = {
        value: game.settings.get('aov', k),
        setting: v
      }
    }
    return {
      optSet,
      buttons: [
        { type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' },
        { type: 'reset', action: 'reset', icon: 'fa-solid fa-undo', label: 'SETTINGS.Reset' }
      ]
    }
  }

  /**
   *
   */
  static registerSettings () {
    for (const [k, v] of Object.entries(SETTINGS)) {
      game.settings.register('aov', k, v)
    }
  }

  /**
   *
   * @param event
   */
  static async onResetDefaults (event) {
    event.preventDefault()
    for await (const [k, v] of Object.entries(SETTINGS)) {
      await game.settings.set('aov', k, v?.default)
    }
    return this.render()
  }

  /**
   *
   * @param event
   * @param form
   * @param formData
   */
  static async formHandler (event, form, formData) {
    const settings = foundry.utils.expandObject(formData.object)
    await Promise.all(
      Object.entries(settings)
        .map(([key, value]) => game.settings.set('aov', key, value))
    )
  }

}
