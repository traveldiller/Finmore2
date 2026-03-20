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
    };

    async fillLoginData(data: LoginData) {
        await this.loginEmailInput.fill(data.email);
        //console.log(data.email) to show output;
        await this.loginPassInput.fill(data.password);
    };

    async clickOnLoginButton() {
        await this.loginSubmitButton.click();
    };

    async openHomepage() {
        await this.page.goto('/');
    };


    async clickElement(element: Locator, options?: { timeout?: number, force?: boolean }) {
        const timeout = options?.timeout ?? 5000;
        await element.waitFor({ state: 'visible', timeout });
        await element.waitFor({ state: 'attached', timeout });
        await element.click({ force: options?.force ?? false });
    };

    ///when several arguments in one method only to use, interface for reusage and more arguments
    //     async fillLoginData(email:string, password:string ) {
    //     await this.loginEmailInput.fill(email);
    //     await this.loginPassInput.fill(password);
    // }

}

