import AOVDialog from '../setup/aov-dialog.mjs'

export class StatsSelectDialog extends AOVDialog {
  /**
   *
   * @param html
   */
  activateListeners (html) {
    super.activateListeners(html)
  }

  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this.element.querySelectorAll('.up.rollable').forEach(n => n.addEventListener('click', this._onSelectArrowClicked.bind(this)))
    this.element.querySelectorAll('.down.rollable').forEach(n => n.addEventListener('click', this._onSelectArrowClicked.bind(this)))
  }

  /**
   *
   * @param event
   */
  async _onSelectArrowClicked (event) {
    let change = Number(event.currentTarget.dataset.change)
    const chosen = event.currentTarget.closest('.large-icon')
    let choice = chosen.dataset.set
    //Don't allow spend over pointsMax
    if (this.options.data.added+change>this.options.data.pointsMax) {change=0}
    //Stats only allowed in range 8-15
    if ((this.options.data.stats[choice].value + change) <this.options.data.stats[choice].min || (this.options.data.stats[choice].value + change) > this.options.data.stats[choice].max) {change = 0}
    //Change the stat value & points spent
    this.options.data.stats[choice].value = this.options.data.stats[choice].value + change
    this.options.data.added = this.options.data.added + change

    //Update points spent and the stats value on the form
    const form = event.currentTarget.closest('.stats-input')
    const divCount = form.querySelector('.count')
    divCount.innerText = this.options.data.added
    const statVal = form.querySelector('.item-'+choice)
    statVal.innerText = this.options.data.stats[choice].value
  }

  /**
   *
   * @param stats
   */
  static async create (stats) {
    let destination = 'systems/aov/templates/dialog/statsInput.hbs'
    let winTitle = game.i18n.localize('AOV.usePoints')
    for (const [key, stat] of Object.entries(stats)) {
      stat.value = 10
      let roll = new Roll (stat.formula)
      await roll.evaluateSync({ maximize: true })
      stat.max = roll.total
    }

    let data = {
      stats:stats,
      pointsMax:90,
      added : 70
    }
    const html = await foundry.applications.handlebars.renderTemplate(destination, data)

    return new Promise(resolve => {
      const dlg = StatsSelectDialog.wait(
        {
          window: { title: winTitle },
          form: { closeOnSubmit: false },
          title: winTitle,
          content: html,
          data,
          buttons: [{
            label: game.i18n.localize('AOV.confirm'),
            callback: (event, button, dialog) => {
              if (dialog.options.data.added < dialog.options.data.pointsMax)  {
                button.disabled = true
              } else {
                dialog.options.form.closeOnSubmit = true
                const selected = [dialog.options.data.stats]
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
