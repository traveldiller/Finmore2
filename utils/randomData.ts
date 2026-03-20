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

export function generateRandomPassword(length: number = 10): string {

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

export const createRandomUser = () => {
  const randomString = Math.random().toString(36).substring(2, 8);
  const password = generateRandomPassword(12);
 
  return {
    name: `TestUser_${randomString}`,
    email: `test_${randomString}@gmail.com`,
    password,
    confirmPassword: password
  };
};

 
 



