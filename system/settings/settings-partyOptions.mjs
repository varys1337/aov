let partyRenderTimeout = null

function queueOpenPartySheetRender () {
  if (partyRenderTimeout) return
  partyRenderTimeout = setTimeout(() => {
    partyRenderTimeout = null
    void renderOpenPartySheets()
  }, 0)
}

async function renderOpenPartySheets () {
  const renderedParties = game.actors?.filter((actor) => actor.type === 'party' && actor.sheet?.rendered) ?? []
  await Promise.all(renderedParties.map((actor) => actor.sheet.render(false)))
}

const WORLD_SETTINGS = {
  partyHPVal: {
    name: 'AOV.Settings.partyHPVal',
    hint: 'AOV.Settings.partyHPValHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: queueOpenPartySheetRender
  },

  partyShowFullMemberStats: {
    name: 'AOV.Settings.partyShowFullMemberStats',
    hint: 'AOV.Settings.partyShowFullMemberStatsHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: queueOpenPartySheetRender
  },

  partyShowDowntime: {
    name: 'AOV.Settings.partyShowDowntime',
    hint: 'AOV.Settings.partyShowDowntimeHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: queueOpenPartySheetRender
  }
}

const USER_SETTINGS = {
  partyUserHPVal: {
    name: 'AOV.Settings.partyUserHPVal',
    hint: 'AOV.Settings.partyUserHPValHint',
    scope: 'user',
    config: false,
    type: Boolean,
    default: true,
    onChange: queueOpenPartySheetRender
  },

  partyUserShowFullMemberStats: {
    name: 'AOV.Settings.partyUserShowFullMemberStats',
    hint: 'AOV.Settings.partyUserShowFullMemberStatsHint',
    scope: 'user',
    config: false,
    type: Boolean,
    default: true,
    onChange: queueOpenPartySheetRender
  },

  partyUserShowDowntime: {
    name: 'AOV.Settings.partyUserShowDowntime',
    hint: 'AOV.Settings.partyUserShowDowntimeHint',
    scope: 'user',
    config: false,
    type: Boolean,
    default: true,
    onChange: queueOpenPartySheetRender
  }
}

const SETTINGS = { ...WORLD_SETTINGS, ...USER_SETTINGS }

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class AOVPartySettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['aov', 'sheet', 'settings'],
    id: 'party-settings',
    actions: {
      reset: AOVPartySettings.onResetDefaults
    },
    form: {
      handler: AOVPartySettings.formHandler,
      closeOnSubmit: true,
      submitOnChange: false
    },
    position: {
      width: 550,
      height: 'auto'
    },
    tag: 'form',
    window: {
      title: 'AOV.Settings.partyOptions',
      contentClasses: ['standard-form']
    }
  }

  /**
   * Return the localized Application title.
   * @returns {string} Localized Application title.
   */
  get title () {
    return game.i18n.localize(this.options.window.title)
  }

  static PARTS = {
    form: { template: 'systems/aov/templates/settings/party-settings.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' }
  }

  /**
   * Prepare world-policy and personal-preference setting groups.
   * @param {object} options Render options.
   * @returns {Promise<object>} Handlebars context.
   */
  async _prepareContext (options) {
    const prepareSettings = (settings) => Object.fromEntries(
      Object.entries(settings).map(([key, setting]) => [key, {
        value: game.settings.get('aov', key),
        setting
      }])
    )
    return {
      isGM: game.user.isGM,
      worldSettings: game.user.isGM ? prepareSettings(WORLD_SETTINGS) : {},
      userSettings: prepareSettings(USER_SETTINGS),
      buttons: [
        { type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' },
        { type: 'reset', action: 'reset', icon: 'fa-solid fa-undo', label: 'SETTINGS.Reset' }
      ]
    }
  }

  /** Register Party world policy and user preference settings. */
  static registerSettings () {
    for (const [key, setting] of Object.entries(SETTINGS)) {
      game.settings.register('aov', key, setting)
    }
  }

  /**
   * Reset only the setting scopes which the current user may edit.
   * @param {Event} event Click event.
   * @returns {Promise<ApplicationV2>} The rerendered settings application.
   */
  static async onResetDefaults (event) {
    event.preventDefault()
    const writableSettings = game.user.isGM ? SETTINGS : USER_SETTINGS
    await Promise.all(
      Object.entries(writableSettings).map(([key, setting]) => game.settings.set('aov', key, setting.default))
    )
    return this.render()
  }

  /**
   * Persist an allowlisted set of submitted Party settings.
   * @param {SubmitEvent} event Submit event.
   * @param {HTMLFormElement} form Submitted form.
   * @param {FormDataExtended} formData Processed form data.
   * @returns {Promise<void>}
   */
  static async formHandler (event, form, formData) {
    const settings = foundry.utils.expandObject(formData.object)
    const writableKeys = new Set(Object.keys(game.user.isGM ? SETTINGS : USER_SETTINGS))
    await Promise.all(
      Object.entries(settings)
        .filter(([key]) => writableKeys.has(key))
        .map(([key, value]) => game.settings.set('aov', key, value))
    )
  }
}
