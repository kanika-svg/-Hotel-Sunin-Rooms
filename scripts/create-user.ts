/**
 * Create a user for the Hotel Sunin Rooms app.
 * Run from project root: npx tsx scripts/create-user.ts <username> <password>
 * Example: npx tsx scripts/create-user.ts myfriend secretpass123
 */
// Use project root for users.json when running this script (ESM has no __dirname in server)
if (!process.env.HOTEL_SUNIN_DATA_DIR) {
  process.env.HOTEL_SUNIN_DATA_DIR = process.cwd();
}

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error("Usage: npx tsx scripts/create-user.ts <username> <password>");
  process.exit(1);
}

const { createUser } = await import("../server/users");

createUser(username, password)
  .then((user) => {
    console.log(`User created: ${user.username} (id: ${user.id})`);
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
