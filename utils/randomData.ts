export function generateRandomEmail(): string {
    const timestamp = Date.now();
    return `testuser_${timestamp}@gmail.com`;
};

export const createRandomUser = () => {
    const randomString = Math.random().toString(36).substring(2, 8);
    return {
        name: `TestUser_${randomString}`,
        email: `test_${randomString}@gmail.com`,
        password: 'Pass123123',
        confirmPassword: 'Pass123123'
    };

};

export function generateRandomPassword(): string {
    const randomString = Math.random().toString(36).substring(2, 10);
    return `Aa1!${randomString}`;

}

export function generateRandomPassword2(length: number = 10): string {

    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    const all = upper + lower + numbers + symbols;

    let password =

        upper[Math.floor(Math.random() * upper.length)] +

        lower[Math.floor(Math.random() * lower.length)] +

        numbers[Math.floor(Math.random() * numbers.length)] +

        symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < length; i++) {

        password += all[Math.floor(Math.random() * all.length)];

    };
    return password;
};

///console.log

export const createRandomUser2 = () => {
    const randomString = Math.random().toString(36).substring(2, 8);
    const password = generateRandomPassword(12);

    return {
        name: `TestUser_${randomString}`,
        email: `test_${randomString}@gmail.com`,
        password,
        confirmPassword: password
    };
};

// Check phones and name after LOOP in array
// Test Data to run through array

for (const user of users) {
 
  console.log(`Register user: ${user.name} ${user.phone}`);
 
  await page.fill('[data-testid="name"]', user.name);
  await page.fill('[data-testid="phone"]', user.phone);
 
  await page.click('[data-testid="submit"]');
 
}



/// global methods 

async clickElement(element: Locator, options ?: { timeout?: number, force?: boolean }) {
    const timeout = options?.timeout ?? 5000;
    await element.waitFor({ state: 'visible', timeout });
    await element.waitFor({ state: 'attached', timeout });
    await element.click({ force: options?.force ?? false });
};

async clickOnLoginButton() {

    await this.clickElement(this.loginSubmitButton);

}



async clickElement(element: Locator, options?: { timeout?: number, force?: boolean }) {
        try {
            const timeout = options?.timeout ?? 5000;
            await element.waitFor({ state: 'visible', timeout });
            await element.waitFor({ state: 'attached', timeout });
            await element.click({ force: options?.force ?? false });
            console.log(`[BasePage] Clicked on element`);
        } catch (error) {
            console.error(`[ERROR] Failed to click on element`, error);
            throw error;
        }
    };


import { Page, Locator, expect } from "@playwright/test";
 
export class BasePage {
    readonly page: Page;
 
    constructor(page: Page) {
        this.page = page;
    }
 
  
    async navigateTo(url: string, timeout = 10000) {
        try {
            console.log(`[BasePage] Navigating to URL: ${url}`);
            await this.page.goto(url, { timeout });
            await this.page.waitForLoadState('domcontentloaded');
            console.log(`[BasePage] Page loaded: ${url}`);
        } catch (error) {
            console.error(`[BasePage][ERROR] Failed to navigate to ${url}`, error);
            throw error;
        }
    }
}



