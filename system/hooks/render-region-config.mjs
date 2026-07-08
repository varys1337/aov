export default function (application, element, context, options) {
  const target = element.querySelector('.tab.region-behaviors')
  if (!target) return

  new foundry.applications.ux.DragDrop({
    permissions: {
      drop: true
    },
    callbacks: {
      drop: async (event) => {
        let dataList
        try {
          dataList = JSON.parse(event.dataTransfer.getData('text/plain'))
        } catch {
          return
        }
        if (typeof dataList?.uuid === 'string') {
          let behaviors = []
          switch (dataList.type) {
            case 'RegionBehavior':
              {
                const behavior = await fromUuid(dataList.uuid)
                if (!behavior) return
                behaviors = [behavior.toObject()]
              }
              break
            case 'Region':
              {
                const region = await fromUuid(dataList.uuid)
                if (!region) return
                behaviors = region.toObject().behaviors ?? []
              }
              break
          }
          if (behaviors.length) {
            await RegionBehavior.create(behaviors, { parent: application.document })
          }
        }
      }
    }
  }).bind(target)
}
