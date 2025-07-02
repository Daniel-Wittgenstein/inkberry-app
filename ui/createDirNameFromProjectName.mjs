function createDirNameFromProjectName(str) {
  function isSpecialChar(char) {
    const code = char.codePointAt(0);
    return (
      char !== "_" &&
      char !== "-" &&
      (code < 48 || (code > 57 && code < 128 && char.toUpperCase() === char.toLowerCase()))
    );
  }
  let newStr = "";
  for (const char of str) {
    if (!isSpecialChar(char)) newStr += char;
  }
  return newStr;
}

export default createDirNameFromProjectName;
