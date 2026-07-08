import { AOVSelectLists } from '../apps/select-lists.mjs'
import { AOVSystemSocket } from '../apps/socket.mjs'
import { updateWorld } from '../setup/update.mjs'


export default async function Ready () {
  game.socket.on('system.aov', async data => {
    AOVSystemSocket.callSocket(data)
  })

  console.log('///////////////////////////////////')
  console.log('//  Age of Vikings System Ready  //')
  console.log('///////////////////////////////////')

  game.aov.categories = AOVSelectLists.preLoadCategoriesCategories()
  game.aov.weaponCategories = AOVSelectLists.getWeaponCategories
  game.aov.weaponSkillsList = AOVSelectLists.getWeaponSkills

  // Determine if a system update has occured
  if (!game.user.isGM) return
  const currentVersion = game.settings.get(
    'aov',
    'systemVersion'
  )
  const needsUpdate = foundry.utils.isNewerVersion(game.system.version, currentVersion ?? '0')
  if (needsUpdate) {
    await updateWorld()
  }

}
