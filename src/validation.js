/**
 * AlgoMintX SDK Validation Utilities
 * Contains all validation methods for SDK parameters
 */

export class Validator {
  /**
   * Base validation methods
   */

  static validateRequired(value, paramName) {
    if (value === undefined || value === null) {
      throw new Error(`${paramName} is required`);
    }
    return value;
  }

  static validateString(value, paramName) {
    Validator.validateRequired(value, paramName);
    if (typeof value !== "string") {
      throw new Error(`${paramName} must be a string`);
    }
    if (value.trim().length === 0) {
      throw new Error(`${paramName} cannot be empty`);
    }
    return value;
  }

  static validateEnum(value, paramName, validValues) {
    Validator.validateString(value, paramName);
    if (!validValues.includes(value)) {
      throw new Error(`${paramName} must be one of: ${validValues.join(", ")}`);
    }
    return value;
  }

  static validateNumber(value, paramName, options = {}) {
    if (value === undefined || value === null) {
      return options.default ?? 0;
    }
    if (typeof value !== "number") {
      throw new Error(`${paramName} must be a number`);
    }
    if (!Number.isFinite(value)) {
      throw new Error(`${paramName} must be a finite number`);
    }
    if (options.min !== undefined && value < options.min) {
      throw new Error(
        `${paramName} must be greater than or equal to ${options.min}`,
      );
    }
    if (options.max !== undefined && value > options.max) {
      throw new Error(
        `${paramName} must be less than or equal to ${options.max}`,
      );
    }
    return value;
  }

