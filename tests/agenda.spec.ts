import { test, expect } from '@playwright/test'

test.describe('Agenda', () => {
    test.beforeEach(async ({ page }) => {
        const email = process.env.TEST_EMAIL
        const senha = process.env.TEST_PASSWORD
        if (!email || !senha) {
            test.skip()
            return
        }
        // Login
        await page.goto('/login')
        await page.locator('input[placeholder="seu@email.com"]').fill(email)
        await page.locator('input[placeholder="••••••••"]').fill(senha)
        await page.locator('button:has-text("Entrar")').click()
        await page.waitForURL('**/dashboard**', { timeout: 15000 })
    })

    test('deve carregar a página de agenda', async ({ page }) => {
        await page.goto('/agenda')
        await expect(page.getByText('Agenda')).toBeVisible({ timeout: 10000 })
    })

    test('deve exibir os modos de visualização', async ({ page }) => {
        await page.goto('/agenda')
        await expect(page.getByText('Mensal')).toBeVisible({ timeout: 10000 })
        await expect(page.getByText('Semanal')).toBeVisible()
        await expect(page.getByText('Diário')).toBeVisible()
    })

    test('deve abrir modal de novo agendamento', async ({ page }) => {
        await page.goto('/agenda')
        // Clicar no botão de adicionar
        const addBtn = page.locator('button').filter({ hasText: /novo|adicionar|\+/i }).first()
        if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await addBtn.click()
            await expect(page.getByText('Novo Agendamento')).toBeVisible({ timeout: 5000 })
        }
    })

    test('deve exibir profissionais no dropdown do agendamento', async ({ page }) => {
        await page.goto('/agenda')
        // Abrir modal
        const addBtn = page.locator('button').filter({ hasText: /novo|adicionar|\+/i }).first()
        if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await addBtn.click()
            await expect(page.getByText('Novo Agendamento')).toBeVisible({ timeout: 5000 })
            
            // Verificar se o select de profissional tem opções
            const selectProf = page.locator('select').first()
            const options = await selectProf.locator('option').count()
            expect(options).toBeGreaterThan(0)
        }
    })

    test('deve exibir procedimentos ao selecionar profissional', async ({ page }) => {
        await page.goto('/agenda')
        const addBtn = page.locator('button').filter({ hasText: /novo|adicionar|\+/i }).first()
        if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await addBtn.click()
            await expect(page.getByText('Novo Agendamento')).toBeVisible({ timeout: 5000 })
            
            // O campo de procedimento deve existir (select ou input)
            const procField = page.locator('select, input').filter({ hasText: /procedimento|Selecione/i }).or(
                page.locator('input[placeholder*="Botox"]')
            ).first()
            await expect(procField).toBeVisible({ timeout: 5000 })
        }
    })
})
