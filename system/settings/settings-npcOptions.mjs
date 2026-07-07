const SETTINGS = {


  tokenDropMode: {
    name: 'AOV.Settings.tokenDropMode',
    hint: 'AOV.Settings.tokenDropModeHint',
    scope: 'world',
    config: false,
    default: 'ask',
    type: String
  },

  tokenVariantStatMode: {
    name: 'AOV.Settings.tokenVariantStatMode',
    hint: 'AOV.Settings.tokenVariantStatModeHint',
    scope: 'world',
    config: false,
    default: 'ask',
    type: String
  },

  tokenVariantSkillMode: {
    name: 'AOV.Settings.tokenVariantSkillMode',
    hint: 'AOV.Settings.tokenVariantSkillModeHint',
    scope: 'world',
    config: false,
    default: 'ask',
    type: String
  }

}


const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
export class AOVNPCSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['aov', 'sheet', 'settings'],
    id: 'npc-settings',
    actions: {
      reset: AOVNPCSettings.onResetDefaults
    },
    form: {
      handler: AOVNPCSettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false
    },
    position: {
      width: 550,
      height: 'auto'
    },
    tag: 'form',
    window: {
      title: 'AOV.Settings.npcSettings',
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
    form: { template: 'systems/aov/templates/settings/npc-settings.hbs' },
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
    let tokenDropModeOptions = {
      'ask': game.i18n.localize('AOV.Settings.tokenDropModeAsk'),
      'roll': game.i18n.localize('AOV.Settings.tokenDropModeRoll'),
      'average': game.i18n.localize('AOV.Settings.tokenDropModeAverage'),
      'ignore': game.i18n.localize('AOV.Settings.tokenDropModeIgnore')
    }
    let tokenStatModeOptions = {
      'ask': game.i18n.localize('AOV.Settings.tokenDropModeAsk'),
      'roll': game.i18n.localize('AOV.Settings.tokenDropModeRoll'),
      'ignore': game.i18n.localize('AOV.Settings.tokenDropModeIgnore')
    }
    let tokenSkillModeOptions = {
      'ask': game.i18n.localize('AOV.Settings.tokenDropModeAsk'),
      'roll': game.i18n.localize('AOV.Settings.tokenDropModeRoll'),
      'ignore': game.i18n.localize('AOV.Settings.tokenDropModeIgnore')
    }
    return {
      tokenDropModeOptions,
      tokenStatModeOptions,
      tokenSkillModeOptions,
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


