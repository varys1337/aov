import { AOVActor } from '../actor/actor.mjs'

const REFRESH_DELAY_MS = 50
const pendingActorUuids = new Set()
let refreshTimeout = null
let registered = false

export function registerPartyRefreshHooks () {
  if (registered) return
  registered = true

  Hooks.on('updateActor', (actor) => queuePartyRefresh(actor))
  Hooks.on('createItem', (item) => queuePartyRefresh(item?.parent))
  Hooks.on('updateItem', (item) => queuePartyRefresh(item?.parent))
  Hooks.on('deleteItem', (item) => queuePartyRefresh(item?.parent))
}

function queuePartyRefresh (actor) {
  if (!actor || !['character', 'npc', 'farm', 'ship', 'party'].includes(actor.type)) return
  if (actor.type === 'party') {
    if (actor.sheet?.rendered) void actor.sheet.render(false)
    return
  }
  pendingActorUuids.add(actor.uuid)
  if (refreshTimeout) return

  refreshTimeout = setTimeout(() => {
    void flushPartyRefreshQueue()
  }, REFRESH_DELAY_MS)
}

async function flushPartyRefreshQueue () {
  const actorUuids = Array.from(pendingActorUuids)
  pendingActorUuids.clear()
  refreshTimeout = null

  try {
    for (const actorUuid of actorUuids) {
      const actor = await fromUuid(actorUuid)
      await AOVActor.refreshRenderedPartiesForActor(actor)
    }
  } catch (err) {
    console.error(err)
  }
}
