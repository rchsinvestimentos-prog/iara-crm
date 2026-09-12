#!/bin/sh
set -e

# Confere o banco antes de subir: roda o SQL do /api/setup-db e cria as
# colunas novas do schema.prisma. Só adiciona, nunca apaga.
#
# Antes aqui rodava "prisma db push --accept-data-loss 2>/dev/null": nunca
# funcionou no contêiner (erro escondido), e se funcionasse apagaria as
# tabelas da memória da IARA que não estão no schema.
echo "🔄 Conferindo o banco..."
if node scripts/banco-no-boot.js; then
  echo "✅ Banco conferido."
else
  echo ""
  echo "❌❌❌ FALHA AO CONFERIR O BANCO. O app vai subir mesmo assim."
  echo "❌❌❌ Veja o erro acima e rode GET /api/setup-db depois que o banco responder."
  echo ""
fi

echo "🚀 Starting server..."
exec node server.js
