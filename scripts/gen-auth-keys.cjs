// One-off helper: generate an RSA keypair for Convex Auth and print
// shell-safe commands to set JWT_PRIVATE_KEY and JWKS on the deployment.
const { generateKeyPairSync } = require("crypto");
const fs = require("fs");

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "jwk" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const jwk = {
  keys: [
    {
      use: "sig",
      kty: publicKey.kty,
      alg: "RS256",
      n: publicKey.n,
      e: publicKey.e,
    },
  ],
};

fs.writeFileSync(
  __dirname + "/_jwt_private_key.txt",
  privateKey.toString("utf8")
);
fs.writeFileSync(__dirname + "/_jwks.json", JSON.stringify(jwk));

console.log("Private key written:", __dirname + "/_jwt_private_key.txt");
console.log("JWKS written:", __dirname + "/_jwks.json");
