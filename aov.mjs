import { AOVMenu } from "./system/setup/menu.mjs";
import drawNote from "./system/hooks/draw-note.mjs";
import renderSceneControls from "./system/hooks/render-scene-controls.mjs";
import RenderJournalEntrySheet from './system/hooks/render-journal-entry-sheet.mjs'
import RenderJournalEntryPageTextSheet from "./system/hooks/render-journal-entry-page-text-sheet.mjs";
import RenderNoteConfig from './system/hooks/render-note-config.js'
import RenderRollTableSheet from './system/hooks/render-roll-table-sheet.mjs'
import CreateToken from './system/hooks/create-token.mjs'
import RenderChatMessageHTML from './system/hooks/render-chat-message.mjs'
import RenderRegionConfig from './system/hooks/render-region-config.mjs'
import RenderActiveEffectConfig from './system/hooks/render-active-effect-config.mjs'
import { registerPartyRefreshHooks } from './system/hooks/party-refresh.mjs'

import Init from './system/hooks/init.mjs';
import Ready from './system/hooks/ready.mjs';

Hooks.once('init', Init);
Hooks.once('ready', Ready);
registerPartyRefreshHooks();
Hooks.on('drawNote', drawNote);
Hooks.on('getSceneControlButtons', AOVMenu.getButtons);
Hooks.on('renderSceneControls', renderSceneControls);
Hooks.on("renderJournalEntryPageTextSheet", RenderJournalEntryPageTextSheet);
Hooks.on('renderJournalEntrySheet', RenderJournalEntrySheet);
Hooks.on('renderNoteConfig', RenderNoteConfig);
Hooks.on('renderRollTableSheet', RenderRollTableSheet);
Hooks.on('renderChatMessageHTML', RenderChatMessageHTML);
Hooks.on('createToken', CreateToken);
Hooks.on('renderRegionConfig', RenderRegionConfig);
Hooks.on('renderActiveEffectConfig', RenderActiveEffectConfig);
