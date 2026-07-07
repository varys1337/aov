import AOVDialog from '../setup/aov-dialog.mjs'

export class PersSkillSelectDialog extends AOVDialog {

  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this.element.querySelectorAll('.selector').forEach(n => n.addEventListener('change', this._onSelectClicked.bind(this)))
  }

  /**
   *
   * @param event
   */
  async _onSelectClicked (event) {
    const form = event.currentTarget.closest('.personal-skill-select')
    const chosen = event.currentTarget.closest('.selector')
    let defaultVal = 'xxx'
    let skill = this.options.data.selectOptions.filter(i => i.id === chosen.value)[0]

    let tempScore = skill.score
    let used = 0
    for (let counter = 1; counter<12; counter++) {
      const newTarget = form.querySelector('.option-' + counter)
      if (defaultVal != newTarget.value) {used++}
      if (newTarget.value === skill.id) {
        tempScore = tempScore + Number(newTarget.dataset.adj)
      }
    }

    //If score will exceed 100% then reject
    if (tempScore - Number(chosen.dataset.adj) >= 100) {
      chosen.value = defaultVal
      ui.notifications.warn(game.i18n.localize('AOV.ErrorMsg.cantImproveSkill'))
      return
    }

    //Otherwise update count used and bonus applied
    skill.bonus = tempScore - skill.score
    this.options.data.selectOptions
    this.options.data.added = used
    const divCount = form.querySelector('.count')
    divCount.innerText = this.options.data.added
  }


  /**
   *
   * @param selectOptions
   */
  static async create (selectOptions) {
    let destination = 'systems/aov/templates/dialog/persSkillSelect.hbs'
    let winTitle = game.i18n.format('AOV.selectItem', { type: game.i18n.localize('TYPES.Item.skill') })
    let data = {
      selectOptions,
      added: 0,
      picks: 11
    }
    const html = await foundry.applications.handlebars.renderTemplate(destination, data)

    return new Promise(resolve => {
      const dlg = PersSkillSelectDialog.wait(
        {
          window: { title: winTitle },
          form: { closeOnSubmit: false },
          title: winTitle,
          content: html,
          data,
          buttons:[{
            label: game.i18n.localize('AOV.confirm'),
            callback: (event, button, dialog) => {
              if (dialog.options.data.added < dialog.options.data.picks) {
                button.disabled = true
              } else {
                dialog.options.form.closeOnSubmit = true
                return resolve(button.form.elements)
              }
            }
          }]
        }
      )

    })
    return dlg
  }
}

