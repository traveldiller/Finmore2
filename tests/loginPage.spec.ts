import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { USERS } from './testData';
import testData from './testData.json';
import { generateRandomEmail } from '../utils/randomData';


// 1st option for user data
//const ADMIN_CREDENTIALS = {
//     email: 'admin@demo.com',
//     password: 'admin123'
// };


test.describe('Login suite', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        loginPage.openHomepage();
    })

    test('Login with valid credentials as Admin', async ({ page }) => {

        await test.step('Check login page', async () => {
            await expect(loginPage.loginSubmitButton).toBeEnabled();
            await expect(loginPage.loginSubmitButton).toHaveText('Увійти');
            await expect(loginPage.loginEmailInput).toBeEnabled();
            await expect(loginPage.loginEmailInput).toHaveAttribute('placeholder', 'your@email.com');
            await expect(loginPage.loginPassInput).toBeEnabled();
            await expect(loginPage.loginPassInput).toHaveAttribute('placeholder', 'Введіть пароль');
        });

        await test.step('Fill Login page with valid data', async () => {
            // await loginPage.loginEmailInput.fill('admin@demo.com');
            // await expect(loginPage.loginEmailInput).toHaveValue('admin@demo.com');
            // await loginPage.loginPassInput.fill('admin123');
            // await expect(loginPage.loginPassInput).toHaveValue('admin123');
            // await loginPage.loginSubmitButton.click();

            //1 st option for test data
            // await loginPage.login(
            //     ADMIN_CREDENTIALS
            // );

           //3rd option JSON file with test data  
            const admin = testData.admin;

            await loginPage.fillLoginData({
                email: admin.email,
                password: admin.password
            });

            await expect(loginPage.loginEmailInput).toHaveValue(admin.email);

// 2nd option const USERS in testData.ts

            await loginPage.fillLoginData(
                USERS.admin
            );
            
            await expect(loginPage.loginEmailInput).toHaveValue(USERS.admin.email);
            await expect(loginPage.loginPassInput).toHaveValue(USERS.admin.password);
            await loginPage.clickOnLoginButton();
        });



        await test.step('Verify user is logged in', async () => {
            await expect(loginPage.userMenu).toBeVisible();
            await expect(loginPage.userMenu).toHaveText(USERS.admin.name);

            await expect(loginPage.appTitle.first()).toContainText('FinanceManager');
            await expect(loginPage.appLogo).toBeVisible();
        });

    });

});