  static validateBoolean(value, paramName, defaultValue = false) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== "boolean") {
      throw new Error(`${paramName} must be a boolean`);
    }
    return value;
  }

  static validateUrl(value, paramName) {
    Validator.validateString(value, paramName);
    try {
      new URL(value);
      return value;
    } catch (e) {
      throw new Error(`${paramName} must be a valid URL`);
    }
  }

  /**
   * SDK-specific validation methods
   */

  static validatePinataServerKey(key) {
    return Validator.validateString(key, "Pinata IPFS server key");
  }

  static validatePinataGatewayUrl(url) {
    // Make it optional - return null if not provided
    if (url === undefined || url === null) {
      return null;
    }

    const validatedUrl = Validator.validateString(
      url,
      "Pinata IPFS gateway URL",
    );

    // Check for https:// or http://
    if (
      validatedUrl.startsWith("http://") ||
      validatedUrl.startsWith("https://")
    ) {
      throw new Error(
        "Pinata IPFS gateway URL must not include http:// or https://",
      );
    }

    // Check for any forward slashes
    if (validatedUrl.includes("/")) {
      throw new Error(
        "Pinata IPFS gateway URL must not contain any forward slashes",
      );
    }

    try {
      // Test if it's a valid URL by adding https://
      new URL(`https://${validatedUrl}`);
      return validatedUrl;
    } catch (e) {
      throw new Error("Pinata IPFS gateway URL must be a valid URL");
    }
  }

  static validateEnvironment(env) {
    return Validator.validateEnum(env, "Environment", ["testnet", "mainnet"]);
  }

  static validateMarketplaceType(marketplaceType) {
    return Validator.validateEnum(marketplaceType, "marketplaceType", [
      "FT",
      "NFT",
    ]);
  }

  static validateNamespace(namespace) {
    const validatedNamespace = Validator.validateString(namespace, "Namespace");
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(validatedNamespace)) {
      throw new Error(
        "Namespace must be a valid UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)",
      );
    }
    return validatedNamespace;
  }

  static validateRevenueWalletAddress(address) {
    const validatedAddress = Validator.validateString(
      address,
      "Revenue wallet address",
    );
    if (validatedAddress.length !== 58) {
      throw new Error("Revenue wallet address must be 58 characters long");
    }
    if (!/^[A-Z2-7]{58}$/.test(validatedAddress)) {
      throw new Error("Invalid Algorand wallet address format");
    }
    return validatedAddress;
  }

  static validateFee(fee, paramName) {
    return Validator.validateNumber(fee, paramName, { min: 0 });
  }

  static validateDisableToast(disableToast) {
    return Validator.validateBoolean(disableToast, "disableToast", false);
  }

  static validateDisableUi(disableUi) {
    return Validator.validateBoolean(disableUi, "disableUi", false);
  }

  static validateMinimizeUILocation(location) {
    return (
      Validator.validateEnum(location, "minimizeUILocation", [
        "left",
        "right",
      ]) || "right"
    );
  }

  static validateLogo(logo) {
    if (logo === undefined || logo === null) {
      return null;
    }

    const validatedLogo = Validator.validateString(logo, "Logo");

    // Check if it's a URL
    if (
      validatedLogo.startsWith("http://") ||
      validatedLogo.startsWith("https://")
    ) {
      return Validator.validateUrl(validatedLogo, "Logo");
    }

    // Check if it's a local file path
    if (
      validatedLogo.startsWith("./") ||
      validatedLogo.startsWith("../") ||
      validatedLogo.startsWith("/")
    ) {
      if (
        !/^[./\\a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(
          validatedLogo,
        )
      ) {
        throw new Error(
          "Invalid logo file path. Must be a valid image file path",
        );
      }
      return validatedLogo;
    }

    throw new Error(
      "Logo must be either a valid URL or a valid local file path",
    );
  }

  static validateToastLocation(location) {
    return Validator.validateEnum(location, "Toast location", [
      "TOP_LEFT",
      "TOP_RIGHT",
    ]);
  }

  static validateSupportedMediaFormats(formats) {
    if (!Array.isArray(formats)) {
      throw new Error("supportedMediaFormats must be an array");
    }

    const validFormats = ["IMAGE", "VIDEO", "AUDIO"];
    const invalidFormats = formats.filter(
      (format) => !validFormats.includes(format),
    );

    if (invalidFormats.length > 0) {
      throw new Error(
        `Invalid media formats: ${invalidFormats.join(
          ", ",
        )}. Valid formats are: ${validFormats.join(", ")}`,
      );
    }

    return formats;
  }

  static validateFileType(file, supportedMediaFormats) {
    const allowedTypes = {
      IMAGE: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ],
      VIDEO: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
      AUDIO: [
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp4",
        "audio/webm",
      ],
    };

    // Get all allowed types based on supported formats
    const allowedMimeTypes = supportedMediaFormats.reduce((types, format) => {
      return [...types, ...allowedTypes[format]];
    }, []);

    const mimeType = file.type || file.mimetype;
    if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
      const formatNames = supportedMediaFormats
        .map((format) => format.toLowerCase())
        .join(", ");
      return {
        valid: false,
        message: `Please upload a supported file type (${formatNames})`,
      };
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    const fileSize =
      file.size ??
      (file.data instanceof Uint8Array
        ? file.data.byteLength
        : file.data?.length);
    if (fileSize != null && fileSize > maxSize) {
      return {
        valid: false,
        message: "File size must be less than 100MB",
      };
    }

    return { valid: true };
  }

  static sanitizeInput(input) {
    // Remove any HTML tags
    input = input.replace(/<[^>]*>/g, "");
    // Remove any script tags and their content
    input = input.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );
    // Remove any special characters except basic punctuation, spaces, and alphanumeric
    input = input.replace(
      /[^a-zA-Z0-9\s.,!?@#$%^&*()_+\-=\[\]{};':"\\|<>\/]/g,
      "",
    );
    // Remove multiple spaces but keep single spaces
    input = input.replace(/\s+/g, " ");
    return input.trim();
  }

  static validateNFTName(name) {
    // Check length (between 1 and 50 characters)
    if (name.length < 1 || name.length > 50) {
      return {
        valid: false,
        message: "NFT name must be between 1 and 50 characters",
      };
    }
    return { valid: true };
  }

  static validateNFTDescription(description) {
    // Check length (between 1 and 500 characters)
    if (description.length < 1 || description.length > 500) {
      return {
        valid: false,
        message: "NFT description must be between 1 and 500 characters",
      };
    }
    return { valid: true };
  }

  static validateFTName(name) {
    // Check length (between 1 and 50 characters)
    if (name.length < 1 || name.length > 50) {
      return {
        valid: false,
        message: "FT name must be between 1 and 50 characters",
      };
    }
    return { valid: true };
  }

  static validateFTDescription(description) {
    // Check length (between 1 and 500 characters)
    if (description.length < 1 || description.length > 500) {
      return {
        valid: false,
        message: "FT description must be between 1 and 500 characters",
      };
    }
    return { valid: true };
  }

  static validateFTDecimals(decimals) {
    // Algorand ASA decimals must be an integer between 0 and 19
    if (decimals === undefined || decimals === null || decimals === "") {
      return { valid: false, message: "Decimals is required" };
    }
    const num = Number(decimals);
    if (!Number.isInteger(num)) {
      return { valid: false, message: "Decimals must be a whole number" };
    }
    if (num < 0 || num > 19) {
      return { valid: false, message: "Decimals must be between 0 and 19" };
    }
    return { valid: true };
  }

  static validateFTTotalSupply(totalSupply) {
    // Algorand ASA total must be a positive integer (1 .. 2^64 - 1)
    if (
      totalSupply === undefined ||
      totalSupply === null ||
      totalSupply === ""
    ) {
      return { valid: false, message: "Total supply is required" };
    }
    const num = Number(totalSupply);
    if (!Number.isInteger(num)) {
      return { valid: false, message: "Total supply must be a whole number" };
    }
    if (num < 1) {
      return { valid: false, message: "Total supply must be at least 1" };
    }
    if (num > Number.MAX_SAFE_INTEGER) {
      return {
        valid: false,
        message: "Total supply is too large",
      };
    }
    return { valid: true };
  }
}
