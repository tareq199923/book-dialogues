import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { derivePersona } = await import("./src/lib/persona/derive");

  const title = process.argv[2] ?? "Beyond Good and Evil";
  console.log(`Deriving persona for: ${title}\n`);

  const persona = await derivePersona(title);
  console.log(JSON.stringify(persona, null, 2));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});