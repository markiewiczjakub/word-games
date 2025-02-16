export function generateBitmask(word: string): string {
  const polishAlphabet = "aąbcćdeęfghijklłmnńoóprsśtuwxyzźż";
  let bitmask = "0".repeat(polishAlphabet.length);

  for (const char of word.toLowerCase()) {
    const index = polishAlphabet.indexOf(char);
    if (index !== -1) {
      bitmask =
        bitmask.substring(0, index) + "1" + bitmask.substring(index + 1);
    }
  }
  return bitmask;
}
