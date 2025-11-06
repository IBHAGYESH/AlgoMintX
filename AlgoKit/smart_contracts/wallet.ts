import algosdk from "algosdk";

// Generate a new account
const account = algosdk.generateAccount();

// Convert the public key to a readable Algorand address
const address = algosdk.encodeAddress(account.addr.publicKey); // Encode public key to address

// Get mnemonic from the secret key
const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

console.log("🔐 Algorand Wallet Created");
console.log("Address:", address); // This is the wallet address as a string
console.log("Mnemonic:", mnemonic);
