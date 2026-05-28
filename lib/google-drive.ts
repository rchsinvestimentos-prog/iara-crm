import { prisma } from './prisma'

/**
 * Envia um PDF de prontuário assinado digitalmente como backup para o Google Drive central da plataforma.
 * Esta função é projetada defensivamente: se as credenciais não estiverem no .env, ela apenas loga um aviso
 * e permite que a operação principal de preenchimento continue sem falhas.
 */
export async function fazerBackupNoGoogleDrive(params: {
    clinicaId: number
    pacienteNome: string
    pacienteTelefone: string
    documentoTitulo: string
    pdfBase64: string
    filename: string
}) {
    const { clinicaId, pacienteNome, pacienteTelefone, documentoTitulo, filename } = params
    console.log(`[Google Drive Backup] Iniciando backup de prontuário para ${pacienteNome} (${pacienteTelefone})...`)

    try {
        const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL
        const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY

        if (!clientEmail || !privateKey) {
            console.warn('[Google Drive Backup] Aviso: GOOGLE_DRIVE_CLIENT_EMAIL ou GOOGLE_DRIVE_PRIVATE_KEY não configurados no .env. Ignorando upload de backup no Drive.')
            return null
        }

        // Importar googleapis dinamicamente para evitar travamentos de build se o pacote não estiver carregado
        const { google } = require('googleapis')

        const auth = new google.auth.JWT(
            clientEmail,
            null,
            privateKey.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
        )

        const drive = google.drive({ version: 'v3', auth })

        // 1. Obter nome da clínica
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nomeClinica: true, nome: true }
        })
        const nomeClinica = clinica?.nomeClinica || clinica?.nome || `Clinica_${clinicaId}`

        // 2. Localizar ou criar a pasta raiz "IARA - Backups de Assinaturas"
        const pastaRaizId = await obterOuCriarPasta(drive, 'IARA - Backups de Assinaturas')

        // 3. Localizar ou criar a pasta da clínica dentro da raiz
        const pastaClinicaId = await obterOuCriarPasta(drive, nomeClinica, pastaRaizId)

        // 4. Localizar ou criar a pasta da cliente dentro da clínica
        const nomePastaPaciente = `${pacienteNome} - ${pacienteTelefone}`.trim()
        const pastaPacienteId = await obterOuCriarPasta(drive, nomePastaPaciente, pastaClinicaId)

        // 5. Upload do arquivo PDF
        // Converter base64 para Buffer
        const buffer = Buffer.from(params.pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64')
        const { Readable } = require('stream')
        const mediaStream = new Readable()
        mediaStream.push(buffer)
        mediaStream.push(null)

        const fileMetadata = {
            name: filename,
            parents: [pastaPacienteId]
        }

        const media = {
            mimeType: 'application/pdf',
            body: mediaStream
        }

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        })

        console.log(`[Google Drive Backup] Backup concluído com sucesso! File ID: ${file.data.id}`)
        return file.data.webViewLink
    } catch (err) {
        console.error('[Google Drive Backup] Erro durante o backup:', err)
        return null
    }
}

/**
 * Busca uma pasta pelo nome e parent, criando-a se não existir.
 */
async function obterOuCriarPasta(drive: any, nome: string, parentId?: string): Promise<string> {
    let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${nome.replace(/'/g, "\\'")}' and trashed = false`
    if (parentId) {
        query += ` and '${parentId}' in parents`
    } else {
        query += ` and 'root' in parents`
    }

    const response = await drive.files.list({
        q: query,
        fields: 'files(id)',
        spaces: 'drive'
    })

    const files = response.data.files
    if (files && files.length > 0) {
        return files[0].id
    }

    // Criar nova pasta
    const folderMetadata = {
        name: nome,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
    }

    const folder = await drive.files.create({
        resource: folderMetadata,
        fields: 'id'
    })

    return folder.data.id
}
