# SKYLINE — Windows app build

This folder is already configured as an Electron desktop app. You do **not**
need the Microsoft Store, Python, Node.js, Git or administrator access on your
own PC to *build* it if you use the included GitHub Actions workflow.

The game that gets packaged is `SKYLINE.html`, so it remains completely local
and offline after installation.

## What GitHub will produce

The workflow builds two Windows x64 `.exe` files:

1. **NSIS installer** — normal Windows setup, desktop shortcut and Start Menu
   entry. It is configured as a per-user install, so it normally does not need
   administrator rights.
2. **Portable EXE** — no installation at all. Download it and double-click it.
   This is the best fallback for locked-down machines that block installers.

Both contain the same game.

## Easiest method — build entirely on GitHub.com

### 1. Make a GitHub account

Go to https://github.com and sign in or create a free account.

### 2. Create an empty repository

1. Click the `+` menu in the top-right of GitHub.
2. Click **New repository**.
3. Name it something like `SKYLINE`.
4. Public or Private both work.
5. Do **not** add a README, `.gitignore`, or licence — this folder already has
   what it needs.
6. Click **Create repository**.

### 3. Upload this project folder

1. Unzip the SKYLINE app-builder ZIP on your computer.
2. Open the folder until you can see files such as `SKYLINE.html`,
   `package.json`, `electron`, `build`, and `.github`.
3. On the empty GitHub repository page, click **uploading an existing file**
   (or **Add file → Upload files**).
4. Drag **the contents of this folder** onto the upload area. Dragging the
   folder itself also works in current browsers.
5. Make sure the upload includes `.github/workflows/build-windows.yml`.
6. Enter a commit message such as `Initial SKYLINE Windows build`.
7. Commit directly to `main`.

There are fewer than 100 files and no source file is near GitHub's 25 MB
browser-upload limit.

### 4. Let GitHub build the EXE

Uploading the files to `main` should start the build automatically.

If it does not:

1. Open the **Actions** tab in the repository.
2. Click **Build SKYLINE for Windows** on the left.
3. Click **Run workflow**.
4. Choose `main` and click the green **Run workflow** button.

GitHub runs the build on a Windows machine in the cloud.

### 5. Download the finished app

1. Stay in **Actions → Build SKYLINE for Windows**.
2. Open the newest successful run (green tick).
3. Scroll to **Artifacts**.
4. Click **SKYLINE-Windows**.
5. GitHub downloads a ZIP containing the two `.exe` files.
6. Unzip it.

You can now use either the installer or the portable build.

## Which EXE should I use?

### Normal installer

Use the file whose name contains `Setup`.

- Double-click it.
- Pick an install location if you want.
- It creates SKYLINE shortcuts.
- It is configured as a **per-user** install, which generally avoids an admin
  prompt.

### Portable build

Use the other SKYLINE `.exe` if installation is blocked.

- Put it anywhere you can write files, such as Downloads or Documents.
- Double-click it.
- Nothing is installed into Windows.

The portable app still uses Electron's normal SKYLINE profile folder for game
save data, so your records and progress persist between launches.

## Windows SmartScreen warning

Because this is your own unsigned game and not a widely downloaded signed app,
Windows may show **Windows protected your PC** / **Unknown publisher**.

If your machine's policy allows it and you trust the build you made yourself:

1. Click **More info**.
2. Check that the app name is SKYLINE.
3. Click **Run anyway**.

Some school-managed PCs completely disable `Run anyway`. If that happens, try
the portable EXE; if the administrator blocks all unknown executables, there
is no code change inside SKYLINE that can bypass that policy. The browser HTML
version remains the fallback.

## Updating SKYLINE later

Whenever ChatGPT gives you a newer `SKYLINE.html`:

1. Open your GitHub repository.
2. Open `SKYLINE.html`.
3. Replace/upload it with the new one (or upload the whole updated project).
4. Commit the change to `main`.
5. The Windows workflow runs again automatically.
6. Download the new `SKYLINE-Windows` artifact from Actions.

The desktop app stores Chromium/localStorage data under the stable SKYLINE
user-data directory, so installing a newer build should keep your progress.
Uninstalling is deliberately configured **not** to delete that save data.

## Making a permanent public download link

Artifacts under GitHub Actions expire, so they are best for your own testing.
For a permanent shareable download:

1. Build the app successfully in Actions.
2. Download the `SKYLINE-Windows` artifact.
3. In your GitHub repository, open **Releases**.
4. Click **Draft a new release**.
5. Create a tag such as `v0.25.0`.
6. Give it a title such as `SKYLINE v0.25.0`.
7. Drag the installer `.exe` and/or portable `.exe` into the release assets.
8. Click **Publish release**.

The release page then gives you a normal link you can send to other people.

## Optional: build locally

Only do this if you later get access to Node.js. End users do NOT need Node.

```powershell
npm install
npm start
```

To make the Windows EXEs locally:

```powershell
npm run dist:win
```

The outputs appear in `dist/`.

## Files added for the desktop build

- `electron/main.cjs` — secure Electron window that loads SKYLINE.
- `package.json` — Electron/electron-builder config.
- `build/icon.ico` — Windows app icon.
- `.github/workflows/build-windows.yml` — cloud Windows build.
- `.gitignore` — excludes dependencies/build output.

### Security settings

The game renderer has Node integration disabled, context isolation enabled,
sandboxing enabled, and web security enabled. External links, if any are added
later, open in the normal browser rather than replacing the game window.
