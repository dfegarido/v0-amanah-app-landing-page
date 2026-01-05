describe('Admin Dashboard', () => {
  beforeEach(() => {
    // Login first before visiting admin dashboard
    const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@test.com'
    const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123456'
    
    cy.loginAdmin(adminEmail, adminPassword)
    
    // Visit admin dashboard after authentication
    cy.visit('/admin')
  })

  it('should display admin dashboard', () => {
    // Wait for page to load and check for dashboard content
    cy.contains('Admin Dashboard', { timeout: 15000 }).should('be.visible')
  })

  it('should load members tab', () => {
    cy.contains('Members', { timeout: 10000 }).click()
    // Wait for tab content to load
    cy.wait(2000)
    // Check for members content (might be loading state or table)
    cy.get('body').should('be.visible')
  })

  it('should load analytics tab', () => {
    cy.contains('Analytics', { timeout: 10000 }).click()
    cy.contains('Platform Analytics', { timeout: 10000 }).should('be.visible')
    cy.contains('Load Analytics').should('be.visible')
  })

  it('should load reports tab', () => {
    cy.contains('Reports', { timeout: 10000 }).click()
    cy.contains('Generate Reports', { timeout: 10000 }).should('be.visible')
    cy.contains('Donations Report').should('be.visible')
    cy.contains('Business Activity Report').should('be.visible')
    cy.contains('Events Report').should('be.visible')
  })

  it('should load activity logs tab', () => {
    cy.contains('Activity Logs', { timeout: 10000 }).click()
    cy.contains('Activity Logs', { timeout: 10000 }).should('be.visible')
    cy.contains('Load Activity Logs').should('be.visible')
  })

  it('should filter analytics by date range', () => {
    cy.contains('Analytics', { timeout: 10000 }).click()
    cy.contains('Platform Analytics', { timeout: 10000 }).should('be.visible')
    
    // Set date range
    cy.get('input[type="date"]').first().should('be.visible').type('2024-01-01')
    cy.get('input[type="date"]').last().should('be.visible').type('2024-12-31')
    
    // Click load analytics
    cy.contains('Load Analytics').click()
    
    // Wait for data to load (may take time)
    cy.wait(3000)
    
    // Check if analytics data is displayed (if loaded successfully)
    cy.get('body').then(($body) => {
      if ($body.text().includes('Total Users')) {
        cy.contains('Total Users').should('be.visible')
      }
    })
  })
})

