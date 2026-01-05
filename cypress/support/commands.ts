/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login as admin user
       * @example cy.loginAdmin('admin@test.com', 'password')
       */
      loginAdmin(email: string, password: string): Chainable<void>
      
      /**
       * Custom command to login as regular user
       * @example cy.loginUser('user@test.com', 'password')
       */
      loginUser(email: string, password: string): Chainable<void>
      
      /**
       * Custom command to wait for API response
       * @example cy.waitForApi('GET', '/api/admin/members')
       */
      waitForApi(method: string, url: string): Chainable<void>
    }
  }
}

// Login as admin - using cy.session() for proper session management
Cypress.Commands.add('loginAdmin', (email: string, password: string) => {
  cy.session(
    `admin-${email}`,
    () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: { email, password },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status !== 200) {
          cy.log(`Login failed: ${response.body.error || 'Unknown error'}`)
          throw new Error(`Login failed with status ${response.status}: ${response.body.error}`)
        }
        
        expect(response.status).to.eq(200)
        expect(response.body.success).to.be.true
        
        // Get access token from response
        const accessToken = response.body.data?.session?.access_token
        
        if (accessToken) {
          // Store token for subsequent requests
          cy.window().then((win) => {
            win.localStorage.setItem('supabase.auth.token', JSON.stringify({
              access_token: accessToken,
              expires_at: response.body.data?.session?.expires_at,
            }))
          })
        }
      })
    },
    {
      validate: () => {
        // Validate session is still active by checking localStorage
        cy.window().then((win) => {
          const token = win.localStorage.getItem('supabase.auth.token')
          expect(token).to.exist
        })
      },
    }
  )
})

// Login as regular user
Cypress.Commands.add('loginUser', (email: string, password: string) => {
  cy.session(
    `user-${email}`,
    () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: { email, password },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status !== 200) {
          cy.log(`Login failed: ${response.body.error || 'Unknown error'}`)
          throw new Error(`Login failed with status ${response.status}: ${response.body.error}`)
        }
        
        expect(response.status).to.eq(200)
        expect(response.body.success).to.be.true
        
        const accessToken = response.body.data?.session?.access_token
        
        if (accessToken) {
          cy.window().then((win) => {
            win.localStorage.setItem('supabase.auth.token', JSON.stringify({
              access_token: accessToken,
              expires_at: response.body.data?.session?.expires_at,
            }))
          })
        }
      })
    },
    {
      validate: () => {
        cy.window().then((win) => {
          const token = win.localStorage.getItem('supabase.auth.token')
          expect(token).to.exist
        })
      },
    }
  )
})

// Wait for API response
Cypress.Commands.add('waitForApi', (method: string, url: string) => {
  cy.intercept(method, url).as('apiCall')
  cy.wait('@apiCall')
})

export {}

