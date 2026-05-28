import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const res = await prisma.$executeRawUnsafe(`DELETE FROM cache_respostas`)
    console.log(`Cache limpo! Deletadas ${res} entradas.`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
