import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/registerPage';
import { LoginPage } from '../pages/loginPage';
import { createRandomUser, generateRandomEmail } from '../utils/randomData';

// test.describe('Registration suite', () => {
//   let regTitle;
//   let regName;
//   let regEmail;
//   let regPass;
//   let regConfirmPass;
//   let regSubmit;
//   let currencySelect;
//   let currencyUAH;

//   test.beforeEach(async ({ page }) => {
//     regTitle = page.getByTestId('register-title');
//     regName = page.getByTestId('register-name-input');
//     regEmail = page.getByTestId('register-email-input');
//     regPass = page.getByTestId('register-password-input');
//     regConfirmPass = page.getByTestId('register-confirm-password-input');
//     regSubmit = page.getByTestId('register-submit-button');
//     currencySelect = page.getByTestId('register-currency-select');
//     currencyUAH = page.getByTestId('currency-option-UAH');
//     await page.goto('/');
//   })

//   test('Homepage', async ({ page }) => {
//     await expect(page).toHaveURL('/');
//     await expect(page).toHaveTitle('Повнофункціональний фінансовий менеджер');
//   });

//   test('Registration', async ({ page }) => {
//     await test.step('Press Registration button', async () => {
//       const regLink = page.getByTestId('switch-to-register-button');
//       await expect(regLink).toBeVisible();
//       await regLink.click();
//     });

//     await test.step('Check Registration form', async () => {
//       //const regTitle = page.getByTestId('register-title');
//       await expect(regTitle).toHaveText('Реєстрація');
//       await expect(regName).toBeEnabled();
//       await expect(regName).toHaveAttribute('placeholder', 'Іван Петренко');
//       await expect(regEmail).toBeEnabled();
//       await expect(regEmail).toHaveAttribute('placeholder', 'your@email.com');
//       await expect(regPass).toBeEnabled();
//       await expect(regPass).toHaveAttribute('placeholder', 'Мінімум 6 символів');
//       await expect(regConfirmPass).toBeEnabled();
//       await expect(regConfirmPass).toHaveAttribute('placeholder', 'Повторіть пароль');
//       await expect(currencySelect).toBeEnabled();
//       await expect(currencySelect).toContainText('Гривня (UAH)');
//       await expect(regSubmit).toBeEnabled();
//       await expect(regSubmit).toHaveText('Зареєструватися');
//     });

//     await test.step('Fill Registration form with valid data', async () => {
//       await regName.fill('Test User');
//       await expect(regName).toHaveValue('Test User');
//       await regEmail.fill('Test123@gmail.com');
//       await expect(regEmail).toHaveValue('Test123@gmail.com');
//       await regPass.fill('Pass123123');
//       await expect(regPass).toHaveValue('Pass123123');
//       await regConfirmPass.fill('Pass123123');
//       await expect(regConfirmPass).toHaveValue('Pass123123');
//       await regSubmit.click();
//     });

//   });

// });


//// POM approach ////

test.describe('User Registration suite', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;


  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    loginPage.openHomepage();
   // loginPage.fillLoginData();ni
   // loginPage.clickOnLoginButton();
  });

  test('Registration of new user', async ({ page }) => {

    await test.step('Open registration page', async () => {
      await expect(registerPage.regLink).toBeVisible();
      await registerPage.clickOnRegisterLink();
    });

    await test.step('Check Registration form', async () => {
      await expect(registerPage.regTitle).toHaveText('Реєстрація');
      await expect(registerPage.regNameInput).toBeEnabled();

    });

    await test.step('Fill registration form', async () => {
      // await registerPage.regNameInput.fill('Test User');
      // await expect(registerPage.regNameInput).toHaveValue('Test User');
      // await registerPage.regEmailInput.fill('Test123@gmail.com');
      // await expect(registerPage.regEmailInput).toHaveValue('Test123@gmail.com');
      // await registerPage.regPassInput.fill('Pass123123');
      // await expect(registerPage.regPassInput).toHaveValue('Pass123123');
      // await registerPage.regConfirmPassInput.fill('Pass123123');
      // await expect(registerPage.regConfirmPassInput).toHaveValue('Pass123123');
      // await registerPage.regSubmit.click();

      await registerPage.fillRegisterForm({
        name: 'Test User',
        email: generateRandomEmail(),
        password: 'Pass123123',
        confirmPassword: 'Pass123123'
      });

      const user = createRandomUser();
 
      await registerPage.fillRegisterForm(user);

      await expect(registerPage.regNameInput).toHaveValue('Test User');
      await expect(registerPage.regEmailInput).toHaveValue(generateRandomEmail());
      await expect(registerPage.regPassInput).toHaveValue('Pass123123');
      await expect(registerPage.regConfirmPassInput).toHaveValue('Pass123123');

      await registerPage.clickonRegisterButton();

    });

    await test.step('Verify user is registered and logged in', async () => {
      await expect(loginPage.userMenu).toBeVisible();
      await expect(loginPage.userMenu).toHaveText('Test User');
      await expect(loginPage.appTitle.first()).toContainText('FinanceManager');
      await expect(loginPage.appLogo).toBeVisible();
    });

  });

});