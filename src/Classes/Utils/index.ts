export function generateCurrentUnix() {
    return Math.floor(Date.now() / 1000);
}

export const camelToSnake = (str: string) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);