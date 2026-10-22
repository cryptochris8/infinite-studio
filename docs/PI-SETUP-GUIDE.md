# Raspberry Pi 5 Setup Guide (multistream)

Step-by-step guide to take the CanaKit Raspberry Pi 5 (8GB, Turbine Black case, 128GB microSD) from the box to a home server you control entirely from your Windows laptop. No monitor or keyboard needed on the Pi.

> **Status:** Parts 1-9 are written. Parts 10-11 are outlines for features not built yet (live TV, Jellyfin).

## What you'll end up with

```
TV / phone / laptop (Wi-Fi) ──► Router ══ cable ══ Raspberry Pi 5
                                                    ├─ multistream app (Docker)
                                                    ├─ Jellyfin, optional (your own movies)
                                                    └─ Tailscale (watch away from home)
```

## Part 0: What you need

- [ ] CanaKit Raspberry Pi 5 kit (Pi, Turbine Black case with fan, 128GB microSD, power supply, USB card reader, micro-HDMI cable)
- [ ] An Ethernet cable (not in the kit) and a free LAN port on your router
- [ ] Your Windows laptop (it needs to be on the same home Wi-Fi/network as the Pi)
- [ ] About 45 minutes

Pick these before you start and write them down (keep the password out of git and out of chat):
- **Hostname:** `multistream`
- **Username:** `chris` (or your choice; replace `chris` in every command below if you pick another)
- **Password:** something strong, saved in your password manager

---

## Part 1: Assemble the Pi

1. Follow the **CanaKit instructions in the box** to put the Pi 5 into the Turbine Black case. The case has a fan; connect it as the instructions show.
2. **Leave the microSD card out for now.** You'll re-flash it on your laptop in Part 2.
3. Don't plug in power yet.

## Part 2: Put the server operating system on the microSD card

The card comes with the desktop version of Raspberry Pi OS. A headless server runs better on the **Lite** version, so you'll replace it.

1. On your laptop, download and install **Raspberry Pi Imager** from <https://www.raspberrypi.com/software/>.
2. Put the microSD card in the kit's **USB card reader** and plug that into the laptop.
3. Open Raspberry Pi Imager and choose:
   - **Device:** Raspberry Pi 5
   - **Operating System:** Raspberry Pi OS (other) → **Raspberry Pi OS Lite (64-bit)**
   - **Storage:** your microSD card (check the size says about 128GB so you don't pick the wrong drive)
4. When it asks about **OS customisation / Edit Settings**, choose to edit settings and fill in:
   - **Hostname:** `multistream`
   - **Username and password:** the ones you picked in Part 0
   - **Wi-Fi:** your network name and password. Fill this in even if you'll use a cable; it's a backup.
   - **Locale / time zone:** your time zone and keyboard layout
   - **Services → Enable SSH → Use password authentication**
5. Save, then confirm the write. **This erases everything on the card.** Wait for "Write successful."
6. Safely eject the card and take it out of the reader.

## Part 3: Connect the Pi to the router and power it on

1. Put the microSD card in the Pi's card slot (on the underside of the board; follow CanaKit's case instructions if the case covers it).
2. Plug one end of the Ethernet cable into the Pi and the other into a **LAN port on your router**.
3. Plug in the power supply last. The Pi turns on by itself.
4. **Wait 2-3 minutes.** The first boot sets everything up and may restart once. The green light flickering is normal.

> Mesh Wi-Fi (Eero, Deco, Orbi): plug the Pi into the main unit.

## Part 4: Control the Pi from your laptop (SSH)

SSH is a text window on your laptop that runs commands on the Pi. It's built into Windows 11.

1. On your laptop, open **PowerShell**.
2. Run (use your username):
   ```
   ssh chris@multistream.local
   ```
3. The first time, it asks `Are you sure you want to continue connecting?` Type `yes` and press Enter.
4. Enter the password you set. You're in when the prompt changes to something like `chris@multistream:~ $`.

Everything you type now runs **on the Pi**. Type `exit` to come back to your laptop.

**If `multistream.local` doesn't connect:**
- Wait another minute and retry; the first boot can be slow.
- Make sure the laptop is on the same network as the Pi (not a guest network, not a VPN).
- Open your router's admin page (often <http://192.168.1.1>; check the sticker on the router) and look in "Connected devices" for `multistream`. Then connect using its IP: `ssh chris@192.168.1.50` (use the real IP).
- Still stuck? See Troubleshooting at the bottom.

## Part 5: Update the Pi and install the software

Run these on the Pi (inside the SSH window), one block at a time.

**Update everything** (takes a few minutes):
```bash
sudo apt update && sudo apt full-upgrade -y
```

**Install Docker**, which runs the app and Jellyfin:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**Install Tailscale**, which lets you reach the Pi away from home:
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
`tailscale up` prints a link. Open it on your laptop and sign in to a Tailscale account (free) to connect the Pi.

**Reduce SD card wear** by keeping system logs in memory:
```bash
sudo sed -i 's/^#\?Storage=.*/Storage=volatile/' /etc/systemd/journald.conf
```

**Restart:**
```bash
sudo reboot
```
Wait about a minute, then reconnect with `ssh chris@multistream.local`.

**Check Docker works:**
```bash
docker run hello-world
```
You should see `Hello from Docker!`. If you get a "permission denied" error, log out (`exit`) and back in, then retry.

## Part 6: Give the Pi a fixed address on your network

Routers can hand out a different address after a restart, which would break the links to your app. Fix this once.

1. On the Pi, find its current address and hardware (MAC) address:
   ```bash
   hostname -I
   ip link show eth0
   ```
   The `link/ether` line is the MAC address.
