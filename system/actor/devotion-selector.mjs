import AOVDialog from '../setup/aov-dialog.mjs'

export class DevotionSelectDialog extends AOVDialog {

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
    const form = event.currentTarget.closest('.devotion-select')
    const chosen = event.currentTarget.closest('.selector')
    let defaultVal = 'xxx'
    let devotion = this.options.data.selectOptions.filter(i => i.id === chosen.value)[0]

    let tempScore = 0
    for (let counter = 1; counter<=this.options.data.picks; counter++) {
      const newTarget = form.querySelector('.option-' + counter)
      if (newTarget.value === devotion.id) {
        tempScore = tempScore + Number(newTarget.dataset.adj)
      }
    }
    //If score will exceed 0 then reset to default and reduce counter by 1
    if (tempScore - Number(chosen.dataset.adj) > 0) {
      chosen.value = defaultVal
      ui.notifications.warn(game.i18n.localize('AOV.ErrorMsg.devotionAlreadySelected'))
    } else {
      //Otherwise update count used and bonus applied
      devotion.bonus = chosen.dataset.adj
    }

    //Calculate number of options used/selected
    let used = 0
    for (let counter = 1; counter<=this.options.data.picks; counter++) {
      const newTarget = form.querySelector('.option-' + counter)
      if (defaultVal != newTarget.value) {used++}
    }


    //Update seletected score
    this.options.data.added = used
    const divCount = form.querySelector('.count')
    divCount.innerText = this.options.data.added
  }




  /**
   *
   * @param selectOptions
   */
  static async create (selectOptions) {
    let destination = 'systems/aov/templates/dialog/devotionSelect.hbs'
    let winTitle = game.i18n.format('AOV.selectItem', { type: game.i18n.localize('TYPES.Item.devotion') })
    let data = {
      selectOptions,
      added: 0,
      picks: 3
    }
    const html = await foundry.applications.handlebars.renderTemplate(destination, data)

    return new Promise(resolve => {
      const dlg = DevotionSelectDialog.wait(
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

