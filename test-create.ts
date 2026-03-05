import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testCreate() {
    try {
        const senhaHash = await bcrypt.hash('123456', 10)
        let proximaRenovacao = new Date()
        proximaRenovacao.setDate(proximaRenovacao.getDate() + 7)

        const clinica = await prisma.clinica.create({
            data: {
                nome: "Teste Script",
                email: "testescript@gmail.com",
                telefone: "41991981913",
                senha: senhaHash,
                role: 'cliente',
                nivel: 1,
                plano: 'essencial',
                status: 'ativo',
                creditosMensais: 1000,
                creditosDisponiveis: 1000,
                proximaRenovacao,
            },
        })
        console.log("Success:", clinica.id)
    } catch (e: any) {
        console.error("Prisma Error:", e.name, e.message)
    } finally {
        await prisma.$disconnect()
    }
}

testCreate()
