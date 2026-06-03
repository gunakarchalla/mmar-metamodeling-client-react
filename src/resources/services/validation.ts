export class Validation {
  isValid = true;
  message = "";

  constructor() {
    this.isValid = true;
    this.message = "";
  }

  /**
   * @param value - The value to be validated
   * @param regex - The regular expression to be used for validation
   * @param messageParam - The message to be displayed if the validation fails
   * @returns void
   * @description - This function validates the value against the regex and sets the isValid flag accordingly
   **/
  validate(value: string, regex: string | RegExp, messageParam: string) {
    if (typeof regex === "string") {
      regex = new RegExp(regex);
    }
    if (regex) {
      if (!regex.test(value)) {
        this.isValid = false;
        this.message = messageParam;
      } else {
        this.isValid = true;
        this.message = "";
      }
    }
  }
}
