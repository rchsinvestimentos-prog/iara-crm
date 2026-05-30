// ============================================
// IARA ENGINE — Index
// ============================================
// Barrel file: importa tudo de um lugar só.
//
// Uso:
//   import { processMessage } from '@/lib/engine'
//   import { checkAccess } from '@/lib/engine'

export { processMessage } from './pipeline'
export { checkAccess, findClinicaByInstance, descontarCredito } from './catraca'
export { buildSystemPrompt, callAI } from './ai-engine'
export { getCofrePadrao, getCofreParaClinica, getLabels } from './cofre'
export { sendText, sendAudio, sendImage } from './sender'
export { transcribeAudio, generateTTS, determineOutputType } from './audio'
export { getClientMemory, getDraFeedbacks, getConversationHistory, saveToHistory, saveDraFeedback, detectFeedback } from './memory'
export { logEvent, logError } from './logger'
export { getAgendaContext, processarAgendamentos } from './calendar'

export type * from './types'
