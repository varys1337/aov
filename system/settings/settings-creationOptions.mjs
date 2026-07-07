const SETTINGS = {

  randomDice: {
    name: 'AOV.Settings.randomDice',
    hint: 'AOV.Settings.randomDiceHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  },

  allocatedDice: {
    name: 'AOV.Settings.allocatedDice',
    hint: 'AOV.Settings.allocatedDiceHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  },

  allocatePoints: {
    name: 'AOV.Settings.allocatePoints',
    hint: 'AOV.Settings.allocatePointsHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  },

  binaryGender: {
    name: 'AOV.Settings.binaryGender',
    hint: 'AOV.Settings.binaryGenderHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  },

  addThralls: {
    name: 'AOV.Settings.addThralls',
    hint: 'AOV.Settings.addThrallsHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  },

  childDeath: {
    name: 'AOV.Settings.childDeath',
    hint: 'AOV.Settings.childDeathHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  },

  showDiceRolls: {
    name: 'AOV.Settings.showDiceRolls',
    hint: 'AOV.Settings.showDiceRollsHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  }
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
export class AOVCreateSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['aov', 'sheet', 'settings'],
    id: 'create-settings',
    actions: {
      reset: AOVCreateSettings.onResetDefaults
    },
    form: {
      handler: AOVCreateSettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false
    },
    position: {
      width: 550,
      height: 'auto'
    },
    tag: 'form',
    window: {
      title: 'AOV.Settings.createSettings',
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
    form: { template: 'systems/aov/templates/settings/create-settings.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' }
  }


  /**
   *
   * @param options
   */
  async _prepareContext (options) {
    const isGM = game.user.isGM
    const optSet = {}
    for (const [k, v] of Object.entries(SETTINGS)) {
      optSet[k] = {
        value: game.settings.get('aov', k),
        setting: v
      }
    }
    return {
      isGM,
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
