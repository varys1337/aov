import { AOVChat } from '../chat/chat.mjs'

export default function (app, html, data) {
  return AOVChat.renderMessageHook(app, html, data)
}
