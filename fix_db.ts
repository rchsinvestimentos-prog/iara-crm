import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // 1. Delete ghost procedure
    await prisma.$executeRawUnsafe(`DELETE FROM procedimentos WHERE nome LIKE '%Micro com final feliz%'`)
    await prisma.$executeRawUnsafe(`DELETE FROM procedimentos WHERE nome LIKE '%Tes%'`)
    
    // 2. Set daCursos to true for his clinic
    await prisma.$executeRawUnsafe(`UPDATE users SET "daCursos" = true WHERE id = 9`)
    
    console.log("Banco de dados corrigido manualmente!")
}
main().catch(console.error).finally(() => prisma.$disconnect())
