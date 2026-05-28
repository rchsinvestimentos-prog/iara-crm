import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const profs = await prisma.$queryRaw`SELECT id, nome, ativo, clinica_id FROM profissionais`;
    console.log("Profissionais:", profs);
}
main().catch(console.error).finally(() => prisma.$disconnect())
