describe('Admin Moderation', () => {
  beforeEach(() => {
    const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@test.com'
    const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123456'
    
    cy.loginAdmin(adminEmail, adminPassword)
  })

  it('should verify business', () => {
    // Visit admin dashboard
    cy.visit('/admin')
    cy.contains('Businesses').click()
    
    // Wait for businesses to load
    cy.wait(2000)
    
    // Find a pending business (if any)
    cy.get('table').then(($table) => {
      if ($table.find('td:contains("pending")').length > 0) {
        // Click approve/verify button for first pending business
        cy.get('button').contains('Approve').first().click()
        
        // Wait for success message
        cy.wait(2000)
        cy.contains('success', { matchCase: false }).should('be.visible')
      }
    })
  })

  it('should verify mosque', () => {
    // Visit admin dashboard
    cy.visit('/admin')
    cy.contains('Mosques').click()
    
    // Wait for mosques to load
    cy.wait(2000)
    
    // Find a pending mosque (if any)
    cy.get('table').then(($table) => {
      if ($table.find('td:contains("pending")').length > 0) {
        // Click approve/verify button for first pending mosque
        cy.get('button').contains('Approve').first().click()
        
        // Wait for success message
        cy.wait(2000)
        cy.contains('success', { matchCase: false }).should('be.visible')
      }
    })
  })

  it('should display activity logs after moderation', () => {
    cy.visit('/admin')
    cy.contains('Activity Logs').click()
    cy.contains('Load Activity Logs').click()
    
    // Wait for logs to load
    cy.wait(2000)
    
    // Check if activity logs table exists
    cy.get('table').should('exist')
  })
})

