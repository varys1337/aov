//CHAOSIUM ID BUTTON

import { CIDEditor } from './cid-editor.mjs'
import { CID } from './cid.mjs'

export function supportsCID (document) {
  if (!document) return false
  return Object.values(CID.documentNameLookup).some(cls => document instanceof cls)
}

export function getCIDClass (document) {
  return document?.flags?.aov?.cidFlag?.id ? 'edit-cid-exisiting' : 'edit-cid-warning invalid-cid'
}

export function getCIDFrameButton (document, action = 'editCid') {
  if (!supportsCID(document)) return null
  return {
    action,
    icon: `fa-solid fa-fingerprint ${getCIDClass(document)}`,
    label: 'AOV.CIDFlag.id'
  }
}

export async function renderCIDDocumentSheet (document) {
  if (document?.sheet?.rendered) await document.sheet.render(false)
}

export function openCIDEditor (document) {
  if (!supportsCID(document)) return
  new CIDEditor({ document }, {}).render(true, { focus: true })
}

export async function copyCID (document) {
  const id = document?.flags?.aov?.cidFlag?.id
  if (!id) return
  await game.clipboard.copyPlainText(id)
  ui.notifications.info('AOV.WhatCopiedClipboard', {
    format: { what: game.i18n.localize('AOV.CIDFlag.key') },
    console: false
  })
}

export async function handleCIDAction (event, document) {
  event.preventDefault()
  event.stopPropagation()
  if (event.detail > 1) return
  if (event.button === 2) return copyCID(document)
  if (event.button !== 0) return
  return openCIDEditor(document)
}

export function insertCIDFrameButton (application, element) {
  const cidDocument = application.document
  if (!supportsCID(cidDocument)) return

  const action = 'cid'
  if (element.querySelector(`button[data-action="${action}"]`)) return

  const header = element.querySelector('header.window-header')
  if (!header) return

  const label = game.i18n.localize('AOV.CIDFlag.id')
  const button = element.ownerDocument.createElement('button')
  button.type = 'button'
  button.className = `header-control fa-solid fa-fingerprint ${getCIDClass(cidDocument)} icon`
  button.dataset.action = action
  button.dataset.tooltip = 'AOV.CIDFlag.id'
  button.setAttribute('aria-label', label)
  button.addEventListener('click', event => handleCIDAction(event, cidDocument))
  button.addEventListener('contextmenu', event => handleCIDAction(event, cidDocument))

  const copyUuid = header.querySelector('button.header-control[data-action="copyUuid"]')
  if (copyUuid) {
    copyUuid.after(button)
    return
  }

  const close = header.querySelector('button.header-control[data-action="close"]')
  if (close) {
    close.before(button)
    return
  }

  header.append(button)
}
