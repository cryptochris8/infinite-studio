# Roku App Guide (multistream)

How to put the multistream app on your Roku TVs and what it can and can't do.

> **Status:** working on a real Roku TV (58" Hisense, Roku OS 15.3, tested 2026-10-21): Home, Movies, Search, detail, My List, menu, "Watch on…" and trailers all checked.

## What it does

- **Home:** a large backdrop and description for whichever poster is highlighted, with rows of posters below: your My List, Trending, In Theaters, Coming Soon, Popular and Top Rated.
- **Movies** and **Shows:** a Popular row, then a row for each genre.
- **Search:** type on the on-screen keyboard; results appear as you type.
- **Detail screen:** backdrop, rating, age rating, runtime, genres, description, director, cast, where to watch, trailer, "Add to My List", and "More like this".
- **Profiles and My List:** shared with the website, so a title saved on your phone shows up on the TV.

## What it can't do

- **It doesn't play movies.** multistream is a guide. "Watch on Tubi" opens the **Tubi app** on the Roku.
- **It opens the app, not the exact movie.** Roku doesn't let one app open a specific title inside another app unless it knows that service's private ID for it, and services don't share those. So you search for the title in Tubi, Netflix and so on. The message at the bottom of the screen tells you what to search for.
- **Trailers** open in the **YouTube app**, aimed at the right video.
- **One home-made app per TV.** Roku lets each TV hold one app installed in developer mode. Installing another replaces it.

## Using it with the remote

| Button | What it does |
|---|---|
| Arrows | Move around |
| OK | Open a title or press a button |
| Left at the edge of a screen, or Back on a main screen | Open the menu (Search, Home, Movies, Shows, My List, Profile) |
| Back on a detail screen | Go back |
| Back with the menu open | Leave the app |
| `*` (Options) | Open or close the menu |

---

## One-time setup

### 1. Update the Pi first

The Roku app needs the newest version of the multistream server. From the laptop, copy the project to the Pi and rebuild (see Part 9 of `PI-SETUP-GUIDE.md`, "Updating later"), or ask Claude to do it.

### 2. Turn on developer mode on the TV

1. Turn the TV on and go to the Roku **Home** screen.
2. On the remote press: **Home ×3, Up ×2, Right, Left, Right, Left, Right**.
3. The **Developer Settings** screen appears and shows the TV's address, such as `http://192.168.68.20`. **Write down the IP address.**
4. Choose **Enable installer and restart** and agree to the license.
5. **Set a password.** It's case-sensitive. Don't share it in chat.
6. The TV restarts.

### 3. Let the Pi open apps on the TV

The "Watch on…" buttons work by asking the TV to open the streaming app, which the TV only allows if this setting permits it:

**Settings → System → Advanced system settings → Control by mobile apps → Network access → Enabled** (or **Permissive**).

> The default on newer Rokus is **Limited**, which may block this. If a "Watch on…" button says "The TV blocked it", this setting is why.

### 4. Add the TV's details to `.env` on the laptop

Open `C:\Users\chris\multistream\.env` in Notepad and add these three lines, with your own values:

```
ROKU_API_BASE=http://192.168.68.59:8080
ROKU_HOST=192.168.68.20
ROKU_DEV_PASSWORD=the-password-you-set
```

- `ROKU_API_BASE` is the Pi's address. Use the IP, not `multistream.local`.
- `ROKU_HOST` is the TV's IP from step 2.
- `.env` never goes to GitHub, so the password stays on the laptop.

### 5. Install the app

The laptop must be on your home Wi-Fi. In PowerShell:

```
cd C:\Users\chris\multistream
pnpm roku:deploy
```

It checks the code, packages it and installs it. The app starts on the TV straight away and also appears on the Roku home screen as **multistream** (look for the "dev" app at the end of your apps).

### Another TV

Repeat steps 2–5 for each TV, changing `ROKU_HOST` (and the password, if different) in `.env` before running `pnpm roku:deploy`.

---

## Commands

| Command | What it does |
|---|---|
| `pnpm roku:check` | Checks the Roku code for errors (no TV needed) |
| `pnpm roku:build` | Packages the app as `out/multistream-roku.zip` |
| `pnpm roku:deploy` | Packages and installs it on `ROKU_HOST` |

You can also install the zip by hand: open `http://<TV IP>` in a browser on the laptop, log in as `rokudev` with your password, choose **Upload**, pick `out/multistream-roku.zip` and click **Install with zip**.

## Troubleshooting

| Problem | Try this |
|---|---|
| "Can't reach the multistream server" | Is the Pi on? Open `http://192.168.68.59:8080` on your phone. Check `ROKU_API_BASE` in `.env`, then run `pnpm roku:deploy` again. |
| "Watch on…" says the TV blocked it | Step 3: set **Control by mobile apps → Network access** to **Enabled**. |
| "The Roku said no… Is the app installed?" | Install that streaming app from the Roku Channel Store. |
| Deploy says unauthorized | The password in `.env` doesn't match the one set on the TV. |
| Deploy can't connect | The TV is off or asleep, its IP changed, or developer mode is off. Repeat step 2 to see the IP. |
| Posters stay blank | The Pi's image proxy isn't reachable. Update the Pi (step 1). |

## How it works (for later changes)

- `roku/` holds the app: `manifest`, `source/main.brs`, `components/` (screens in `components/screens/`, shared code in `components/lib/`) and `images/`.
- The Pi does the formatting in `server/roku.ts` and serves it at `/api/roku/*`, so the Roku code stays small. Posters come through the Pi at `/img/...` over plain HTTP.
- "Watch on…" calls `POST /api/roku/launch`; the Pi sends the TV a Roku ECP `launch` command on port 8060. Roku IDs for each service are in `server/roku.ts` and may need updating if a service changes.
- Tests: `components/lib/helpers.brs` is tested off the device (`roku/tests/helpers.test.brs`); `pnpm test` also checks every Roku file for errors. Screens can only be tried on a TV.
