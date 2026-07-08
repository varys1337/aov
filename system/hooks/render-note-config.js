/**
 * Render Hook
 * @param {ApplicationV2} application
 * @param {HTMLElement} element
 */
/* global game */
export default function (application, element) {
  const hideBackground = application.document.getFlag('aov', 'hide-background') ?? false
  const tint = element.querySelector("[name='texture.tint']")
  const formGroup = tint?.closest('div.form-group')
  if (!formGroup) return
  if (element.querySelector("[name='flags.aov.hide-background']")) return

  const newGroup = element.ownerDocument.createElement('div')
  newGroup.classList.add('form-group')
  const label = element.ownerDocument.createElement('label')
  label.setAttribute('for', application.id + '-hide-background')
  label.innerText = game.i18n.localize('AOV.mapNoteNoBackground')
  const div = element.ownerDocument.createElement('div')
  div.classList.add('form-fields')
  const input = element.ownerDocument.createElement('input')
  input.type = 'checkbox'
  input.name = 'flags.aov.hide-background'
  input.checked = hideBackground
  input.id = application.id + '-hide-background'
  div.append(input)
  newGroup.append(label)
  newGroup.append(div)
  formGroup.after(newGroup)
  application.document?.object?.draw()
}
