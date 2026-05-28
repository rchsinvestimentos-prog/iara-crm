import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const clinica = await prisma.clinica.findFirst({
        where: { nomeAssistente: { contains: 'Rafinha' } }
    });
    if (!clinica) {
        console.log("Clinica not found");
        return;
    }
    const procs = await prisma.$queryRaw`SELECT * FROM procedimentos WHERE user_id = ${clinica.id} AND ativo = true`;
    console.log("Procedimentos ATIVOS:", procs);
}
main().catch(console.error).finally(() => prisma.$disconnect())
