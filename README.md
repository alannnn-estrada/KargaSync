# KargaSync

A desktop app for comparing file environments between local folders and remote servers (SFTP/FTP). Take snapshots, diff them, explore and deploy files.

---

## Installation

### Windows

Download `KargaSync-Setup-x.x.x.exe` from [Releases](https://github.com/alann-estrada-KSH/KargaSync/releases/latest) and run the installer.

Updates are downloaded and applied automatically in the background.

---

### macOS

Download `KargaSync-darwin-x64-x.x.x.zip` from [Releases](https://github.com/alann-estrada-KSH/KargaSync/releases/latest), unzip, and move `KargaSync.app` to `/Applications`.

When a new version is available, the app will notify you with a link to download it.

> **Note:** The app is not notarized. On first launch, right-click → Open to bypass Gatekeeper.

---

### Linux — via package manager (recommended)

Adds a repository so `apt` / `dnf` can keep the app updated automatically.

**Debian / Ubuntu**

```bash
echo "deb [trusted=yes] https://alann-estrada-KSH.github.io/KargaSync/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/kargasync.list
sudo apt update
sudo apt install karga-sync
```

**Fedora / RHEL / openSUSE**

```bash
sudo curl -o /etc/yum.repos.d/kargasync.repo \
  https://alann-estrada-KSH.github.io/KargaSync/rpm/kargasync.repo
sudo dnf install karga-sync
```

**Updating** (once the repository is added)

```bash
# Debian / Ubuntu
sudo apt update && sudo apt upgrade karga-sync

# Fedora / RHEL
sudo dnf upgrade karga-sync
```

---

### Linux — manual download

Download the `.deb` or `.rpm` package from [Releases](https://github.com/alann-estrada-KSH/KargaSync/releases/latest) and install it directly.

```bash
# Debian / Ubuntu
sudo dpkg -i karga-sync_x.x.x_amd64.deb

# Fedora / RHEL
sudo rpm -i karga-sync-x.x.x.x86_64.rpm
```

---

## Development

```bash
npm install
npm run dev        # start in dev mode
npm run make       # build distributable packages
npm run lint       # lint
```

**Generate app icons** (run once after changing `src/assets/logo.png`):

```bash
npm run build:icons
```

---

## Release

Push a version tag to trigger the CI pipeline — it builds for all platforms and publishes to GitHub Releases and the Linux package repositories automatically.

```bash
git tag v1.0.0
git push origin v1.0.0
```
