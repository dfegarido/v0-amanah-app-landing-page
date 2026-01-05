describe('Admin Reports', () => {
  beforeEach(() => {
    const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@test.com'
    const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123456'
    
    cy.loginAdmin(adminEmail, adminPassword)
    cy.visit('/admin')
    cy.contains('Reports', { timeout: 15000 }).click()
  })

  it('should download donations CSV report', () => {
    // Set date range
    cy.get('input[type="date"]').first().type('2024-01-01')
    cy.get('input[type="date"]').last().type('2024-12-31')
    
    // Intercept the download request
    cy.intercept('GET', '/api/admin/reports/donations?format=csv*').as('downloadCSV')
    
    // Click CSV download button
    cy.contains('Donations Report').parent().parent().contains('CSV').click()
    
    // Wait for download to complete
    cy.wait('@downloadCSV').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200)
      expect(interception.response?.headers['content-type']).to.include('text/csv')
    })
  })

  it('should download donations PDF report', () => {
    // Set date range
    cy.get('input[type="date"]').first().type('2024-01-01')
    cy.get('input[type="date"]').last().type('2024-12-31')
    
    // Intercept the download request
    cy.intercept('GET', '/api/admin/reports/donations?format=pdf*').as('downloadPDF')
    
    // Click PDF download button
    cy.contains('Donations Report').parent().parent().contains('PDF').click()
    
    // Wait for download to complete
    cy.wait('@downloadPDF').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200)
      expect(interception.response?.headers['content-type']).to.include('application/pdf')
    })
  })

  it('should download business activity CSV report', () => {
    cy.intercept('GET', '/api/admin/reports/business-activity?format=csv*').as('downloadBusinessCSV')
    
    cy.contains('Business Activity Report').parent().parent().contains('CSV').click()
    
    cy.wait('@downloadBusinessCSV').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200)
    })
  })

  it('should download events CSV report', () => {
    cy.intercept('GET', '/api/admin/reports/events?format=csv*').as('downloadEventsCSV')
    
    cy.contains('Events Report').parent().parent().contains('CSV').click()
    
    cy.wait('@downloadEventsCSV').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200)
    })
  })
})

