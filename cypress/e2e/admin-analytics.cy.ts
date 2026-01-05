describe('Admin Analytics', () => {
  beforeEach(() => {
    const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@test.com'
    const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123456'
    
    cy.loginAdmin(adminEmail, adminPassword)
    cy.visit('/admin')
    cy.contains('Analytics').click()
  })

  it('should load analytics overview', () => {
    // Set date range
    cy.get('input[type="date"]').first().type('2024-01-01')
    cy.get('input[type="date"]').last().type('2024-12-31')
    
    // Intercept API calls
    cy.intercept('GET', '/api/admin/analytics/overview*').as('overview')
    cy.intercept('GET', '/api/admin/analytics/user-activity*').as('userActivity')
    cy.intercept('GET', '/api/admin/analytics/donations*').as('donations')
    cy.intercept('GET', '/api/admin/analytics/listings*').as('listings')
    
    // Click load analytics
    cy.contains('Load Analytics').click()
    
    // Wait for all API calls
    cy.wait('@overview')
    cy.wait('@userActivity')
    cy.wait('@donations')
    cy.wait('@listings')
    
    // Check if analytics data is displayed
    cy.contains('Total Users').should('be.visible')
    cy.contains('Total Donations').should('be.visible')
  })

  it('should display analytics metrics', () => {
    // Load analytics first
    cy.get('input[type="date"]').first().type('2024-01-01')
    cy.get('input[type="date"]').last().type('2024-12-31')
    cy.contains('Load Analytics').click()
    cy.wait(3000)
    
    // Check for metric cards
    cy.contains('Total Users').should('be.visible')
    cy.contains('Total Donations').should('be.visible')
    cy.contains('Donation Amount').should('be.visible')
    cy.contains('Active Businesses').should('be.visible')
  })
})

