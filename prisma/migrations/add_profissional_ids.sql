-- Migration: Adicionar campo profissional_ids (JSON array) na tabela procedimentos
-- Suporta múltiplos profissionais por procedimento
-- Rode este SQL no banco de produção

ALTER TABLE procedimentos 
ADD COLUMN IF NOT EXISTS profissional_ids JSONB DEFAULT '[]'::jsonb;

-- Migrar dados existentes: se já tem profissional_id, colocar no array
UPDATE procedimentos 
SET profissional_ids = jsonb_build_array(profissional_id)
WHERE profissional_id IS NOT NULL 
  AND (profissional_ids IS NULL OR profissional_ids = '[]'::jsonb);
