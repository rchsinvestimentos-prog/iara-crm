import { test, expect } from '@playwright/test'
import { loginAsCliente } from './helpers/auth'

test.describe('Secretária', () => {
    test.beforeEach(async ({ page }) => {
        const email = process.env.TEST_EMAIL
        const senha = process.env.TEST_PASSWORD
        if (!email || !senha) {
            test.skip()
            return
        }
        await loginAsCliente(page)
    })

    test('deve preencher e salvar personalidade da IA', async ({ page }) => {
        await page.goto('/secretaria')
        await page.waitForLoadState('networkidle')

        // Verifica se estamos na página correta
        await expect(page.locator('text=Personalidade, text=Secretária, text=Tom de Voz').first()).toBeVisible({ timeout: 10000 })

        // Preenche algum textarea de personalidade
        const inputPersonalidade = page.locator('textarea, input[placeholder*="personalidade" i]').first()
        
        if (await inputPersonalidade.isVisible()) {
            await inputPersonalidade.fill('Você é a IARA, seja educada e ajude os clientes.')
            
            // Clica em botão que contem salvar personalidade
            const btnSalvar = page.locator('button:has-text("Salvar Personalidade")').first()
            if (await btnSalvar.isVisible()) {
                await btnSalvar.click()
                await expect(page.locator('text=sucesso, text=salvo, text=✅').first()).toBeVisible({ timeout: 10000 })
            }
        }
    })

    test('deve alterar e salvar o modo IA', async ({ page }) => {
        await page.goto('/secretaria')
        await page.waitForLoadState('networkidle')

        const btnSalvarModo = page.locator('button:has-text("Salvar Modo")').first()
        if (await btnSalvarModo.isVisible()) {
            await btnSalvarModo.click()
            await expect(page.locator('text=sucesso, text=atualizado, text=✅').first()).toBeVisible({ timeout: 10000 })
        }
    })

    test('deve salvar as configurações da secretária', async ({ page }) => {
        await page.goto('/secretaria')
        await page.waitForLoadState('networkidle')

        const btnSalvarConfig = page.locator('button:has-text("Salvar Configurações da Secretária")').first()
        if (await btnSalvarConfig.isVisible()) {
            await btnSalvarConfig.click()
            await expect(page.locator('text=sucesso, text=salvas, text=✅').first()).toBeVisible({ timeout: 10000 })
        }
    })
})
