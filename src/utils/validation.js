import validator from "validator"

export const validateSignUpData = (req) => {
    const {firstName, lastName, emailId, password} = req.body;
    if (!firstName || !lastName) {
        throw new Error("Name is not valid!");
      } else if (!validator.isEmail(emailId)) {
        throw new Error("Email is not valid!");
      }
    //   } else if (!validator.isStrongPassword(password)) {
    //     throw new Error("Please enter a strong Password!");
    // }
}

export const validateEditProfileData = (req) => {
    const allowedEditFields = ["firstName", "lastName", "photoUrl", "about", "gender", "age","skills"];

    const isEditAllowed = Object.keys(req.body).every((update) => {
      return allowedEditFields.includes(update);
    });

    return isEditAllowed;
}