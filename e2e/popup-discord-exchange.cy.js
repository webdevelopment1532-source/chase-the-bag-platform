/// <reference types="cypress" />

describe("Discord OAuth → Popup → Exchange E2E", () => {
  it("shows popup, logs in with Discord, and navigates to Exchange", () => {
    cy.visit("/");
    // Wait for popup
    cy.wait(2600);
    cy.contains(/Join the Chase The Bag/i).should("exist");
    // Simulate Discord login by setting user in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem(
        "user",
        JSON.stringify({ username: "E2EUser", id: "123" }),
      );
    });
    cy.reload();
    cy.wait(2600);
    cy.contains(/Welcome back, E2EUser/i).should("exist");
    cy.contains("View Exchange").click();
    cy.url().should("include", "/exchange");
  });

  it("dismisses popup with X and does not show again in session", () => {
    cy.visit("/");
    cy.wait(2600);
    cy.get('button[aria-label="Close ad"]').click();
    cy.contains(/Join the Chase The Bag/i).should("not.exist");
    cy.reload();
    cy.wait(2600);
    cy.contains(/Join the Chase The Bag/i).should("not.exist");
  });
});
