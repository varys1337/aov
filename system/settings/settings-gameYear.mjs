const SETTINGS = {
  gameYear: {
    name: 'AOV.Settings.gameYear',
    hint: 'AOV.Settings.gameYearHint',
    scope: 'world',
    config: false,
    type: Number,
    default: 977
  },

  omens: {
    name: 'AOV.Settings.omens',
    hint: 'AOV.Settings.omensHint',
    scope: 'world',
    config: false,
    type: String,
    default: 'normal'
  }

}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
export class AOVGameYearSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['aov', 'sheet', 'settings'],
    id: 'gameYear-settings',
    actions: {
      reset: AOVGameYearSettings.onResetDefaults
    },
    form: {
      handler: AOVGameYearSettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false
    },
    position: {
      width: 550,
      height: 'auto'
    },
    tag: 'form',
    window: {
      title: 'AOV.Settings.gameYearSettings',
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
    form: { template: 'systems/aov/templates/settings/gameYear-settings.hbs' },
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

    //options.omensList = CONFIG.AOV.omensList


    optSet.omensList = {
      'cursed': game.i18n.localize('AOV.Omens.cursed'),
      'illfavoured': game.i18n.localize('AOV.Omens.illfavoured'),
      'normal': game.i18n.localize('AOV.Omens.normal'),
      'good': game.i18n.localize('AOV.Omens.good'),
      'blessed': game.i18n.localize('AOV.Omens.blessed')
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
