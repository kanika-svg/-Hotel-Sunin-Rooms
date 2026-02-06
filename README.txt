# Hotel Sunin Rooms - Desktop Application

## Standalone app (recommended for sharing)

You can build a **single Windows app** that your friend can download and run (no Node, no browser step):

1. Install Node.js from https://nodejs.org if you don't have it.
2. In this folder, open a terminal and run:
   - `npm install`
   - `npm run dist`
3. When the build finishes, go to the **release** folder. You will find:
   - **Hotel Sunin Rooms 1.0.0.exe** (portable – double-click to run)
   - **Hotel Sunin Rooms Setup 1.0.0.exe** (installer – optional)
4. Send your friend **Hotel Sunin Rooms 1.0.0.exe** (or the installer). They double-click it and use the app in one window – no browser, no Node install. Data is stored in their user folder (AppData).

## Other ways to run (development / existing launchers)

- **Launch Hotel Sunin Rooms.vbs** – starts the server and opens the app in your browser (requires the packaged exe in this folder).
- **Start-With-Node.cmd** – runs the app with Node (builds first if needed, then opens the browser). Use this if the .vbs launcher doesn't work.

## Requirements

- No database install required (data is stored in hotel-sunin-data.json or, for the standalone app, in the user's AppData folder).

## Troubleshooting

If the browser doesn't open automatically:
1. Wait 3 seconds
2. Open your browser manually
3. Go to: http://localhost:5000

If the app doesn't load:
- Make sure you extracted the zip fully (don't run from inside the zip).
- Try **Start-With-Node.cmd** if the .vbs launcher doesn't work.

## To stop the application

Close the browser or the app window. If you used Start-With-Node.cmd, close the command window to stop the server.

## Website login (for when you deploy online)

The app now has a login screen. Only people with a username and password can use it.

- **Create a user** (run once per person, from project root):
  npx tsx scripts/create-user.ts <username> <password>
  Example: npx tsx scripts/create-user.ts myfriend secretpass123

- **First-time setup:** An initial user "admin" / "admin123" was created. Sign in with that, or create new users and share their credentials securely.

- **When deploying** (e.g. Render, Railway): Set SESSION_SECRET in the environment to a long random string so session cookies are secure.
