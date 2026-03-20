import { Page, Locator } from "@playwright/test";
export interface LoginData {
    email: string;
    password: string;
};


export class LoginPage {
    readonly page: Page;
    readonly loginEmailInput: Locator;
    readonly loginPassInput: Locator;
    readonly loginSubmitButton: Locator;
    readonly userMenu: Locator;  //maybe it better to put in another Class > Account for example
    readonly appTitle: Locator; //maybe it better to put in another Class > Account for example
    readonly appLogo: Locator;


    constructor(page: Page) {
        this.page = page;
        this.loginEmailInput = page.getByTestId('login-email-input');
        this.loginPassInput = page.getByTestId('login-password-input');
        this.loginSubmitButton = page.getByTestId('login-submit-button');
        this.userMenu = page.getByTestId('user-menu-trigger');
        this.appTitle = page.getByTestId('app-title'); // 2 same ID for the page: header 'FinanceManager' with space and without
        this.appLogo = page.getByTestId('app-logo');
    }

    async fillLoginData(data: LoginData) {
        await this.loginEmailInput.fill(data.email);
        await this.loginPassInput.fill(data.password);
    }

    async clickOnLoginButton() {
        await this.loginSubmitButton.click();
    }

    async openHomepage() {
        await this.page.goto('/');
    }

    ///when several arguments in one method only to use, interface for reusage and more arguments
    //     async fillLoginData(email:string, password:string ) {
    //     await this.loginEmailInput.fill(data.email);
    //     await this.loginPassInput.fill(data.password);
    // }

}

