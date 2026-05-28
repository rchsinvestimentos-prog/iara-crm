import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    try {
        const clinicas = await prisma.$queryRaw`SELECT id, nome_clinica, email, whatsapp_doutora, whatsapp_clinica, evolution_instance FROM users`;
        console.log("CLINICAS_FOUND:", JSON.stringify(clinicas, null, 2));
    } catch (e: any) {
        console.error("Erro ao conectar no banco:", e.message || e);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect())