2. Open your router's admin page and find a setting called **DHCP reservation**, **Address reservation** or **Static lease**. The exact name depends on the router.
3. Reserve the Pi's current IP for its MAC address and save.
4. Write the IP down. You'll use it on the TVs, because many smart TVs can't resolve `multistream.local`.

## Part 7: Set up key login so Claude can help over SSH (recommended)

Key login is more secure than a password, and it means no password has to be typed into a chat. Do this on the **laptop** (PowerShell):

1. Create a key (press Enter at the prompts; setting a passphrase is optional):
   ```
   ssh-keygen -t ed25519
   ```
2. Copy the public key to the Pi (use your username; enter the Pi password once):
   ```
   Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | ssh chris@multistream.local "mkdir -p ~/.ssh && tr -d '\r' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
   ```
3. Test it. This should log you in without asking for the Pi password:
   ```
   ssh chris@multistream.local
   ```

Once this works, Claude Code can run commands on the Pi from your laptop for deploys and updates. Claude will ask before running anything on it.

## Part 8: Make the Pi safer

On the Pi:
```bash
# Turn on automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```
- **Do not forward ports on your router** to the Pi. Use Tailscale to reach it from outside your home.
- After Part 7 works, you can turn off password login: `sudo nano /etc/ssh/sshd_config`, set `PasswordAuthentication no`, then `sudo systemctl restart ssh`. Keep an SSH window open while you test so you can't lock yourself out.

---

## Part 9: Deploy the app

**Before you start:** get a free TMDB account and API key at <https://www.themoviedb.org/settings/api> (copy the long "API Read Access Token").

> The Docker setup has not been tested on a real Pi yet (it couldn't be built where the app was written). If the first build fails, send Claude the error.

1. **Get the project onto the Pi.** If the project is on GitHub, SSH into the Pi and run:
   ```bash
   git clone <your-repo-url> multistream
   cd multistream
   ```
   No GitHub repo yet? From your laptop, copy the folder over SSH (skip `node_modules`):
   ```
   scp -r C:\Users\chris\multistream chris@multistream.local:~/
   ```
   (then `ssh` in and `cd multistream`; delete the copied `node_modules` folder if it came along).
2. **Add your TMDB key.** On the Pi:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Paste your key after `TMDB_API_KEY=`, then press Ctrl+O, Enter, Ctrl+X to save. The key stays on the Pi and is never sent to browsers.
3. **Build and start** (the first build takes several minutes on a Pi):
   ```bash
   docker compose up -d --build
   ```
4. **Check it's running:**
   ```bash
   docker compose ps
   curl http://localhost:8080/api/health
   ```
   You should see `{"ok":true}`.
5. **Open it** from your laptop or any device on your Wi-Fi: `http://multistream.local:8080` (or `http://<Pi-IP>:8080`).

It restarts by itself after a reboot or power cut.

**Updating later:**
```bash
cd ~/multistream
git pull
docker compose up -d --build
```
Your profiles and My Lists live in the `data` folder, so updates don't erase them.

**Useful commands:** `docker compose logs -f` (see what it's doing), `docker compose restart`, `docker compose down` (stop).

## Part 10: Open the app on your TVs and devices

- **Phones, tablets, laptops:** open the Pi's address in the browser, then use "Add to Home Screen" for an app-like icon.
- **Smart TVs with a browser (Samsung, LG, Fire TV, Google TV):** open the TV's browser and enter the Pi's **IP address**, not `multistream.local`. Bookmark it.
- **Roku:** Roku has no real browser, so it needs a separate channel. We'd decide on that later.
- The TV must be on your main Wi-Fi, not a guest network.

## Part 11: Optional add-ons

- **Live TV over the air:** an HDHomeRun tuner (about $100) plus an antenna, connected to your router. Setup steps will be added when we build the live TV page.
- **Your own movie library (Jellyfin):** plug a USB 3 SSD or hard drive into one of the Pi's blue USB ports. Jellyfin steps will be added when we get there. Files in common formats (H.264/H.265 in MP4/MKV) play best, because the Pi 5 has no hardware video converter.
- **Away from home:** install the Tailscale app on your phone and laptop, sign in with the same account, and open the Pi's Tailscale address.

## Part 12: Everyday maintenance

- **Update the system** (about once a month):
  ```bash
  sudo apt update && sudo apt full-upgrade -y && sudo reboot
  ```
- **Restart safely:** `sudo reboot`. To power off, use `sudo shutdown now` and wait for the light to stop before unplugging.
- **Back up:** the watchlists and settings will live in one data folder. A backup command will be added with the deploy steps. The microSD card can wear out over years, so keep a copy.
- **Check temperature:** `vcgencmd measure_temp` (normal is under 70°C with the fan).

---

## Troubleshooting

| Problem | Try this |
|---|---|
| `ssh: Could not resolve hostname multistream.local` | Wait 2-3 minutes after power-on. Find the Pi's IP in your router's connected-devices list and use `ssh chris@<IP>`. |
| `Connection timed out` | Laptop and Pi must be on the same network. Turn off any VPN. Check the Pi's lights and the Ethernet cable. |
| `Permission denied` | Re-check username and password. Usernames are case-sensitive. |
| Pi never shows up on the network | Power it off, plug it into a TV with the micro-HDMI cable and power it on to see error messages. The most common cause is a typo in the Wi-Fi settings or a card that wasn't written correctly. Re-flash in Part 2. |
| `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED` | You re-flashed the Pi. Run `ssh-keygen -R multistream.local` on the laptop and connect again. |
| Docker "permission denied" | Run `exit`, reconnect, and retry. The group change needs a new login. |
| Random freezes or reboots | Use the official CanaKit power supply, make sure the fan is spinning, and check the temperature. |
| Slow or buffering video | Use the cable (not Wi-Fi) for the Pi, and move weak-signal TVs closer to the router or add a mesh node. |
