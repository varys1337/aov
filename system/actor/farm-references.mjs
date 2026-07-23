/**
 * Resolve the world Farm Actors linked to a Character.
 * @param {Actor} actor
 * @param {object} options
 * @param {boolean} [options.requireOwner=false]
 * @param {boolean} [options.requireObserver=false]
 * @returns {Promise<{farms: Actor[], invalid: string[], denied: Actor[], ok: boolean}>}
 */
export async function resolveWorldFarms (actor, { requireOwner = false, requireObserver = false } = {}) {
  const farms = []
  const invalid = []
  const denied = []

  for (const reference of actor?.system?.farms ?? []) {
    const uuid = typeof reference === 'string' ? reference : reference?.uuid
    const farm = uuid ? await fromUuid(uuid) : null
    if (!farm || farm.inCompendium || farm.type !== 'farm') {
      invalid.push(uuid ?? game.i18n.localize('AOV.invalid'))
      continue
    }

    farms.push(farm)
    if (game.user.isGM) continue
    if (requireOwner && !farm.isOwner) denied.push(farm)
    else if (requireObserver && !farm.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) {
      denied.push(farm)
    }
  }

  return {
    farms,
    invalid,
    denied,
    ok: invalid.length === 0 && denied.length === 0
  }
}

/**
 * Report invalid or inaccessible Farm links as one notification.
 * @param {{invalid: string[], denied: Actor[]}} resolution
 */
export function notifyFarmReferenceErrors (resolution) {
  const messages = []
  if (resolution.invalid.length) {
    messages.push(game.i18n.format('AOV.Party.InvalidFarmReferences', {
      references: resolution.invalid.join(', ')
    }))
  }
  if (resolution.denied.length) {
    messages.push(game.i18n.format('AOV.Party.FarmPermissionDenied', {
      count: resolution.denied.length
    }))
  }
  if (messages.length) ui.notifications.warn(messages.join(' '))
}
