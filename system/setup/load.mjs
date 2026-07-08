// If a new world then create a default scene.
Hooks.once('ready', async () => {
  if (!game.user.isGM) return

  const isNewWorld = !(game.actors.size + game.items.size + game.journal.size)
  if (!isNewWorld) return

  const hasUserScene = game.scenes.filter(scene => scene.id !== 'NUEDEFAULTSCENE0').length > 0
  if (hasUserScene) return

  await Scene.create({
    name:'Default',
    active:true,
    levels: [{
      name: 'Default',
      background: { src: 'systems/aov/art-assets/vikings-launch.jpg' }
    }],
    foregroundElevation:20,
    thumb:'systems/aov/art-assets/vikings-launch.jpg',
    grid:{ type:0 },
    tokenVision:false,
    fog:{ exploration:false },
    initial:{ scale: 0.4 }
  })
})
