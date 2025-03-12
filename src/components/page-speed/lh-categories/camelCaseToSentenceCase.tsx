export function camelCaseToSentenceCase(str: string) {
    if (!str) {
        return '';
    }
    const result = str
        .split(/(?=[A-Z])/)
        .join(' ')
        .toLowerCase();
    return result.charAt(0).toUpperCase() + result.slice(1);
}
