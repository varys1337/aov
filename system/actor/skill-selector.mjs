import AOVDialog from '../setup/aov-dialog.mjs'

export class SkillsSelectDialog extends AOVDialog {

  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this.element.querySelectorAll('.select.rollable').forEach(n => n.addEventListener('click', this._onSelectClicked.bind(this)))
  }

  /**
   *
   * @param event
   */
  async _onSelectClicked (event) {
    const chosen = event.currentTarget.closest('.mediumIcon')
    let choice = chosen.dataset.set
    let change = 1
    if (this.options.data.selectOptions[choice].selected) change = -1
    //Don't allow spend over picks
    if (this.options.data.added + change <= this.options.data.picks) {
      //Update points spent and the stats value on the form
      const form = event.currentTarget.closest('.skill-select')
      const divCount = form.querySelector('.count')
      const selected = form.querySelector('.item-' + choice)
      if (this.options.data.selectOptions[choice].selected) {
        this.options.data.selectOptions[choice].selected = false
        selected.innerHTML = '<a><i class="fa-regular fa-square"></i> </a>'
      } else {
        this.options.data.selectOptions[choice].selected = true
        selected.innerHTML = '<a><i class="fa-regular fa-square-check"></i> </a>'
      }
      //Change the points spent
      this.options.data.added = await (this.options.data.selectOptions.filter(option => (option.selected))).length
      divCount.innerText = this.options.data.added
    }
  }

  /**
   *
   * @param selectOptions
   * @param picks
   * @param type
   * @param brief
   */
  static async create (selectOptions, picks, type, brief) {
    let destination = 'systems/aov/templates/dialog/skillSelect.hbs'
    let winTitle = game.i18n.format('AOV.selectItem', { type: type })
    for (let option of selectOptions) {
      option.selected = false
    }
    let data = {
      selectOptions,
      brief,
      picks,
      added: 0
    }
    const html = await foundry.applications.handlebars.renderTemplate(destination, data)

    return new Promise(resolve => {
      const dlg = SkillsSelectDialog.wait(
        {
          window: { title: winTitle },
          classes: ['skill-selector'],
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
                const selected = dialog.options.data.selectOptions.filter(option => (option.selected))
                return resolve(selected)
              }
            }
          }]
        }
      )

    })
    return dlg
  }
}

